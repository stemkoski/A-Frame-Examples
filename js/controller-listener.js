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
        this.leftTrigger = {pressed: false, pressing: false, released: false, value: 0};
        this.leftGrip    = {pressed: false, pressing: false, released: false, value: 0};

        this.rightAxisX   = 0;
        this.rightAxisY   = 0;
        this.rightTrigger = {pressed: false, pressing: false, released: false, value: 0};
        this.rightGrip    = {pressed: false, pressing: false, released: false, value: 0};

        this.buttonA = {pressed: false, pressing: false, released: false};
        this.buttonB = {pressed: false, pressing: false, released: false};
        this.buttonX = {pressed: false, pressing: false, released: false};
        this.buttonY = {pressed: false, pressing: false, released: false};

        // event listeners
        let self = this;

        // left controller

        this.leftController.addEventListener('thumbstickmoved', function(event)
          { self.leftAxisX = event.detail.x; 
            self.leftAxisY = event.detail.y; } );

        this.leftController.addEventListener("triggerdown", function(event)
          { self.leftTrigger.pressed = true; } );        
        this.leftController.addEventListener("triggerup", function(event)
          { self.leftTrigger.released = true; } );
        this.leftController.addEventListener('triggerchanged', function (event) 
          { self.leftTrigger.value = event.detail.value; } );

        this.leftController.addEventListener("gripdown", function(event)
          { self.leftGrip.pressed = true; } );        
        this.leftController.addEventListener("gripup", function(event)
          { self.leftGrip.released = true; } );
        this.leftController.addEventListener('gripchanged', function (event) 
          { self.leftGrip.value = event.detail.value; } );

        this.leftController.addEventListener("xbuttondown", function(event)
            { self.buttonX.pressed = true; } );
        this.leftController.addEventListener("xbuttonup", function(event)
            { self.buttonX.released = true; } );
        
        this.leftController.addEventListener("ybuttondown", function(event)
            { self.buttonY.pressed = true; } );
        this.leftController.addEventListener("ybuttonup", function(event)
            { self.buttonY.released = true; } );

        // right controller

        this.rightController.addEventListener('thumbstickmoved', function(event)
          { self.rightAxisX = event.detail.x; 
            self.rightAxisY = event.detail.y; } );

        this.rightController.addEventListener("triggerdown", function(event)
          { self.rightTrigger.pressed = true; } );        
        this.rightController.addEventListener("triggerup", function(event)
          { self.rightTrigger.released = true; } );
        this.rightController.addEventListener('triggerchanged', function (event) 
          { self.rightTrigger.value = event.detail.value; } );

        this.rightController.addEventListener("gripdown", function(event)
          { self.rightGrip.pressed = true; } );        
        this.rightController.addEventListener("gripup", function(event)
          { self.rightGrip.released = true; } );
        this.rightController.addEventListener('gripchanged', function (event) 
          { self.rightGrip.value = event.detail.value; } );
        
        this.rightController.addEventListener("abuttondown", function(event)
            { self.buttonA.pressed = true; } );        
        this.rightController.addEventListener("abuttonup", function(event)
            { self.buttonA.released = true; } );
        
        this.rightController.addEventListener("bbuttondown", function(event)
            { self.buttonB.pressed = true; } );
        this.rightController.addEventListener("bbuttonup", function(event)
            { self.buttonB.released = true; } );        
    },
    
    updateButtonState: function( stateObject )
    {
        // if button was recently pressed: 
        //   on first tick, pressing becomes true, 
        //   then on next tick, pressed becomes false.
        if (stateObject.pressed)
        {
           if (!stateObject.pressing)
             stateObject.pressing = true;
           else
             stateObject.pressed = false;
        }

        // if button was recently released:
        //   on first tick, pressing becomes false, 
        //   then on next tick, released becomes false. 
        if (stateObject.released)
        {
           if (stateObject.pressing)
             stateObject.pressing = false;
           else
             stateObject.released = false;
        }
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

