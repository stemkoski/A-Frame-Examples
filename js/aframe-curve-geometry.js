/* 
	Note: compatible with aframe-parametric-curve and aframe-compass-curve components
*/
AFRAME.registerComponent('curve-geometry', {
    schema: 
    {
		// reference to entity containing component with curve data
		curveData:      { type: "string",  default: "" },
		// component type that generated curve data
		type:      		{ type: "string",  default: "parametric-curve" },
		
		totalPoints: { type: "number", default: 500},
		lineColor:   { type: "color",  default: "red"}
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

		let curve = new THREE.Curve();
		curve.getPoint = function ( u ) 
		{
			// three.js convention:
			// 'u' is a parameter in range [0, 1]; think of 'u' as percent
			// convert 'u' to value in range [tMin, tMax]
			let tValue = tMin + (tMax - tMin) * u;
			
			return f(tValue);
		};

		let points = curve.getPoints( this.data.totalPoints );
		let geometry = new THREE.BufferGeometry().setFromPoints( points );
    	let material = new THREE.LineBasicMaterial({
			color: this.data.lineColor
		});
		let line = new THREE.Line( geometry, material );
		this.el.object3D.add( line );
	}
});
