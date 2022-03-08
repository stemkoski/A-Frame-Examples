
// uses custom components "controller-listener" and "raycaster-extras" 
//   to detect trigger pressed and hover status to activate buttons

AFRAME.registerComponent("music-player", {

    schema:
    {
        controllerListenerId:  {type: 'string',  default: "#controller-data"},
        musicDataVariableName: {type: 'string',  default: "MusicData"},
    },

    init: function () 
    {
        this.controllerData = document.querySelector(this.data.controllerListenerId).components["controller-listener"];

        // set up the physical entity
        this.base = document.createElement("a-entity");
        this.base.setAttribute("geometry", 
         { primitive: "box", width: 2.20, height: 1.80, depth: 0.04 } );
        this.base.setAttribute("material", {color: "#111111"});
        this.base.setAttribute("raycaster-target", "canGrab: true;" );
        // add component
        this.el.setAttribute("sound", {positional: false, volume: 0.50});
        this.el.appendChild(this.base);

        // add another box to frame button controls
        let buttonBase = document.createElement("a-entity");
        buttonBase.setAttribute("geometry", 
         { primitive: "box", width: 1.999, height: 0.20, depth: 0.04 } );
        buttonBase.setAttribute("material", {color: "#444444"});
        buttonBase.setAttribute("position", {x: 0, y: -0.70, z: 0.01});
        this.base.appendChild(buttonBase);

        // add the buttons

        function initButton(materialSrc, posX, posY, posZ)
        {
            let button = document.createElement("a-entity");
            button.setAttribute("geometry", 
              { primitive: "box", width: 0.16, height: 0.16, depth: 0.04 } );
            button.setAttribute("material", "color", "#EEEEEE");
            button.setAttribute("material", "src", materialSrc);        
            button.setAttribute("position", {x: posX, y: posY, z: posZ});
            button.setAttribute("raycaster-target", "");
            return button;
        }

        this.previousButton = initButton("#iconPrevious", -0.90, 0, 0.01);
        buttonBase.appendChild( this.previousButton );
        this.replayButton = initButton("#iconReplay", -0.70, 0, 0.01);
        buttonBase.appendChild( this.replayButton );
        this.playButton = initButton("#iconPlay", -0.50, 0, 0.01);
        buttonBase.appendChild( this.playButton );
        this.nextButton = initButton("#iconNext", -0.30, 0, 0.01);
        buttonBase.appendChild( this.nextButton );

        this.playOnceButton = initButton("#iconPlayOnce",  0.00, 0, 0.01);
        buttonBase.appendChild( this.playOnceButton );
        this.playLoopButton = initButton("#iconPlayLoop",  0.20, 0, 0.01);
        buttonBase.appendChild( this.playLoopButton );
        this.playAllButton = initButton("#iconPlayAll",  0.40, 0, 0.01);
        buttonBase.appendChild( this.playAllButton );

        this.volumeDownButton = initButton("#iconVolumeDown", 0.70, 0, 0.01);
        buttonBase.appendChild( this.volumeDownButton );
        this.volumeUpButton = initButton("#iconVolumeUp", 0.90, 0, 0.01);
        buttonBase.appendChild( this.volumeUpButton );

        // create text area to display music information
        this.textArea = document.createElement("a-entity");
        this.textArea.setAttribute("geometry", 
          { primitive: "plane", width: 2, height: 0.2 } );
        this.textArea.setAttribute("material",
          { color: "#000000" } );
        this.textArea.setAttribute("text",
          { anchor: "center", baseline: "center", wrapCount: 40,
            color: "#8888FF", value: "" } );
        this.textArea.setAttribute("position", {x: 0, y: -0.50, z: 0.03});
        this.base.appendChild(this.textArea);

        // create area to display image art
        this.imageArea = document.createElement("a-entity");
        this.imageArea.setAttribute("geometry", 
          { primitive: "plane", width: 2, height: 1.2 } );
        // adding some emission so image can be seen more easily
        this.textArea.setAttribute("material", { emissive: "#222222" } );
        // images should be approximately 900 x 500
        this.imageArea.setAttribute("position", {x: 0, y: 0.20, z: 0.04});
        this.base.appendChild(this.imageArea);

        // "once" || "loop" || "all"
        this.setPlayMode("once");

        let self = this;

        this.el.addEventListener("sound-loaded", function(event) {
            // change "loading music..." to song name 
            self.textArea.setAttribute("text", "value", 
            self.musicDataList[self.musicDataIndex].songText );

            // automatically start music after loading
            self.playMusic();
        });

        this.el.addEventListener("sound-ended", function(event) {
            // self.playMode determines what happens when a song is finished
            if (self.playMode == "once")
                self.stopMusic();
            else if (self.playMode == "loop")
                self.playMusic();                  
            else if (self.playMode == "all")
                self.next();                    
        });

        // load music data from external variable
        this.musicDataList = window[this.data.musicDataVariableName]
        this.musicDataIndex = 0;
        this.buttonIcon = "wait";
        this.loadMusic( this.musicDataIndex );
    },

    loadMusic: function(index)
    {
        this.imageArea.setAttribute("material", "src", 
            "url(" + this.musicDataList[index].imageURL + ")" );

        this.el.setAttribute("sound", "src", 
            "url(" + this.musicDataList[index].audioURL + ")" );

        // while loading music:
        this.textArea.setAttribute("text", "value", " . . . music loading . . . ");

        // change play button icon to Wait
        this.playButton.setAttribute("material", "src", "#iconWait");
        this.buttonIcon = "wait";

        // used by event listener
        this.musicDataIndex = index;
    },

    playMusic: function()
    {
        this.el.components["sound"].playSound();
        this.playButton.setAttribute("material", "src", "#iconPause");
        this.buttonIcon = "pause";
    },

    pauseMusic: function()
    {
        this.el.components["sound"].pauseSound();
        this.playButton.setAttribute("material", "src", "#iconPlay");
        this.buttonIcon = "play";
    },

    stopMusic: function()
    {
        this.el.components["sound"].stopSound();
        this.playButton.setAttribute("material", "src", "#iconPlay");
        this.buttonIcon = "play";
    },

    replay: function()
    {
        this.stopMusic();
        this.playMusic();
    },

    next: function()
    {
        this.stopMusic();
        this.musicDataIndex++;
        if (this.musicDataIndex == this.musicDataList.length)
            this.musicDataIndex = 0;
        this.loadMusic( this.musicDataIndex );
    },

    previous: function()
    {
        this.stopMusic();
        this.musicDataIndex--;
        if (this.musicDataIndex == -1)
            this.musicDataIndex = this.musicDataList.length - 1;
        this.loadMusic( this.musicDataIndex );
    },

    changeVolume: function(amount)
    {
        let volume = this.el.getAttribute("sound").volume;
        volume += amount;
        if (volume < 0)
            volume = 0;
        if (volume > 1)
            volume = 1;
        this.el.setAttribute("sound", "volume", volume);
    },

    setPlayMode: function(mode)
    {
        this.playMode = mode;
        this.playOnceButton.setAttribute("material", "color", "#888888");  
        this.playLoopButton.setAttribute("material", "color", "#888888");  
        this.playAllButton.setAttribute("material", "color", "#888888"); 
        if (mode == "once")
            this.playOnceButton.setAttribute("material", "color", "#FFFF00");  
        else if (mode == "loop")
            this.playLoopButton.setAttribute("material", "color", "#FFFF00");  
        else if (mode == "all")
            this.playAllButton.setAttribute("material", "color", "#FFFF00"); 
    },

    tick: function()
    {
    
        if (this.controllerData.rightTrigger.pressed)
        {
            if ( this.buttonIcon == "wait" )
            {
                // song loading in process; can not play song or skip ahead;
                //   just wait patiently...
            }
            // determine which button was clicked (if any)
            else if ( this.playButton.components["raycaster-target"].hasFocus )
            {
                if ( this.buttonIcon == "play" )
                    this.playMusic();
                else if ( this.buttonIcon == "pause" ) 
                    this.pauseMusic();
            }
            else if ( this.replayButton.components["raycaster-target"].hasFocus )
                this.replay();
            else if ( this.nextButton.components["raycaster-target"].hasFocus )
                this.next();
            else if ( this.previousButton.components["raycaster-target"].hasFocus )
                this.previous();
            else if ( this.volumeDownButton.components["raycaster-target"].hasFocus )
                this.changeVolume(-0.10);
            else if ( this.volumeUpButton.components["raycaster-target"].hasFocus )
                this.changeVolume(0.10);
            else if ( this.playOnceButton.components["raycaster-target"].hasFocus )
                this.setPlayMode("once");
            else if ( this.playLoopButton.components["raycaster-target"].hasFocus )
                this.setPlayMode("loop");
            else if ( this.playAllButton.components["raycaster-target"].hasFocus )
                this.setPlayMode("all");
        }

    } // end of tick()

});
