AFRAME.registerComponent('controller-listener', {
    
    schema:
    {
        hand: {type: 'string',  default: "right"},
    },

    init: function()
    {
        // common to both controllers

        this.axisX = 0;
        this.axisY = 0;
        this.trigger = {pressed: false, pressing: false, released: false, value: 0};
        this.grip    = {pressed: false, pressing: false, released: false, value: 0};

        // only on one controller

        if (this.data.hand == "right")
        {
          this.buttonA = {pressed: false, pressing: false, released: false};
          this.buttonB = {pressed: false, pressing: false, released: false};
        }

        if (this.data.hand == "left")
        {
          this.buttonX = {pressed: false, pressing: false, released: false};
          this.buttonY = {pressed: false, pressing: false, released: false};
        }

        // event listeners

        let self = this;

        this.el.addEventListener('thumbstickmoved', function(event)
          { self.axisX = event.detail.x; 
            self.axisY = event.detail.y; } );

        this.el.addEventListener("triggerdown", function(event)
          { self.trigger.pressed = true; } );        
        this.el.addEventListener("triggerup", function(event)
          { self.trigger.released = true; } );
        this.el.addEventListener('triggerchanged', function (event) 
          { self.trigger.value = event.detail.value; } );

        this.el.addEventListener("gripdown", function(event)
          { self.grip.pressed = true; } );        
        this.el.addEventListener("gripup", function(event)
          { self.grip.released = true; } );
        this.el.addEventListener('gripchanged', function (event) 
          { self.grip.value = event.detail.value; } );
        
        if (this.data.hand == "right")
        {
          this.el.addEventListener("abuttondown", function(event)
            { self.buttonA.pressed = true; } );        
          this.el.addEventListener("abuttonup", function(event)
            { self.buttonA.released = true; } );
        
          this.el.addEventListener("bbuttondown", function(event)
            { self.buttonB.pressed = true; } );
          this.el.addEventListener("bbuttonup", function(event)
            { self.buttonB.released = true; } );
        }
                
        if (this.data.hand == "left")
        {
          this.el.addEventListener("xbuttondown", function(event)
            { self.buttonX.pressed = true; } );
          this.el.addEventListener("xbuttonup", function(event)
            { self.buttonX.released = true; } );
        
          this.el.addEventListener("ybuttondown", function(event)
            { self.buttonY.pressed = true; } );
          this.el.addEventListener("ybuttonup", function(event)
            { self.buttonY.released = true; } );
        }
    },
    
    updateButtonState: function( stateObject )
    {
        // if button was recently pressed: 
        //   first pressing becomes true, then on neck tick, pressed becomes false.
        if (stateObject.pressed)
        {
           if (!stateObject.pressing)
             stateObject.pressing = true;
           else
             stateObject.pressed = false;
        }

        // if button was recently released:
        //   first pressing becomes false, then on next tick, released becomes false. 
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
        this.updateButtonState( this.trigger );
        this.updateButtonState( this.grip );

        if (this.data.hand == "right")
        {
          this.updateButtonState( this.buttonA );
          this.updateButtonState( this.buttonB );
        }

        if (this.data.hand == "left")
        {
          this.updateButtonState( this.buttonX );
          this.updateButtonState( this.buttonY );          
        }
    }

});

