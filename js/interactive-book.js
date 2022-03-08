AFRAME.registerComponent("interactive-book", {

    schema:
    {
        fileName:              {type: 'string',  default: "assets/wonderland.pdf"},
        bookHeight:            {type: 'float',   default: 1.0},
        pageWidth:             {type: 'float',   default: 646},
        pageHeight:            {type: 'float',   default: 968},
        coverColor:            {type: 'color',   default: "#EEEEFF"},
        coverText:             {type: 'string',  default: "Title Text"},
        coverTextColor:        {type: 'color',   default: "#000337"},

        // need to listen for control input to enable on trigger press, and map controller actions to gamepad-model
        controllerListenerId:  {type: 'string', default: "#controller-data"},
        // need to disable player movement when displaying controller actions on gamepad-model
        playerMoveId:          {type: 'string', default: "#player"},
    },

    init: function () 
    {
        this.bookWidth = this.data.bookHeight * this.data.pageWidth / this.data.pageHeight;
        this.pageDepth = 0.01;
   
        // cover slightly larger than pages
        let margin = 0.04;

        // convert this to a grabbable back cover for book
        this.backCover = document.createElement("a-entity");
        this.backCover.setAttribute("geometry",
          { primitive: "box", width: this.bookWidth + margin, height: this.data.bookHeight + margin, depth: this.pageDepth + 0.01 } );
        this.backCover.setAttribute("material", { color: this.data.coverColor });
        this.backCover.setAttribute("raycaster-target", "canGrab: true;");
        this.el.appendChild(this.backCover);

        // cylinder along book center
        this.spine = document.createElement("a-entity");
        this.spine.setAttribute("geometry",
          { primitive: "cylinder", height: this.data.bookHeight + margin, radius: 4*this.pageDepth } );
        this.spine.setAttribute("material", { color: this.data.coverColor });
        this.spine.setAttribute("position", {x: -this.bookWidth/2, y:0, z:0} );
        this.backCover.appendChild(this.spine);

        // attach mesh at an offset for correct pivot point when rotating front cover
        this.frontCover = document.createElement("a-entity");
        this.frontCover.setAttribute("position", {x: -this.bookWidth/2, y:0, z:0} );
        this.frontCoverBox = document.createElement("a-entity");
        this.frontCoverBox.setAttribute("geometry",
          { primitive: "box", width: this.bookWidth + margin, height: this.data.bookHeight + margin, depth: this.pageDepth + 0.01 } );
        this.frontCoverBox.setAttribute("material", { color: this.data.coverColor });
        this.frontCoverBox.setAttribute("position", {x: this.bookWidth/2, y:0, z:0} );
        this.frontCover.appendChild(this.frontCoverBox);
        this.backCover.appendChild(this.frontCover);

        let self = this;

        // make entire cover glow on hover
        this.backCover.addEventListener("raycaster-intersected", function(event)
            { 
                self.backCover.setAttribute("material", "emissive", "#444444");
                self.spine.setAttribute("material", "emissive", "#444444");
                self.frontCoverBox.setAttribute("material", "emissive", "#444444");
            } 
        );
        this.backCover.addEventListener("raycaster-intersected-cleared", function(event)
            { 
                self.backCover.setAttribute("material", "emissive", "#000000");
                self.spine.setAttribute("material", "emissive", "#000000");
                self.frontCoverBox.setAttribute("material", "emissive", "#000000");
            } 
        );

        // create an entity to display book title text
        this.frontCoverText = document.createElement("a-entity");
        this.frontCoverText.setAttribute("position", {x: 0.04, y:0, z:0.02} );
        this.frontCoverText.setAttribute("text",
          { anchor: "center", align: "center", baseline: "center", color: this.data.coverTextColor,
            width: this.bookWidth - 0.04, height: this.data.bookHeight, 
            wrapCount: 16, // wrapCount indirectly controls font size
            value: this.data.coverText } );
        this.frontCoverBox.appendChild(this.frontCoverText);
        
        // convenience functions for rotating front cover
        this.frontCover.angle = 0;
        this.frontCover.setAngle = function(angle)
        { 
            self.frontCover.angle = angle;
            self.frontCover.setAttribute("rotation", {x:0, y:angle, z:0} );
        };
        this.frontCover.setAngle(-10);

        this.bookPageArray = []; 

        this.pdf = null;
        this.pdfPageCount = null;

        pdfjsLib.GlobalWorkerOptions.workerSrc = "js/pdf.worker.js";

        pdfjsLib.getDocument(this.data.fileName).promise.then(
            (pdf) => 
            { 
                self.pdf = pdf; 
                self.pdfPageCount = pdf.numPages;

                self.createBookPage(0);
                self.createBookPage(1);
                self.createBookPage(2);
                self.createBookPage(3);
                // initialize book positions
                self.flip("close");
            } 
        );
 
        // rotation angles for fron cover and pages
        this.angleCoverOpen = -160;
        this.anglePageA = -155;
        this.anglePageB = -150;
        this.anglePageC = -10;
        this.anglePageD = -5;

        this.leftBottomPageIndex = 0;

        this.flipInProgress = false;
        this.flipType = "left";
        this.flipTime = 0;
        this.clock = new THREE.Clock();

        // use quest controllers to interact with book
        this.controllerData = document.querySelector(this.data.controllerListenerId).components["controller-listener"];
        // player-move is disabled when interacting with book
        this.playerMoveControls = document.querySelector(this.data.playerMoveId).components["player-move"];
        
        // must use Quest right trigger ("click") to enable interactions 
        this.enabled = false;
        // if not yet first opened, open on first trigger click
        this.firstOpen = false;
        // light to indicate enabled status
        this.enabledLight = document.createElement("a-entity");
        this.enabledLight.setAttribute("geometry",
          { primitive: "sphere", radius: 4*this.pageDepth } );
        this.enabledLight.setAttribute("material", { color: "#444444", emissive: "#BB0000" });
        this.enabledLight.setAttribute("position", {x: 0, y:this.data.bookHeight/2 + margin, z:0} );
        this.spine.appendChild(this.enabledLight);
    },

    // create a "book page" object: a box with two planes attached, 
    //   each of which has a canvas-based material to render PDF pages
    createBookPage(bookPageNumber)
    {
        let bookPage = {};
        
        bookPage.number = bookPageNumber; // index of object in bookPageArray; = 0,1,2,3
        bookPage.frontPageNumber = 2 * bookPageNumber - 3;
        bookPage.backPageNumber  = 2 * bookPageNumber - 2;
        bookPage.angle = 0;

        // everything attaches to this (group) at an offset for correct pivot point when "flipping" pages
        bookPage.entity = document.createElement("a-entity");
        // offset this to align with backCover
        bookPage.entity.setAttribute("position", {x: -this.bookWidth/2, y:0, z:0} );
        this.backCover.appendChild(bookPage.entity);

        bookPage.setAngle = function(angle)
        { 
            bookPage.angle = angle;
            bookPage.entity.setAttribute("rotation", {x:0, y:angle, z:0} );
        };

        bookPage.rotateBy = function(deltaAngle)
        { 
            bookPage.angle += deltaAngle;
            bookPage.entity.setAttribute("rotation", {x:0, y:bookPage.angle, z:0} );
        };

        // page center
        let boxGeo = new THREE.BoxGeometry( this.bookWidth, this.data.bookHeight, this.pageDepth );
        let boxMat = new THREE.MeshLambertMaterial( {color: "#EEEEEE"} );
        let pageCenter = new THREE.Mesh( boxGeo, boxMat );
        pageCenter.position.set(this.bookWidth/2, 0, 0);
        bookPage.entity.object3D.attach( pageCenter );

        let frontCanvas = document.createElement("canvas");
        frontCanvas.setAttribute("id", "canvas" + bookPageNumber + "front");
        frontCanvas.setAttribute("width", this.data.pageWidth);
        frontCanvas.setAttribute("height", this.data.pageHeight);
        this.el.appendChild(frontCanvas);
        let frontTexture = new THREE.Texture(frontCanvas);
        // front page plane
        let planeGeo = new THREE.PlaneGeometry( this.bookWidth, this.data.bookHeight );
        let frontPlaneMat = new THREE.MeshBasicMaterial( {color: "#FFFFFF", map: frontTexture} );
        let frontPlane = new THREE.Mesh( planeGeo, frontPlaneMat );
        frontPlane.position.set(this.bookWidth/2, 0, this.pageDepth/2 + 0.005);
        bookPage.entity.object3D.attach( frontPlane );

        let backCanvas = document.createElement("canvas");
        backCanvas.setAttribute("id", "canvas" + bookPageNumber + "front");
        backCanvas.setAttribute("width", this.data.pageWidth);
        backCanvas.setAttribute("height", this.data.pageHeight);
        this.el.appendChild(backCanvas);
        let backTexture = new THREE.Texture(backCanvas);
        // back page plane
        let backPlaneMat = new THREE.MeshBasicMaterial( {color: "#FFFFFF", map: backTexture} );
        let backPlane = new THREE.Mesh( planeGeo, backPlaneMat );
        backPlane.position.set(this.bookWidth/2, 0, -this.pageDepth/2 - 0.005);
        backPlane.rotation.set(0, Math.PI, 0);
        bookPage.entity.object3D.attach( backPlane );

        let self = this;
        bookPage.render = function()
        {
            self.render(bookPage.frontPageNumber, frontCanvas, frontPlaneMat);
            self.render(bookPage.backPageNumber,  backCanvas,  backPlaneMat);
        };
        
        bookPage.render();

        this.bookPageArray[bookPageNumber] = bookPage;
    },

    render(pageNumber, canvas, material, scale=2)
    {

        if (this.pdf == null)
            return;

        let self = this;

        const context = canvas.getContext('2d');
        
        // pages out of range have canvas rendered with a solid color
        if (pageNumber < 1 || pageNumber > this.pdf.numPages)
        {
            context.fillStyle = "#CCCCCC";
            context.fillRect(0,0, this.data.pageWidth, this.data.pageHeight);
            material.map.needsUpdate = true;
            return;
        }

        this.pdf.getPage(pageNumber).then( function(page) {

            const pageViewport = page.getViewport({scale: scale});
            const context = canvas.getContext('2d');
                
            const renderTask = page.render({
                canvasContext: context,
                viewport: pageViewport
            });
                
            renderTask.promise.then( function() {
                material.map.needsUpdate = true;
            });
                
        });
    },

    // type: "left", "right", "open", or "close"
    flip: function(type)
    {
        // if currently flipping pages, do not start another flip
        if (this.flipInProgress)
            return;

        // if book is closed, flip left ==> flip open
        if (type == "left" && this.frontCover.angle > -20)
            type = "open";

        // no more pages to flip left
        if (type == "left" && 
            this.bookPageArray[(this.leftBottomPageIndex + 2) % 4].backPageNumber > this.pdf.numPages)
            return;

        // if the correct page number is 1, flip right ==> flip close
        if (type == "right" && 
            this.bookPageArray[(this.leftBottomPageIndex + 2) % 4].frontPageNumber == 1)
            type = "close";

        // if book is closed, flip right has no effect
        if (type == "right" && this.frontCover.angle > -20)
            return;

        this.flipInProgress = true;
        this.flipType = type;
        this.flipTime = 0;

        this.frontCover.startAngle = this.frontCover.angle;
        this.bookPageArray[0].startAngle = this.bookPageArray[0].angle;
        this.bookPageArray[1].startAngle = this.bookPageArray[1].angle;
        this.bookPageArray[2].startAngle = this.bookPageArray[2].angle;
        this.bookPageArray[3].startAngle = this.bookPageArray[3].angle;

        if (type == "open")
        {
            this.frontCover.endAngle       = this.angleCoverOpen;
            this.bookPageArray[0].endAngle = this.anglePageA;
            this.bookPageArray[1].endAngle = this.anglePageB;
            this.bookPageArray[2].endAngle = this.anglePageC;
            this.bookPageArray[3].endAngle = this.anglePageD;
        }
        else if (type == "close")
        {
            this.frontCover.endAngle       = -10;
            this.bookPageArray[0].endAngle = -8;
            this.bookPageArray[1].endAngle = -6;
            this.bookPageArray[2].endAngle = -4;
            this.bookPageArray[3].endAngle = -2;
        }
        else if (type == "left")
        {
            this.frontCover.endAngle = this.angleCoverOpen;
            this.bookPageArray[(this.leftBottomPageIndex + 0) % 4].endAngle = this.anglePageD;
            this.bookPageArray[(this.leftBottomPageIndex + 1) % 4].endAngle = this.anglePageA;
            this.bookPageArray[(this.leftBottomPageIndex + 2) % 4].endAngle = this.anglePageB;
            this.bookPageArray[(this.leftBottomPageIndex + 3) % 4].endAngle = this.anglePageC;

            // update pdf page numbers
            this.bookPageArray[this.leftBottomPageIndex].frontPageNumber += 8;
            this.bookPageArray[this.leftBottomPageIndex].backPageNumber  += 8;
            this.bookPageArray[this.leftBottomPageIndex].render();

            // immediately move left-bottom page to right-bottom angle
            this.bookPageArray[this.leftBottomPageIndex].startAngle = this.anglePageD;
            this.leftBottomPageIndex = (this.leftBottomPageIndex + 1) % 4;
        }
        else if (type == "right")
        {
            this.frontCover.endAngle = this.frontCover.angle;
            this.bookPageArray[(this.leftBottomPageIndex + 0) % 4].endAngle = this.anglePageB;
            this.bookPageArray[(this.leftBottomPageIndex + 1) % 4].endAngle = this.anglePageC;
            this.bookPageArray[(this.leftBottomPageIndex + 2) % 4].endAngle = this.anglePageD;
            this.bookPageArray[(this.leftBottomPageIndex + 3) % 4].endAngle = this.anglePageA;

            // update pdf page numbers
            this.bookPageArray[(this.leftBottomPageIndex + 3) % 4].frontPageNumber -= 8;
            this.bookPageArray[(this.leftBottomPageIndex + 3) % 4].backPageNumber  -= 8;
            this.bookPageArray[(this.leftBottomPageIndex + 3) % 4].render();        

            // immediately move right-bottom page to left-bottom angle
            this.bookPageArray[(this.leftBottomPageIndex + 3) % 4].startAngle = this.anglePageA;
            this.leftBottomPageIndex = (this.leftBottomPageIndex + 3) % 4;  // +3 == -1 (mod 4)
        }
    },

    lerp: function(startValue, endValue, percent)
    {
        return startValue + (endValue - startValue) * percent;
    },

    tick: function()
    {
        let deltaTime = this.clock.getDelta();
        
        if (!this.playerMoveControls)
            this.playerMoveControls = document.querySelector(this.data.playerMoveId).components["player-move"];

        if ( this.backCover.components["raycaster-target"].hasFocus && this.controllerData.rightTrigger.pressed )
        {
            // toggle book enabled value
            this.enabled = !this.enabled;
            this.playerMoveControls.enabled = !this.enabled;

            // change light indicator for book "on" / "off"
            if (this.enabled)
                this.enabledLight.setAttribute("material", "emissive", "#00BB00" );
            else
                this.enabledLight.setAttribute("material", "emissive", "#BB0000" );

            if (this.enabled && !this.firstOpen)
            {
                this.flip("open");
                this.firstOpen = true;
            }
        }

        if (this.flipInProgress)
        {
            this.flipTime += deltaTime;

            // opening and closing the book requires the front cover to move
            if (this.flipType == "open" || this.flipType == "close")
                this.frontCover.setAngle( this.lerp(
                    this.frontCover.startAngle, this.frontCover.endAngle, this.flipTime) );
        
            // turn all pages
            for (let i = 0; i < 4; i++)
            {
                let page = this.bookPageArray[i];
                page.setAngle( this.lerp(page.startAngle, page.endAngle, this.flipTime) )
            }

            if (this.flipTime >= 1)
                this.flipInProgress = false;
        }

        // user can only interact with book if it is enabled
        if ( !this.enabled )
            return;

        if (this.controllerData.buttonA.pressed ||
            this.controllerData.buttonX.pressed ||
            this.controllerData.leftAxisX  < -0.90 ||
            this.controllerData.rightAxisX < -0.90 )
            this.flip("left");

        if (this.controllerData.buttonB.pressed ||
            this.controllerData.buttonY.pressed ||
            this.controllerData.leftAxisX  > 0.90 ||
            this.controllerData.rightAxisX > 0.90 )
            this.flip("right");
    }
});
