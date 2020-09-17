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

  		maxLookEnabled: {type: 'boolean', default: true},
  		maxLookAngle:   {type: 'number',  default: 60},

  		moveSpeed: {type: 'number', default: 1},  // A-Frame units/second
		turnSpeed: {type: 'number', default: 30}, // degrees/second
		lookSpeed: {type: 'number', default: 30},  // degrees/second

		// use keyboard or other (e.g. joystick) to activate these controls
		inputType: {type: 'string', default: "keyboard"}
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

		this.moveVector  = new THREE.Vector3(0,0,0);
		this.movePercent = new THREE.Vector3(0,0,0);
		// z = forward/backward
		// x = left/right
		// y = up/down

		this.rotateVector  = new THREE.Vector2(0,0);
		this.rotatePercent = new THREE.Vector2(0,0);
		// y = turn angle
		// x = look angle

		// used as reference vector when turning
		this.upVector = new THREE.Vector3(0,1,0);
		
		// current rotation amounts
		this.turnAngle = 0; // around global Y axis
		this.lookAngle = 0; // around local X axis

		// this will = null or an object
		this.lookControls = this.el.components["look-controls"];
		
		// allows easy extraction of turn angle
		this.el.object3D.rotation.order = 'YXZ';
	},
	

	tick: function (time, timeDelta) 
	{
		let moveAmount = (timeDelta/1000) * this.data.moveSpeed;
		// need to convert angle measures from degrees to radians
		let turnAmount = (timeDelta/1000) * THREE.Math.degToRad(this.data.turnSpeed);
		let lookAmount = (timeDelta/1000) * THREE.Math.degToRad(this.data.lookSpeed);
		let maxLookAngle = THREE.Math.degToRad(this.data.maxLookAngle);
		
		// rotations
		
		// reset values
		let totalTurnAngle = 0;
		let totalLookAngle = 0;

		// look-controls and extended-wasd-controls are compatible
		//   with desktop/mouse combo but not for tablet/gyroscope combo ("magic window" effect)
		//   (at least not with this code)
		// thus, look/turn automatically disabled when look-controls present

		console.log("rev. 6");

		if ( this.lookControls ) // take into account look-controls, if they exist
		{
			// this code is only useful when trying to combine 
			//   look-controls with extended-wasd rotation
			// totalTurnAngle += this.lookControls.yawObject.rotation.y;
			// totalLookAngle += this.lookControls.pitchObject.rotation.x;
		}
		else
		{
			if (this.data.inputType == "keyboard")
			{
				// need to reset rotatePercent values
				//   when querying which keys are currently pressed
				this.rotatePercent.set(0,0);

				if (this.isKeyPressed(this.data.lookUpKey))
					this.rotatePercent.x += 1;
				if (this.isKeyPressed(this.data.lookDownKey))
					this.rotatePercent.x -= 1;

				if (this.isKeyPressed(this.data.turnLeftKey))
					this.rotatePercent.y += 1;
				if (this.isKeyPressed(this.data.turnRightKey))
					this.rotatePercent.y -= 1;

				// center on horizon
				if (this.isKeyPressed(this.data.lookUpKey) && this.isKeyPressed(this.data.lookDownKey))
					this.lookAngle *= 0.90;
			}
			else // other, e.g. "joystick"
			{
				// assume this.rotatePercent values have been set/reset elsewhere (outside of this function)
			}

			if ( this.data.lookEnabled )
			{
				this.lookAngle += this.rotatePercent.x * lookAmount;
				this.el.object3D.rotation.x = this.lookAngle;
			}

			if ( this.data.turnEnabled )
			{
				this.turnAngle += this.rotatePercent.y * turnAmount;
				this.el.object3D.rotation.y = this.turnAngle;
			}

			// enforce bounds on look angle (avoid upside-down perspective) 
			if ( this.data.maxLookEnabled )
			{
				if (this.lookAngle > maxLookAngle)
					this.lookAngle = maxLookAngle;
				if (this.lookAngle < -maxLookAngle)
					this.lookAngle = -maxLookAngle;
			}
		}

		// translations

		// this only works when rotation order = "YXZ"
		let finalTurnAngle = this.el.object3D.rotation.y;
		
		let c = Math.cos(finalTurnAngle);
		let s = Math.sin(finalTurnAngle);

		if (this.data.inputType == "keyboard")
		{
			// need to reset movePercent values
			//   when querying which keys are currently pressed
			this.movePercent.set(0,0,0)

			if (this.isKeyPressed(this.data.moveForwardKey))
				this.movePercent.z += 1;
			if (this.isKeyPressed(this.data.moveBackwardKey))
				this.movePercent.z -= 1;

			if (this.isKeyPressed(this.data.moveRightKey))
				this.movePercent.x += 1;
			if (this.isKeyPressed(this.data.moveLeftKey))
				this.movePercent.x -= 1;

			if ( this.data.flyEnabled )
			{
				if (this.isKeyPressed(this.data.moveUpKey))
					this.movePercent.y += 1;
				if (this.isKeyPressed(this.data.moveDownKey))
					this.movePercent.y -= 1;
			}
		}
		else // other, e.g. "joystick"
		{
			// assume this.movePercent values have been set/reset elsewhere (outside of this function)
		}

		// forward(z) direction: [ -s,  0, -c ]
		//   right(x) direction: [  c,  0, -s ]
		//      up(y) direction: [  0,  1,  0 ]
		// multiply each by (maximum) movement amount and percentages (how much to move in that direction)

		this.moveVector.set( -s * this.movePercent.z + c * this.movePercent.x,
							  1 * this.movePercent.y,
							 -c * this.movePercent.z - s * this.movePercent.x ).multiplyScalar( moveAmount );

		this.el.object3D.position.add( this.moveVector );
	}
});
