/* 
	Note: this component requires mathematical parser library from:
	https://github.com/silentmatt/expr-eval
*/
AFRAME.registerComponent('parametric-curve', {
    schema: 
    {
       xFunction: { type:"string", default: "cos(t)" },
       yFunction: { type:"string", default: "0.1 * t" },
       zFunction: { type:"string", default: "sin(t)" },
       tMin: {type: "number", default: 0},
       tMax: {type: "number", default: 10},
       totalPoints: {type: "number", default: 500},
       lineColor: {type:"color", default: "red"}
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

		let points = curve.getPoints( self.data.totalPoints );

		let geometry = new THREE.BufferGeometry().setFromPoints( points );
    	let material = new THREE.LineBasicMaterial({
			color: self.data.lineColor
		});
		let line = new THREE.Line( geometry, material );
		this.el.object3D.add( line );
	}
});
