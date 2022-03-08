
// to specify game class, after loading *.js script, store in window variable;
// for example:
//   <script src="SpaceRocks.js"></script>
//   <script> window["SpaceRocks"] = SpaceRocks; </script>

AFRAME.registerComponent("bagel-game-component", {
    
    schema:
    {
        controllerListenerId:  {type: 'string',  default: "#controller-data"},
        canvasId:              {type: 'string',  default: "#game-canvas"},
        displayId:             {type: 'string',  default: "#game-model-display"},
        gameClassName:         {type: 'string',  default: ""}
    },

    init: function () 
    {
        this.controllerData = document.querySelector(this.data.controllerListenerId).components["controller-listener"];
        this.canvas = document.querySelector(this.data.canvasId);

        this.display = document.querySelector(this.data.displayId);
        this.displayMaterial = this.display.getObject3D('mesh').material;
        
        this.gameClass = window[this.data.gameClassName];
        this.game = new this.gameClass();

        // assume canvas is 800 x 600
        this.game.canvas = this.canvas;
        this.game.context = this.game.canvas.getContext("2d");
        this.game.context.fillStyle = "#444444";
        this.game.context.fillRect(0,0, 800,600);

        // must update canvas texture data
        if (this.displayMaterial.map)
            this.displayMaterial.map.needsUpdate = true;

        // read inputs from Quest controllers 
        //  (e.g. this.game.input.leftAxisX, this.game.input.buttonA.pressed)
        this.game.input = this.controllerData;

        this.clock = new THREE.Clock();

        this.game.start();

        // game does not run unless enabled
        this.enabled = false;

        this.tickCount = 0;
    },

    tick: function ()
    {
        let deltaTime = this.clock.getDelta();
        
        // stop update/render of BAGEL game
        if ( !this.enabled )
            return;

        this.game.update(deltaTime);

        // must update canvas texture data
        // try reducing texture updates to GPU by 50% to reduce jitter
        this.tickCount++;
        if ((this.tickCount % 2 == 0) && this.displayMaterial.map)
            this.displayMaterial.map.needsUpdate = true;
    },

});
