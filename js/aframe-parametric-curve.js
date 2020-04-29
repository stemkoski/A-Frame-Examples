/* 
	Note: this component requires mathematical parser library from:
	https://github.com/silentmatt/expr-eval
 */
AFRAME.registerComponent('parametric-curve', {
    schema: 
    {
		// data for curves defined by parametric functions
		xyzFunctions: { type: "array", default: ["cos(t)", "0.1 * t", "sin(t)"] },
		tRange: 	  { type: "array", default: [0, 10], 
						parse: function(value) // convert array of strings to array of floats
						{ return value.split(",").map( parseFloat ); } },
    },
    
    eval: function(t)
    {
    	return new THREE.Vector3(t,t,t);
    },

    init: function() 
    {
		// convert strings to functions
		let parser = new Parser();
		let xF = parser.parse(this.data.xyzFunctions[0]);
		let yF = parser.parse(this.data.xyzFunctions[1]);
		let zF = parser.parse(this.data.xyzFunctions[2]);

		this.eval = function( tValue )
		{
			return new THREE.Vector3( 
				xF.evaluate( {t: tValue} ), 
				yF.evaluate( {t: tValue} ), 
				zF.evaluate( {t: tValue} ) 
			);
		}
	}

});
