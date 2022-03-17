AFRAME.registerComponent("player-move", {

    schema:
    {
        // the id of the element with constroller listener component attached
        controllerListenerId:  {type: 'string', default: "#controller-data"},
        // the id of the element with raycaster attached, for teleport movement
        raycasterId:           {type: 'string', default: "#right-controller"},
        navigationMeshClass:   {type: 'string', default: "navMesh"},
        teleportEnabled:       {type: 'boolean', default: true},
        motionEnabled:         {type: 'boolean', default: true},
    },

    init: function() 
    {
        this.controllerData = document.querySelector(this.data.controllerListenerId).components["controller-listener"];

        // use raycaster data for teleport
        if ( document.querySelector(this.data.raycasterId) )
            this.raycaster = document.querySelector(this.data.raycasterId).components["raycaster"];
        else
            this.raycaster = null;

        this.clock = new THREE.Clock();

        this.moveSpeed = 1; // units per second

        // quick turns
        this.turnReady = true;
        this.startAngle = 0;
        this.endAngle = 0;
        this.turnInProgress = false;
        this.turnAngle = 45;
        this.turnDuration = 0.10;
        this.turnTime = 0;

        // navTarget objects to indicate teleport destination on navMesh
        let geoProps = { primitive: "torus", radius: 0.2, radiusTubular: 0.01 };
        let matProps = { color: "#444444", emissive: "#008800", transparent: true, opacity: 1.0 };

        this.scene = document.querySelector("a-scene");
        this.navTarget1 = document.createElement("a-entity");
        this.navTarget1.setAttribute("geometry", geoProps );
        this.navTarget1.setAttribute("material", matProps );
        this.navTarget1.setAttribute("rotation", "90 0 0");
        this.scene.appendChild(this.navTarget1);

        this.navTarget2 = document.createElement("a-entity");
        this.navTarget2.setAttribute("geometry", geoProps );
        this.navTarget2.setAttribute("material", matProps );
        this.navTarget2.setAttribute("rotation", "90 0 0");
        this.scene.appendChild(this.navTarget2);

        // variables used for: fade out, teleport, fade in
        this.fadeInProgress = false;
        this.fadeDuration = 0.15;
        this.fadeTime = 0;
        this.fadeColor = "#000000";
        // create sphere around camera for fade effect
        this.camera = document.querySelector("a-camera");
        this.fadeSphere = document.createElement("a-entity");
        this.fadeSphere.setAttribute("geometry", { primitive: "sphere", radius: 0.1 } );
        this.fadeSphere.setAttribute("material",
         { color: this.fadeColor, transparent: true, opacity: 0.5, side: "back"} );
        this.fadeSphere.setAttribute("visible", false);
        this.camera.appendChild(this.fadeSphere);

        // other components may set this value to enable/disable this component
        this.enabled = true;
    },

    lerp: function(startValue, endValue, percent)
    {
        return startValue + (endValue - startValue) * percent;
    },

    tick: function()
    {
        // always update deltaTime!
        let deltaTime = this.clock.getDelta();

        if ( !this.enabled )
            return;
        
        // =====================================================================
        // teleportation
        // =====================================================================
        if (this.data.teleportEnabled && 
            this.raycaster &&
            this.raycaster.intersectionDetail.intersections && 
            this.raycaster.intersectionDetail.intersections.length > 0 &&
            this.raycaster.intersectionDetail.els[0].classList.contains(this.data.navigationMeshClass) )
        {
            // show marker to indicate teleport zone
            let point = this.raycaster.intersectionDetail.intersections[0].point;

            let t = this.clock.elapsedTime/3 % 1;
            let alpha = Math.min(2*t, 0.5);
            this.navTarget1.setAttribute("position", {x:point.x, y:point.y, z:point.z} );
            this.navTarget1.setAttribute("visible", true);
            this.navTarget1.setAttribute("scale", {x: 1-t, y: 1-t, z: 1});
            this.navTarget1.setAttribute("material", "opacity", alpha);

            t = (this.clock.elapsedTime/3 + 0.5) % 1;
            alpha = Math.min(2*t, 0.5);
            this.navTarget2.setAttribute("position", {x:point.x, y:point.y, z:point.z} );
            this.navTarget2.setAttribute("visible", true);
            this.navTarget2.setAttribute("scale", {x: 1-t, y: 1-t, z: 1});
            this.navTarget2.setAttribute("material", "opacity", alpha);

            if (this.controllerData.rightTrigger.pressed && !this.fadeInProgress)
            {
                // fade out, then set position, then fade back in
                this.fadeSphere.setAttribute("visible", true);
                this.fadeInProgress = true;
                this.fadeTime = 0;
                this.point = {x:point.x, y:point.y, z:point.z};
            }
        }
        else
        {
            // hide marker if raycaster not hovering over navigation mesh
            this.navTarget1.setAttribute("visible", false);
            this.navTarget2.setAttribute("visible", false);
        }

        // currently teleporting
        if (this.fadeInProgress)
        {
            this.fadeTime += deltaTime;

            // fade to dark and then to light
            let alpha = -Math.abs(this.fadeTime - this.fadeDuration)/this.fadeDuration + 1;
            this.fadeSphere.setAttribute("material", "opacity", alpha);

            if (this.fadeTime >= this.fadeDuration)
            {
                this.el.setAttribute("position", this.point)
            }
            if (this.fadeTime >= 2 * this.fadeDuration)
            {
                this.fadeInProgress = false;
                this.fadeSphere.setAttribute("visible", false);
            }
        }

        // =====================================================================
        // moving on horizontal (XZ) plane
        // =====================================================================

        // move with left joystick (while not pressing left grip);
        //   move faster when pressing trigger
        let leftJoystickLength = Math.sqrt(this.controllerData.leftAxisX * this.controllerData.leftAxisX + 
                                           this.controllerData.leftAxisY * this.controllerData.leftAxisY );

        if ( this.data.motionEnabled &&
             leftJoystickLength > 0.001 && 
             !this.controllerData.leftGrip.pressing )
        {
            // create a vector to store camera direction
            let cameraDirection = new THREE.Vector3();
            this.el.sceneEl.camera.getWorldDirection(cameraDirection);
            let cameraAngle = Math.atan2(cameraDirection.z, cameraDirection.x);

            let leftJoystickAngle = Math.atan2(this.controllerData.leftAxisY, this.controllerData.leftAxisX);
            
            let moveAngle = cameraAngle + leftJoystickAngle;

            let moveDistance = this.moveSpeed * deltaTime;

            // move faster if pressing trigger at same time
            moveDistance *= (1 + 9 * this.controllerData.leftTrigger.value);

            // convert move distance and angle to right and forward amounts
            // scale by magnitude of joystick press (smaller press moves player slower)
            let moveRight   = -leftJoystickLength * Math.sin(moveAngle) * moveDistance;
            let moveForward =  leftJoystickLength * Math.cos(moveAngle) * moveDistance;
                          
            let playerPos = this.el.getAttribute("position");
            playerPos.z += moveForward;
            playerPos.x += moveRight;
            this.el.setAttribute("position", playerPos);
        }

        // =====================================================================
        // turning in horizontal (XZ) plane
        // =====================================================================

        // while pressing left grip, press left joystick left/right to turn left/right by N degrees;
        // -or- just press right joystick left/right to turn left/right by N degrees.
        //  joystick must return to rest/center position before turning again
        let leftX  = this.controllerData.leftAxisX;
        let rightX = this.controllerData.rightAxisX;
        
        if ( Math.abs(leftX) < 0.10 && Math.abs(rightX) < 0.10 )
        {           
            this.turnReady = true;
        }

        if ( this.data.motionEnabled && this.turnReady &&
             ((this.controllerData.leftGrip.pressing && Math.abs(leftX) > 0.90) || Math.abs(rightX) > 0.90)
           )
        {
            this.startAngle = this.el.getAttribute("rotation").y;

            if ( leftX > 0.90 || rightX > 0.90 )
                this.endAngle = this.startAngle - this.turnAngle;
            if ( leftX < -0.90 || rightX < -0.90 )
                this.endAngle = this.startAngle + this.turnAngle;

            this.turnInProgress = true;
            this.turnTime = 0;
            this.turnReady = false;
        }

        if (this.turnInProgress)
        {
            this.turnTime += deltaTime;
            let rot = this.el.getAttribute("rotation");
            rot.y = this.lerp(this.startAngle, this.endAngle, this.turnTime/this.turnDuration);
            this.el.setAttribute("rotation", rot);
            
            if (this.turnTime >= this.turnDuration)
                this.turnInProgress = false;
        }

        // =====================================================================
        // vertical movement (Y axis)
        // =====================================================================

        // while pressing left grip, press left joystick up/down to move up/down;
        //   move faster while pressing trigger.
        // includes extended deadzone adjustment 
        //   to avoid unintended simultaneous turning and vertical movement
        if ( this.data.motionEnabled && 
             this.controllerData.leftGrip.pressing && 
             Math.abs(this.controllerData.leftAxisY) > 0.25 )
        {
            let y = this.controllerData.leftAxisY;
            y = Math.sign(y) * (Math.abs(y) - 1/4);
            let moveDistance = -this.moveSpeed * y * deltaTime;
            // move faster if pressing trigger at same time
            moveDistance *= (1 + 9 * this.controllerData.leftTrigger.value);

            let playerPos = this.el.getAttribute("position");
            playerPos.y += moveDistance;
            this.el.setAttribute("position", playerPos);
        }
    }
});
