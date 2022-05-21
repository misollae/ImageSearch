class Picture {

    constructor(px, py, w, h, impath, cat) {
        this.posx = px;
        this.posy = py;
        this.w = w;
        this.h = h;
        this.impath = impath;
        this.imgobj = new Image();
        this.imgobj.src = this.impath;
        this.original_w = this.imgobj.width;
        this.original_h = this.imgobj.height;
        this.category = cat;
        this.hist = [];
        this.color_moments = [];
        this.manhattanDist = [];
        let self = this;

        this.imgobj.addEventListener('load', function () {
            self.setWidth((self.h * this.width) / this.height);
            self.original_w = this.width;
            self.original_h = this.height;
        }, false);
    }
    
    draw(cnv) {
        let ctx = cnv.getContext("2d");
        
        if (this.imgobj.complete) {
            ctx.drawImage(this.imgobj, this.posx, this.posy, this.w, this.h);
            console.log("Debug: N Time");
        } else {
            console.log("Debug: First Time");
            let self = this;
            this.imgobj.addEventListener('load', function () {
                self.setWidth((self.h * this.width) / this.height);
                self.original_w = this.width;
                self.original_h = this.height;
                ctx.drawImage(self.imgobj, self.posx, self.posy, self.w, self.h);
            }, false);
        }
    }

    setWidth(w){
        this.w = w;
    }

    newHeight(h){
        this.h = h;
        this.w = ((this.h * this.original_w) / this.original_h);
    }
    
    //method to apply the algorithms to the image.
    //Because the image have to be loaded from the server, the same strategy used in the method draw()
    //is used here to access the image pixels. We do not know exactly when the image is loaded and computed.
    //For this reason the event "processed_picture" was created to alert the application (ISearchEngine)
    computation(cnv, histcol, colorMom, eventP) {
        let ctx = cnv.getContext("2d");

        if (this.imgobj.complete) {
            console.log("Debug: N Time");
            ctx.drawImage(this.imgobj, 0, 0, this.imgobj.width, this.imgobj.height);
            let pixels =  ctx.getImageData(0, 0, this.imgobj.width, this.imgobj.height);
            //let pixels = Generate_Image(cnv);
            this.hist = histcol.count_Pixels(pixels);
            //this.build_Color_Rect(cnv, this.hist, histcol.redColor, histcol.greenColor, histcol.blueColor);
            this.color_moments = colorMom.moments(this.imgobj, cnv);
            document.dispatchEvent(eventP);

        } else {
            console.log("Debug: First Time");
            let self = this;
            this.imgobj.addEventListener('load', function () {
                ctx.drawImage(self.imgobj, 0, 0, self.imgobj.width, self.imgobj.height);
                let pixels =  ctx.getImageData(0, 0, self.imgobj.width, self.imgobj.height);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                //let pixels = Generate_Image(cnv);
                self.hist = histcol.count_Pixels(pixels);
                console.log("hist" +  self.hist)
                //self.build_Color_Rect(cnv, self.hist, histcol.redColor, histcol.greenColor, histcol.blueColor);
                self.color_moments = colorMom.moments(self.imgobj, cnv);
                document.dispatchEvent(eventP);
            }, false);
        }
    }

    //method used for debug. It shows the color and the correspondent number of pixels obtained by
    //the colorHistogram algorithm
    build_Color_Rect (cnv, hist, redColor, greenColor, blueColor) {
        let ctx = canvas.getContext("2d");
        let text_y = 390;
        let rect_y = 400;
        let hor_space = 80;

        ctx.font = "12px Arial";
        for (let c = 0; c < redColor.length; c++) {
            ctx.fillStyle = "rgb(" + redColor[c] + "," + greenColor[c] + "," + blueColor[c] + ")";
            ctx.fillRect(c * hor_space, rect_y, 50, 50);
            if (c === 8) {
                ctx.fillStyle = "black";
            }
            ctx.fillText(hist[c], c * hor_space, text_y);
        }
    }

    setPosition (px, py) {
        this.posx = px;
        this.posy = py;
    }

    mouseOver(mx, my) {
        if ((mx >= this.posx) && (mx <= (this.posx + this.w)) && (my >= this.posy) && (my <= (this.posy + this.h))) {
            return true;
        }
        return false;
    }

}


//Class to compute the Color Histogram algorithm. It receives the colors and computes the histogram
//through the method count_Pixels()
class ColorHistogram {
    constructor(redColor, greenColor, blueColor) {
        this.redColor = redColor;
        this.greenColor = greenColor;
        this.blueColor = blueColor;
        this.limiar1 = 160;
        this.limiar2 = 70;
    }

    count_Pixels (pixels) {
        let hist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let npixels = pixels.data.length/4;

        for (let i = 0; i < npixels ; i++){
            let rp = pixels.data[0 + (4*i)];
            let gp = pixels.data[1 + (4*i)];
            let bp = pixels.data[2 + (4*i)];

            for (let c = 0; c < this.redColor.length ; c++){
                let distR = Math.abs(this.redColor[c] - rp);
                let distG = Math.abs(this.greenColor[c] - gp);
                let distB = Math.abs(this.blueColor[c] - bp);
                let manDist = distR + distG + distB;
                
                if (manDist < this.limiar1 && distR < this.limiar2 && distG < this.limiar2 && distB < this.limiar2) hist[c] += 1;
            }
        }

        hist = hist.map((pixel) => pixel/npixels)
        return hist;
    }
}


//Class to compute the Color Moments algorithm. It computes the statistics moments
//through the method moments(). The moments are computed in the HSV color space. The method rgdToHsv is used
//to translate the pixel into the HSV color space
class ColorMoments {
    constructor() {
        this.h_block = 3;
        this.v_block = 3;
    }

    rgbToHsv (rc, gc, bc) {
        let r = rc / 255;
        let g = gc / 255;
        let b = bc / 255;

        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let h = null, s = null, v = max;

        let dif = max - min;
        s = max == 0 ? 0 : dif / max;

        if (max == min) {
            h = 0;
        } else {
            switch (max) {
                case r:
                    h = (g - b) / dif + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / dif + 2;
                    break;
                case b:
                    h = (r - g) / dif + 4;
                    break;
            }
            h /= 6;
        }
        return [h, s, v];
    }
    
    moments (imgobj, cnv) {
        let wBlock = Math.floor(imgobj.width / this.h_block);
        let hBlock = Math.floor(imgobj.height / this.v_block);
        let n = wBlock * hBlock;
        let descriptor = [];

        let ctx = cnv.getContext("2d");
        ctx.drawImage(imgobj, 0, 0);

        for (let x = 0 ; x < 3 ; x++){
            for (let y = 0 ; y < 3 ; y++){
                let componenteH = 0;
                let componenteV = 0;
                let componenteS = 0;
                let pixels =  ctx.getImageData(wBlock * x, hBlock * y, wBlock, hBlock);
                
                for (let i = 0; i < n ; i++){
                    let rp = pixels.data[0 + (4*i)];
                    let gp = pixels.data[1 + (4*i)];
                    let bp = pixels.data[2 + (4*i)];

                    let hsv = this.rgbToHsv(rp, gp, bp);
                    componenteH += hsv[0];
                    componenteV += hsv[1];
                    componenteS += hsv[2];
                }

                // Total / n amostras
                let mediaH = componenteH/n;
                let mediaV = componenteV/n;
                let mediaS = componenteS/n;

                let varianciasH = 0;
                let varianciasS = 0;
                let varianciasV = 0;

                for (let i = 0; i < n ; i++){
                    let rp = pixels.data[0 + (4*i)];
                    let gp = pixels.data[1 + (4*i)];
                    let bp = pixels.data[2 + (4*i)];

                    let hsv = this.rgbToHsv(rp, gp, bp);
                    // cálculo pela fórmula
                    varianciasH += (hsv[0] - mediaH)**2;
                    varianciasS += (hsv[1] - mediaS)**2;
                    varianciasV += (hsv[2] - mediaV)**2;
                }

                // divisão pelo número de amostras
                let varianciaH = varianciasH/n;
                let varianciaS = varianciasS/n;
                let varianciaV = varianciasV/n;

                descriptor.push(mediaH, varianciaH, mediaS, varianciaS, mediaV, varianciaV);
            }
        }
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        return descriptor;
    }
}





