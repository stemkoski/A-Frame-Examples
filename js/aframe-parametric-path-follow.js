/* 
	Note: this component requires mathematical parser library from:
	https://github.com/silentmatt/expr-eval
*/
AFRAME.registerComponent("parametric-path-follow",
{
	schema: 
    {
       // parametric function to follow
       xFunction: { type:"string", default: "cos(t)" },
       yFunction: { type:"string", default: "1" },
       zFunction: { type:"string", default: "sin(t)" },

       // start and end values on path
       tMin: {type: "number", default: 0},
       tMax: {type: "number", default: 10},

       // once end of path is reached, restart from beginning?
       loop: {type: "boolean", default: false},

       // time (seconds) required to traverse path
       duration: {type: "number", default: 4},

       // actively follow path?
       enabled: {type: "boolean", default: true}
    },

    init: function()
	{
		let self = this;

		let parser = new Parser();
		let xF = parser.parse(this.data.xFunction);
		let yF = parser.parse(this.data.yFunction);
		let zF = parser.parse(this.data.zFunction);

		this.path = function( u ) 
		{
			// u is a parameter in range [0, 1]; think of as percent
			// convert to value in range [tMin, tMax]
			let tValue = self.data.tMin + (self.data.tMax - self.data.tMin) * u;
			
			return new THREE.Vector3( 
				xF.evaluate( {t: tValue} ), 
				yF.evaluate( {t: tValue} ), 
				zF.evaluate( {t: tValue} ) 
			);
		};

		this.elapsedTime = 0;
		this.upVector = new THREE.Vector3(0,1,0);
	},

	tick: function(time, deltaTime)
	{
		if ( !this.data.enabled )
			return;
		
		if ( this.elapsedTime > this.data.duration )
		{
			if ( this.data.loop )
				this.elapsedTime = 0;
			else
				return;
		}

		// convert time (milliseconds) to t (seconds)
		this.elapsedTime += deltaTime / 1000;
		let percentComplete = this.elapsedTime / this.data.duration;

		// get current position; take into account travel speed (duration)
		let pos = this.path( percentComplete );

		this.el.object3D.position.set( pos.x, pos.y, pos.z );

		let pos2 = this.path( percentComplete + 0.0001 );
		let deltaPos = new THREE.Vector3().subVectors(pos2, pos);

		let rotX = Math.asin( deltaPos.y / deltaPos.length() );
		let rotY = Math.atan2( deltaPos.x, deltaPos.z );

		this.el.object3D.rotation.set( -rotX, 0, 0 );
		this.el.object3D.rotateOnWorldAxis(this.upVector, rotY);
	}
});
