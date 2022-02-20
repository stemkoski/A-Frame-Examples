AFRAME.registerComponent("player-move", {

    init: function() 
    {
        this.clock = new THREE.Clock();

        this.moveSpeed = 1; // units per second

        this.turnReady = true;
        this.turnAngle = 45;
    },

    tick: function()
    {
        let deltaTime = this.clock.getDelta();

        // get data from quest controllers;
        //   requires the "controller-listener" component
        let leftController = document.querySelector("#left-controller-entity");
        let leftData       = leftController.components["controller-listener"];

        let rightController = document.querySelector("#right-controller-entity");
        let rightData       = rightController.components["controller-listener"];

        // =====================================================================
        // moving on horizontal (XZ) plane
        // =====================================================================

        // move with left joystick
        let leftJoystickLength = Math.sqrt(leftData.axisX * leftData.axisX + leftData.axisY * leftData.axisY);

        if ( leftJoystickLength > 0.001 )
        {
            // create a vector to store camera direction
            let cameraDirection = new THREE.Vector3();
            this.el.sceneEl.camera.getWorldDirection(cameraDirection);
            let cameraAngle = Math.atan2(cameraDirection.z, cameraDirection.x);

            let leftJoystickAngle = Math.atan2(leftData.axisY, leftData.axisX);
            
            let moveAngle = cameraAngle + leftJoystickAngle;

            let moveDistance = this.moveSpeed * deltaTime;

            // move faster if pressing trigger at same time
            moveDistance *= (1 + 9 * leftData.trigger.value);

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

        // press right joystick left/right to turn left/right by N degrees;
        //  joystick must return to rest/center position before turning again
        if ( Math.abs(rightData.axisX) < 0.10 )
        {           
            this.turnReady = true;
        }

        if ( this.turnReady )
        {
            if ( rightData.axisX > 0.90 )
            {
                let rot = this.el.getAttribute("rotation");
                rot.y -= this.turnAngle;
                this.el.setAttribute("rotation", rot);
                this.turnReady = false;
            }
            if ( rightData.axisX < -0.90 )
            {
                let rot = this.el.getAttribute("rotation");
                rot.y += this.turnAngle;
                this.el.setAttribute("rotation", rot);
                this.turnReady = false;
            }
        }

        // =====================================================================
        // pull player/camera in direction of controller movement
        // (includes vertical movement, can use to move up and down in scene)
        // =====================================================================

        // hold trigger + grab, then hold A/X to pull player
        if ( rightData.trigger.pressing && rightData.grip.pressing )
        {
        	let rightHandCurrentPos = rightController.getAttribute("position");
        	if ( !rightData.buttonA.pressing )
        	{
        		this.rightHandPreviousX = rightHandCurrentPos.x;
        		this.rightHandPreviousY = rightHandCurrentPos.y;
        		this.rightHandPreviousZ = rightHandCurrentPos.z;
        	}
        	else // if ( rightData.buttonA.pressing )
        	{
        		let playerPos = this.el.getAttribute("position")
        		playerPos.x -= (rightHandCurrentPos.x - this.rightHandPreviousX);
        		playerPos.y -= (rightHandCurrentPos.y - this.rightHandPreviousY);
        		playerPos.z -= (rightHandCurrentPos.z - this.rightHandPreviousZ);
        		this.el.setAttribute("position", playerPos);

        		// what is now current is considered previous during the next check
        		this.rightHandPreviousX = rightHandCurrentPos.x;
        		this.rightHandPreviousY = rightHandCurrentPos.y;
        		this.rightHandPreviousZ = rightHandCurrentPos.z;
        	}
        }

        if ( leftData.trigger.pressing && leftData.grip.pressing )
        {
        	let leftHandCurrentPos = leftController.getAttribute("position");
        	if ( !leftData.buttonX.pressing )
        	{
        		this.leftHandPreviousX = leftHandCurrentPos.x;
        		this.leftHandPreviousY = leftHandCurrentPos.y;
        		this.leftHandPreviousZ = leftHandCurrentPos.z;
        	}
        	else // if ( rightData.buttonX.pressing )
        	{
        		let playerPos = this.el.getAttribute("position")
        		playerPos.x -= (leftHandCurrentPos.x - this.leftHandPreviousX);
        		playerPos.y -= (leftHandCurrentPos.y - this.leftHandPreviousY);
        		playerPos.z -= (leftHandCurrentPos.z - this.leftHandPreviousZ);
        		this.el.setAttribute("position", playerPos);

        		// what is now current is considered previous during the next check
        		this.leftHandPreviousX = leftHandCurrentPos.x;
        		this.leftHandPreviousY = leftHandCurrentPos.y;
        		this.leftHandPreviousZ = leftHandCurrentPos.z;
        	}
        }
    }
});
