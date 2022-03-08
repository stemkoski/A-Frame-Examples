
//=========================================================

class StarfishCollector extends BAGEL.Game
{
	initialize()
	{
		this.addScreen( "title", new TitleScreen(this) );
		this.addScreen( "level", new LevelScreen(this) );
		this.setScreen( "title" );
	}
}

//=========================================================

class TitleScreen extends BAGEL.Screen 
{
	initialize()
	{
		let titleTex = new BAGEL.Texture("BAGEL/images/starfish-collector/title.png");
		let title = new BAGEL.Sprite();
		title.setTexture(titleTex);
		title.setSize(500, 200);
		title.setPosition(400,250);
		this.addSpriteToGroup(title);		

		let startTex = new BAGEL.Texture("BAGEL/images/starfish-collector/start.png");
		let start = new BAGEL.Sprite();
		start.setTexture(startTex);
		start.setSize(100,50);
		start.setPosition(400,450);
		this.addSpriteToGroup(start);		
	}

	update()
	{
		// input is from Quest controllers
		if ( this.game.input.buttonX.pressed )
			this.game.setScreen("level");
	}
}

//=========================================================

class LevelScreen extends BAGEL.Screen
{
	initialize()
	{
		let waterTex = new BAGEL.Texture("BAGEL/images/starfish-collector/water.png");
		let water = new BAGEL.Sprite();
		water.setTexture(waterTex);
		water.setSize(800,600);
		water.setPosition(400,300);
		this.addSpriteToGroup(water);

		
		let turtleTex = new BAGEL.Texture("BAGEL/images/starfish-collector/turtle.png");
  		this.turtle = new BAGEL.Sprite();
		this.turtle.setTexture(turtleTex);
  		this.turtle.setSize(64,64);
 		this.turtle.setPosition(400, 50);
 		this.addSpriteToGroup(this.turtle);

		let starfishTex = new BAGEL.Texture("BAGEL/images/starfish-collector/starfish.png");
  		
  		this.createGroup("starfish");
  		let starfishCount = 100;
  		for (let i = 0; i < starfishCount; i++)
  		{
  			let starfish = new BAGEL.Sprite();
			starfish.setTexture(starfishTex);
  			starfish.setSize(32,32);
  			let x = 100 + Math.random() * 600;
  			let y = 200 + Math.random() * 300;
 			starfish.setPosition(x, y);
 			this.addSpriteToGroup(starfish, "starfish");
 		}

		let winTex = new BAGEL.Texture("BAGEL/images/starfish-collector/win.png");
  		this.win = new BAGEL.Sprite();
		this.win.setTexture(winTex);
 		this.win.setPosition(400, 300);
 		this.win.setVisible(false);
 		this.addSpriteToGroup(this.win);
	}

	update(deltaTime)
	{
		let speed = 100; // pixels per second		
		let distance = speed * deltaTime;

		// move turtle with axis
		this.turtle.moveBy(
			distance * this.game.input.leftAxisX,
			distance * this.game.input.leftAxisY
		);		

		for ( let starfish of this.getGroupSpriteList("starfish") )
		{
			if ( this.turtle.overlaps(starfish) )
				starfish.destroy();
		}

		if ( this.getGroupSpriteCount("starfish") == 0 && !this.win.visible)
			this.win.setVisible(true);		
	}
}

//=========================================================
