AFRAME.registerComponent("camera-fade-in", {

    schema:
    {
        active:   {type: 'boolean', default: true},
        duration: {type: 'float',   default: 1.0},
        color:    {type: 'color',   default: "black"},
    },
    
    init: function () 
    {
        this.clock = new THREE.Clock();  
        this.camera = document.querySelector("a-camera");

        if (this.data.active)
            this.start();
    },

    start: function()
    {
        this.data.active = true;
        this.opacity = 1.0;

        // add sphere around camera
        this.cameraSphere = document.createElement("a-entity");
        this.cameraSphere.setAttribute("geometry", 
          { primitive: "sphere", radius: 0.5 } );
        this.cameraSphere.setAttribute("material", 
            { shader: "flat", color: this.data.color, 
              transparent: true, opacity: 1.0, side: "back" } );
        this.camera.appendChild( this.cameraSphere );

        this.finished = false;
    },

    tick: function()
    {
        let deltaTime = this.clock.getDelta();
        if (this.data.active && this.cameraSphere)
        {
            this.opacity -= deltaTime / this.data.duration;
            this.cameraSphere.setAttribute("material", "opacity", this.opacity);
            if (this.opacity <= 0)
            {
                this.data.active = false;
                this.finished = true;
                // must remove sphere, otherwise causes transparency flickering issues
                this.camera.removeChild( this.cameraSphere );
                this.cameraSphere = null;
            }
        }
    }
});

AFRAME.registerComponent("camera-fade-out", {

    schema:
    {
        active:   {type: 'boolean', default: false},
        duration: {type: 'float',   default: 1.0},
        color:    {type: 'color',   default: "black"},
    },
    
    init: function () 
    {
        this.clock = new THREE.Clock();
        this.camera = document.querySelector("a-camera");
       
        if (this.data.active)
            this.start();
    },

    start: function()
    {
        this.data.active = true;
        this.opacity = 0.0;

        // add sphere around camera
        this.cameraSphere = document.createElement("a-entity");
        this.cameraSphere.setAttribute("geometry", 
          { primitive: "sphere", radius: 0.5 } );
        this.cameraSphere.setAttribute("material", 
            { shader: "flat", color: this.data.color, 
              transparent: true, opacity: 0.0, side: "back" } );
        this.camera.appendChild( this.cameraSphere );

        this.finished = false;
    },

    tick: function()
    {
        let deltaTime = this.clock.getDelta();
        if (this.data.active)
        {
            this.opacity += deltaTime / this.data.duration;
            this.cameraSphere.setAttribute("material", "opacity", this.opacity);
            if (this.opacity >= 1)
            {
                this.data.active = false;
                this.finished = true;
                // no need to remove sphere, because nothing is visible anyway
                // this.camera.removeChild( this.cameraSphere );
                // this.cameraSphere = null;
            }
        }
    }
});
