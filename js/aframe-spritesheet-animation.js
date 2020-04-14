/**
	Plays a spritesheet-based animation.
	Author: Lee Stemkoski
*/
AFRAME.registerComponent('spritesheet-animation', {

	schema: 
	{
  		rows: {type: 'number', default: 1},
  		columns: {type: 'number', default: 1},

  		// set these values to play a (consecutive) subset of frames from spritesheet
		firstFrameIndex: {type: 'number', default: 0},
		lastFrameIndex: {type: 'number', default: -1}, // index is inclusive

		// goes from top-left to bottom-right.
		frameDuration: {type: 'number', default: 1}, // seconds to display each frame
  		loop: {type: 'boolean', default: true},
	},

	init: function()
	{
		this.repeatX = 1 / this.data.columns;
		this.repeatY = 1 / this.data.rows;

		if (this.data.lastFrameIndex == -1) // indicates value not set; default to full sheet
			this.data.lastFrameIndex = this.data.columns * this.data.rows - 1;

		this.mesh = this.el.getObject3D("mesh");

		this.frameTimer = 0;
		this.currentFrameIndex = this.data.firstFrameIndex;
		this.animationFinished = false;
	},
	
	tick: function (time, timeDelta) 
	{
		// return if animation finished.
		if (this.animationFinished)
			return;

		this.frameTimer += timeDelta / 1000;

		while (this.frameTimer > this.data.frameDuration)
		{
			this.currentFrameIndex += 1;
			this.frameTimer -= this.data.frameDuration;

			if (this.currentFrameIndex > this.data.lastFrameIndex)
			{
				if (this.data.loop)
				{
					this.currentFrameIndex = this.data.firstFrameIndex;
				}
				else
				{
					this.animationFinished = true;
					return;
				}
			}
		}

		let rowNumber = Math.floor(this.currentFrameIndex / this.data.columns);
		let columnNumber = this.currentFrameIndex % this.data.columns;
		
		let offsetY = (this.data.rows - rowNumber - 1) / this.data.rows;
		let offsetX = columnNumber / this.data.columns;

		if ( this.mesh.material.map )
		{
			this.mesh.material.map.repeat.set(this.repeatX, this.repeatY);
			this.mesh.material.map.offset.set(offsetX, offsetY);
		}
	}
});
