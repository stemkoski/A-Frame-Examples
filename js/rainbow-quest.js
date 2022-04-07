// ===============================================================================
// helpful functions
// ===============================================================================

// simplify replacing string content
String.prototype.replaceAll = function(search, replacement) 
{
    let target = this;
    return target.split(search).join(replacement);
};

// simplify removing element from array
Array.prototype.remove = function (item) 
{
  let index = this.indexOf(item)
  if (index >= 0) 
    this.splice(index, 1);
};

// simplify removing element from array
Array.prototype.removeAll = function (item) 
{
  let index = this.indexOf(item)
  while (index >= 0) 
  {
    this.splice(index, 1);
    index = this.indexOf(item);
  }
};

// select random element from array
Array.prototype.random = function () 
{
    return this[ Math.floor( this.length * Math.random() ) ]; 
};

// create two-dimensional array
Array.create2D = function(length1, length2, initValue = 0)
{
  let arr = new Array(length1);
  for (let i = 0; i < length1; i++)
    arr[i] = new Array(length2).fill(initValue);
  return arr;
};

// get element from array, return null if either index is out of bounds
// (similar to standard array)
Array.prototype.get2D = function(i, j)
{
  if ( i < 0 || i > this.length - 1 || j < 0 || j > this[0].length - 1 )
    return null;
  else
    return this[i][j];
}

// generate random float value in range
Math.randomFloat = function (min=0, max=100)
{
  return min + (max - min) * Math.random();
};

// generate random integer N, where: min <= N < max
Math.randomInt = function (min=0, max=100)
{
  return Math.floor( Math.randomFloat(min, max) );
}

// ===============================================================================
// data structures required by game
// ===============================================================================

class Wall
{
  constructor(x = -1, y = -1)
  {
    this.x = x;
    this.y = y;
    this.visible = true;
  }
}

class Cell 
{
  // constants
  static get PATH()  { return 0; }
  static get SOLID() { return 1; }
  static get ROOM()  { return 2; }
  
  static get DIRECTIONS() { return ["N", "S", "E", "W"]; }

  constructor(x = -1, y = -1)
  {
    this.x = x;
    this.y = y;
    this.type = Cell.PATH;

    // used when cell type is Cell.ROOM
    this.roomId = 0;

    // used by maze algorithm;
    //  indicates this cell is connected to the main path
    this.connected = false;

    // can be used by map rendering algorthm
    this.seen = false;

    // must be set when Cell is created!
    this.cellArray      = null;
    this.horizWallArray = null;
    this.vertWallArray  = null;
  }

  getNeighbor(direction)
  {
    if (direction == "N")
      return this.cellArray.get2D(this.x, this.y - 1);
    else if (direction == "S")
      return this.cellArray.get2D(this.x, this.y + 1);
    else if (direction == "W")
      return this.cellArray.get2D(this.x - 1, this.y);
    else if (direction == "E")
      return this.cellArray.get2D(this.x + 1, this.y);
    else
      return null;
  }

  getNeighborArray()
  {
    let neighborArray = [];
    neighborArray.push( this.getNeighbor("N") );
    neighborArray.push( this.getNeighbor("S") );
    neighborArray.push( this.getNeighbor("W") );
    neighborArray.push( this.getNeighbor("E") );
    neighborArray.removeAll( null );
    return neighborArray;
  }

  getWall(direction)
  {
    if (direction == "N")
      return this.horizWallArray.get2D(this.x, this.y);
    else if (direction == "S")
      return this.horizWallArray.get2D(this.x, this.y + 1);
    else if (direction == "W")
      return this.vertWallArray.get2D(this.x, this.y);
    else if (direction == "E")
      return this.vertWallArray.get2D(this.x + 1, this.y);
    else
      return null;
  }

  getWallArray()
  {
    let wallArray = [];
    wallArray.push( this.getWall("N") );
    wallArray.push( this.getWall("S") );
    wallArray.push( this.getWall("W") );
    wallArray.push( this.getWall("E") );
    wallArray.removeAll( null );
    return wallArray;
  }

  connectTo(neighbor)
  {
    // West
    if (neighbor.x == this.x + 1)
      this.getWall("E").visible = false;
    // East
    else if (neighbor.x == this.x - 1)
      this.getWall("W").visible = false;
    // North
    else if (neighbor.y == this.y + 1)
      this.getWall("S").visible = false;
    // South
    else if (neighbor.y == this.y - 1)
      this.getWall("N").visible = false;
    else
      console.error("Error: attempting to connect non-adjacent cell");
  }

  // sets visibility of all surrounding walls
  setWallVisibility(visible)
  {
    let wallArray = this.getWallArray();
    for (let wall of wallArray)
      wall.visible = visible;
  }

}

class Room
{
  constructor(x=0, y=0, w=7, h=5)
  {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    this.centerX = x + Math.floor(w/2);
    this.centerY = y + Math.floor(h/2);

    this.id = 0;

    // must be set when Room is created!
    this.cellArray = null;
  }

  setPosition(x, y)
  {
    this.x = x;
    this.y = y;
  }

  setSize(w, h)
  {
    this.w = w;
    this.h = h;
  }

  overlap(otherRoom)
  {
    let buffer = 2; // min space between rooms

    let thisLeft   = this.x, 
        thisRight  = this.x + this.w - 1 + buffer, 
        thisTop    = this.y, 
        thisBottom = this.y + this.h - 1 + buffer;
    
    let otherLeft   = otherRoom.x, 
        otherRight  = otherRoom.x + otherRoom.w - 1 + buffer, 
        otherTop    = otherRoom.y, 
        otherBottom = otherRoom.y + otherRoom.h - 1 + buffer;
  
    // separating axis theorem: two objects do not overlap if there exists an axis separating them
    let noOverlap = 
        (thisLeft > otherRight) || 
        (otherLeft > thisRight) || 
        (thisTop > otherBottom) || 
        (otherTop > thisBottom);

    return !noOverlap;
  }

  syncCellData()
  {
    let midX = this.x + Math.floor(this.w/2);
    let midY = this.y + Math.floor(this.h/2);

    for (let i = this.x; i < this.x + this.w; i++)
    {
      for (let j = this.y; j < this.y + this.h; j++)
      {
        let cell = this.cellArray[i][j];

        // used for color later
        cell.type = Cell.ROOM;
        cell.roomId = this.id;

        // cells not along a room midlines
        //   will be ignored in maze generation
        if ( !(i == midX || j == midY) )
          cell.connected = true;
      }
    }
  }

}

// ===============================================================================
// world generator
// ===============================================================================

class RainbowQuest
{
	constructor()
	{
		this.numCellHoriz = 40;
		this.numCellVert  = 40;
		this.horizWallArray = [];
		this.vertWallArray  = [];
		this.cellArray      = [];
		this.roomArray      = [];
	}

	// not sure if useful
	reset()
	{
		this.horizWallArray = [];
		this.vertWallArray  = [];
		this.cellArray      = [];
		this.roomArray      = [];
	}

	initWalls()
	{
	  this.horizWallArray = Array.create2D(this.numCellHoriz, this.numCellVert+1);
	  for (let i = 0; i < this.numCellHoriz; i++)
	    for (let j = 0; j < this.numCellVert+1; j++)
	      this.horizWallArray[i][j] = new Wall(i, j);

	  this.vertWallArray = Array.create2D(this.numCellHoriz+1, this.numCellVert);
	  for (let i = 0; i < this.numCellHoriz+1; i++)
	    for (let j = 0; j < this.numCellVert; j++)
	      this.vertWallArray[i][j] = new Wall(i, j);
	}

	initCells()
	{
	  this.cellArray = Array.create2D(this.numCellHoriz, this.numCellVert);
	  for (let i = 0; i < this.numCellHoriz; i++)
	    for (let j = 0; j < this.numCellVert; j++)
	    {
	      let c = new Cell(i, j);
	  	  c.cellArray      = this.cellArray;
	  	  c.horizWallArray = this.horizWallArray;
	  	  c.vertWallArray  = this.vertWallArray;
	      this.cellArray[i][j] = c;
	    }
	}


	initRooms(roomCountTarget = 4)
	{
	  // place rooms
	  let maxFailAttempts = 200;
	  let failAttempts = 0;
	  
	  // start with entrance room
	  
	  // North room
	  // this.roomArray = [ new Room(this.numCellHoriz/2 - 2, 0, 5, 5) ]
    // South room
	  this.roomArray = [ new Room(this.numCellHoriz/2 - 2, 35, 5, 5) ]

	  while (this.roomArray.length < roomCountTarget)
	  {
	     // generate a random room


	     let w = 5, h = 5; 
	     /*
	     if (Math.random() < 0.5)
	      h = 3;
	     else
	      w = 3;
			 */

	     let x = Math.randomInt(1, this.numCellHoriz - w);
	     let y = Math.randomInt(1, this.numCellVert - h);

	     let room = new Room(x,y,w,h);
	     room.id = this.roomArray.length;

	     let anyOverlap = false;
	     for (let otherRoom of this.roomArray)
	     {
	       if (room.overlap(otherRoom))
	       {
	         anyOverlap = true;
	         failAttempts += 1;
	         break;
	       }
	     }

	     if (!anyOverlap)
	     {
	       this.roomArray.push(room);
	       failAttempts = 0;
	     }

	     if (failAttempts > maxFailAttempts)
	     {
	       // there must have been some really unlucky initial room placement
	       console.log("retrying room setup")
	       this.roomArray = [ new Room(this.numCellHoriz/2 - 2, 0, 5, 3) ];

	       failAttempts = 0;
	     }
	  }

	  // all rooms have been successfully placed
	  for (let room of this.roomArray)
	  {
	  	room.cellArray = this.cellArray;
	    room.syncCellData();
	  }
	}

	// Any PATH type cell with 3+ walls/SOLID cell neighbors is a "dead end"
	//  and will be changed to cell type SOLID.
	// Returns true if any new dead ends were discovered during this search. 
	identifyDeadEnd()
	{
	  let newDeadEnds = false;
	  for (let i = 0; i < this.numCellHoriz; i++)
	  {
	    for (let j = 0; j < this.numCellVert; j++)
	    {
	      let cell = this.cellArray[i][j];

	      // only paths can be dead ends
	      if (cell.type != Cell.PATH)
	        continue;

	      let wallCount = 0;

	      for (let dir of Cell.DIRECTIONS)
	      {
	        let wall = cell.getWall(dir);
	        let neighbor = cell.getNeighbor(dir);

	        if ( wall.visible || (neighbor != null && neighbor.type == Cell.SOLID))
	          wallCount++;
	      }

	      if (wallCount >= 3)
	      {
	        newDeadEnds = true;
	        cell.type = Cell.SOLID;
	      }
	       
	    }
	  }
	  return newDeadEnds;
	}

	identifySomeDeadEnds(num = 3)
	{
	  for (let i = 0; i < num; i++)
	    this.identifyDeadEnd();
	}

	identifyAllDeadEnds()
	{
	   let anyDeadEnds = this.identifyDeadEnd();
	   while (anyDeadEnds)
	      anyDeadEnds = this.identifyDeadEnd();
	}

	// add walls between any pair of SOLID and non-SOLID type cells
	blockDeadEndEntry()
	{
	  for (let i = 0; i < this.numCellHoriz; i++)
	  {
	    for (let j = 0; j < this.numCellVert; j++)
	    {
	      let cell = this.cellArray[i][j];
	      for (let dir of Cell.DIRECTIONS)
	      {
	        let neighbor = cell.getNeighbor(dir);

	        if (neighbor == null)
	          continue;

	        if ( cell.type != Cell.SOLID && neighbor.type == Cell.SOLID )
	            cell.getWall(dir).visible = true;
	      }      
	    }
	  }
	}

	// remove a wall if it only separates two hallway (PATH) areas
	removeAdjacentWallTypes(type = Cell.PATH)
	{

	  for (let i = 0; i < this.numCellHoriz; i++)
	  {
	    for (let j = 0; j < this.numCellVert; j++)
	    {
	      let cell = this.cellArray[i][j];

	      if (cell.type != type)
	        continue;

	      let directions = ["S", "E"];

	      for (let dir of directions)
	      {
	        let neighbor = cell.getNeighbor(dir);
	        if ( neighbor != null && neighbor.type == type )
	          cell.getWall(dir).visible = false;
	      }
	    }
	  }

	}

	// Along a row of the dungeon, replace PATH type cells by SOLID type cells
	//   to force the player to cross through ROOM type cells.
	// (Be careful when using this function, it could make the dungeon unsolvable.)
	addHorizBarrier(y)
	{
	  for (let x = 0; x < this.numCellHoriz; x++)
	  {
	    let cell = this.cellArray[x][y];

	    // only change paths to solids
	    if (cell.type != Cell.PATH) 
	      continue;

	    cell.type = Cell.SOLID;
	    cell.connected = true; // do not visit in algorithm
	  }
	}

	// get the first cell with a given type
	getCellWithType(type = Cell.PATH)
	{
	  for (let i = 0; i < this.numCellHoriz; i++)
	  {
	    for (let j = 0; j < this.numCellVert; j++)
	    {
	      if (this.cellArray[i][j].type == type)
	        return this.cellArray[i][j];
	    }
	  }
	  return null;
	}

	// standard maze generation algorithm
	generateMaze(branchProbability = 0.5)
	{
	   let activeCellArray = [];

	   let currentCell = this.getCellWithType(Cell.PATH);
	   currentCell.connected = true;
	   activeCellArray.push(currentCell);

	   while (activeCellArray.length > 0)
	   {
	      if (Math.random() < branchProbability)
	      {
	        // get random previously visited cell
	        currentCell = activeCellArray.random();
	      }
	      else
	      {
	        // get most recently visited room
	        currentCell = activeCellArray[ activeCellArray.length - 1 ];
	      }

	      // get list of unconnected neighbors
	      let neighborArray = currentCell.getNeighborArray();
	      let unconnectedNeighborArray = [];

	      for (let cell of neighborArray)
	        if ( !cell.connected )
	          unconnectedNeighborArray.push(cell);

	      if (unconnectedNeighborArray.length > 0)
	      {
	        let nextCell = unconnectedNeighborArray.random();

	        // remove wall between this and next room       
	        currentCell.connectTo(nextCell);

	        nextCell.connected = true;
	        activeCellArray.push(nextCell);
	      }
	      else
	      {
	        // this room has no more adjacent unconnected rooms
	        //   so there is no reason to keep it in the list
	        activeCellArray.remove( currentCell );
	      }

	   }
	}

	// remove entry and/or exit doors to be able to access the interior
	removeMazeDoorWalls()
	{
	  // North
	  // this.cellArray[this.numCellHoriz/2][0].getWall("N").visible = false;

	  // South
	  // this.cellArray[this.numCellHoriz/2][39].getWall("S").visible = false;
	}

	// purely aesthetic and optional, preventing big open (3x3) areas
	//   by adding a SOLID type cell in the middle
	addSolidInEmptySpaces()
	{
	  for (let i = 0; i < this.numCellHoriz - 3; i++)
	  {
	    for (let j = 0; j < this.numCellVert - 3; j++)
	    {
	      let emptyCount = 0;
	      for (let a = 0; a < 3; a++)
	        for (let b = 0; b < 3; b++)
	          if (this.cellArray[i+a][j+b].type == Cell.PATH)
	            emptyCount++;

	      if (emptyCount == 9)
	        this.cellArray[i+1][j+1].type = Cell.SOLID;
	    }
	  }
	}

	// purely aesthetic and optional; not necessary
	addWallsAroundSolids()
	{
	  for (let i = 0; i < this.numCellHoriz; i++)
	  {
	    for (let j = 0; j < this.numCellVert; j++)
	    {
	      let cell = this.cellArray[i][j];

	      if (cell.type == Cell.SOLID)
	      {
	        for (let wall of cell.getWallArray())
	          wall.visible = true;
	      }
	    }
	  }
	}

	generateDungeon()
	{

	  this.initWalls();

	  this.initCells();

	  this.initRooms(13);

	  // increase chance of forcing player
	  //   to pass through these rooms;
	  // too many may cause an unsolvable maze

	  // temporarily disabled
	  // this.addHorizBarrier( this.roomArray[7].y );
	  // this.addHorizBarrier( this.roomArray[9].y );

	  this.removeMazeDoorWalls();

	  // branch probability:
	  //  larger value ->
	  //  more branches ->
	  //  more dead ends ->
	  //  fewer paths (once dead ends removed)
	  this.generateMaze(0.80);

	  this.identifyAllDeadEnds();

	  // purely for aesthetics
	  this.addSolidInEmptySpaces();

	  this.blockDeadEndEntry();

	  this.removeAdjacentWallTypes(Cell.PATH);
	  this.removeAdjacentWallTypes(Cell.SOLID); 
	  this.removeAdjacentWallTypes(Cell.ROOM);

	  // this.addWallsAroundSolids();

	  console.log("dungeon generated!");
	}

	drawMap(context)
	{
		function drawLine(x1, y1, x2, y2)
		{
			context.beginPath();
			context.moveTo(x1, y1);
			context.lineTo(x2, y2);
			context.stroke();
		}

		let canvasSize = 512;
		let cellSize = canvasSize / this.numCellHoriz;

		let dark = "#222222"
		let roomColorArray = [
          "#CCCCCC", 
          "#FF8888", "#FFCC88", "#FFFF88", "#99FF99", "#99CCFF", "#CC99FF",
          dark, dark, dark, dark, dark, dark ];

		// draw cells
		for (let i = 0; i < this.numCellHoriz; i++)
		{
			for (let j = 0; j < this.numCellVert; j++)
			{
			  let color = "black";
			  let cell = this.cellArray[i][j];

			  if (cell.type == Cell.PATH)
			    color = "#AAAAAA";
			  else if (cell.type == Cell.SOLID)
			    color = "#444444";
			  else if (cell.type == Cell.ROOM)
			    color = roomColorArray[ cell.roomId ];

			  context.fillStyle = color;
			  let canvasX = i * cellSize;
			  let canvasY = j * cellSize;
			  context.fillRect(Math.floor(canvasX),Math.floor(canvasY), Math.ceil(cellSize),Math.ceil(cellSize));
			}
		}

		context.lineWidth = 2
		// horizontal walls
		for (let i = 0; i < this.numCellHoriz; i++)
		{
			for (let j = 0; j < this.numCellVert+1; j++)
			{
			  if ( !this.horizWallArray[i][j].visible )
			    continue;

			  let canvasX = i * cellSize;
			  let canvasY = j * cellSize;

			  drawLine(canvasX, canvasY,
			           canvasX + cellSize, canvasY);
			}
		}

		// vertical walls
		for (let i = 0; i < this.numCellHoriz+1; i++)
		{
			for (let j = 0; j < this.numCellVert; j++)
			{
			  if ( !this.vertWallArray[i][j].visible )
			    continue;

			  let canvasX = i * cellSize;
			  let canvasY = j * cellSize;

			  drawLine(canvasX, canvasY,
			           canvasX, canvasY + cellSize);
			}
		}

	} // end of map drawing


	updateMapRoom(context, roomId, color, clear=false)
	{
		let canvasSize = 512;
		let cellSize = canvasSize / this.numCellHoriz;

		// draw cells
		for (let i = 0; i < this.numCellHoriz; i++)
		{
			for (let j = 0; j < this.numCellVert; j++)
			{
			  let cell = this.cellArray[i][j];

			  if (cell.roomId == roomId)
			  {
					  let canvasX = i * cellSize;
					  let canvasY = j * cellSize;

					  if (clear)
					  {
					  		context.clearRect(Math.floor(canvasX),Math.floor(canvasY), Math.ceil(cellSize),Math.ceil(cellSize));
					  }
					  else
					  {
								context.fillStyle = color;
							  context.fillRect(Math.floor(canvasX),Math.floor(canvasY), Math.ceil(cellSize),Math.ceil(cellSize));
						}
				}
			}
		}

	} // end of map drawing


}