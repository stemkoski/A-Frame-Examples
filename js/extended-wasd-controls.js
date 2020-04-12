AFRAME.registerComponent('extended-wasd-controls', {

	schema: 
	{
		/*
			Default key assignments: WASDQERFTG. 
			(Pronounced: "wahz-dee-kerf-tug")

			WASD: standard forward/left/backward/right movement
			Mnemonics:
			QE: turn left/right (positioned above move left/right keys)
			RF: move up/down ("R"ise / "F"all)
			TG: look up/down (look at "T"ower / "G"round.
		*/
		moveForwardKey:  {type: 'string', default: "W"},
		moveBackwardKey: {type: 'string', default: "S"},
		moveLeftKey:     {type: 'string', default: "A"},
		moveRightKey:    {type: 'string', default: "D"},
		moveUpKey:       {type: 'string', default: "R"},
		moveDownKey:     {type: 'string', default: "F"},
		turnLeftKey:     {type: 'string', default: "Q"},
		turnRightKey:    {type: 'string', default: "E"},
		lookUpKey:       {type: 'string', default: "T"},
		lookDownKey:     {type: 'string', default: "G"},
		
  		flyEnabled:  {type: 'boolean', default: 'true'},
  		turnEnabled: {type: 'boolean', default: 'true'},
  		lookEnabled: {type: 'boolean', default: 'true'},

  		maxLookAngle: {type: 'number', default: 60},

  		moveSpeed: {type: 'number', default: 1},  // A-Frame units/second
		turnSpeed: {type: 'number', default: 30}, // degrees/second
		lookSpeed: {type: 'number', default: 30}  // degrees/second
	},

	init: function()
	{
		// register key down/up events 
		//  and keep track of all keys currently pressed
		this.keyPressedSet = new Set();
				
		let self = this;
		
		let convertKeyName = function(keyName)
		{
			if (keyName == " ")
				return "Space";
			else if (keyName.length == 1)
				return keyName.toUpperCase();
			else
				return keyName;
		}

		document.addEventListener( "keydown", 
			function(eventData) 
			{ 
				let keyName = convertKeyName( eventData.key );
				// avoid adding duplicates of keys
				if ( !self.keyPressedSet.has(keyName) )
            		self.keyPressedSet.add(keyName);
			}
		);
		
		document.addEventListener( "keyup", 
			function(eventData) 
			{ 
				let keyName = convertKeyName( eventData.key );
				self.keyPressedSet.delete(keyName);
			} 
		);

		// movement-related data

		this.forwardVector = new THREE.Vector3(0,0,-1);
		this.rightVector = new THREE.Vector3(1,0,0);
		this.upVector = new THREE.Vector3(0,1,0);
		
		// current rotation amounts
		this.turnAngle = 0; // around global Y axis
		this.lookAngle = 0; // around local X axis
	},
	
	tick: function (time, timeDelta) 
	{
		// console.log( this.keyPressedSet );

		let moveAmount = (timeDelta/1000) * this.data.moveSpeed;
		// need to convert angle measures from degrees to radians
		let turnAmount = (timeDelta/1000) * THREE.Math.degToRad(this.data.turnSpeed);
		let lookAmount = (timeDelta/1000) * THREE.Math.degToRad(this.data.lookSpeed);
		let maxLookAngle = THREE.Math.degToRad(this.data.maxLookAngle);
		
		// rotations

		if (this.data.turnEnabled)
		{
			if (this.keyPressedSet.has(this.data.turnLeftKey))
				this.turnAngle += turnAmount;

			if (this.keyPressedSet.has(this.data.turnRightKey))
				this.turnAngle -= turnAmount;
		}

		if (this.data.lookEnabled)
		{
			if (this.keyPressedSet.has(this.data.lookUpKey))
				this.lookAngle += lookAmount;

			if (this.keyPressedSet.has(this.data.lookDownKey))
				this.lookAngle -= lookAmount;

			// look towards horizon when both are pressed
			if (this.keyPressedSet.has(this.data.lookUpKey)
				&& this.keyPressedSet.has(this.data.lookDownKey))
				this.lookAngle *= 0.90;

			// enforce bounds on look angle (avoid upside-down perspective)
			if (this.lookAngle > maxLookAngle)
				this.lookAngle = maxLookAngle;
			if (this.lookAngle < -maxLookAngle)
				this.lookAngle = -maxLookAngle;
		}

		this.upVector.set(0,1,0);
		this.el.object3D.rotation.set(this.lookAngle, 0, 0);
		this.el.object3D.rotateOnWorldAxis(this.upVector, this.turnAngle);

		// translations

		let c = Math.cos(this.turnAngle);
		let s = Math.sin(this.turnAngle);

		this.forwardVector.set( -s, 0, -c ).multiplyScalar( moveAmount );
		this.rightVector.set( c, 0, -s ).multiplyScalar( moveAmount );
		this.upVector.set( 0, 1, 0 ).multiplyScalar( moveAmount );

		if (this.keyPressedSet.has(this.data.moveForwardKey))
			this.el.object3D.position.add( this.forwardVector );

		if (this.keyPressedSet.has(this.data.moveLeftKey))
			this.el.object3D.position.sub( this.rightVector );

		if (this.keyPressedSet.has(this.data.moveBackwardKey))
			this.el.object3D.position.sub( this.forwardVector );

		if (this.keyPressedSet.has(this.data.moveRightKey))
			this.el.object3D.position.add( this.rightVector );

		if (this.data.flyEnabled)
		{
			if (this.keyPressedSet.has(this.data.moveUpKey))
				this.el.object3D.position.add( this.upVector );

			if (this.keyPressedSet.has(this.data.moveDownKey))
				this.el.object3D.position.sub( this.upVector );
		}

	}
});
