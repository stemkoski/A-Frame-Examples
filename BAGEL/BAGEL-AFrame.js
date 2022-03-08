// ===============================================================================================
/**
 *  The Basic Adaptable Game Engine Library
 *
 *  https://github.com/stemkoski/BAGEL-Javascript
 *
 *  created by Lee Stemkoski
 *
 *  https://stemkoski.net
 *
 * 
 */ 

// create namespace

var BAGEL = {};

// ===============================================================================================

/**
 * A framework for storing a method that is applied to a target {@link Sprite} over time. 
 * <br/>
 * Actions are typically created with the static methods in the 
 * {@link ActionFactory} class, added to the target {@link Sprite}, 
 * and will then be applied automatically. 
 * <br/>
 * Actions return true when finished.
 * <br/>
 * Custom Action objects may be created by using inline functions with the necessary parameters, such as:
 * <pre>
 * let teleportRight = new BAGEL.Action(
 *   function(targetSprite, deltaTime, totalTime)
 *   {
 *     targetSprite.moveBy(100, 0);
 *     return true;
 *   }
 * );
 * </pre>
 */
BAGEL.Action = class
{   
    /**
     * This constructor is used by static {@link ActionFactory} methods.
     * <br/>
     * Actions store their total running time, as some Actions run only for a precise amount of time.
     * @param {function} actFunction - function that will be applied to the Sprite this Action is attached to;
     *   must take parameters (targetSprite, deltaTime, totalTime).
    */
    constructor(actFunction=null)
    {
        this.actFunction = actFunction;
        this.totalTime = 0;
    }
    
    /**
     * Increments totalTime by deltaTime and applies function to target.
     * @param {Sprite} targetSprite - the sprite to which the function will be applied
     * @param {number} deltaTime - elapsed time (seconds) since previous iteration of game loop (typically approximately 1/60 second)
     * @return {boolean} true if the function has completed, false otherwise
     */
    apply(targetSprite, deltaTime)
    {
        this.totalTime += deltaTime;
        return this.actFunction(targetSprite, deltaTime, this.totalTime);
    }
    
    /**
     * Sets totalTime to 0, effectively restarting this Action.
     */
    reset()
    {
        this.totalTime = 0;
    }
}
    
 // ===============================================================================================

/**
 * A factory class for creating {@link Action} objects.
 */
BAGEL.ActionFactory = class
{
    /**
     * Create an Action to move a Sprite by a fixed amount over a period of time.
     * <br>This Action is complete once movement has finished.
     * @param {number} deltaX - distance to move Sprite in the x-direction
     * @param {number} deltaY - distance to move Sprite in the y-direction
     * @param {number} duration - total time to be used for movement
     * @return {Action} Action to move a Sprite by a fixed amount over a period of time.
     */
    static moveBy(deltaX, deltaY, duration)
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                targetSprite.moveBy( deltaX * deltaTime/duration, deltaY * deltaTime/duration );
                return (totalTime >= duration);
            }
        );
    }

    /**
     * Create an Action to rotate a Sprite by a fixed amount over a period of time.
     * <br>This Action is complete once rotation has finished.
     * @param {number} deltaAngle - angle to rotate Sprite
     * @param {number} duration - total time to be used for movement
     * @return {Action} Action to rotate a Sprite by a fixed amount over a period of time
     */
    static rotateBy(deltaAngle, duration)
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                targetSprite.rotateBy( deltaAngle * deltaTime/duration );
                return (totalTime >= duration);
            }
        );
    }

    /**
     * Create an Action to fade out (reduce opacity of) a Sprite over a period of time.
     * <br>This Action is complete once the Sprite's opacity reaches 0.
     * <br>To automatically remove a Sprite once it has finished fading out, use:
     * <br>
     * <code>
     * ActionFactory.sequence([ 
     * <br> &nbsp;&nbsp; ActionFactory.fadeOut(fadeRate), 
     * <br> &nbsp;&nbsp; ActionFactory.remove() 
     * <br> ])
     * </code>
     * @param {number} fadeDuration - how long (seconds) until fade is complete
     * @return {Action} Action to fade out a Sprite over a period of time
     */
    static fadeOut(fadeDuration)
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                targetSprite.opacity -= deltaTime/fadeDuration;
                if (targetSprite.opacity < 0)
                    targetSprite.opacity = 0;
                return (targetSprite.opacity <= 0);
            }
        );
    }

    /**
     * Create an Action to fade in (increase opacity of) a Sprite over a period of time.
     * <br>This Action is complete once the Sprite's opacity reaches 1.
     * @param {number} fadeDuration - how long (seconds) until fade is complete
     * @return {Action} Action to fade in a Sprite over a period of time
     */
    static fadeIn(fadeDuration)
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                targetSprite.opacity += deltaTime/fadeDuration;
                if (targetSprite.opacity > 1)
                    targetSprite.opacity = 1;
                return (targetSprite.opacity >= 1);
            }
        );
    }

    /**
     * Create an Action to perform a sequence of actions. 
     * Each Action in the list is performed only after all previous actions in the list have completed.
     * <br>
     * This Action is complete once all the corresponding actions are complete.
     * @param {array} actionArray - one or more actions to perform in sequence
     * @return {Action} Action that performs a sequence of actions
     */
    static sequence(actionArray)
    { 
        let sequenceAction = new BAGEL.Action();

        sequenceAction.actionArray = actionArray;
        sequenceAction.actionIndex = 0;

        // uses additional variables defined above
        sequenceAction.apply = function(targetSprite, deltaTime, totalTime)
        {
            // retrieve first action in array
            let currentAction = sequenceAction.actionArray[sequenceAction.actionIndex];
            // run action on target
            let finished = currentAction.apply(targetSprite, deltaTime);
            // if that action is finished, move on to the next
            if (finished)
                sequenceAction.actionIndex += 1;
            // if array is empty, this (sequence) action is finished
            return (sequenceAction.actionIndex == sequenceAction.actionArray.length);
        }

        // overriding default reset function
        sequenceAction.reset = function()
        {
            for (let i = 0; i < sequenceAction.actionArray.length; i++)
                sequenceAction.actionArray[i].reset();

            sequenceAction.actionIndex = 0;
        }

        return sequenceAction;
    }

    /**
     * Create an Action that repeats another Action a fixed number of times.
     * <br>This Action is complete once the specified Action has been completed
     *  the specified number of times.
     * @param {Action} action - Action to be repeated
     * @param {number} totalTimes - total number of times to repeat the specified Action
     * @return {Action} Action that repeats another Action a fixed number of times
     */
    static repeat(action, totalTimes)
    { 
        let repeatAction = new BAGEL.Action();

        repeatAction.finishedTimes = 0;

        repeatAction.apply = function(targetSprite, deltaTime)
        {
            let finished = action.apply(targetSprite, deltaTime);
            if (finished)
            {
                repeatAction.finishedTimes += 1;
                action.reset();
            }
            return (repeatAction.finishedTimes == totalTimes);
        }
        
        return repeatAction;
    }

    /**
     * Create an Action that repeats another Action forever.
     * <br>This Action is never complete.
     * @param {Action} action - Action to be repeated
     * @return {Action} Action that repeats another Action forever
     */
    static forever(action)
    { 
        let foreverAction = new BAGEL.Action();

        foreverAction.apply = function(targetSprite, deltaTime)
        {
            let finished = action.apply(targetSprite, deltaTime);
            if (finished)
                action.reset();
            return false;
        }
        
        return foreverAction;
    }

    /**
     * Create an Action that waits for a specified amount of time.
     * This is typically used in conjunction with a {@link ActionFactory#sequence|sequence} action.
     * <br>This Action is complete once the specified amount of time passes.
     * @param {number} duration - amount of time to wait
     * @return {Action} Action that waits for a specified amount of time
     */
    static delay(duration)
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                return (totalTime >= duration);
            }
        );
    }

    /**
     * Create an Action that automatically removes a Sprite.
     * <br>This Action is complete immediately.
     * @return {Action} Action that automatically removes a Sprite
     */
    static destroy()
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                targetSprite.destroy();
                return true;
            }
        );
    }
    
    /**
     * Create an Action that checks if animation is finished.
     * <br> 
     * To remove a Sprite after its animation is complete, use:
     * <br>
     * <code>
     * ActionFactory.sequence([ 
     * <br> &nbsp;&nbsp; ActionFactory.isAnimationFinished(), 
     * <br> &nbsp;&nbsp; ActionFactory.remove() 
     * <br> ])
     * </code>
     * @return {Action} Action that automatically removes a Sprite
     */
    static isAnimationFinished()
    {
        return new BAGEL.Action(
            function(targetSprite, deltaTime, totalTime)
            {
                return targetSprite.animation.isFinished();
            }
        );
    }



}

 // ===============================================================================================

/**
 * An Animation is similar to a {@link Texture} but designed for drawing images from a spritesheet
 *   (a grid of images), with methods to automatically update
 */
BAGEL.Animation = class
{

    /**
     * Load image file and create list of regions depending on number of rows and columns in spritesheet.
     * @param {string} filename the name (including path) of the image file  
     * @param {number} rows - the number of rows in the spritesheet
     * @param {number} cols - the number of columns in the spritesheet
     * @param {number} frameDuration - time (seconds) to display each frame (region in spritesheet)
     * @param {boolean} loop - whether to restart animation once all frames have been displayed
     * @constructor
     */
    constructor(fileName, rows=1, cols=1, frameDuration=0.25, loop=false)
    {
        this.texture  = new BAGEL.Texture();
        this.regionList = [];
        this.elapsedTime = 0;
        this.paused = false;

        this.frameDuration = 0.25;
        this.totalDuration = null;
        this.loop = false;

        // only try to load a file if a fileName is given
        // (this will not be the case when cloning an Animation)
        if ( fileName )
        {
            let self = this;

            // this code automatically runs after image data loaded
            this.texture.image.onload = function()
            {

                // create list of rectangles
                let frameWidth  = self.texture.image.width  / cols;
                let frameHeight = self.texture.image.height / rows;         
                for (let y = 0; y < rows; y++)
                {
                    for (let x = 0; x < cols; x++)
                    {
                        let region = new BAGEL.Rectangle(x*frameWidth, y*frameHeight, frameWidth, frameHeight)
                        self.regionList.push( region );
                    }
                }
                self.texture.region = self.regionList[0];

                self.frameDuration = frameDuration;
                self.totalDuration  = frameDuration * self.regionList.length;
                self.loop = loop;
            }

            this.texture.image.src = fileName;
        }
    }
    

    /**
     * Updates elapsedTime and updates the rectangular region used by texture
     *  depending on how much time has elapsed.
     */
    update(deltaTime)
    {
        if (this.paused)
            return;
            
        this.elapsedTime += deltaTime;
    
        // check if loop is reset
        if (this.loop && this.elapsedTime > this.totalDuration)
            this.elapsedTime -= this.totalDuration;
        
        let regionIndex = Math.floor( this.elapsedTime / this.frameDuration );
        if ( regionIndex >= this.regionList.length )
            regionIndex = this.regionList.length - 1;
        this.texture.region = this.regionList[regionIndex];
    }

    /**
     *  Determines if this animation is finished displaying all frames (and is not set to loop).
     *  @return {boolean} if this animation has finished
     */
    isFinished()
    {
        return (this.elapsedTime >= this.regionList.length * this.frameDuration) && !this.loop;
    }

    /**
     *  Make a copy of this object.
     *  <br>An animation object can not be shared between multiple sprites because each
     *   may have started at different times, thus have different elapsedTime values.
     *  @return {Animation} a copy of this Animation object
     */
    clone()
    {
        let anim            = new BAGEL.Animation();
        anim.texture.image  = this.texture.image;
        anim.texture.region = this.regionList[0];
        anim.regionList     = this.regionList;
        anim.frameDuration  = this.frameDuration;
        anim.totalDuration  = this.totalDuration;
        anim.loop           = this.loop;
        return anim;
    }

}

// ===============================================================================================

// no BAGEL.Clock class


// ===============================================================================================

// ****   Special Game class Implementation for A-Frame   ****
// **** designed to work with bagel-game-player component ****


/**
 *  The Game class sets up the canvas where the game appears,
 *   manages a collection of {@link Screen} objects, which contain the code for each individual game screen,
 *   and manages up the {@link Input} object and {@link Clock} objects, shared by all screens.
 *  <br/>
 *  Classes which extend Game must implement the {@link Game#initialize|initialize} method.
 */
BAGEL.Game = class
{

    /**
     *
     */
    constructor()
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
        if ( !this.screenFadeTransition || this.activeScreen == null)
        {
            this.activeScreen = this.screenList[screenName];
            this.activeScreen.resume();
        }
        else
        {
            this.screenFadeInProgress = true;
            this.screenFadeType = "out";
            this.screenFadeOpacity = 0.00;
            this.nextScreenName = screenName;
        }
    }

    
    /**
     * Determine whether current screen will fade out and
     *  next screen will fade in, when the screen is changed
     *  using {@link Game#setScreen|setScreen}, 
     *  and set the screen fade duration and color. 
     * @param {boolean} screenFadeTransition - whether or not screens will fade in and fade out
     * @param {number} screenFadeDuration - the amount of time to fade in and fade out
     * @param {string} screenFadeColor - the color of the fade between screens
     */
    setScreenFadeTransition(screenFadeTransition = true,
        screenFadeDuration = 1.0, screenFadeColor = "#000000" )
    {
        this.screenFadeTransition = screenFadeTransition;
        this.screenFadeDuration   = screenFadeDuration;
        this.screenFadeColor      = screenFadeColor;
    }


    /**
     * Store data at a global level so it is accessible to all {@link Screen|screens} via {@link Game#getData|getData}.
     * <br>
     * Note: required data must be set before screens are created.
     * @param {string} dataName - name used to reference and retrieve data later
     * @param {object} dataValue - value to be stored
     */
    setData(dataName, dataValue)
    {
        this.data[dataName] = dataValue;
    }

    /**
     * Retrieve data previously stored by {@link Game#setData|setData}.
     */
    getData(dataName)
    {
        return this.data[dataName];
    }

    /**
     * Start the game: create game objects and run the {@link Game#initialize|initialize} method.
     */
    start()
    {
        // Input and Clock handled by A-Frame component

        // store collection of screen objects, indexed by name
        this.screenList = {};

        // the currently active screen, will be displayed in game
        this.activeScreen = null;

        // variables for screen fade transitions
        this.screenFadeTransition = false;
        this.screenFadeInProgress = false;
        this.screenFadeType = "out";
        this.screenFadeDuration = 1.0;
        this.screenFadeColor = "#000000";
        this.screenFadeOpacity = 0.00;
        this.nextScreenName = null;

        // global data structure for passing data between screens
        this.data = {};

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

    // called by A-Frame component tick() function, which also supplies deltaTime value

    /**
     * Update the game: update the game {@link Input} and {@link Clock} objects,
     *   run the active screen's update method, and draw the active screen's sprite images to the canvas. 
     */
    update(deltaTime) // deltaTime calculated by A-Frame clock component
    {
        // input update handled by A-Frame controller component        
        
        // update active screen's game state
        this.activeScreen.updateGroups(deltaTime);
        this.activeScreen.update(deltaTime);
        
        // clear window canvas
        this.clearCanvas("#337");

        // render active screen's sprite images to canvas
        this.activeScreen.drawGroups(this.context);

        // if screen fade is active, draw a translucent overlay
        //  and switch screen between fade in and out
        if (this.screenFadeTransition && this.screenFadeInProgress)
        {
            if (this.screenFadeType == "out")
            {
                this.screenFadeOpacity += deltaTime / this.screenFadeDuration;
                if (this.screenFadeOpacity > 1)
                {
                    this.screenFadeOpacity = 1;
                    this.activeScreen = this.screenList[this.nextScreenName];
                    this.activeScreen.resume();
                    this.screenFadeType = "in";
                }
            }
            else if (this.screenFadeType == "in")
            {
                this.screenFadeOpacity -= deltaTime / this.screenFadeDuration;
                if (this.screenFadeOpacity < 0)
                {
                    this.screenFadeOpacity = 0;
                    this.screenFadeInProgress = false;
                }
            }

            this.context.globalAlpha = this.screenFadeOpacity;
            this.clearCanvas(this.screenFadeColor);
            this.context.globalAlpha = 1.00;
        }

        // loop handled by A-Frame component
    }
    
}


// ===============================================================================================

// no BAGEL.Gamepad class

// ===============================================================================================

/**
 *  A Group stores a collection of {@link Sprite|Sprites}.
 */
BAGEL.Group = class
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

// ===============================================================================================

// no BAGEL.Input class required

 // ===============================================================================================

/**
 *  A Label draws text on the canvas of a {@link Game}.
 *  <br/>
 *  Labels must be added to {@link Group|Groups}, similar to {@link Sprite|Sprites}, to appear in a Game.
 */
BAGEL.Label = class
{
    /**
     * Initialize default values for all properties.
     */
    constructor()
    {
        this.text = " ";

        this.position = new BAGEL.Vector();
        this.alignment = "left"; // "left" | "center" | "right"

        // style options, configured by setProperties method        
        this.visible = true;

        this.fontName = "Arial Black";
        this.fontSize = 36;
        this.fontColor = "#00FFFF";

        this.drawBorder = true;
        this.borderSize = 1;
        this.borderColor = "black";

        this.drawShadow = true;
        this.shadowColor = "black";
        this.shadowSize = 4;

        // extra graphics options
        this.visible = true;
        this.opacity = 1.00;

        this.lineHeight = 1.5;

        // list of Actions: functions applied to object over time
        this.actionList = [];
    }

    /**
     * Set the location of this label.
     * @param {number} x - the x coordinate of the text, corresponding to the location specified by the "alignment" parameter
     * @param {number} x - the y coordinate of the baseline of the text
     * @param {string} alignment - one of: "left", "center", "right"; determines what location of the text that the x coordinate refers to 
     */ 
    setPosition(x,y, alignment="left")
    {
        this.position.setValues(x, y);
        this.alignment = alignment;
    }

    /**
     * Set the text displayed by this label.
     * @param {string} text - the text displayed by this label
     */
    setText(text)
    {
        this.text = text;
    }

    /**
     * Set the style properties for displaying text.
     * <br/>
     * Properties that can be set include:
     * <ul>
     * <li> <tt>fontName</tt> (string, e.g. "Arial Black")
     * <li> <tt>drawBorder</tt> and <tt>drawShadow</tt> (boolean)
     * <li> <tt>fontSize</tt>, <tt>borderSize</tt>, and <tt>shadowSize</tt> (number)
     * <li> <tt>fontColor</tt>, <tt>borderColor</tt>, and <tt>shadowColor</tt> (string, e.g. "red" or "#FF0000")
     * </ul>
     * Properties are specified with an object.
     * <br/>
     * For example: <tt>{ "fontSize" : 48, "fontColor" : "#8800FF", "drawShadow" : false }</tt>
     * @param {object} properties - an object containing property name and value pairs
     */ 
    setProperties( properties )
    {
        for (let name in properties)
        {
            if ( this.hasOwnProperty(name) )
                this[name] = properties[name];
        }
    }

    /**
     * Change this sprite's position by the given amounts.
     * @param {number} dx - value to add to the position x coordinate
     * @param {number} dy - value to add to the position y coordinate
     */
    moveBy(dx, dy)
    {
        this.position.addValues(dx, dy);
    }   

    /**
     * Change the opacity when drawing, 
     *   enabling objects underneath to be partially visible
     *   by blending their colors with the colors of this object.
     * <br>
     * 0 = fully transparent (appears invisible);  1 = fully opaque (appears solid) 
     * @param {number} opacity - opacity of this object
     */
    setOpacity(opacity)
    {
        this.opacity = opacity;
    }

    /**
     * Set whether this sprite should be visible or not;
     *  determines whether sprite will be drawn on canvas.
     * @param {boolean} visible - determines if this sprite is visible or not
     */
    setVisible(visible)
    {
        this.visible = visible;
    }

    /**
     * Remove this sprite from the group that contains it.
     */
    destroy()
    {
        this.parentGroup.removeSprite(this);
    }


    /**
     * Add an {@link Action} to this object: a special function that
     *  will be automatically applied over time until it is complete.
     * <br>
     * Most common actions can be created with the static methods in the
     * {@link ActionFactory} class.
     * <br>
     * All actions added to this object are performed in parallel, unless
     *  enclosed by a {@link ActionFactory#sequence|Sequence} action.
     * @param {Action} action - an action to be applied to this object
     */
    addAction(action)
    {
        this.actionList.push(action);
    }

    /**
     *  Process any {@link Action|Actions} that have been added to this Label.
     *  @param {number} deltaTime - time elapsed since previous frame
     */
    update(deltaTime)
    {
        // Update all actions (in parallel, by default).
        // Using a copy of the list to avoid skipping the next action in the list
        //  when the previous action is removed.
        let actionListCopy = this.actionList.slice();
        for (let action of actionListCopy)
        {
            let finished = action.apply(this, deltaTime);
            if (finished)
            {
                let index = this.actionList.indexOf(action);
                if (index > -1)
                    this.actionList.splice(index, 1);
            }
        }
    }

    /**
     * Draw the label on a canvas, using the style properties specified by this object.
     * @param context - the graphics context object associated to the game canvas
     */
    draw(context)
    {
        if ( !this.visible )
            return;

        context.font = "bold " + this.fontSize + "px " + this.fontName;
        context.fillStyle = this.fontColor;
        context.textAlign = this.alignment;
        
        context.setTransform(1,0, 0,1, 0,0); 
        context.globalAlpha = this.opacity;

        // shadow draw settings
        if (this.drawShadow)
        {
            context.shadowColor = this.shadowColor;
            context.shadowBlur = this.shadowSize;
        }

        // add support for multiline text (line breaks indicated by "\n")
        let textArray  = this.text.split("\n");
        let lineSkip = this.fontSize * this.lineHeight;

        // draw filled in text (multiple times to increase drop shadow intensity)
        for (let i = 0; i < textArray.length; i++)
        {
            context.fillText( textArray[i], this.position.x, this.position.y + i * lineSkip);
            context.fillText( textArray[i], this.position.x, this.position.y + i * lineSkip);
        }

        // disable shadowBlur, otherwise all sprites drawn later will have shadows
        context.shadowBlur = 0;
        // draw filled text again, to fill over interior shadow blur, that may be a different color
        for (let i = 0; i < textArray.length; i++)
        {
            context.fillText( textArray[i], this.position.x, this.position.y + i * lineSkip);
        }

        // draw border last, so not hidden by filled text
        if (this.drawBorder)
        {
            context.strokeStyle = this.borderColor;
            context.lineWidth = this.borderSize;
            for (let i = 0; i < textArray.length; i++)
            {
                context.strokeText( textArray[i], this.position.x, this.position.y + i * lineSkip);
            }
        }       
    }

}

 // ===============================================================================================

/**
 *  The Physics class performs position-velocity-acceleration {@link Vector} related calculations
 *   for more advanced {@link Sprite} movement. 
 *  <br/>
 *  For example, can set speed and motion angle of a sprite with constant velocity (no deceleration),
 *   or player character can accelerate at an angle and automatically decelerate at a fixed rate.
 *  <br/>
 *  Similar to the {@link Rectangle} class design, 
 *   the Physics position Vector can be set to reference the position of a {@link Sprite},
 *   which keeps them synchronized.
 *  <br/>
 *  A Physics object needs to be updated once per frame; for Sprites, this is handled by
 *   their {@link Sprite#update|update} method.
 */
BAGEL.Physics = class
{
    /**
     * Initialize position, velocity, and acceleration vectors,
     *   and set acceleration, maximum speed, and deceleration values.
     * @param {number} accValue - default magnitude of acceleration when using {@link Physics#accelerateAtAngle|accelerateAtAngle}
     * @param {number} maxSpeed - maximum speed: if speed is ever above this amount, it will be reduced to this amount
     * @param {number} decValue - when not accelerating, object will decelerate (decrease speed) by this amount
     * @constructor
     */
    constructor(accValue, maxSpeed, decValue)
    {
        this.positionVector     = new BAGEL.Vector(0,0);
        this.velocityVector     = new BAGEL.Vector(0,0);
        this.accelerationVector = new BAGEL.Vector(0,0);
        this.accelerationValue = accValue
        this.maximumSpeed      = maxSpeed;
        this.decelerationValue = decValue;
    }

    
    /**
     * Get the current speed of this object (pixels/second).
     * @return {number} current speed
     */ 
    getSpeed() 
    { 
        return this.velocityVector.getLength(); 
    }

    /**
     * Set the speed (pixels/second) for this object (without changing the current angle of motion).
     * @param {number} speed - the new speed
     */
    setSpeed(speed) 
    { 
        this.velocityVector.setLength(speed); 
    }
    
    /**
     * Get the current angle of motion (in degrees) of this object.
     * <br/>
     * (The angle is measured from the positive x-axis, 
     * and angles increase in clockwise direction, since positive y-axis is down.)
     * @return {number} current angle of motion
     */ 
    getMotionAngle()
    {
        return this.velocityVector.getAngle();
    }
    
    /**
     * Set the angle of motion (in degrees) for this object (without changing the current speed).
     * <br/>
     * (The angle is measured from the positive x-axis, 
     * and angles increase in clockwise direction, since positive y-axis is down.)
     * @param {number} angleDegrees - the new angle of motion
     */
    setMotionAngle(angleDegrees)
    {
        this.velocityVector.setAngle(angleDegrees);
    }

    /**
     * Accelerate this object by a multiple of base acceleration value in the given direction.
     * @param {number} percent - percentage of acceleration value (specified in constructor) to apply
     * @param {number} angleDegrees - the direction of acceleration
     */
    acceleratePercentAtAngle(percent, angleDegrees)
    {
        let v = new BAGEL.Vector();
        v.setLength(this.accelerationValue * percent);
        v.setAngle(angleDegrees);
        this.accelerationVector.addVector( v );
    }

    /**
     * Accelerate this object in the given direction.
     * <br/>
     * (Uses the constant acceleration value specified in constructor.)
     * @param {number} angleDegrees - the direction of acceleration
     */
    accelerateAtAngle(angleDegrees)
    {
        this.acceleratePercentAtAngle( 1.00, angleDegrees );
    }

    /**
     *  Update the values for position, velocity, and acceleration vectors.
     *  <br/>
     *  This method should be called once per frame (automatically handled for {@link Sprite} objects). 
     */
    update(deltaTime)
    {
        // apply acceleration to velocity
        this.velocityVector.addValues( 
            this.accelerationVector.x * deltaTime, 
            this.accelerationVector.y * deltaTime );

        let speed = this.getSpeed();

        // decrease speed (decelerate) when not accelerating
        if (this.accelerationVector.getLength() < 0.001)
            speed -= this.decelerationValue * deltaTime;

        // keep speed within set bounds
        if (speed < 0)
            speed = 0;
        if (speed > this.maximumSpeed)
            speed = this.maximumSpeed;

        // update velocity
        this.setSpeed(speed);

        // apply velocity to position
        this.positionVector.addValues( 
            this.velocityVector.x * deltaTime, 
            this.velocityVector.y * deltaTime );

        // reset acceleration
        this.accelerationVector.setValues(0,0);
    }

}

 // ===============================================================================================

/**
 *  A Rectangle has a size (width and height) and a position (x, y).
 *  <br/>
 *  The position is stored as a {@link Vector} so it can easily be synchronized with the position of a {@link Sprite}.
 */
BAGEL.Rectangle = class
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

 // ===============================================================================================

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
BAGEL.Screen = class
{

    /**
     *  Creates a collection to store {@link Group|Groups}, a default Group named "main",
     *  a variable to reference the {@link Game} containing this screen,
     *  and calls the {@link Screen#initialize|initialize} method.
     *  @param {Game} game - a reference to the Game containing this Screen
     *  @constructor
     */
    constructor(game)
    {       
        // collection of Groups to be rendered by Game
        this.groupCollection = {};
        this.groupCollection["main"] = new BAGEL.Group();

        // a list to store the order in which groups are added;
        //   necessary because draw order is important
        this.groupDrawOrder = [];
        this.groupDrawOrder.push("main");

        // store reference to Game containing this Screen
        this.game = game;

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
     * Remove a sprite from a group in the collection.
     * <br/>
     * (Note: simpler to use the {@link Sprite} class {@link Sprite#destroy|destroy} method.) 
     * @param {Sprite} sprite - the sprite to be removed
     * @param {string} groupName - the name of the group
     */
    removeSpriteFromGroup(sprite, groupName)
    {
      this.getGroup(groupName).removeSprite(sprite);
    }   

    /**
     * Remove all sprites from a group in the collection.
     * @param {string} groupName - the name of the group
     */
    removeAllSpritesFromGroup(groupName)
    {
      let spriteList = this.getGroupSpriteList(groupName);
      // traverse list in reverse order
      //  because splicing from list changes indices
      for (let i = spriteList.length - 1; i >= 0; i--)
      {
          let sprite = spriteList[i];
          sprite.destroy();
      }
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
     * Pauses the game: enables/disables automatic {@link Group#update|Group updates}, 
     *   which in turn calls the {@link Sprite#update|Sprite update} functions.
     * <br>
     * The {@link Screen#update|Screen update} function is still called, 
     *   so {@link Input} functions can still be checked,
     *   to enable the user to un-pause the currently running game.
     */
    setPaused(paused)
    {   
        this.paused = paused;
    }

    /**
     * Update all sprites in all groups in the collection.
     * <br>
     * Can be enabled/disabled with {@link Screen#setPaused|setPaused}.
     * @param deltaTime - the change in time since the last clock update
     */
    updateGroups(deltaTime)
    {
        if (this.paused)
            return;

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
     */
    initialize()
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


    /**
     *  Resume function is called by Game {@link Game#setScreen|setScreen} function, 
     *    which enables screen data to be updated, if needed. 
     *  <br/>
     *    Optional to implement in extending class.
     */
    resume()
    { 
        
    }

}

 // ===============================================================================================

/**
 * A Sprite represents the entities in a game.
 * <br/>
 * Sprites have a {@link Vector} position, a {@link Rectangle} boundary, and a {@link Texture}.
 */
BAGEL.Sprite = class
{
    /**
     * Initialize all fields to default values.
     * @constructor
     */
    constructor()
    {
        this.position  = new BAGEL.Vector();
        this.rectangle = new BAGEL.Rectangle();

        // keep position of boundary rectangle
        //  synchronized with sprite position
        this.rectangle.position = this.position;

        this.texture = null;
        this.visible = true;

        // the Group that contains this sprite
        this.parentGroup = null;

        // additional graphics-related data

        // initial angle = 0 indicates sprite is initially facing to the right
        this.angle  = 0;
        this.opacity = 1.0;
        this.mirrored = false;
        this.flipped = false;

        // store physics data
        this.physics = null;

        // store rectangles to define boundary/wrapping/destroy areas.
        // if a rectangle exists, corresponding function called during update.
        this.boundRectangle   = null;
        this.wrapRectangle    = null;
        this.destroyRectangle = null;

        // store animation data
        this.animation = null;

        // list of Actions: functions applied to object over time
        this.actionList = [];   
    }
    
    /**
     * Set the x and y coordinates of the center of this sprite.
     * @param {number} x - the new x coordinate of the center of this sprite
     * @param {number} y - the new y coordinate of the center of this sprite
     */
    setPosition(x, y)
    {
        this.position.setValues(x, y);
    }

    /**
     * Change this sprite's position by the given amounts.
     * @param {number} dx - value to add to the position x coordinate
     * @param {number} dy - value to add to the position y coordinate
     */
    moveBy(dx, dy)
    {
        this.position.addValues(dx, dy);
    }   
    
    /**
     * Set the texture used when drawing this sprite.
     *  Also updates the size of the sprite to the size of the texture.
     * @param {Texture} texture - the texture to use when drawing this sprite
     */
    setTexture(texture)
    {
        this.texture = texture;
        this.rectangle.width  = texture.region.width;
        this.rectangle.height = texture.region.height;
    }
    
    /**
     * Set the size (rectangle width and height) of the sprite;
     *  used when drawing sprite and checking for overlap with other sprites.
     * @param {number} width - the new width of this sprite
     * @param {number} height - the new height of this sprite
     */
    setSize(width, height)
    {
        this.rectangle.width  = width;
        this.rectangle.height = height;
    }
    
    /**
     * Set whether this sprite should be visible or not;
     *  determines whether sprite will be drawn on canvas.
     * @param {boolean} visible - determines if this sprite is visible or not
     */
    setVisible(visible)
    {
        this.visible = visible;
    }

    /**
     * Get the angle (in degrees) between this sprite and the positive x-axis.
     * <br/>
     * (Angles increase in clockwise direction, since positive y-axis is down.)
     * @return {number} angle between this sprite and positive x-axis
     */
    getAngle(angleDegrees)
    {
        this.angle = angleDegrees;
    }

    /**
     * Set the angle (in degrees) between this sprite and the positive x-axis.
     * <br/>
     * (Angles increase in clockwise direction, since positive y-axis is down.)
     * @param {number} angleDegrees - the new direction angle of this sprite
     */
    setAngle(angleDegrees)
    {
        this.angle = angleDegrees;
    }

    /**
     * Rotate this sprite by the given amount.
     * @param {number} angleDegrees - the angle (in degrees) to rotate this sprite by
     */
    rotateBy(angleDegrees)
    {
        this.angle += angleDegrees;
    }

    /**
     * Move this sprite by a given distance in a given direction.
     * @param {number} distance - distance this sprite will move
     * @param {number} angle - direction along which this sprite will move
     */
    moveAtAngle(distance, angleDegrees)
    {
        this.position.x += distance * Math.cos(angleDegrees * Math.PI/180);
        this.position.y += distance * Math.sin(angleDegrees * Math.PI/180);
    }
    
    /**
     * Move this sprite by a given distance along its current direction angle.
     * @param {number} distance - distance this sprite will move
     */
    moveForward(distance)
    {
        this.moveAtAngle(distance, this.angle);
    }

    /**
     * Change the opacity when drawing, 
     *   enabling objects underneath to be partially visible
     *   by blending their colors with the colors of this object.
     * <br>
     * 0 = fully transparent (appears invisible);  1 = fully opaque (appears solid) 
     * @param {number} opacity - opacity of this object
     */
    setOpacity(opacity)
    {
        this.opacity = opacity;
    }

    /**
     * Determine if this sprite overlaps another sprite (includes overlapping edges).
     * @param {Sprite} other - sprite to check for overlap with
     * @return {boolean} true if this sprite overlaps other sprite, false otherwise
     */
    overlaps(other)
    {
        return this.rectangle.overlaps( other.rectangle );
    }

    /**
     * Initialize {@link Physics} data for this sprite and link to position.
     * <br/>
     * Physics object will be automatically updated and used to control position. 
     * @param {number} accValue - default magnitude of acceleration when using {@link Physics#accelerateAtAngle|accelerateAtAngle}
     * @param {number} maxSpeed - maximum speed: if speed is ever above this amount, it will be reduced to this amount
     * @param {number} decValue - when not accelerating, object will decelerate (decrease speed) by this amount
     */
    setPhysics(accValue, maxSpeed, decValue)
    {
        this.physics = new BAGEL.Physics(accValue, maxSpeed, decValue);
        this.physics.positionVector = this.position;
    }

    /**
     * Set world dimensions (width and height) to be used to bound sprite position within the world.
     * <br/>
     * Calling this function will cause {@link Sprite#boundWithinRectangle|boundWithinRectangle} 
     *  to be called automatically by the {@link Sprite#update|update} function.
     * @param {number} width - the width of the screen or world
     * @param {number} height - the height of the screen or world
     */
    setBoundRectangle(width, height)
    {
        this.boundRectangle = new BAGEL.Rectangle(width/2,height/2, width,height);
    }

    /**
     * Set world dimensions (width and height) to be used to wrap sprite around world when moving beyond screen edges.
     * <br/>
     * Calling this function will cause {@link Sprite#wrapAroundRectangle|wrapAroundRectangle} 
     *  to be called automatically by the {@link Sprite#update|update} function.     
     * @param {number} width - the width of the screen or world
     * @param {number} height - the height of the screen or world
     */
    setWrapRectangle(width, height)
    {
        this.wrapRectangle = new BAGEL.Rectangle(width/2,height/2, width,height);
    }

    /**
     * Set world dimensions (width and height) to be used to destroy sprite if it moves beyond world edges.
     * <br/>
     * Calling this function will cause {@link Sprite#destroyOutsideRectangle|destroyOutsideRectangle} 
     *  to be called automatically by the {@link Sprite#update|update} function.     
     * @param {number} width - the width of the screen or world
     * @param {number} height - the height of the screen or world
     */
    setDestroyRectangle(width, height)
    {
        this.destroyRectangle = new BAGEL.Rectangle(width/2,height/2, width,height);
    }

    /**
     * Adjusts the position of this sprite
     *  so that it remains completely contained within screen or world dimensions.
     * <br/>
     * Called automatically by {@link Sprite#update|update} if {@link Sprite#setBoundRectangle|setBoundRectangle} was previously called.
     * @param {number} worldWidth - the width of the screen or world
     * @param {number} worldHeight - the height of the screen or world
     */
    boundWithinRectangle(worldWidth, worldHeight)
    {
        if (this.position.x - this.rectangle.width/2 < 0)
            this.position.x = this.rectangle.width/2;

        if (this.position.x + this.rectangle.width/2 > worldWidth)
            this.position.x = worldWidth - this.rectangle.width/2;

        if (this.position.y - this.rectangle.height/2 < 0)
            this.position.y = this.rectangle.height/2;

        if (this.position.y + this.rectangle.height/2 > worldHeight)
            this.position.y = worldHeight - this.rectangle.height/2;             
    }

    /**
     * If this sprite moves completely beyond an edge of the screen or world,
     *   adjust its position to the opposite side.
     * <br/>
     * Called automatically by {@link Sprite#update|update} if {@link Sprite#setWrapRectangle|setWrapRectangle} was previously called.
     * @param {number} worldWidth - the width of the screen or world
     * @param {number} worldHeight - the height of the screen or world
     */
    wrapAroundRectangle(worldWidth, worldHeight)
    {
        if (this.position.x + this.rectangle.width/2 < 0)
            this.position.x = worldWidth + this.rectangle.width/2;

        if (this.position.x - this.rectangle.width/2 > worldWidth)
            this.position.x = -this.rectangle.width/2;

        if (this.position.y + this.rectangle.height/2 < 0)
            this.position.y = worldHeight + this.rectangle.height/2;             

        if (this.position.y - this.rectangle.height/2 > worldHeight)
            this.position.y = -this.rectangle.height/2;
    }

    /**
     * Destroy this sprite if it moves completely beyond the edges of the screen or world.
     * <br/>
     * Called automatically by {@link Sprite#update|update} if {@link Sprite#setDestroyRectangle|setDestroyRectangle} was previously called.
     * @param {number} worldWidth - the width of the screen or world
     * @param {number} worldHeight - the height of the screen or world
     */
    destroyOutsideRectangle(worldWidth, worldHeight)
    {
        if ( (this.position.x + this.rectangle.width/2 < 0) || 
            
             (this.position.x - this.rectangle.width/2 > worldWidth) ||
             (this.position.y + this.rectangle.height/2 < 0) ||
             (this.position.y - this.rectangle.height/2 > worldHeight) )
            this.destroy();
    }

    /**
     * Set the {@link Animation} used when drawing this sprite.
     * <br/>
     * Also updates the size of the sprite to the size of an animation frame.
     * <br/>
     * Animation object will be automatically updated and used when drawing sprite. 
     * @param {Animation} animation - the animation to use when drawing this sprite
     */
    setAnimation(animation)
    {
        this.animation = animation;
        this.texture = animation.texture;
        this.rectangle.width  = animation.texture.region.width;
        this.rectangle.height = animation.texture.region.height;
    }

    /**
     * Add an {@link Action} to this sprite: a special function that
     *  will be automatically applied to the sprite over time until it is complete.
     * <br>
     * Most common actions can be created with the static methods in the
     * {@link ActionFactory} class.
     * <br>
     * All actions added to this sprite are performed in parallel, unless
     *  enclosed by a {@link ActionFactory#sequence|Sequence} action.
     * @param {Action} action - an action to be applied to this object
     */
    addAction(action)
    {
        this.actionList.push(action);
    }


    /**
     * Perform any internal actions that should be repeated every frame.
     * @param {number} deltaTime - time elapsed since previous frame
     */
    update(deltaTime)
    {
        // use physics to update position (based on velocity and acceleration)
        //   if it has been initialized for this sprite
        if (this.physics != null)
            this.physics.update(deltaTime);

        if (this.boundRectangle != null)
            this.boundWithinRectangle(this.boundRectangle.width, this.boundRectangle.height);

        if (this.wrapRectangle != null)
            this.wrapAroundRectangle(this.wrapRectangle.width, this.wrapRectangle.height);

        if (this.destroyRectangle != null)
            this.destroyOutsideRectangle(this.destroyRectangle.width, this.destroyRectangle.height);

        if (this.animation != null)
            this.animation.update(deltaTime);

        // Update all actions (in parallel, by default).
        // Using a copy of the list to avoid skipping the next action in the list
        //  when the previous action is removed.
        let actionListCopy = this.actionList.slice();
        for (let action of actionListCopy)
        {
            let finished = action.apply(this, deltaTime);
            if (finished)
            {
                let index = this.actionList.indexOf(action);
                if (index > -1)
                    this.actionList.splice(index, 1);
            }
        }
    }

    /**
     * Draw the sprite on a canvas, centered at the sprite's position, in an area corresponding to the sprite's size.
     * Also take into account sprite's angle, whether the image should be flipped or mirrored, and the opacity of the image.
     * If visible is set to false, sprite will not be drawn.
     * @param context - the graphics context object associated to the game canvas
     */
    draw(context)
    {
        if ( !this.visible )
            return;
        
        let A = this.angle * Math.PI/180;
        let scaleX = 1;
        let scaleY = 1;
        if (this.mirrored)
            scaleX *= -1;
        if (this.flipped)
            scaleY *= -1;
        let cosA = Math.cos(A);
        let sinA = Math.sin(A);

        context.setTransform(scaleX*cosA, scaleX*sinA, -scaleY*sinA, scaleY*cosA, 
            this.position.x, this.position.y);

        context.globalAlpha = this.opacity;

        // image, 4 source parameters, 4 destination parameters
        context.drawImage(this.texture.image, 
            this.texture.region.position.x, this.texture.region.position.y, 
            this.texture.region.width, this.texture.region.height,
            -this.rectangle.width/2, -this.rectangle.height/2, 
             this.rectangle.width, this.rectangle.height);
    }

    /**
     * Remove this sprite from the group that contains it.
     */
    destroy()
    {
        this.parentGroup.removeSprite(this);
    }
    
}


 // ===============================================================================================

/**
 * A Texture stores an Image and a {@link Rectangle}
 *  that indicates which region of the Image will be drawn.
 */
BAGEL.Texture = class
{
    /**
     * Initialize Image and Rectangle objects;
     * Load image file and set size of rectangle to image dimensions.
     * @param {string} filename the name (including path) of the image file      
     * @constructor
     */
    constructor(fileName)
    {
        this.image  = new Image();
        this.region = new BAGEL.Rectangle();

        // only try to load a file if a fileName is given
        if ( fileName )
        {
            let self = this;
            // this code automatically runs after image data loaded
            this.image.onload = function()
            {
                self.region.setSize(self.image.width, self.image.height);
            }
            this.image.src = fileName;
        }
    }

}

 // ===============================================================================================

/**
 *  A Vector is a pair of values (x,y), useful for 
 *   representing position (see {@link Rectangle} and {@link Sprite}). 
 */
BAGEL.Vector = class
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
