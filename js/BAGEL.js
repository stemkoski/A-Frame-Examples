/* ===========================================================================

A subset of the Basic Adaptable Game Engine Library (BAGEL).

=========================================================================== */



/**
 *  A Vector is a pair of values (x,y), useful for 
 *   representing position (see {@link Rectangle} and {@link Sprite}). 
 */
class Vector
{
	/**
	 * Set initial values for (x, y); defaults to (0, 0).
	 * @constructor
	 * @param {number} x - the x coordinate
	 * @param {number} y - the y coordinate
	 */
	constructor(x=0, y=0)
	{
		this.x = x;
		this.y = y;
	}

    /**
     * Set new values for the x and y coordinates.
     * @param {number} x - new x coordinate
     * @param {number} y - new y coordinate
     */
	setValues(x, y)
	{
		this.x = x;
		this.y = y;
	}

    /**
     * Add values to the x and y coordinates.
     * @param {number} dx - value to add to the x coordinate
     * @param {number} dy - value to add to the y coordinate
     */
	addValues(dx, dy)
	{
		this.x += dx;
		this.y += dy;
	}

    /**
     * Add x and y components of another vector to this vector.
     * @param {Vector} other - vector to be added to this vector
     */
    addVector(other)
	{
		this.x += other.x;
		this.y += other.y;
	}

	/**
     * Multiple x and y components of this vector by a constant.
     * @param {number} value - value to multiply by
     */
    multiply(value)
	{
		this.x *= value;
		this.y *= value;
	}
	
	/**
     * Get the length of this vector.
     * @return {number} the length of this vector
     */
    getLength()
	{
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	
	/**
     * Get the angle (in degrees) between this vector and the positive x-axis.
     * <br/>
     * (Angles increase in clockwise direction, since positive y-axis is down.)
     * @return {number} angle between this vector and positive x-axis
     */
    getAngle()
	{
		// range: -180 to 180
		if (this.getLength() == 0)
			return 0;
		else
			return Math.atan2(this.y, this.x) * 180/Math.PI;
	}

	/**
     * Set the length of this vector (without changing the current direction).
     * @param {number} length - new length of this vector
     */
    setLength(length)
	{
		let angleDegrees = this.getAngle();
		this.x = length * Math.cos(angleDegrees * Math.PI/180);
		this.y = length * Math.sin(angleDegrees * Math.PI/180);
	}	

	/**
     * Set the angle (in degrees) between this vector and the positive x-axis
     *  (without changing the current length).
     * <br/>
     * (Angles increase in clockwise direction, since positive y-axis is down.)
     * @param {number} angleDegrees - the new direction angle of this vector
     */
    setAngle(angleDegrees)
	{
		let length = this.getLength();
		this.x = length * Math.cos(angleDegrees * Math.PI/180);
		this.y = length * Math.sin(angleDegrees * Math.PI/180);
	}
}

/**
 *  A Rectangle has a size (width and height) and a position (x, y).
 *  <br/>
 *  The position is stored as a {@link Vector} so it can easily be synchronized with the position of a {@link Sprite}.
 */
class Rectangle
{
	/**
	 * Set initial center position (x, y) and size (width and height).
	 * @constructor
	 * @param {number} x - x coordinate of the top-left corner
	 * @param {number} y - y coordinate of the top-left corner
	 * @param {number} width - width: the length in the x-direction
	 * @param {number} height - height: the length in the y-direction
	 */
	constructor(x=0, y=0, width=0, height=0)
	{
		this.position = new BAGEL.Vector(x,y);
		this.width = width;
		this.height = height;
	}
	
	/**
	 * Set new center position (x, y) and new size (width and height).
	 * @param {number} x - x coordinate of the top-left corner
	 * @param {number} y - y coordinate of the top-left corner
	 * @param {number} width - width: the length in the x-direction
	 * @param {number} height - height: the length in the y-direction
	 */
	setValues(x, y, width, height)
	{
		this.position.setValues(x,y);
		this.width = width;
		this.height = height;
	}

	/**
	 * Set new center position (x, y).
	 * @param {number} x - x coordinate of the top-left corner
	 * @param {number} y - y coordinate of the top-left corner
	 */
	setPosition(x, y)
	{
		this.position.setValues(x,y);
	}

	/**
	 * Set new size (width and height).
	 * @param {number} width - width: the length in the x-direction
	 * @param {number} height - height: the length in the y-direction
	 */
	setSize(width, height)
	{
		this.width = width;
		this.height = height;
	}
	
	/**
	 * Determine if this rectangle overlaps another rectangle (includes overlapping edges).
	 * @param {Rectangle} other - rectangle to check for overlap with
	 * @return {boolean} true if this rectangle overlaps other rectangle, false otherwise
	 */
	overlaps(other)
	{
		let noOverlap = (other.position.x + other.width/2 <= this.position.x - this.width/2) 
		              || (this.position.x + this.width/2 <= other.position.x - other.width/2) 
					  || (other.position.y + other.height/2 <= this.position.y - this.height/2) 
					  || (this.position.y + this.height/2 <= other.position.y - other.height/2);
		return !noOverlap;
	}
}


/**
 * A Texture stores an Image and a {@link Rectangle}
 *  that indicates which region of the Image will be drawn.
 */
class Texture
{
	/**
	 * Initialize empty Image and Rectangle objects;
	 *  data set with the {@link Texture#load|load} method.
	 * @constructor
	 */
	constructor()
	{
		this.image  = new Image();
		this.region = new BAGEL.Rectangle();
	}
	
	/**
	 * Load image file and set size of rectangle to image dimensions.
	 * @param {string} filename the name (including path) of the image file  
	 */
	async load(filename)
	{
		this.image.src = filename;
  		await this.image.decode();
		this.region.setSize(this.image.width, this.image.height);
	}
}


/**
 *  A Group stores a collection of {@link Sprite|Sprites}.
 */
class Group
{
	/**
	 *  Initializes a list to store Sprites.
	 *  @constructor
	 */
	constructor()
	{
		// using arrays rather than sets, because draw order is important.
		this.spriteList = [];
	}
	
	/**
	 * Add a sprite to this group.
	 * @param {Sprite} sprite - a sprite to add to this group
	 */ 
	addSprite(sprite)
	{
		sprite.parentGroup = this;
		this.spriteList.push(sprite);
	}
	
	/**
	 * Remove a sprite from this group.
	 * @param {Sprite} sprite - a sprite to remove from this group
	 */ 
	removeSprite(sprite)
	{
		sprite.parentGroup = null;
		let index = this.spriteList.indexOf(sprite);
		if (index > -1)
			this.spriteList.splice(index, 1);
	}

	/**
	 * Get the list of sprites stored in this group.
	 * <br/>
	 * Typically used in loops that involve all sprites in this group.
	 * @return {List} the list of sprites in this group
	 */ 
	getSpriteList()
	{
		return this.spriteList;
	}
	
	/**
	 * Get the number of sprites in this group.
	 * @return {number} the number of sprites in this group
	 */ 
	getSpriteCount()
	{
		return this.spriteList.length;
	}

	/**
	 * Draw the sprites in this group.
     * @param context - the graphics context object associated to the game canvas
	 */ 
	drawSprites(context)
	{
		for (let sprite of this.spriteList)
			sprite.draw(context);
	}

	/**
	 * Update the sprites in this group.
     * @param deltaTime - the change in time since the last clock update
	 */ 
	updateSprites(deltaTime)
	{
		for (let sprite of this.spriteList)
			sprite.update(deltaTime);
	}

}


/**
 *  A Screen contains the code for each individual game screen, 
 *   such as a title screen, menu screens, and screens corresponding to each room or level in the game.
 * <br/> 
 * Each screen manages a collection of {@link Group|Groups}, 
 *   each of which stores a list of {@link Sprite|Sprites}, 
 *   that are rendered by the {@link Game} class,
 *   in the order in which they were added. 
 * <br/>
 * Classes which extend Screen must implement the {@link Screen#initialize|initialize} and {@link Screen#update|update} methods.
 */
class Screen
{

	/**
	 *  Creates a collection to store {@link Group|Groups}, a default Group named "main",
	 *  a variable to reference the {@link Game} containing this screen,
	 *  and calls the {@link Screen#initialize|initialize} method.
	 *  @constructor
	 */
	constructor()
	{		
		// collection of Groups to be rendered by Game
		this.groupCollection = {};
		this.groupCollection["main"] = new BAGEL.Group();

		// a list to store the order in which groups are added;
		//   necessary because draw order is important
		this.groupDrawOrder = [];
		this.groupDrawOrder.push("main");

		// store reference to Game containing this Screen
		this.game = null;

    	// set up screen-specific objects
		this.initialize();
	}

	/**
	 * Create a new group and add it to the collection.
	 * @param {string} groupName - the name that will be used to reference the group
	 */
	createGroup(groupName)
	{
	  this.groupCollection[groupName] = new BAGEL.Group();
	  this.groupDrawOrder.push(groupName);
	}

	/**
	 * Get a group from the collection.
	 * @param {string} groupName - the name of the group
	 * @return {Group} the group stored with the given name
	 */
	getGroup(groupName)
	{
	  return this.groupCollection[groupName];
	}	

	/**
	 * Add a sprite to a group in the collection.
	 * @param {Sprite} sprite - the sprite to be added
	 * @param {string} groupName - the name of the group
	 */
	addSpriteToGroup(sprite, groupName="main")
	{
	  this.getGroup(groupName).addSprite(sprite);
	}	

	/**
	 * Get the list of sprites stored in the group with the given name.
	 * <br/>
	 * Typically used in loops that involve all sprites in this group.
	 * @param {string} groupName - the name of the group
	 * @return {List} the list of sprites in the group
	 */
	getGroupSpriteList(groupName)
	{
	  return this.getGroup(groupName).getSpriteList();
	}

	/**
	 * Get the number of sprites stored in the group with the given name.
	 * @param {string} groupName - the name of the group
	 * @return {number} the number of sprites in the group
	 */
	getGroupSpriteCount(groupName)
	{
	  return this.getGroup(groupName).getSpriteCount();
	}


	/**
	 * Draw all sprites in all groups in the collection (in the order they were added).
     * @param context - the graphics context object associated to the game canvas
	 */
	drawGroups(context)
	{
		for (let i = 0; i < this.groupDrawOrder.length; i++)
		{
			let groupName = this.groupDrawOrder[i];
			this.getGroup(groupName).drawSprites(context);
		}
	}	

	/**
	 * Update all sprites in all groups in the collection.
     * @param deltaTime - the change in time since the last clock update
	 */
	updateGroups(deltaTime)
	{
		for (let i = 0; i < this.groupDrawOrder.length; i++)
		{
			let groupName = this.groupDrawOrder[i];
			this.getGroup(groupName).updateSprites(deltaTime);
		}
	}	

	/**
	 *  Create all objects and any other initialization code required by this screen.
	 *  <br/>
	 *    Must be implemented by extending class.
	 *  <br/>
	 *  Note: this method will typically be "async" because "await" should be used when loading textures.
	 */
	async initialize()
	{ 
		throw new Error("initialize() method not implemented");
	}

	/**
	 *  Update all game logic for this screen, such as processing player input,
	 *    interaction between sprites, and game event conditions (such as win/lose). 
	 *  <br/>
	 *    Must be implemented by extending class.
	 */
	update()
	{ 
		throw new Error("update() method not implemented");
	}


}

// ================================================================================================

/**
 *  (Special Game class implementation for A-Frame, to run BAGEL game on a canvas in a scene.)
 * 
 *   Manages a collection of {@link Screen} objects, which contain the code for each individual game screen,
 *   and manages up the {@link Input} object and {@link Clock} objects, shared by all screens.
 *  <br/>
 *  Classes which extend Game must implement the {@link Game#initialize|initialize} method.
 */
class Game
{

	/**
	 * Set up the canvas where the game will appear.
	 * @constructor
	 * @param {number} width the width of the canvas containing the game
	 * @param {number} height the height of the canvas containing the game
	 */
	constructor(width=800, height=600)
	{
		
	}

	/**
	 *  Add {@link Screen} objects and set first screen to display.
	 *  <br/>
	 *  Must be implemented by extending class.
	 */
	initialize()
	{ 
		throw new Error("initialize() method not implemented");
	}

	/**
	 * Add a {@link Screen} object to this game.
	 * @param {string} screenName - the name that should be used to refer to the screen when using the {@link Game#setScreen|setScreen} method
	 * @param {Screen} screenObject - the screen to be added to the game
	 */
	addScreen(screenName, screenObject)
	{
		this.screenList[screenName] = screenObject;	
	}

	/**
	 * Set the active {@link Screen} object for this game. 
	 * <br/>
	 * During each frame, the game calls the {@link Screen#update|Screen.update} method and
	 *  renders the {@link Sprite|Sprites} in the {@link Group} of the active screen. 
	 * @param {string} screenName - the name of the associated screen initially specified by the {@link Game#addScreen|addScreen} method
	 */
	setScreen(screenName)
	{
		this.activeScreen = this.screenList[screenName];

		this.activeScreen.game = this;
	}
	
	/**
	 * Start the game: create game objects and run the {@link Game#initialize|initialize} method.
	 */
	start()
	{	
		// store collection of screen objects, indexed by name
		this.screenList = {};

		// the currently active screen, will be displayed in game
		this.activeScreen = null;

		// TODO: global data structure for passing data between screens?

		this.initialize();
	}

    /**
	 * Clear the game canvas by drawing a colored rectangle that fills the canvas.
	 * @param {string} clearColor - name or hex code of color to use when clearing the canvas
	 */
	clearCanvas(clearColor = "#000000")
	{
		this.context.setTransform(1,0, 0,1, 0,0);
		this.context.fillStyle = clearColor
		this.context.fillRect(0,0, this.canvas.width, this.canvas.height);
	}

    /**
	 * Update the game: update the game {@link Input} and {@link Clock} objects,
	 *   run the active screen's update method, and draw the active screen's sprite images to the canvas. 
	 */
	update()
	{

		// clock handled by A-Frame component (THREE.js Clock class)

		// input handled by A-Frame component

		// update active screen's game state
		// this.activeScreen.group.act(this.deltaTime);
		this.activeScreen.update();
		
		// clear window canvas
		this.clearCanvas("#337");

		// render active screen's sprite images to canvas
		this.activeScreen.drawGroups(this.context);

		// loop handled by A-Frame component
	}
	



}


