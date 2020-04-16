AFRAME.registerComponent('extended-wasd-controls', {

	schema: 
	{
		/*
			Default key assignments: WASDQERFTG. 
			(Pronounced: "wahz-dee-kerf-tig")

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
		
  		flyEnabled:  {type: 'boolean', default: true},
  		turnEnabled: {type: 'boolean', default: true},
  		lookEnabled: {type: 'boolean', default: true},

  		// if you are attaching extended-wasd-controls to a camera
  		//   that also has the look-controls component,
  		//   set this to true to use look-controls from rotation to calculate forward/right vectors.
  		// For responsive magic window effect on tablets, set turnEnabled/lookEnabled to false also.
  		coordinateLookControls: {type: 'boolean', default: false},

  		// consider setting to maxLook to false when working with look controls;
  		//   complicated to handle the combination accurately
  		maxLookEnabled: {type: 'boolean', default: true},
  		maxLookAngle: {type: 'number', default: 60},

  		moveSpeed: {type: 'number', default: 1},  // A-Frame units/second
		turnSpeed: {type: 'number', default: 30}, // degrees/second
		lookSpeed: {type: 'number', default: 30}  // degrees/second
	},

	convertKeyName: function(keyName)
	{
		if (keyName == " ")
			return "Space";
		else if (keyName.length == 1)
			return keyName.toUpperCase();
		else
			return keyName;
	},

	registerKeyDown: function(keyName)
	{
		// avoid adding duplicates of keys
		if ( !this.keyPressedSet.has(keyName) )
        	this.keyPressedSet.add(keyName);
	},

	registerKeyUp: function(keyName)
	{
       	this.keyPressedSet.delete(keyName);
	},

	isKeyPressed: function(keyName)
	{
       	return this.keyPressedSet.has(keyName);
	},

	init: function()
	{
		// register key down/up events 
		//  and keep track of all keys currently pressed
		this.keyPressedSet = new Set();
				
		let self = this;
		
		document.addEventListener( "keydown", 
			function(eventData) 
			{ 
				self.registerKeyDown( self.convertKeyName(eventData.key) );
			}
		);
		
		document.addEventListener( "keyup", 
			function(eventData) 
			{ 
				self.registerKeyUp( self.convertKeyName(eventData.key) );
			} 
		);

		// movement-related data

		this.forwardVector = new THREE.Vector3(0,0,-1);
		this.rightVector = new THREE.Vector3(1,0,0);
		this.upVector = new THREE.Vector3(0,1,0);
		
		// current rotation amounts
		this.turnAngle = 0; // around global Y axis
		this.lookAngle = 0; // around local X axis

		this.lookControls = null;
		if (this.data.coordinateLookControls)
		{
			this.lookControls = this.el.components["look-controls"];
		}
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
		
		// reset values
		this.upVector.set(0,1,0);

		let totalTurnAngle = 0;
		let totalLookAngle = 0;

		if ( this.data.coordinateLookControls )
		{
			totalTurnAngle += this.lookControls.yawObject.rotation.y;
			totalLookAngle += this.lookControls.pitchObject.rotation.x;
		}
		
		if ( this.data.lookEnabled )
		{
			if (this.isKeyPressed(this.data.lookUpKey))
				this.lookAngle += lookAmount;

			if (this.isKeyPressed(this.data.lookDownKey))
				this.lookAngle -= lookAmount;

			totalLookAngle += this.lookAngle;

			// look towards horizon when both are pressed;
			//   does not work well when used with look-controls
			if ( !this.data.coordinateLookControls )
			{
				if (this.isKeyPressed(this.data.lookUpKey)
					&& this.isKeyPressed(this.data.lookDownKey))
					this.lookAngle *= 0.90;
			}

			// enforce bounds on look angle (avoid upside-down perspective) 
			if ( this.data.maxLookEnabled )
			{
				if (this.lookAngle > maxLookAngle)
					this.lookAngle = maxLookAngle;
				if (this.lookAngle < -maxLookAngle)
					this.lookAngle = -maxLookAngle;
			}

			this.el.object3D.rotation.set(totalLookAngle, 0, 0);
		}

		if (this.data.turnEnabled)
		{
			if (this.isKeyPressed(this.data.turnLeftKey))
				this.turnAngle += turnAmount;

			if (this.isKeyPressed(this.data.turnRightKey))
				this.turnAngle -= turnAmount;

			totalTurnAngle += this.turnAngle;	

			this.el.object3D.rotateOnWorldAxis(this.upVector, totalTurnAngle);
		}

		// translations

		let c = Math.cos(totalTurnAngle);
		let s = Math.sin(totalTurnAngle);

		this.forwardVector.set( -s, 0, -c ).multiplyScalar( moveAmount );
		this.rightVector.set( c, 0, -s ).multiplyScalar( moveAmount );
		this.upVector.set( 0, 1, 0 ).multiplyScalar( moveAmount );

		// console.log("forward vec", this.forwardVector)

		if (this.isKeyPressed(this.data.moveForwardKey))
			this.el.object3D.position.add( this.forwardVector );

		if (this.isKeyPressed(this.data.moveLeftKey))
			this.el.object3D.position.sub( this.rightVector );

		if (this.isKeyPressed(this.data.moveBackwardKey))
			this.el.object3D.position.sub( this.forwardVector );

		if (this.isKeyPressed(this.data.moveRightKey))
			this.el.object3D.position.add( this.rightVector );

		if (this.data.flyEnabled)
		{
			if (this.isKeyPressed(this.data.moveUpKey))
				this.el.object3D.position.add( this.upVector );

			if (this.isKeyPressed(this.data.moveDownKey))
				this.el.object3D.position.sub( this.upVector );
		}

	}
});
