AFRAME.registerComponent("gltf-modifier", {

    schema: {
        color:       {type: 'string',  default: "#FFFFFF"},
        transparent: {type: 'boolean', default: false},
        opacity:     {type: 'float',   default: 1.0},
        blending:    {type: 'string',  default: "normal"},
        emissive:    {type: 'string',  default: "#000000"},
    },

    init: function () 
    {
        let blending;
        if (this.data.blending == "additive")
            blending = THREE.AdditiveBlending;
        else // if (this.data.blending == "normal")
            blending = THREE.NormalBlending;

        let parameters = {color: this.data.color, transparent: this.data.transparent, opacity: this.data.opacity, blending: blending };

        let material;
        if (this.data.shading == "flat")
          material = new THREE.MeshBasicMaterial( parameters );
        else // if (this.data.shading == "normal")
          material = new THREE.MeshLambertMaterial( parameters );
        
        let self = this;

        this.el.addEventListener("model-loaded", function(eventData) {
            let model = eventData.detail.model;
            model.traverse((obj) => {
                if (obj.isMesh && obj.material)
                {
                    obj.material.color = new THREE.Color( self.data.color );

                    obj.material.emissive = new THREE.Color( self.data.emissive );                    

                    obj.material.transparent = self.data.transparent;

                    obj.material.opacity = self.data.opacity;
                    
                    if (self.data.blending == "additive")
                        obj.material.blending = THREE.AdditiveBlending;
                    else if (self.data.blending == "normal")
                        obj.material.blending = THREE.NormalBlending;
                    
                  // obj.material = material;
                }
            });
        });

        // material replacement complete
    }
});
