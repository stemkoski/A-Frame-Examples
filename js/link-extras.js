AFRAME.registerComponent("link-extras", {
    init: function () 
    {
        // note: modified a-frame a-link code directly, to:
        //  - change default background color of portal when distance to camera is large
        //  - change default color of title text

        // construct a torus surrounding link portal
        this.torus = document.createElement("a-entity");
        this.torus.setAttribute("geometry", 
          { primitive: "torus", radius: 1.0, radiusTubular: 0.04, segmentsTubular: 64} );
        this.torus.setAttribute("material", 
          { src: "#portalBorder", repeat: "16 1", color: "white"} );
        this.el.appendChild( this.torus );

        // use for animating torus material
        this.clock = new THREE.Clock();
        this.materialOffset = {x : 0, y: 0};

        // create a single invisible object to get raycaster focus
        this.cylinder = document.createElement("a-entity");
        this.cylinder.setAttribute("geometry", 
          { primitive: "cylinder", radius: 1.1, height: 0.2} );
        this.cylinder.setAttribute("material", 
          { blending: "additive", color: "#222222", 
            transparent: true, opacity: 0.0 } );
        this.cylinder.setAttribute("rotation", "90 0 0");
        this.cylinder.setAttribute("class", "raycaster-target");
        this.cylinder.setAttribute("raycaster-hover", "");
        this.el.appendChild( this.cylinder );

        let self = this;

        // change opacity so alpha blending highlights all objects in portal
        this.cylinder.addEventListener("raycaster-intersected", function(event)
            { 
                self.cylinder.setAttribute("material", "opacity", 1.0);
            } 
        );
        this.el.addEventListener("raycaster-intersected-cleared", function(event)
            { 
                self.cylinder.setAttribute("material", "opacity", 0.0);
            } 
        );

        // stop accidental "click" event.
        // note: seem to be unable to change this using schema when initialized
        this.el.components["link"].data.on = "nope";

        // use controller to determine when to activate link
        this.rightController = document.querySelector("#right-controller-entity");
        this.rightData       = this.rightController.components["controller-listener"];

        // when link activated, 
        //  will fade out if camera-fade-out component is present on camera
        this.camera = document.querySelector("a-camera");  
    },

    tick: function()
    {
        // update portal texture data
        let deltaTime = this.clock.getDelta();
        this.materialOffset.x += deltaTime / 4;
        this.materialOffset.y -= deltaTime / 2;
        this.torus.setAttribute("material", "offset", this.materialOffset);

        this.hoverData = this.cylinder.components["raycaster-hover"].data;

        // navigate to new page
        // TODO: if camera-fade-out is not present, then navigate immediately 
        if ( this.hoverData.hasFocus && this.rightData.trigger.pressed)
            this.camera.components["camera-fade-out"].start();
        
        if ( this.camera.components["camera-fade-out"].finished )
        {
            this.el.components["link"].navigate();
            // change finished to false to prevent spamming navigate function, which causes problems
            this.camera.components["camera-fade-out"].finished = false;
        }
    }
});
