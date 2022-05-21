'use strict';

class ISearchEngine {
    constructor(dbase) {
        this.allpictures = new Pool(3000);
        this.shownImages = []
        this.colors = ["red", "orange", "yellow", "green", "Blue-green", "blue", "purple", "pink", "white", "grey", "black", "brown"];
        this.redColor   = [204, 251, 255, 0, 3, 0, 118, 255, 255, 153, 0, 136];
        this.greenColor = [0, 148, 255, 204, 192, 0, 44, 152, 255, 153, 0, 84];
        this.blueColor  = [0, 11, 0, 0, 198, 255, 167, 191, 255, 153, 0, 24];
        this.validsearches = ['beach', 'birthday', 'face', 'indoor', 'artificial', 'manmade', 'urban', 'marriage', 'nature', 'no people', 'outdoor', 'party', 'people', 'snow']
        this.categories    = ["beach", "birthday", "face", "indoor", "manmade/artificial", "manmade/manmade","manmade/urban", "marriage", "nature", "no_people", "outdoor", "party", "people", "snow"];
        this.XML_file = dbase;
        this.XML_db = new XML_Database();
        this.LS_db = new LocalStorageXML();
        this.num_Images = 100;
        this.numshownpic = 35;
        this.imgWidth = 190;
        this.imgHeight = 140;
        this.lastSearches = [];
        this.memoryPos = -1;
        this.displayedImage = null;
        this.clickable = false;
    }

    init(cnv) {
        this.databaseProcessing(cnv);
        let myaudio = document.getElementById("audioID");
        myaudio.play(); 
    }

    // method to build the database which is composed by all the pictures organized by the XML_Database file
    // At this initial stage, in order to evaluate the image algorithms, the method only compute one image.
    // However, after the initial stage the method must compute all the images in the XML file
    databaseProcessing (cnv) {
        let h12color = new ColorHistogram(this.redColor, this.greenColor, this.blueColor);
        let colmoments = new ColorMoments();
        let allImages = []

        for (let cat = 0 ; cat < this.categories.length ; cat++) {
            let xml    = this.XML_db.loadXMLfile(this.XML_file);
            let search = this.XML_db.SearchXML(this.categories[cat], xml, 1000);
            for (let img = 0 ; img < search.length ; img++){
                let imagem = new Picture(0, 0, 150, 150, search[img], this.categories[cat]); 
                allImages.push(imagem)
            }
        }

        for (let img = 0 ; img < allImages.length ; img++) {
                let imagem = allImages[img];
                let eventname = "processed_picture_" + imagem.impath;
                let eventP = new Event(eventname);
                let self = this;
                document.addEventListener(eventname, function(){
                    self.imageProcessed(imagem, eventname);
                },false);
                imagem.computation(cnv, h12color, colmoments, eventP);
        }
    }

    //When the event "processed_picture_" is enabled this method is called to check if all the images are
    //already processed. When all the images are processed, a database organized in XML is saved in the localStorage
    //to answer the queries related to Color and Image Example
    imageProcessed (img, eventname) {
        this.allpictures.insert(img);
        console.log("Image Processed: " + this.allpictures.stuff.length + " Event: " + eventname);
        if (this.allpictures.stuff.length === (this.num_Images * this.categories.length)) {
            this.createXMLColordatabaseLS();
            this.createXMLIExampledatabaseLS();
        }
    }

    //Method to create the XML database in the localStorage for color queries
    createXMLColordatabaseLS() {
        for (let cat = 0 ; cat < this.categories.length ; cat++){
            let coloredPictures = [];
            let entrada = "<images>";

            for (let img = 0 ; img < this.allpictures.stuff.length ; img++){
                if(this.allpictures.stuff[img].category === this.categories[cat]) coloredPictures.push(this.allpictures.stuff[img]);
            }
            for (let cor = 0 ; cor < this.colors.length ; cor++) {
                this.sortbyColor(cor, coloredPictures);
                for (let img = 0 ; img < 30 ; img++){
                    entrada += "<image class='" + this.colors[cor] + "'><path>" + coloredPictures[img].impath + "</path></image>"
                }
            }
            entrada += "</images>";
            this.LS_db.saveLS_XML(this.categories[cat], entrada);    
        } 
    }
    
    //Method to create the XML database in the localStorage for Image Example queries
    createXMLIExampledatabaseLS() {
        this.zscoreNormalization();

        for (let img = 0 ; img < this.allpictures.stuff.length ; img++){
            let similarPictures = [];
            let entrada = "<images>";

            for (let i = 0 ; i < this.allpictures.stuff.length ; i++){
                similarPictures.push({
                    dist: this.calcManhattanDist(this.allpictures.stuff[img], this.allpictures.stuff[i]), 
                    imgPath: this.allpictures.stuff[i].impath
                });
            }

            this.sortbyManhattanDist(img, similarPictures)
            for (let sim = 0 ; sim < 30 ; sim++){
                entrada += "<image class='Manhattan'><path>" + similarPictures[sim].imgPath + "</path></image>"
            }
            entrada += "</images>";
            console.log(this.allpictures.stuff[img].impath)
            this.LS_db.saveLS_XML(this.allpictures.stuff[img].impath, entrada);    
        }

        document.getElementById("loadingpage").style.display='none';
        document.getElementById("main-page").style.display='block';
    }

    //A good normalization of the data is very important to look for similar images. This method applies the
    // zscore normalization to the data
    zscoreNormalization() {
        let overall_mean = [];
        let overall_std = [];

        // Inicialization
        for (let i = 0; i < this.allpictures.stuff[0].color_moments.length; i++) {
            overall_mean.push(0);
            overall_std.push(0);
        }

        // Mean computation I
        for (let i = 0; i < this.allpictures.stuff.length; i++) {
            for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
                overall_mean[j] += this.allpictures.stuff[i].color_moments[j];
            }
        }

        // Mean computation II
        for (let i = 0; i < this.allpictures.stuff[0].color_moments.length; i++) {
            overall_mean[i] /= this.allpictures.stuff.length;
        }

        // STD computation I
        for (let i = 0; i < this.allpictures.stuff.length; i++) {
            for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
                overall_std[j] += Math.pow((this.allpictures.stuff[i].color_moments[j] - overall_mean[j]), 2);
            }
        }

        // STD computation II
        for (let i = 0; i < this.allpictures.stuff[0].color_moments.length; i++) {
            overall_std[i] = Math.sqrt(overall_std[i]/this.allpictures.stuff.length);
        }

        // zscore normalization
        for (let i = 0; i < this.allpictures.stuff.length; i++) {
            for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
                this.allpictures.stuff[i].color_moments[j] = (this.allpictures.stuff[i].color_moments[j] - overall_mean[j]) / overall_std[j];
            }
        }
    }

    
    writeKeyword(category){
        category = document.getElementById("textfield").value = category;
    }
    
    changeMenu(){
        this.clickable = true;
        document.getElementById("main-page").style.left = '510px';
        document.getElementById("main-page").style.top  = '40px';
        document.getElementById("main-page").style.backgroundColor  = 'white';
        document.getElementById("textfield").style.color  = '#dbc5b0';
        document.getElementById("lupa").style.color = 'white';
        document.getElementById("lupa").style.backgroundColor  = '#cd5959';
        document.getElementById("palete").style.color  = 'white';
        document.getElementById("palete").style.backgroundColor  = '#cd5959';
        document.getElementById("upper-menu").style.display = 'block';
        document.getElementById("music").style.display = 'block';
        document.getElementById("next").style.display = 'flex';
        document.getElementById("previous").style.display = 'flex';
        document.getElementById("header1").style.left = '18px';
        document.getElementById("header1").style.top  = '19px';
        document.getElementById("header1").style.fontSize = '36px'

        let x = document.getElementsByClassName("upper-color-choice");
        let y = document.getElementsByClassName("color-choice");
        for (let i = 0 ; i < x.length ; i++){
            x[i].style.display = 'inline'
            y[i].style.display = 'none'
        }

    }
    
    mainMenu(){
        this.clickable = false;
        document.getElementById("main-page").style.left = '50%';
        document.getElementById("main-page").style.top  = '50%';
        document.getElementById("main-page").style.backgroundColor  = '#cd5959';
        document.getElementById("textfield").style.color  = '#dbc5b0';
        document.getElementById("lupa").style.backgroundColor  = '#cd5959';
        document.getElementById("lupa").style.color  = 'white';
        document.getElementById("palete").style.backgroundColor  = '#cd5959';
        document.getElementById("palete").style.color  = 'white';
        document.getElementById("upper-menu").style.display = 'none';
        document.getElementById("music").style.display = 'none';
        document.getElementById("next").style.display = 'none';
        document.getElementById("previous").style.display = 'none';
        document.getElementById("header1").style.left = '32%';
        document.getElementById("header1").style.top  = '160px';
        document.getElementById("header1").style.fontSize = '75px'

        let y = document.getElementsByClassName("upper-color-choice");
        let x = document.getElementsByClassName("color-choice");
        for (let i = 0 ; i < x.length ; i++){
            x[i].style.display = ''
            y[i].style.display = 'none'
        }
        
        let canvas = document.querySelector("canvas");
        let context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        this.lastSearches = []
    }

    //Method to search images based on a selected color
    searchColor(category, color) {
        if (category === 'search') {
            category = document.getElementById("textfield").value;
            if (!this.validsearches.includes(category.toLowerCase())) return;
            category = this.categories[this.validsearches.indexOf(category.toLowerCase())]
        } 
        this.changeMenu();
        if (this.memoryPos != this.lastSearches.length - 1) {
            this.lastSearches.splice(this.memoryPos + 1)
        }
        
        let search = this.LS_db.readLS_XML(category);
        let matchingColor = search.getElementsByClassName(color);

        this.shownImages = [];
        let memory = []
        for (let i = 0 ; i < matchingColor.length ; i++){
            for (let j = 0 ; j < this.allpictures.stuff.length ; j++){
                if (this.allpictures.stuff[j].impath === matchingColor[i].textContent){
                    let img = this.allpictures.stuff[j];
                    this.shownImages.push(img);
                    memory.push(img)
                    break;
                }
            }
        }
        this.lastSearches.push(memory)
        this.memoryPos = this.lastSearches.length - 1;
        let canvas = document.querySelector("canvas");
        this.gridView(canvas);
    }
    
    //Method to search images based on keywords
    searchKeywords(category) {
        if (category === 'search') {
            category = document.getElementById("textfield").value;
            if (!this.validsearches.includes(category.toLowerCase())) return;
            category = this.categories[this.validsearches.indexOf(category.toLowerCase())]
        } 

        this.changeMenu();
        if (this.memoryPos != this.lastSearches.length - 1) {
            this.lastSearches.splice(this.memoryPos + 1)
        }

        let xml    = this.XML_db.loadXMLfile(this.XML_file);
        let search = this.XML_db.SearchXML(category, xml, 30); 
        
        this.shownImages = [];
        let memory = []
        for (let i = 0 ; i < this.allpictures.stuff.length ; i++){
            if (this.allpictures.stuff[i].category === category && this.shownImages.length < 30){
                let img = this.allpictures.stuff[i];   
                this.shownImages.push(img);
                memory.push(img)
            }
        }

        this.lastSearches.push(memory)
        this.memoryPos = this.lastSearches.length - 1;
        let canvas = document.querySelector("canvas");

        console.log(this.lastSearches);

        this.gridView(canvas);
    }

    //Method to search images based on Image similarities
    searchISimilarity(IExample, dist) {
        let search = this.LS_db.readLS_XML(IExample.impath);
        let similarImages = search.getElementsByClassName("Manhattan");
        this.shownImages = [];

        if (this.memoryPos != this.lastSearches.length - 1) {
            this.lastSearches.splice(this.memoryPos + 1)
        }

        let memory = []


        for (let i = 0 ; i < similarImages.length ; i++){
            for (let j = 0 ; j < this.allpictures.stuff.length ; j++){
                if (this.allpictures.stuff[j].impath === similarImages[i].textContent){
                    let img = this.allpictures.stuff[j];
                    this.shownImages.push(img);
                    memory.push(img)
                    break;
                }
            }
        }

        this.lastSearches.push(memory)
        this.memoryPos = this.lastSearches.length - 1;
        let canvas = document.querySelector("canvas");
        this.gridView(canvas);
    }

    //Method to compute the Manhattan difference between 2 images which is one way of measure the similarity
    //between images.
    calcManhattanDist(img1, img2){
        let manhattan = 0;
        for(let i=0; i < img1.color_moments.length; i++){
            manhattan += Math.abs(img1.color_moments[i] - img2.color_moments[i]);
        }
        manhattan /= img1.color_moments.length;
        return manhattan;
    }

    //Method to sort images according to the Manhattan distance measure
    sortbyManhattanDist(idxdist,list){
        list.sort(function (a, b) {
            return a.dist - b.dist;
        });
    }

    //Method to sort images according to the number of pixels of a selected color
    sortbyColor (idxColor, list) {
        list.sort(function (a, b) {
            return b.hist[idxColor] - a.hist[idxColor];
        });
    }

    selectImage(mx, my) {
       if (!this.clickable) return;
       for (let i = 0 ; i < this.shownImages.length ; i++){
           if (this.shownImages[i].mouseOver(mx, my)) {
               document.getElementById("shownimage").style.display = 'block';
               document.getElementById("selected").src = this.shownImages[i].impath;
               document.getElementById("download").href = this.shownImages[i].impath;
               let left = 910 - ((1024 - this.shownImages[i].original_w)*0.50);
               document.getElementById("close").style.left = left + 'px' ;
               document.getElementById("download").style.left = left + 'px' ;
               document.getElementById("similar").style.left = left + 'px' ;
               this.displayedImage = this.shownImages[i];
               break;
            }
       }
    }

    searchSimilar(){
        this.searchISimilarity(this.displayedImage);
        this.close();
    }

    moveImage(where){
        let index = 0;
        let nextIndex = 0;

        for (let i = 0 ; i < this.shownImages.length ; i++){
            if (this.shownImages[i] == this.displayedImage) {
                index = i; 
            }
        }

        if (where === 'next'){
            if (index == this.shownImages.length-1) nextIndex = 0;
            else nextIndex = index+1;
        }
        if (where === 'previous'){
            if (index == 0) nextIndex = this.shownImages.length-1;
            else nextIndex = index-1;
        }

        document.getElementById("shownimage").style.display = 'block';
        document.getElementById("selected").src = this.shownImages[nextIndex].impath;
        document.getElementById("download").href = this.shownImages[nextIndex].impath;
        console.log(this.shownImages[nextIndex])
        let left = 910 - ((1024 - this.shownImages[nextIndex].original_w)*0.50);
        console.log(left)
        document.getElementById("close").style.left = left + 'px' ;
        document.getElementById("download").style.left = left + 'px' ;
        document.getElementById("similar").style.left = left + 'px' ;
        this.displayedImage = this.shownImages[nextIndex];
    }

    close(){
        document.getElementById("shownimage").style.display = 'none';
        this.displayedImage = null;
    }
    
    searchMemory(time) {
        let canvas = document.querySelector("canvas");
        this.gridView(canvas);
        if(time === 'previous' && this.memoryPos > 0) {
            this.memoryPos -= 1;
            this.shownImages = this.lastSearches[this.memoryPos]
            this.gridView(canvas)
        }
        if(time === 'next' && this.memoryPos < this.lastSearches.length-1) {
            this.memoryPos += 1;
            this.shownImages = this.lastSearches[this.memoryPos]
            this.gridView(canvas)
        }
    }

    //Method to visualize images in canvas organized in columns and rows
    gridView (canvas) {
        let context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        let x = 10;
        let y = 90;
        let prox = 0;
        
        for (let i = 0 ; i < this.shownImages.length ; i++){
            let imagem = this.shownImages[i]
            if (x + imagem.w > 1500) {y += 150 + 15; prox = i;}

            if (i === prox) {
                let sumW = this.shownImages[i].w;
                let ioffset = 1;
                while (ioffset + i < this.shownImages.length && sumW + this.shownImages[i+ioffset].w <= 1500 - 10)  {
                    sumW += this.shownImages[i+ioffset].w + 10;
                    ioffset++;
                } 
                x = (1500 - 10 - sumW)/2
            }

            imagem.setPosition(x, y);
            imagem.draw(canvas);                           
            x += imagem.w + 10;
        }
    }
}


class Pool {
    constructor (maxSize) {
        this.size = maxSize;
        this.stuff = [];

    }

    insert (obj) {
        if (this.stuff.length < this.size) {
            this.stuff.push(obj);
        } else {
            alert("The application is full: there isn't more memory space to include objects");
        }
    }

    remove () {
        if (this.stuff.length !== 0) {
            this.stuff.pop();
        } else {
           alert("There aren't objects in the application to delete");
        }
    }


    empty_Pool () {
        while (this.stuff.length > 0) {
            this.remove();
        }
    }
}

