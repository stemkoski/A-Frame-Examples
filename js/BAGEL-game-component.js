
// must inject game class, this.gameClass
AFRAME.registerComponent("BAGEL-game-player", {
    
    schema:
    {
        controllerListenerId:  {type: 'string',  default: "#controller-data"},
        canvasId:              {type: 'string',  default: "#game-canvas"},
    },

    init: function () 
    {
        this.controllerData = document.querySelector(this.data.controllerListenerId).components["controller-listener"];
    },

    tick: function ()
    {
        if ( !this.gameClass )
            return;

        if ( !this.gameInstance )
        {
            this.game = new this.gameClass();

            this.game.canvas = document.querySelector(this.data.canvasId);

            // assume 640 x 480? 800 x 600?

            // this.canvas.width = width;
            // this.canvas.height = height;
            this.game.context = this.game.canvas.getContext("2d");

            // read inputs from Quest controllers 
            //  (e.g. this.game.input.leftAxisX, this.game.input.buttonA.pressed)
            this.game.input = this.controllerData;

            this.game.clock = new THREE.Clock();

            this.game.start();
        }


        this.update();


    },

});
