/* 
	Note: this component requires mathematical parser library from:
	https://github.com/silentmatt/expr-eval
*/
AFRAME.registerComponent('parametric-tube', {
    schema: 
    {
       xFunction: { type:"string", default: "cos(t)" },
       yFunction: { type:"string", default: "0.1 * t" },
       zFunction: { type:"string", default: "sin(t)" },
       tMin: {type: "number", default: 0},
       tMax: {type: "number", default: 10},
       tubeSegments: {type: "number", default: 50},
       radius: {type: "number", default: 0.1},
       radiusSegments: {type: "number", default: 8},
       closed: {type: "boolean", default: false},
       tubeColor: {type:"color", default: "red"}
    },
    
    init: function() 
    {
		let self = this;

		let parser = new Parser();
		let xF = parser.parse(this.data.xFunction);
		let yF = parser.parse(this.data.yFunction);
		let zF = parser.parse(this.data.zFunction);

		let curve = new THREE.Curve();
		curve.getPoint = function ( u ) 
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

		let geometry = new THREE.TubeGeometry( curve, self.data.tubeSegments, self.data.radius, self.data.radiusSegments, self.data.closed );

    	let material = new THREE.MeshLambertMaterial({
			color: self.data.tubeColor
		});
		let mesh = new THREE.Mesh( geometry, material );
		this.el.object3D.add( mesh );
	}
});
