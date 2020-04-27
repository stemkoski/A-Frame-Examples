/* 
	Note: this component requires mathematical parser library from:
	https://github.com/silentmatt/expr-eval

	// Parse slash-delimited string to an array 
  // (e.g., `foo="myProperty: a/b"` to `['a', 'b']`).
  myProperty: {
    default: [],
    parse: function (value) {
      return value.split('/');
    }
  }

  vec3array
  3 1 4, 2 3 5, 3 3 7, 2 4 8;
	split by ',' then by ' ' into THREE.Vector3 objects...

*/
AFRAME.registerComponent('curve', {
    schema: 
    {
    	// types: 
    	// * parametric (uses xyzFunctions, tRange)
    	// * TOOD: compass (uses an array of string directions)
    	// * TODO: points (uses an array of points?)
    	// creates a function that can be used by other components
		type: { type: "string", default: "parametric"},

		xyzFunctions: { type: "array", default: ["cos(t)", "0.1 * t", "sin(t)"] },
		tRange: 	  { type: "array", default: [0, 10], 
						parse: function(value) // convert array of strings to array of floats
						{ return value.split(",").map( parseFloat ); } }
    },
    
    eval: function(t)
    {
    	return new THREE.Vector3(t,t,t);
    },

    init: function() 
    {
    	if ( this.data.type == "parametric" )
    	{
    		// convert strings to functions
			let parser = new Parser();
			let xF = parser.parse(this.data.xyzFunctions[0]);
			let yF = parser.parse(this.data.xyzFunctions[1]);
			let zF = parser.parse(this.data.xyzFunctions[2]);
			console.log(xF, yF, zF);

			this.eval = function( tValue )
			{
				return new THREE.Vector3( 
					xF.evaluate( {t: tValue} ), 
					yF.evaluate( {t: tValue} ), 
					zF.evaluate( {t: tValue} ) 
				);
			}
		}
	}

});
