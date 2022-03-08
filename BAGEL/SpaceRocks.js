//============================================================================================================================

class SpaceRocks extends BAGEL.Game
{
	initialize()
	{
		this.setData("level", 1);
		this.setData("score", 0);
		this.setData("highScore", 0);
		this.setData("shieldOpacity", 1.00);

		// multiple screens spawn rocks multiple times,
		//  therefore adding a function here to avoid repetition

		this.createRock = function(rockTexture, baseSize, baseSpeed)
		{
			let rock = new BAGEL.Sprite();
            rock.setTexture( rockTexture );

            let rockSize = baseSize + (Math.random() * 30 - 15);
			rock.setSize(rockSize, rockSize);
			
			let rockSpeed = baseSpeed + (Math.random() * 20 - 10);
			rock.setPhysics(0, 300, 0);
            rock.physics.setSpeed(rockSpeed);

            rock.setWrapRectangle(800, 600);

            let rotateDirection = (Math.random() < 0.50) ? 360 : -360;
            let rotateDuration = 5 + 10 * Math.random();
            rock.addAction(
            	BAGEL.ActionFactory.forever(
            		BAGEL.ActionFactory.rotateBy(rotateDirection, rotateDuration)
            	)
            );

            return rock;
		}

		this.setScreenFadeTransition(true, 0.25, "#000000");

		this.addScreen( "title",        new SRTitleScreen(this) );
		this.addScreen( "instructions", new SRInstructionsScreen(this) );
		this.addScreen( "level",        new SRLevelScreen(this) );

		this.setScreen( "title" );
	}
}

//=========================================================

class SRTitleScreen extends BAGEL.Screen 
{
	initialize()
	{
		let background = new BAGEL.Sprite();
		background.setTexture(
    	  new BAGEL.Texture("BAGEL/images/space-rocks/space.png") );
		background.setSize(800, 600)
		background.setPosition(400, 300);
		this.addSpriteToGroup(background);		

		let rockCount = 20;
		let rockTextureArray = [
			new BAGEL.Texture("BAGEL/images/space-rocks/rock1.png"),
			new BAGEL.Texture("BAGEL/images/space-rocks/rock2.png"),
			new BAGEL.Texture("BAGEL/images/space-rocks/rock3.png"),
			new BAGEL.Texture("BAGEL/images/space-rocks/rock4.png")
		];

		for (let n = 0; n < rockCount; n++)
        {
            let rock = this.game.createRock(rockTextureArray[n % 4], 80, 60);
			rock.setPosition(Math.random() * 800, Math.random() * 600);
			let motionAngle = 360 * n/rockCount + Math.random() * 30;
			rock.physics.setMotionAngle( motionAngle );
            this.addSpriteToGroup(rock);
        }

		this.createGroup("UI");

		let title = new BAGEL.Sprite();
		title.setTexture(
    	  new BAGEL.Texture("BAGEL/images/space-rocks/space-rocks-title.png") );
		title.setSize(500, 100)
		title.setPosition(400, 300);
		this.addSpriteToGroup(title, "UI");		

		let labelStyle = {
			fontColor: "#00FF00", 
			borderColor: "#000000", 
			shadowColor: "#888888"
		};

		this.label = new BAGEL.Label();
		this.label.setText("press (Y)");
		this.label.setPosition(400, 570, "center");
		this.label.setProperties(labelStyle);
		this.addSpriteToGroup(this.label, "UI");		

		let highScore = this.game.getData("highScore");
		this.highScoreLabel = new BAGEL.Label();
		this.highScoreLabel.setText("High Score: " + highScore);
		this.highScoreLabel.setPosition(20, 40, "left");
		this.highScoreLabel.setProperties(labelStyle);
 		this.addSpriteToGroup(this.highScoreLabel, "UI");

	}

    resume()
    {
    	// when returning to this screen, reset game data 
    	//  (except high score, which is persistent data)
		this.game.setData("level", 1);
		this.game.setData("score", 0);
		this.game.setData("shieldOpacity", 1.00);
		this.game.addScreen("level", new SRLevelScreen(this.game) );

		// display current high score
		let highScore = this.game.getData("highScore");
		this.highScoreLabel.setText("High Score: " + highScore);
    }

	update()
	{
		if ( this.game.input.buttonY.pressed )
		    this.game.setScreen("instructions");
	}
}

//============================================================================================================================
//============================================================================================================================

class SRInstructionsScreen extends BAGEL.Screen 
{
	initialize()
	{
		let background = new BAGEL.Sprite();
		background.setTexture(
    	  new BAGEL.Texture("BAGEL/images/space-rocks/space.png") );
		background.setSize(800, 600)
		background.setPosition(400, 300);
		this.addSpriteToGroup(background);	

		// add fully functional spaceship
		//  for player to test controls

		this.fire = new BAGEL.Sprite();
		this.fire.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/fire.png") );
  		this.fire.setSize(96,16); // mostly black space to align with spaceship
 		this.addSpriteToGroup(this.fire);

		this.spaceship = new BAGEL.Sprite();
		this.spaceship.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/spaceship.png") );
  		this.spaceship.setSize(48,48);
 		this.spaceship.setPosition(680, 280);
 		this.spaceship.setAngle(-90);
 		// takes 2 seconds to reach top speed,
 		//  nearly equal to speed of lasers
 		this.spaceship.setPhysics(175, 350, 5);
 		this.spaceship.setWrapRectangle(800, 600);
 		this.addSpriteToGroup(this.spaceship);

		this.laserTexture = new BAGEL.Texture("BAGEL/images/space-rocks/laser.png");
		this.createGroup("laser");

		this.warpAnimation = new BAGEL.Animation(
            "BAGEL/images/space-rocks/warp.png", 4, 8, 0.03, true );

		// user interface

		this.createGroup("UI");

		let title = new BAGEL.Sprite();
		title.setTexture(
    	  new BAGEL.Texture("BAGEL/images/space-rocks/space-rocks-title.png") );
		title.setSize(500, 100)
		title.setPosition(400, 80);
		this.addSpriteToGroup(title, "UI");		

		let labelStyle = {
			fontColor: "#FFFF00", 
			borderColor: "#000000", 
			shadowColor: "#888888"
		};

		this.label1 = new BAGEL.Label();
		this.label1.lineHeight = 1.1;
		this.label1.setText("controls \n"
  			              + "(try them!)");
		this.label1.setPosition(400, 160, "center");
		this.label1.setProperties(labelStyle);
		this.label1.fontColor = "#D2B48C";
		this.addSpriteToGroup(this.label1, "UI");		

		this.label2 = new BAGEL.Label();
		this.label2.setText(
			       "left joystick: turn left/right \n"
		         + "(A): accelerate forward \n"
		         + "(B): shoot laser \n"
		         + "(X): warp (random) \n"
		         + "(Y): pause (during game)" );
		this.label2.setPosition(150, 250, "left");
		this.label2.setProperties(labelStyle);
		this.addSpriteToGroup(this.label2, "UI");		

		this.label3 = new BAGEL.Label();
		this.label3.setText("press (Y) to start");
		this.label3.setPosition(400, 570, "center");
		this.label3.setProperties(labelStyle);
		this.label3.fontColor = "#00FF00";
		this.addSpriteToGroup(this.label3, "UI");
	}

	// user actions

	rotateSpaceship(angle)
	{
		this.spaceship.rotateBy(angle);
	}

	accelerateSpaceship(percent)
	{
		this.spaceship.physics.acceleratePercentAtAngle(
			percent, this.spaceship.angle );
		// align thruster rocket fire with spaceship
		this.fire.position = this.spaceship.position;
		this.fire.angle    = this.spaceship.angle;
		this.fire.setOpacity(percent);
	}

	shootLaser()
	{
		let laser = new BAGEL.Sprite();
		laser.setTexture( this.laserTexture );
		laser.setSize(10, 10);
 		laser.setPosition(
 			this.spaceship.position.x, this.spaceship.position.y );
 		laser.setPhysics(0, 400, 0);
 		laser.physics.setSpeed(400);
 		laser.physics.setMotionAngle( this.spaceship.angle );
 		laser.setWrapRectangle(800, 600);
 		laser.addAction(
            BAGEL.ActionFactory.sequence([
                BAGEL.ActionFactory.delay(1),
                BAGEL.ActionFactory.fadeOut(0.25),
                BAGEL.ActionFactory.destroy()
            ])
        );
 		this.addSpriteToGroup(laser, "laser");
	}

	spawnWarp(x, y)
	{
		let warp = new BAGEL.Sprite();
		warp.setAnimation( this.warpAnimation.clone() );                    
        warp.setPosition( x, y );
		warp.setSize(96,96);
        // eventually fade away
        warp.addAction( 
            BAGEL.ActionFactory.sequence([
                BAGEL.ActionFactory.delay(1),
                BAGEL.ActionFactory.fadeOut(0.5),
                BAGEL.ActionFactory.destroy()
            ])
        );
        this.addSpriteToGroup(warp); 
	}

	activateSpaceshipWarp()
	{
		this.spawnWarp(this.spaceship.position.x, this.spaceship.position.y);

		let newX = Math.random() * 700 + 50;
		let newY = Math.random() * 500 + 50;
		this.spaceship.setPosition(newX, newY);

		this.spawnWarp(this.spaceship.position.x, this.spaceship.position.y);
	}

	resume()
	{
		this.spaceship.setPosition(680, 280);
 		this.spaceship.setAngle(-90);	
 		this.spaceship.physics.setSpeed(0);
	}

	update(deltaTime)
	{
		// spaceship movement 

		let rotateSpeed = 240; // degrees per second
		let angle = rotateSpeed * deltaTime;

		if ( this.game.input.buttonY.pressed )
			this.game.setScreen("level");

		let dx = this.game.input.leftAxisX;
		this.rotateSpaceship(dx * angle);

		if ( this.game.input.buttonA.pressing )
			this.accelerateSpaceship(1.00);
		else
			this.accelerateSpaceship(0.00);

		// shoot laser; at most 4 on screen at any time
		if ( this.game.input.buttonB.pressed && this.getGroupSpriteCount("laser") < 4 )
			this.shootLaser();

		// warp to new random location on screen (useful when unable to escape incoming rock)
		if ( this.game.input.buttonX.pressed )
			this.activateSpaceshipWarp();

	}
}

//============================================================================================================================
//============================================================================================================================

class SRLevelScreen extends BAGEL.Screen 
{
	initialize()
	{
		this.level = this.game.getData("level");
		this.levelComplete = false;
		this.gameOver = false;

		let shieldOpacity = this.game.getData("shieldOpacity");

		let background = new BAGEL.Sprite();
		background.setTexture(
			new BAGEL.Texture("BAGEL/images/space-rocks/space.png") );
		background.setSize(800,600);
		background.setPosition(400,300);
		this.addSpriteToGroup(background);

		this.fire = new BAGEL.Sprite();
		this.fire.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/fire.png") );
  		this.fire.setSize(80,16); // mostly black space to align with spaceship
 		this.fire.setPosition(400, 300);
 		this.addSpriteToGroup(this.fire);

		this.spaceship = new BAGEL.Sprite();
		this.spaceship.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/spaceship.png") );
  		this.spaceship.setSize(48,48);
 		this.spaceship.setPosition(400, 300);
 		// takes 2 seconds to reach top speed,
 		//  nearly equal to speed of lasers
 		this.spaceship.setPhysics(175, 350, 5);
 		this.spaceship.setWrapRectangle(800, 600);
 		this.addSpriteToGroup(this.spaceship);

 		this.shields = new BAGEL.Sprite();
 		this.shields.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/shields.png") );
  		this.shields.setSize(100, 100);
  		this.shields.setOpacity(shieldOpacity);
  		// align positions
 		this.shields.position = this.spaceship.position;
 		this.shields.rectangle.position = this.spaceship.position;

 		// swirling effect
 		this.shields.addAction(
 			BAGEL.ActionFactory.forever(
 				BAGEL.ActionFactory.rotateBy(360, 0.333)
 			)
 		);
 		this.addSpriteToGroup(this.shields);

 		this.createGroup("laser");
 		this.laserTexture = new BAGEL.Texture("BAGEL/images/space-rocks/laser.png");

 		this.createGroup("rock");
 		this.rockTextureArray = [
			new BAGEL.Texture("BAGEL/images/space-rocks/rock1.png"),
			new BAGEL.Texture("BAGEL/images/space-rocks/rock2.png"),
			new BAGEL.Texture("BAGEL/images/space-rocks/rock3.png"),
			new BAGEL.Texture("BAGEL/images/space-rocks/rock4.png")
		];

 		let rockCount = 3 + this.level;

		for (let n = 0; n < rockCount; n++)
        {
			let rock = this.game.createRock(this.rockTextureArray[n % 4], 100, 50 + 5 * this.level);

			let motionAngle = 360 * n/rockCount + Math.random() * 30;
			rock.physics.setMotionAngle( motionAngle );

			rock.setPosition( this.spaceship.position.x, 
				              this.spaceship.position.y );
			rock.moveAtAngle( 200, motionAngle );

            this.addSpriteToGroup(rock, "rock");
        }
        
 		this.createGroup("effects");

		this.explosionAnimation = new BAGEL.Animation(
            "BAGEL/images/space-rocks/explosion.png", 6, 6, 0.03, false );

		this.warpAnimation = new BAGEL.Animation(
            "BAGEL/images/space-rocks/warp.png", 4, 8, 0.03, true );

		this.sparkAnimation = new BAGEL.Animation(
            "BAGEL/images/space-rocks/spark.png", 4, 4, 0.03, true );

 		this.createGroup("UI");

 		let labelStyle = {
			fontColor: "#00FF00", 
			borderColor: "#000000", 
			shadowColor: "#888888"
		};

 		let levelLabel = new BAGEL.Label();
 		levelLabel.setText("Level: " + this.level);
 		levelLabel.setPosition(20, 40, "left");
 		levelLabel.setProperties(labelStyle);
 		this.addSpriteToGroup(levelLabel, "UI");

 		levelLabel.addAction(
 			BAGEL.ActionFactory.sequence([
 				BAGEL.ActionFactory.delay(1),
 				BAGEL.ActionFactory.fadeOut(1),
 				BAGEL.ActionFactory.destroy()
 			])
 		);

 		this.score     = this.game.getData("score");
 		this.highScore = this.game.getData("highScore");
 		
 		this.scoreLabel = new BAGEL.Label();
 		this.scoreLabel.setText("Score: " + this.score);
 		this.scoreLabel.setPosition(20, 40, "left");
 		this.scoreLabel.setProperties(labelStyle);
 		this.scoreLabel.setOpacity(0);
 		this.addSpriteToGroup(this.scoreLabel, "UI");

 		this.highScoreLabel = new BAGEL.Label();
 		this.highScoreLabel.setText("High Score: " + this.highScore);
 		this.highScoreLabel.setPosition(20, 70, "left");
 		this.highScoreLabel.setProperties(labelStyle);
 		this.highScoreLabel.fontSize = 28; // default 36
 		this.highScoreLabel.setOpacity(0);
 		this.addSpriteToGroup(this.highScoreLabel, "UI");

 		this.scoreLabel.addAction(
 			BAGEL.ActionFactory.sequence([
 				BAGEL.ActionFactory.delay(2),
 				BAGEL.ActionFactory.fadeIn(1),
 			])
 		);

 		this.highScoreLabel.addAction(
 			BAGEL.ActionFactory.sequence([
 				BAGEL.ActionFactory.delay(2),
 				BAGEL.ActionFactory.fadeIn(1),
 			])
 		);

 		this.levelCompleteLabel = new BAGEL.Sprite();
		this.levelCompleteLabel.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/level-complete.png") );
  		this.levelCompleteLabel.setSize(500, 100);
 		this.levelCompleteLabel.setPosition(400, 300);
 		this.levelCompleteLabel.setOpacity(0.00);
 		this.addSpriteToGroup(this.levelCompleteLabel, "UI");

 		this.gameOverLabel = new BAGEL.Sprite();
		this.gameOverLabel.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/game-over.png") );
  		this.gameOverLabel.setSize(500, 100);
 		this.gameOverLabel.setPosition(400, 300);
 		this.gameOverLabel.setOpacity(0.00);
 		this.addSpriteToGroup(this.gameOverLabel, "UI");

 		this.gameOverInstruction = new BAGEL.Label();
		this.gameOverInstruction.setText("press (X) to restart");
		this.gameOverInstruction.setPosition(400, 570, "center");
		this.gameOverInstruction.setProperties(labelStyle);
 		this.gameOverInstruction.setOpacity(0.00);
		this.addSpriteToGroup(this.gameOverInstruction, "UI");		

		// pause overlay

		this.pauseOverlay = new BAGEL.Sprite();
		this.pauseOverlay.setTexture(
		  new BAGEL.Texture("BAGEL/images/space-rocks/black.png") );
  		this.pauseOverlay.setSize(800, 600);
 		this.pauseOverlay.setPosition(400, 300);
 		this.pauseOverlay.setOpacity(0.50);
 		this.pauseOverlay.setVisible(false); 		
 		this.addSpriteToGroup(this.pauseOverlay, "UI");

		this.pauseLabel1 = new BAGEL.Label();
		this.pauseLabel1.setText("[ [ [ paused ] ] ]");
		this.pauseLabel1.setPosition(400, 300, "center");
		this.pauseLabel1.setProperties(labelStyle);
		this.pauseLabel1.setVisible(false);
		this.addSpriteToGroup( this.pauseLabel1, "UI" );		

		this.pauseLabel2 = new BAGEL.Label();
		this.pauseLabel2.setText("press (Y) to resume, or (X) to quit");
		this.pauseLabel2.setPosition(400, 570, "center");
		this.pauseLabel2.setProperties(labelStyle);
		this.pauseLabel2.setVisible(false);
		this.addSpriteToGroup(this.pauseLabel2, "UI" );
	}

	// user actions

	rotateSpaceship(angle)
	{
		this.spaceship.rotateBy(angle);
	}

	accelerateSpaceship(percent)
	{
		this.spaceship.physics.acceleratePercentAtAngle(
			percent, this.spaceship.angle );
		// align thruster rocket fire with spaceship
		this.fire.position = this.spaceship.position;
		this.fire.angle    = this.spaceship.angle;
		this.fire.setOpacity(percent);
	}

	shootLaser()
	{
		let laser = new BAGEL.Sprite();
		laser.setTexture( this.laserTexture );
		laser.setSize(10, 10);
 		laser.setPosition(
 			this.spaceship.position.x, this.spaceship.position.y );
 		laser.setPhysics(0, 400, 0);
 		laser.physics.setSpeed(400);
 		laser.physics.setMotionAngle( this.spaceship.angle );
 		laser.setWrapRectangle(800, 600);
 		laser.addAction(
            BAGEL.ActionFactory.sequence([
                BAGEL.ActionFactory.delay(1),
                BAGEL.ActionFactory.fadeOut(0.25),
                BAGEL.ActionFactory.destroy()
            ])
        );
 		this.addSpriteToGroup(laser, "laser");
	}

	spawnWarp(x, y)
	{
		let warp = new BAGEL.Sprite();
		warp.setAnimation( this.warpAnimation.clone() );                    
        warp.setPosition( x, y );
		warp.setSize(96,96);
        // eventually fade away
        warp.addAction( 
            BAGEL.ActionFactory.sequence([
                BAGEL.ActionFactory.delay(1),
                BAGEL.ActionFactory.fadeOut(0.5),
                BAGEL.ActionFactory.destroy()
            ])
        );
        this.addSpriteToGroup(warp, "effects"); 
	}

	activateSpaceshipWarp()
	{
		this.spawnWarp(this.spaceship.position.x, this.spaceship.position.y);

		let newX = Math.random() * 700 + 50;
		let newY = Math.random() * 500 + 50;
		this.spaceship.setPosition(newX, newY);

		this.spawnWarp(this.spaceship.position.x, this.spaceship.position.y);
	}

	spawnExplosion(sprite)
	{
        let explosion = new BAGEL.Sprite();
        explosion.setAnimation( this.explosionAnimation.clone() );
        explosion.setPosition( sprite.position.x, sprite.position.y );
        let spriteSize = sprite.rectangle.width;
		explosion.setSize(2*spriteSize, 2*spriteSize);
        // remove explosion after animation complete
        explosion.addAction( 
            BAGEL.ActionFactory.sequence([
                BAGEL.ActionFactory.isAnimationFinished(),
                BAGEL.ActionFactory.destroy()
            ])
        );
        this.addSpriteToGroup(explosion, "effects"); 
	}

	spawnSpark(sprite)
	{
        let spark = new BAGEL.Sprite();
        spark.setAnimation( this.sparkAnimation.clone() );
        // sync positions permanently
        spark.position = sprite.position;
        let spriteSize = sprite.rectangle.width;
		spark.setSize(2*spriteSize, 2*spriteSize);
        // remove spark after animation complete
        spark.addAction( 
            BAGEL.ActionFactory.sequence([
                BAGEL.ActionFactory.delay(0.25), // delay then fade
                BAGEL.ActionFactory.fadeOut(0.25),
                BAGEL.ActionFactory.destroy()
            ])
        );
        this.addSpriteToGroup(spark, "effects"); 
	}

	update(deltaTime)
	{
		// if game is over, do not process any more user input beyond this point
		if ( this.gameOver )
		{
			if ( this.game.input.buttonX.pressed )
				this.game.setScreen("title");
			
			return;
		}

		// pause/unpause the game
		if ( this.game.input.buttonY.pressed ) 
		{
			let newPauseState = !this.paused;
			this.pauseOverlay.setVisible(newPauseState);
			this.pauseLabel1.setVisible(newPauseState);
			this.pauseLabel2.setVisible(newPauseState);
			this.setPaused(newPauseState);
		}

		// if game is paused, do not process any more user input beyond this point
		if ( this.paused )
		{
			if ( this.game.input.buttonX.pressed )
				this.game.setScreen("title");

			return;
		}


		// spaceship movement 

		let rotateSpeed = 240; // degrees per second
		let angle = rotateSpeed * deltaTime;

		let dx = this.game.input.leftAxisX;
		this.rotateSpaceship(dx * angle);

		if ( this.game.input.buttonA.pressing )
			this.accelerateSpaceship(1.00);
		else
			this.accelerateSpaceship(0.00);

		// shoot laser; at most 4 on screen at any time
		if ( this.game.input.buttonB.pressed && this.getGroupSpriteCount("laser") < 4 )
			this.shootLaser();

		// warp to new random location on screen (useful when unable to escape incoming rock)
		if ( this.game.input.buttonX.pressed )
			this.activateSpaceshipWarp();


		// lasers collide with rocks cause explosions
		for (let rock of this.getGroupSpriteList("rock"))
        {        	
        	if ( this.shields.opacity > 0 && this.shields.overlaps(rock) )
        	{
        		rock.destroy();
        		this.spawnExplosion(rock);
        		this.spawnSpark(this.spaceship);
        		this.spaceship.physics.setSpeed(0);
                this.shields.opacity -= 0.25;
                continue; // go to next rock in for loop
        	}

        	if ( this.shields.opacity <= 0 && this.spaceship.overlaps(rock) )
        	{
        		// check if either object was recently removed 
               	//  (indicated by no parent group)
               	if (rock.parentGroup == null || this.spaceship.parentGroup == null)
               		continue;

        		this.gameOver = true;

        		this.spaceship.destroy();
        		this.fire.destroy();
        		this.spaceship.setSize(200,200); // to increase explosion size
        		this.spawnExplosion(this.spaceship);
        		this.removeAllSpritesFromGroup("laser");

        		this.gameOverLabel.addAction(
					BAGEL.ActionFactory.sequence([
						BAGEL.ActionFactory.delay(2),
						BAGEL.ActionFactory.fadeIn(2)

					])
				);						

				this.gameOverInstruction.addAction(
					BAGEL.ActionFactory.sequence([
						BAGEL.ActionFactory.delay(5),
						BAGEL.ActionFactory.fadeIn(2)
					])
				);

        		continue; // go to next rock in for loop
        	}

            for (let laser of this.getGroupSpriteList("laser"))
            {
               	// check if either object was recently removed 
               	//  (indicated by no parent group)
               	if (rock.parentGroup == null || laser.parentGroup == null)
               		continue;

                if ( laser.overlaps(rock) )
                {
                    laser.destroy();
                    rock.destroy();

	        		this.spawnExplosion(rock);
					
                    let rockSize = rock.rectangle.width;
                    
                    // large rocks split into two small rocks
                    if ( rockSize > 65 )
                    {
                    	this.score += 100;

                    	let motionAngle = rock.physics.getMotionAngle();

						let rock1 = this.game.createRock(this.rockTextureArray[0], 50, 80 + 10 * this.level);
						rock1.physics.setMotionAngle( motionAngle + 60 );
						rock1.setPosition( rock.position.x, rock.position.y );
						rock1.moveAtAngle( 20, motionAngle + 60 );
            			this.addSpriteToGroup(rock1, "rock");

						let rock2 = this.game.createRock(this.rockTextureArray[1], 50, 80 + 10 * this.level);
						rock2.physics.setMotionAngle( motionAngle - 60 );
						rock2.setPosition( rock.position.x, rock.position.y );
						rock2.moveAtAngle( 20, motionAngle - 60 );
            			this.addSpriteToGroup(rock2, "rock");
                    }

                    // award points based on destroyed rock size
                    if ( rockSize > 65 )
                    	this.score += 100;
                    else // smaller rocks are harder to hit and therefore worth more points
                    	this.score += 200;
                 
	            }
            } 
        } // finished checking for rock interactions

		// update score labels
		this.scoreLabel.setText("Score: " + this.score);
		if (this.score > this.highScore)
		{
			this.highScoreLabel.setText("New High Score!");
			this.highScore = this.score;
			this.game.setData("highScore", this.highScore);
		}
 		

		// if all rocks destroyed (0 rocks remain), level is complete!
		if ( this.getGroupSpriteCount("rock") == 0 && !this.levelComplete)
		{
			this.levelComplete = true;

			this.game.setData("level", this.level + 1);
			this.game.setData("score", this.score);
			this.game.setData("shieldOpacity", this.shields.opacity);

			this.game.addScreen("level", new SRLevelScreen(this.game));

			let self = this;
			this.levelCompleteLabel.addAction(
				BAGEL.ActionFactory.sequence([
					BAGEL.ActionFactory.fadeIn(1),
					BAGEL.ActionFactory.delay(3),
					BAGEL.ActionFactory.fadeOut(1),
					BAGEL.ActionFactory.delay(1),
					new BAGEL.Action( function() 
					  { self.game.setScreen("level"); return true; } )
				])
			);
		}

	}
}

//=========================================================
