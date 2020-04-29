
AFRAME.registerComponent('compass-curve', {
    schema: 
    {
    	// set later; required by curve-follow component
		tRange: 	  { type: "array", default: [0, 1] },

		// data for curves defined by compass direction list
		directions: { type: "array", default: ["N"] }
    },
    
    eval: function(t)
    {
    	return new THREE.Vector3(t,t,t);
    },

    init: function() 
    {
    	/*
			// assumes array is sorted.
			let index = array.getSortedIndex(value);
			array[index] <= value && value < array[index+1]; 	
		*/
		Array.prototype.getSortedIndex = function(value) 
		{
			for (let index = 0; index < this.length - 1; index++)
			{
				// check if array[index] <= value < array[index+1]
				if ( this[index] <= value && value < this[index+1] )
					return index;
			}
			// value not contained in array bounds
			return -1;
		};
	
		let p = Math.PI/2;
		// these functions move from origin to nearby lattice point.
		// orientation: North = z-, South = z+, East = x+, West = x-
		let compassFunctions = 
		{
			N:  function(t) { return new THREE.Vector3( 0, 0, -t); }, 
			S:  function(t) { return new THREE.Vector3( 0, 0,  t); }, 
			E:  function(t) { return new THREE.Vector3( t, 0,  0); }, 
			W:  function(t) { return new THREE.Vector3(-t, 0,  0); },
			EN: function(t) { return new THREE.Vector3( Math.sin( t + 0*p), 0, Math.cos( t + 0*p)-1 ); },
			NW: function(t) { return new THREE.Vector3( Math.sin( t + 1*p)-1, 0, Math.cos( t + 1*p) ); }, 
			WS: function(t) { return new THREE.Vector3( Math.sin( t + 2*p), 0, Math.cos( t + 2*p)+1 ); }, 
			SE: function(t) { return new THREE.Vector3( Math.sin( t + 3*p)+1, 0, Math.cos( t + 3*p) ); }, 
			WN: function(t) { return new THREE.Vector3( Math.sin(-t - 0*p), 0, Math.cos(-t - 0*p)-1 ); },
			NE: function(t) { return new THREE.Vector3( Math.sin(-t - 1*p)+1, 0, Math.cos(-t - 1*p) ); }, 
			ES: function(t) { return new THREE.Vector3( Math.sin(-t - 2*p), 0, Math.cos(-t - 2*p)+1 ); }, 
			SW: function(t) { return new THREE.Vector3( Math.sin(-t - 3*p)-1, 0, Math.cos(-t - 3*p) ); }, 
  
		};
	
		// change in position after travelling along corresponding compassFunction
		let compassOffsets = 
		{
			N:  new THREE.Vector3( 0, 0, -1), 
			S:  new THREE.Vector3( 0, 0,  1), 
			E:  new THREE.Vector3( 1, 0,  0), 
			W:  new THREE.Vector3(-1, 0,  0),
			NE: new THREE.Vector3( 1, 0, -1), EN: new THREE.Vector3( 1, 0, -1),
			NW: new THREE.Vector3(-1, 0, -1), WN: new THREE.Vector3(-1, 0, -1),
			SE: new THREE.Vector3( 1, 0,  1), ES: new THREE.Vector3( 1, 0,  1),
			SW: new THREE.Vector3(-1, 0,  1), WS: new THREE.Vector3(-1, 0,  1)
		};
	
		// time required to travel along corresponding compassFunction at unit speed
		let compassDurations =
		{ 
			N:1, S:1, E:1, W:1, 
			NE:p, EN:p, NW:p, WN:p, SE:p, ES:p, SW:p, WS:p
		};
	
		let currentTime = 0;
		let currentPosition = new THREE.Vector3(0,0,0);	
	
		let timeArray = [];
		timeArray.push( currentTime );
	
		let positionArray = [];
		positionArray.push( currentPosition.clone() );
	
		let directionArray = this.data.directions;
	
		for (let n = 0; n < directionArray.length; n++)
		{
			let currentDirection = directionArray[n];
			
			currentTime += compassDurations[currentDirection];
			timeArray.push(currentTime);
	
			currentPosition.add( compassOffsets[currentDirection] );
			positionArray.push( currentPosition.clone() );
		}
	
		console.log( timeArray );
		console.log( positionArray );
		
		this.eval = function(t)
		{
			// extreme cases
			if (t <= 0)
				return new THREE.Vector3(0,0,0);
			if (t >= currentTime)
				return currentPosition.clone();
	
			let index = timeArray.getSortedIndex(t);
			let timeStart = timeArray[index];
			let timeOffset = t - timeStart;
	
			let direction = directionArray[index];
	
			let currentFunction = compassFunctions[direction];
			let positionStart = positionArray[index];
			let positionOffset = currentFunction(timeOffset);
	
			return new THREE.Vector3().addVectors( positionStart, positionOffset );
		}

		this.data.tRange = [0, currentTime];
	
	}

});
