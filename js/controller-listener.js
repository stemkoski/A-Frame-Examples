AFRAME.registerComponent('controller-listener', {
    
    schema:
    {
        leftControllerId:  {type: 'string',  default: "#left-controller"},
        rightControllerId: {type: 'string',  default: "#right-controller"},
    },

    init: function()
    {
        this.leftController  = document.querySelector(this.data.leftControllerId);
        this.rightController = document.querySelector(this.data.rightControllerId);
        
        this.leftAxisX   = 0;
        this.leftAxisY   = 0;
        this.leftTrigger = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false, value: 0};
        this.leftGrip    = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false, value: 0};

        this.rightAxisX   = 0;
        this.rightAxisY   = 0;
        this.rightTrigger = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false, value: 0};
        this.rightGrip    = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false, value: 0};

        this.buttonA = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false};
        this.buttonB = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false};
        this.buttonX = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false};
        this.buttonY = {queuePress: false, queueRelease: false, pressed: false, pressing: false, released: false};

        // event listeners
        let self = this;

        // left controller

        this.leftController.addEventListener('thumbstickmoved', function(event)
          { self.leftAxisX = event.detail.x; 
            self.leftAxisY = event.detail.y; } );

        this.leftController.addEventListener("triggerdown", function(event)
          { self.leftTrigger.queuePress = true; } );        
        this.leftController.addEventListener("triggerup", function(event)
          { self.leftTrigger.queueRelease = true; } );
        this.leftController.addEventListener('triggerchanged', function (event) 
          { self.leftTrigger.value = event.detail.value; } );

        this.leftController.addEventListener("gripdown", function(event)
          { self.leftGrip.queuePress = true; } );        
        this.leftController.addEventListener("gripup", function(event)
          { self.leftGrip.queueRelease = true; } );
        this.leftController.addEventListener('gripchanged', function (event) 
          { self.leftGrip.value = event.detail.value; } );

        this.leftController.addEventListener("xbuttondown", function(event)
            { self.buttonX.queuePress = true; } );
        this.leftController.addEventListener("xbuttonup", function(event)
            { self.buttonX.queueRelease = true; } );
        
        this.leftController.addEventListener("ybuttondown", function(event)
            { self.buttonY.queuePress = true; } );
        this.leftController.addEventListener("ybuttonup", function(event)
            { self.buttonY.queueRelease = true; } );

        // right controller

        this.rightController.addEventListener('thumbstickmoved', function(event)
          { self.rightAxisX = event.detail.x; 
            self.rightAxisY = event.detail.y; } );

        this.rightController.addEventListener("triggerdown", function(event)
          { self.rightTrigger.queuePress = true; } );        
        this.rightController.addEventListener("triggerup", function(event)
          { self.rightTrigger.queueRelease = true; } );
        this.rightController.addEventListener('triggerchanged', function (event) 
          { self.rightTrigger.value = event.detail.value; } );

        this.rightController.addEventListener("gripdown", function(event)
          { self.rightGrip.queuePress = true; } );        
        this.rightController.addEventListener("gripup", function(event)
          { self.rightGrip.queueRelease = true; } );
        this.rightController.addEventListener('gripchanged', function (event) 
          { self.rightGrip.value = event.detail.value; } );
        
        this.rightController.addEventListener("abuttondown", function(event)
            { self.buttonA.queuePress = true; } );        
        this.rightController.addEventListener("abuttonup", function(event)
            { self.buttonA.queueRelease = true; } );
        
        this.rightController.addEventListener("bbuttondown", function(event)
            { self.buttonB.queuePress = true; } );
        this.rightController.addEventListener("bbuttonup", function(event)
            { self.buttonB.queueRelease = true; } );        
    },
    
    updateButtonState: function( stateObject )
    {
        // clear pressed/released data,
        //  because it is only true for one frame.
        stateObject.pressed = false;
        stateObject.released = false;

        // if button was recently pressed
        if (stateObject.queuePress && !stateObject.pressing)
        {
           stateObject.pressed = true;
           stateObject.pressing = true;
        }

        // if button was recently released:
        //   on first tick, pressing becomes false, 
        //   then on next tick, released becomes false. 
        if (stateObject.queueRelease)
        {
           stateObject.pressing = false;
           stateObject.released = true;
        }

        // data processed; clear queues
        stateObject.queuePress = false;
        stateObject.queueRelease = false;
    }, 

    tick: function()
    {
        this.updateButtonState( this.leftTrigger );
        this.updateButtonState( this.leftGrip );

        this.updateButtonState( this.rightTrigger );
        this.updateButtonState( this.rightGrip );

        this.updateButtonState( this.buttonA );
        this.updateButtonState( this.buttonB );
        this.updateButtonState( this.buttonX );
        this.updateButtonState( this.buttonY );          
    }

});

