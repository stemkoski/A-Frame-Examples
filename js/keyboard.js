/*
    Keyboard.js: a class for simplifying keyboard interaction.
	Author: Lee Stemkoski.
	
	Usage: 
	// initialize keyboard
	var keyboard = new Keyboard();

	// in update loop
	keyboard.update();
	
	// check for discrete input (on key down/up event)
	keyboard.isKeyDown("Space");
	keyboard.isKeyUp("X");

	// check for continuous input (true between key down and key up events)
	keyboard.isKeyPressed("ArrowUp");
*/

class Keyboard
{
	constructor()
	{
		// Event listeners add keys to Queues.
		// Update method updates Sets accordingly.
		this.keyDownQueue  = new Set();
		this.keyUpQueue    = new Set();
		
		this.keyDownSet    = new Set();
		this.keyPressedSet = new Set();
		this.keyUpSet      = new Set();
				
		let self = this;
		
		document.addEventListener( "keydown", 
			function(eventData) 
			{ 
				let key = eventData.key;
				if (key == " ")
					key = "Space";
				if (key.length == 1)
					key = key.toUpperCase();
				self.keyDownQueue.add( key ); 
			}
		);
		
		document.addEventListener( "keyup", 
			function(eventData) 
			{ 
				let key = eventData.key;
				if (key == " ")
					key = "Space";
				if (key.length == 1)
					key = key.toUpperCase();
				self.keyUpQueue.add( key ); 
			} 
		);
	};
	
	update()
	{
		// clear previous discrete event status
		this.keyDownSet.clear();
		this.keyUpSet.clear();
		
		// update current event status
		for (let k of this.keyDownQueue)
		{
			// avoid multiple keydown events while holding key
            if ( !this.keyPressedSet.has(k) )
            {
                this.keyDownSet.add(k);
                this.keyPressedSet.add(k);
            }
		}
		
		for (let k of this.keyUpQueue)
		{
			this.keyPressedSet.delete(k);
			this.keyUpSet.add(k);
		}
		
		// clear the queues used to store events
		this.keyDownQueue.clear();
		this.keyUpQueue.clear();
	};
	
	// only true for a single frame after key down
	isKeyDown( keyName )
	{
		return ( this.keyDownSet.has(keyName) );
	};
	
	// true between key down and key up events
	isKeyPressed( keyName )
	{
		return ( this.keyPressedSet.has(keyName) );
	};
	
	// only true for a single frame after key up
	isKeyUp( keyName )
	{
		return ( this.keyUpSet.has(keyName) );
	};
}
