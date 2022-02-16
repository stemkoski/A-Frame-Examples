AFRAME.registerComponent('controller-listener', {
    
    schema:
    {
        hand:       {type: 'string',  default: "right"},
        buttonA:    {type: 'boolean', default: false},
        buttonB:    {type: 'boolean', default: false},
        buttonX:    {type: 'boolean', default: false},
        buttonY:    {type: 'boolean', default: false},
        axisX:      {type: 'float',   default: 0},
        axisY:      {type: 'float',   default: 0},
        trigger:    {type: 'boolean', default: false},
        grip:       {type: 'boolean', default: false},
    },

    init: function()
    {
        let self = this;

        if (this.data.hand == "right")
        {
          this.el.addEventListener("abuttondown", function(event)
            { self.data.buttonA = true; } );        
          this.el.addEventListener("abuttonup", function(event)
            { self.data.buttonA = false; } );
        
          this.el.addEventListener("bbuttondown", function(event)
            { self.data.buttonB = true; } );
          this.el.addEventListener("bbuttonup", function(event)
            { self.data.buttonB = false; } );
        }
                
        if (this.data.hand == "left")
        {
          this.el.addEventListener("xbuttondown", function(event)
            { self.data.buttonX = true; } );
          this.el.addEventListener("xbuttonup", function(event)
            { self.data.buttonX = false; } );
        
          this.el.addEventListener("ybuttondown", function(event)
            { self.data.buttonY = true; } );
          this.el.addEventListener("ybuttonup", function(event)
            { self.data.buttonY = false; } );
        }

        this.el.addEventListener("triggerdown", function(event)
          { self.data.trigger = true; } );
        this.el.addEventListener("triggerup", function(event)
          { self.data.trigger = false; } );

        this.el.addEventListener("gripdown", function(event)
          { self.data.grip = true; } );
        this.el.addEventListener("gripup", function(event)
          { self.data.grip = false; } );

        this.el.addEventListener('thumbstickmoved', function(event)
          { self.data.axisX = event.detail.x; 
            self.data.axisY = event.detail.y; } );
    },
    
});

