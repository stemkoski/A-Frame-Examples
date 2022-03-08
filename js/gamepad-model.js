AFRAME.registerComponent('gamepad-model', {
    schema:
    {
        // need to listen for control input to enable on trigger press, and map controller actions to gamepad-model
        controllerListenerId: {type: 'string', default: "#controller-data"},
        // need to disable player movement when displaying controller actions on gamepad-model
        playerMoveId:         {type: 'string', default: "#player"},
        // get the plane where a game is being display, resize it to fit gamepad-model center box
        gameDisplayId:        {type: 'string', default: "#game-model-display"},
        // if set, use trigger on gamepad-model to enable BAGEL game
        bagelGameComponentId: {type: 'string', default: ""},
    },

    init: function()
    {
        this.controllerData     = document.querySelector(this.data.controllerListenerId).components["controller-listener"];
        this.playerMoveControls = document.querySelector(this.data.playerMoveId).components["player-move"];
        this.gameDisplay        = document.querySelector(this.data.gameDisplayId);

        this.bagelGameComponent = null;
        if (this.data.bagelGameComponentId != "")
            this.bagelGameComponent = document.querySelector(this.data.bagelGameComponentId).components["bagel-game-component"];

        // enabled: gamepad responds to controller input, player movement disabled
        this.enabled = false;

        let centerBoxWidth  = 0.667; 
        let centerBoxHeight = 0.500;
        let centerBoxDepth  = 0.050;
        let stickRadius = 0.070; // half this for knob radius, and also maximum offset
        let buttonRadius = 0.040;

        this.el.setAttribute("geometry", 
         { primitive: "box", width: centerBoxWidth + centerBoxHeight, height: centerBoxHeight, depth: centerBoxDepth } );
        this.el.setAttribute("material", 
         { color: "#CCCCFF", transparent: true, opacity: 0.0 });
        this.el.setAttribute("raycaster-target", "canGrab: true;");

        // change plane dimensions and position to fit game-model
        this.gameDisplay.setAttribute("width",  0.95 * centerBoxWidth);
        this.gameDisplay.setAttribute("height", 0.95 * centerBoxHeight);
        this.gameDisplay.setAttribute("position", "0.00 0.00 0.03");
        // this.el.object3D.attach(this.gameElement.object3D);

        this.centerBox = document.createElement("a-entity");
        this.centerBox.setAttribute("geometry", 
         { primitive: "box", width: centerBoxWidth, height: centerBoxHeight, depth: 0.05 } );
        this.centerBox.setAttribute("material", "color", "#222222");
        this.el.appendChild(this.centerBox);

        this.leftSide = document.createElement("a-entity");
        this.leftSide.setAttribute("geometry", 
         { primitive: "cylinder", radius: centerBoxHeight/2, height: 0.05, thetaStart: 180, thetaLength: 180 } );
        this.leftSide.setAttribute("material", "color", "#FF69B4");
        this.leftSide.setAttribute("position", {x: -centerBoxWidth/2, y: 0, z: 0});
        this.leftSide.setAttribute("rotation", "90 0 0");
        this.centerBox.appendChild(this.leftSide);

        this.leftStickBase = document.createElement("a-entity");
        this.leftStickBase.setAttribute("geometry", 
         { primitive: "cylinder", radius: stickRadius, height: 0.05 } );
        this.leftStickBase.setAttribute("material", 
          { src: "#circleBlank", color: "#CCCCCC" } );
        this.leftStickBase.setAttribute("position", {x: -0.17, y: 0.005, z: 0});
        this.leftSide.appendChild( this.leftStickBase );

        this.leftStickKnob = document.createElement("a-entity");
        this.leftStickKnob.setAttribute("geometry", 
         { primitive: "cylinder", radius: stickRadius/2, height: 0.05 } );
        this.leftStickKnob.setAttribute("material", "color", "#444444");
        this.leftStickKnob.setAttribute("position", {x: 0, y: 0.01, z: 0});
        this.leftStickBase.appendChild( this.leftStickKnob );

        this.leftButtonY = document.createElement("a-entity");
        this.leftButtonY.setAttribute("geometry", 
         { primitive: "cylinder", radius: buttonRadius, height: 0.05 } );
        this.leftButtonY.setAttribute("material", 
            { src: "#circleY", color: "white"} );
        this.leftButtonY.setAttribute("position", {x: -0.05, y: 0.005, z: -0.06});
        this.leftButtonY.setAttribute("rotation", "0 90 0");
        this.leftSide.appendChild( this.leftButtonY );

        this.leftButtonX = document.createElement("a-entity");
        this.leftButtonX.setAttribute("geometry", 
         { primitive: "cylinder", radius: buttonRadius, height: 0.05 } );
        this.leftButtonX.setAttribute("material", 
            { src: "#circleX", color: "white"} );
        this.leftButtonX.setAttribute("position", {x: -0.05, y: 0.005, z:  0.06});
        this.leftButtonX.setAttribute("rotation", "0 90 0");
        this.leftSide.appendChild( this.leftButtonX );

        this.rightSide = document.createElement("a-entity");
        this.rightSide.setAttribute("geometry", 
         { primitive: "cylinder", radius: centerBoxHeight/2, height: 0.05, thetaStart: 0, thetaLength: 180 } );
        this.rightSide.setAttribute("material", "color", "#B469FF");
        this.rightSide.setAttribute("position", {x: centerBoxWidth/2, y: 0, z: 0});
        this.rightSide.setAttribute("rotation", "90 0 0");
        this.centerBox.appendChild(this.rightSide);

        this.rightStickBase = document.createElement("a-entity");
        this.rightStickBase.setAttribute("geometry", 
         { primitive: "cylinder", radius: stickRadius, height: 0.05 } );
        this.rightStickBase.setAttribute("material", 
          { src: "#circleBlank", color: "#CCCCCC" } );
        this.rightStickBase.setAttribute("position", {x: 0.17, y: 0.005, z: 0});
        this.rightSide.appendChild( this.rightStickBase );

        this.rightStickKnob = document.createElement("a-entity");
        this.rightStickKnob.setAttribute("geometry", 
         { primitive: "cylinder", radius: stickRadius/2, height: 0.05 } );
        this.rightStickKnob.setAttribute("material", "color", "#444444");
        this.rightStickKnob.setAttribute("position", {x: 0, y: 0.01, z: 0});
        this.rightStickBase.appendChild( this.rightStickKnob );

        this.rightButtonB = document.createElement("a-entity");
        this.rightButtonB.setAttribute("geometry", 
         { primitive: "cylinder", radius: buttonRadius, height: 0.05 } );
        this.rightButtonB.setAttribute("material", 
            { src: "#circleB", color: "white"} );
        this.rightButtonB.setAttribute("position", {x: 0.05, y: 0.005, z: -0.06});
        this.rightButtonB.setAttribute("rotation", "0 90 0");
        this.rightSide.appendChild( this.rightButtonB );

        this.rightButtonA = document.createElement("a-entity");
        this.rightButtonA.setAttribute("geometry", 
         { primitive: "cylinder", radius: buttonRadius, height: 0.05 } );
        this.rightButtonA.setAttribute("material", 
            { src: "#circleA", color: "white"} );
        this.rightButtonA.setAttribute("position", {x: 0.05, y: 0.005, z:  0.06});
        this.rightButtonA.setAttribute("rotation", "0 90 0");
        this.rightSide.appendChild( this.rightButtonA );

        this.powerLight = document.createElement("a-entity");
        this.powerLight.setAttribute("geometry", 
         { primitive: "sphere", radius: 0.03 } );
        this.powerLight.setAttribute("material", 
            { color: "#444444", emissive: "#FF0000"} );
        this.powerLight.setAttribute("position", {x: 0.03, y: 0, z:  0.22});
        this.rightSide.appendChild( this.powerLight );

        // highlight parts of gamepad when hovering over containing box
        let self = this;
        this.el.addEventListener("raycaster-intersected", function(event)
            { 
                self.centerBox.setAttribute("material", "emissive", "#444444");
                self.leftSide.setAttribute("material", "emissive", "#444444");
                self.rightSide.setAttribute("material", "emissive", "#444444");
            } 
        );
        this.el.addEventListener("raycaster-intersected-cleared", function(event)
            { 
                self.centerBox.setAttribute("material", "emissive", "#000000");
                self.leftSide.setAttribute("material", "emissive", "#000000");
                self.rightSide.setAttribute("material", "emissive", "#000000");
            } 
        );

    },

    tick: function()
    {

        if ( this.el.components["raycaster-target"].hasFocus && this.controllerData.rightTrigger.pressed )
        {
            this.playerMoveControls.enabled = !this.playerMoveControls.enabled;
            this.enabled = !this.playerMoveControls.enabled;

            // change light indicator for game "on" / "off"
            if (this.enabled)
            {
                this.powerLight.setAttribute("material", "emissive", "#00FF00" );
                if (this.bagelGameComponent != null)
                    this.bagelGameComponent.enabled = true;
            }
            else
            {
                this.powerLight.setAttribute("material", "emissive", "#FF0000" );
                if (this.bagelGameComponent != null)
                    this.bagelGameComponent.enabled = false;
            }
        }

        if ( !this.enabled )
            return;

        // show controller inputs on game model

        this.leftStickKnob.setAttribute("position", 
            {x: 0.035 * this.controllerData.leftAxisX, 
             y: 0.01, 
             z: 0.035 * this.controllerData.leftAxisY} );

        this.rightStickKnob.setAttribute("position", 
            {x: 0.035 * this.controllerData.rightAxisX, 
             y: 0.01, 
             z: 0.035 * this.controllerData.rightAxisY} );

        if ( this.controllerData.buttonA.pressed )
            this.rightButtonA.setAttribute("material", "emissive", "#444444");
        else if ( this.controllerData.buttonA.released )
            this.rightButtonA.setAttribute("material", "emissive", "#000000");

        if ( this.controllerData.buttonB.pressed )
            this.rightButtonB.setAttribute("material", "emissive", "#444444");
        else if ( this.controllerData.buttonB.released )
            this.rightButtonB.setAttribute("material", "emissive", "#000000");

        if ( this.controllerData.buttonX.pressed )
            this.leftButtonX.setAttribute("material", "emissive", "#444444");
        else if ( this.controllerData.buttonX.released )
            this.leftButtonX.setAttribute("material", "emissive", "#000000");

        if ( this.controllerData.buttonY.pressed )
            this.leftButtonY.setAttribute("material", "emissive", "#444444");
        else if ( this.controllerData.buttonY.released )
            this.leftButtonY.setAttribute("material", "emissive", "#000000");
    },
    
});
