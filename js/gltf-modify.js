AFRAME.registerComponent("gltf-modify", {

    schema: {
        shading:     {type: 'string', default: "normal"},
        color:       {type: 'color',   default: "red"},
        transparent: {type: 'boolean', default: false},
        opacity:     {type: 'float',   default: 1.0},
        blending:    {type: 'string',  default: "normal"},
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
        
        this.el.addEventListener("model-loaded", function(eventData) {
            let model = eventData.detail.model;
            model.traverse((obj) => {
            if (obj.isMesh) 
              obj.material = material;
            });
        });

        // material replacement complete
    }
});
