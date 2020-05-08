/* 
	Note: compatible with aframe-parametric-curve and aframe-compass-curve components
*/
AFRAME.registerComponent("curve-follow",
{
	schema: 
    {
		// reference to entity containing component with curve data
		curveData:      { type: "string",  default: "" },
		// component type that generated curve data
		type:      		{ type: "string",  default: "parametric-curve" },

		// once end of path is reached, restart from beginning?
		loop: {type: "boolean", default: false},

		// time (seconds) required to traverse path
		duration: {type: "number", default: 4},

		// actively follow path?
		enabled: {type: "boolean", default: true},

		// follow path in reverse
		reverse: {type: "boolean", default: false}
    },

    init: function()
	{
		let entity = document.querySelector(this.data.curveData);
		if ( !entity )
		{
			console.error("no element: " + this.data.curveData);
			return;
		}
		let curveComponent = entity.components[this.data.type];
		if ( !curveComponent )
		{
			console.error(
				"element: " + this.data.curveData +
			 	" does not have component: " + this.data.type );
			return;			
		}


		let f    = curveComponent.eval;
		let tMin = curveComponent.data.tRange[0];
		let tMax = curveComponent.data.tRange[1];

		this.path = function ( u ) 
		{
			// three.js convention:
			// 'u' is a parameter in range [0, 1]; think of 'u' as percent
			// convert 'u' to value in range [tMin, tMax]
			let tValue = tMin + (tMax - tMin) * u;
			
			return f(tValue);
		};

		if ( !this.data.reverse )
		{
			// moving forwards (default), starting time is zero
			this.elapsedTime = 0; 		
		}
		else
		{
			// moving in reverse direction, starting time at maximum and counting down
			this.elapsedTime = this.data.duration;
		}
		
		this.upVector = new THREE.Vector3(0,1,0);
	},

	tick: function(time, deltaTime)
	{
		if ( !this.data.enabled )
			return;
		
		// once elapsedTime is out of bounds, reset (if looping) or return
		if ( this.elapsedTime > this.data.duration || this.elapsedTime < 0)
		{
			if ( this.data.loop )
			{
				if ( !this.data.reverse )
					this.elapsedTime = 0;
				else
					this.elapsedTime = this.data.duration;
			}
			else
				return;
		}

		// convert time (milliseconds) to t (seconds)
		// and take into account reverse direction setting
		if ( !this.data.reverse )
			this.elapsedTime += deltaTime / 1000;
		else
			this.elapsedTime -= deltaTime / 1000;
			
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
