
class Map {

	constructor (yggdrasil, ctx, mapctx, w, h) {

		//WorldTree
		this.yggdrasil = yggdrasil;

		//Render context
		this.ctx = ctx;

		//Map preparation context
		this.mapctx = mapctx;

		//Base pos
		this.bx = 0;
		this.by = 0;

		//Tile size
		this.tw = 16;
		this.th = 16;

		//Tile display size
		this.dw = 16;
		this.dh = 16;

		//Map size
		this.w = w || 1;
		this.h = h || 1;


		//Tileset
		this.tileset = new Image();
		this.tileset.src = 'test.png';

		//Map core

		this.data = [];

		this.visible = [];

		this.regions = [];this.temp={}
		this.rooms = [];
		this.stairs = [];

		this.seed = 0;
		this.PRNG = null;

		//Player/client
		this.player = new Player(this.ctx, this);

	}


	/* 
	 * Map Generation Function
	 * Handles everything related to map generation
	 * 
	 * options - object
	 *   bool generate*, generate the map? default true
	 *   if !generate:
	 *     2D array data, map data to replace the map with
	 *     sPos spawn, player spawn position
	 *   else:
	 *     int w, map width
	 *     int h, map height
	 *     object rooms*, room options, defaults to no rooms (falsy value)
	 *       int minSize, min room dimensions
	 *       int maxSize, max room dimensions
	 *       int minRooms, min no. of rooms, no of rooms is rng(minRooms, maxRooms)
	 *       int maxRooms*, max no. of rooms, defaults to minRooms
	 *     string corridoors, can be 'maze' or 'corridoor', indicates how to connect regions
	 *     int numDeadEnds, number of dead ends to cut back (typically used with corridoors === 'maze')
	 *     decimal connectorOpenChance, the chance of a wall touching two regions opening and becoming a doorway
	 *       (at least one connector will open)
	 *     decimal seed*, seed for the map generation engine, defaults to Math.random()
	 *     decimal stairCarveChance, chance of an empty floor tile becoming a downward staircase
	 *     float minStairDistance, the closest a staircase can be to another in tiles
	 */

	generate (options, seed) {

		options = typeof options === 'object' ? options : {};

		//Are we actually generating a new map or reusing an existing one?
		if(options.generate === false) {
			this.w = options.data[0].length;
			this.h = options.data.length;
		}

		//Map dimensions
		this.w = typeof options.w === 'number' ? options.w : this.w;
		this.h = typeof options.h === 'number' ? options.h : this.h;

		this.mapctx.canvas.width = this.w * this.dw;
		this.mapctx.canvas.height = this.h * this.dh;

		//Map randomness source
		this.seed = typeof seed === 'number' ? seed : (typeof options.seed === 'number' ? options.seed : Math.random());
		this.PRNG = new PRNG(this.seed);

		//Initialise this.data and this.visible
		//this.data is map data
		//this.regions indicates what region each tile is part of
		//this.visible indicates whether the player has seen map tiles
		for(let y = 0; y < this.h; y++) {
			this.data[y] = [];
			this.regions[y] = [];
			this.visible[y] = [];
			for(let x = 0; x < this.w; x++) {
				this.data[y][x] = 0;
				this.regions[y][x] = -1;
				this.visible[y][x] = false;
			}
		}

		//We don't need the rest if we're just overwriting
		if(options.generate === false) {
			this.data = options.data.slice(0);
			this.player.x = options.spawn % this.w;
			this.player.y = options.spawn / this.w >> 0;
			this.player.updateMapVisibility();
			this.player.center();
			return;
		}

		//Region ids array to track when to stop overwriting regions
		this.originalRegions = [];

		if(options.rooms)
			this.generateRooms(options.rooms);

		if(options.corridoors === 'maze')
			this.generateMaze(options);

		this.connectRegions(options);

		this.removeDeadEnds(options);

		this.buildMapData(options);

		this.addStaircases(options);

	}

	generateRooms (options) {

		this.rooms = [];

		//Min and max dimensions of an empty room, not including walls
		let minRoomSize = options.minSize || 7,
			maxRoomSize = options.maxSize || 15;

		//Generate a random amount of rooms of random sizes and random positions within the map
		//Rooms must have an odd number width and odd number positions to work with the maze
		//No removal due to collision, rooms can merge if needed
		//If two rooms do collide though, the first (and any with the first's ID) will have their
		//ID overwritten with the second's

		let minRooms = options.minRooms || 15,
			maxRooms = options.maxRooms || (options.minRooms || 20),
			roomCount = this.PRNG.range(minRooms, maxRooms);

		for(let n = 0; n < roomCount; n++) {

			let room = {
				w: this.PRNG.rng((maxRoomSize - minRoomSize) / 2 + 1) * 2 + minRoomSize,
				h: this.PRNG.rng((maxRoomSize - minRoomSize) / 2 + 1) * 2 + minRoomSize,
				regionId: n, morphWith: []
			}

			room.x = this.PRNG.rng((this.w - room.w) / 2 - 1) * 2 + 1;
			room.y = this.PRNG.rng((this.h - room.h) / 2 - 1) * 2 + 1;

			this.rooms.push(room);

			this.originalRegions.push(n);

		}

		for(let room of this.rooms) {
			//Collision check with already present rooms
			for(let i = 0; i < this.rooms.length; i++)
				if(this.boundingBox(room, this.rooms[i]))
					room.morphWith.push(i);
		}

		let done = [];

		const recursiveIdReplace = room => {
			if(done.indexOf(room) !== -1) return;
			done.push(room);

			for(let i = 0; i < room.morphWith.length; i++) {
				this.rooms[room.morphWith[i]].regionId = room.regionId;
				recursiveIdReplace(this.rooms[room.morphWith[i]]);
			}
		}

		for(let room of this.rooms) {
			recursiveIdReplace(room);
		}

		//Each room forms its own region, disconnected from every other region
		//We create another 2D array like this.data that contains distinct region IDs
		//-1 means there is no region; ie walls

		//Add rooms to the regions array
		for(let i = 0; i < this.rooms.length; i++) {
			for(let y = 0; y < this.rooms[i].h; y++) {
				for(let x = 0; x < this.rooms[i].w; x++){
					this.regions[this.rooms[i].y + y][this.rooms[i].x + x] = this.rooms[i].regionId;
				}
			}
		}

	}

	generateMaze (options) {

		//Now we fill the remaining space on the map with a maze
		//Basically a randomised flood fill that goes one way at a time and generates a 'perfect' maze
		//So, no two paths to the same place. We'll fix that when we join regions though with multiple
		//doors connecting rooms.

		let mazeEnds = [];
		let done = [];

		const mazeFill = (rId) => {

			this.originalRegions.push(rId);

			while(mazeEnds.length) {

				let currents = mazeEnds[0];
				if(done.indexOf(currents) !== -1){
					mazeEnds.shift();
					continue;
				}
				let current = this.dPos(currents);

				//Sides available to expand into
				let sides = [];

				if(
					current.x < this.w - 3 && this.regions[current.y][current.x + 2] === -1 &&
					done.indexOf(this.sPos(current.x + 2, current.y)) === -1
				){
					sides.push([this.sPos(current.x + 1, current.y), this.sPos(current.x + 2, current.y)]);
				}
				if(
					current.y < this.h - 3 && this.regions[current.y + 2][current.x] === -1 &&
					done.indexOf(this.sPos(current.x, current.y + 2)) === -1
				){
					sides.push([this.sPos(current.x, current.y + 1), this.sPos(current.x, current.y + 2)]);
				}

				if(current.x > 2 && this.regions[current.y][current.x - 2] === -1 && done.indexOf(this.sPos(current.x - 2, current.y)) === -1){
					sides.push([this.sPos(current.x - 1, current.y), this.sPos(current.x - 2, current.y)]);
				}
				if(current.y > 2 && this.regions[current.y - 2][current.x] === -1 && done.indexOf(this.sPos(current.x, current.y - 2)) === -1){
					sides.push([this.sPos(current.x, current.y - 1), this.sPos(current.x, current.y - 2)]);
				}

				if(sides.length) {
					let index = this.PRNG.rng(sides.length),
						side = this.dPos(sides[index][0]);
					this.regions[side.y][side.x] = rId;
					mazeEnds.push(sides[index][1]);
				}

				this.regions[current.y][current.x] = rId;
				done.push(currents);
				mazeEnds.shift();

			}

		}

		let regionId = 0;

		for(let y = 1; y < this.h; y += 2) {
			for(let x = 1; x < this.w; x += 2) {
				//Suitable for the recursive maze 
				if(this.regions[y][x] === -1) {
					mazeEnds.push(this.sPos(x, y));
					mazeFill(regionId++);
				}
			}
		}

	}

	connectRegions (options) {

		//Now we iterate through tiles to find ones with the following properties
		// They are a wall without a region
		// They have two empty tiles of distinct regions touching them
		//Any tile with those properties 

		let connectors = [];

		for(let y = 0; y < this.h; y++) {
			for(let x = 0; x < this.w; x++) {

				if(this.regions[y][x] !== -1) continue;

				let connectingRegions = [];

				if(x < this.w - 1 && connectingRegions.indexOf(this.regions[y][x + 1]) === -1) {
					connectingRegions.push(this.regions[y][x + 1]);
				}
				if(y < this.h - 1 && connectingRegions.indexOf(this.regions[y + 1][x]) === -1) {
					connectingRegions.push(this.regions[y + 1][x]);
				}
				if(x > 0 && connectingRegions.indexOf(this.regions[y][x - 1]) === -1) {
					connectingRegions.push(this.regions[y][x - 1]);
				}
				if(y > 0 && connectingRegions.indexOf(this.regions[y - 1][x]) === -1) {
					connectingRegions.push(this.regions[y - 1][x]);
				}

				if(connectingRegions.includes(-1))
					connectingRegions.splice(connectingRegions.indexOf(-1), 1);

				if(connectingRegions.length === 2) {
					connectors.push({
						c: this.sPos(x, y),
						r: connectingRegions
					});
				}

			}
		}


		//Now we need to randomly choose a master region
		//The whole map will be filled with this region by the end of the process

		this.masterRegion = this.originalRegions[this.PRNG.rng(this.rooms.length)];

		//Used in conjunction with the remainingRegions array
		let overwrittenRegions = [];

		//Find all connectors connecting to the master region
		const findConnectors = () => {
			let cns = [];

			for(let i = 0; i < connectors.length; i++) {
				if(connectors[i].r.indexOf(this.masterRegion) !== -1) {
					cns.push(connectors[i]);
				}
			}

			return cns;
		}

		//Float
		let connectorOpenChance = typeof options.connectorOpenChance === 'number' ? options.connectorOpenChance : 0.05;

		//Update connector's connecting regions as they are overwritten by the main region, and delete them if they no
		//longer connect separate regions, giving them a 5% chance of opening up regardless
		const updateConnectorRegions = () => {
			for(let i = connectors.length - 1; i >= 0; i--) {
				if(overwrittenRegions.indexOf(connectors[i].r[0]) !== -1) {
					connectors[i].r[0] = this.masterRegion;
				}
				if(overwrittenRegions.indexOf(connectors[i].r[1]) !== -1) {
					connectors[i].r[1] = this.masterRegion;
				}
				if(connectors[i].r[0] === connectors[i].r[1]) {
					if(this.PRNG.next() < connectorOpenChance)
						openConnector(connectors[i]);

					connectors.splice(i, 1);
				}
			}
		}

		const openConnector = connector => {
			let pos = this.dPos(connector.c);
			this.regions[pos.y][pos.x] = this.masterRegion;
		}

		//Note that the regions array does not get updated, you can assume that at the end of this loop it is redunant
		//as all of the regions have been overwritten by the master region
		while(this.originalRegions.length - 1 > overwrittenRegions.length) {
			let cns = findConnectors();
			if(!cns.length) break;
			let connector = cns[this.PRNG.rng(cns.length)];
			overwrittenRegions.push( connector.r.filter(n => n !== this.masterRegion)[0] );
			openConnector(connector);
			updateConnectorRegions();
		}

	}

	removeDeadEnds (options) {

		//Now, we replace a certain number of dead end tiles with walls to make the map less of a hardcore maze
		//A dead end tile is any tile which has only one walkable neighbour
		//regionId -1 is used for walls, so we use that
		//Keep in mind that every time a dead end is removed there is a good chance one of its neighbours becomes one

		//Number of dead ends to remove
		let numDeadEnds = typeof options.numDeadEnds === 'number' ? options.numDeadEnds : 5000;

		let deadEnds = [];

		const findDeadEnds = () => {
			for(let y = 0; y < this.h; y++) {
				for(let x = 0; x < this.w; x++) {

					let dead = [];

					if(x < this.w - 1 && this.regions[y][x + 1] === -1) {
						dead.push(this.regions[y][x + 1]);
					}
					if(y < this.h - 1 && this.regions[y + 1][x] === -1) {
						dead.push(this.regions[y + 1][x]);
					}
					if(x > 0 && this.regions[y][x - 1] === -1) {
						dead.push(this.regions[y][x - 1]);
					}
					if(y > 0 && this.regions[y - 1][x] === -1) {
						dead.push(this.regions[y - 1][x]);
					}

					if(dead.length > 2)
						deadEnds.push(this.sPos(x, y));

				}
			}
		}

		//Remove a dead end from the map, but don't update the deadEnds array so we can do things like .forEach(removeDeadEnd) safely
		const removeDeadEnd = ends => {
			let end = this.dPos(ends);

			this.regions[end.y][end.x] = -1;
		}

		//
		while(numDeadEnds > 0) {
			findDeadEnds();
			if(!deadEnds.length) break;
			if(numDeadEnds > deadEnds.length) {
				deadEnds.forEach(removeDeadEnd);
				numDeadEnds -= deadEnds.length;
				deadEnds = [];
			} else {
				let o = numDeadEnds;
				for(let i = 0; i < o; i++) {
					let r = this.PRNG.rng(deadEnds.length);
					removeDeadEnd(deadEnds[r]);
					deadEnds.splice(r, 1);
					numDeadEnds--;
				}
			}
		}

	}

	buildMapData (options) {
		for(let y = 0; y < this.h; y++) {
			for(let x = 0; x < this.w; x++) {
				this.data[y][x] = this.regions[y][x] >= 0 ? 5 : this.data[y][x];
			}
		}
	}

	addStaircases (options) {

		//Add a few downward staircases
		this.stairs = [];

		let stairCarveChance = typeof options.stairCarveChance === 'number' ? options.stairCarveChance : 0.0015;
		let minStairDistance = typeof options.minStairDistance === 'number' ? options.minStairDistance : 5;

		for(let y = 0; y < this.h; y++) {
			for(let x = 0; x < this.w; x++) {

				this.data[y][x] = this.regions[y][x] >= 0 ? 5 : this.data[y][x];

				//If the tile is a floor tile at least 5 tiles away from other staircases then it has a chance
				//of becoming a down staircase
				if(
					this.data[y][x] === tiles.space &&
					this.PRNG.next() < stairCarveChance &&
					//This works like a bunch of conditions chained together with &&, if a single staircase is too
					//close and returns false, the tile is invalidated
					this.stairs.map(
						stair => Math.hypot(
							(stair.pos % this.w) - x,
							(stair.pos / this.w << 0) - y
						) >= minStairDistance
					).indexOf(false) === -1
				) {
					this.stairs.push({pos: this.sPos(x, y), tile: tiles.stair_down});
					this.data[y][x] = tiles.stair_down;
				}

			}
		}

		//Add an upward staircase
		let triedTiles = [];
		while(true) {
			let x = this.PRNG.rng(this.w);
			let y = this.PRNG.rng(this.h);
			if(triedTiles.indexOf(this.sPos(x, y)) !== -1) continue;
			triedTiles.push(this.sPos(x, y));
			if(this.data[y][x] === tiles.space) {
				this.stairs.push({pos: this.sPos(x, y), tile: tiles.stair_up});
				this.data[y][x] = tiles.stair_up;
				break;
			}
		}

	}

	boundingBox (a, b) {
		return  a.x < b.x + b.w &&
				a.x + a.w > b.x &&
				a.y < b.y + b.h &&
				a.y + a.h > b.y;
	}

	//Prepare the map on a canvas given
	prepare () {
		this.mapctx.clearRect(0, 0, this.mapctx.canvas.width, this.mapctx.canvas.height);
		this.patch(this.mapctx, 0, 0, this.w, this.h);
	}

	//Patch a small rectangle an already prepared version of the map on the canvas given
	//Useful if a small portion of the map is changed slightly ie visibility changes

	patch (ctx, sx, sy, pw, ph) {

		sx = sx < 0 ? 0 : sx;
		sy = sy < 0 ? 0 : sy;
		pw = pw > this.w ? this.w : pw;
		ph = ph > this.h ? this.h : ph;

		ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';

		for(let y = sy; y < sy + ph; y++) {
			for(let x = sx; x < sx + pw; x++) {

				if(!this.visible[y] || !this.visible[y][x] || this.outOfBounds(x, y)) continue;

				//Draw the tile
				ctx.drawImage(
					this.tileset,

					this.data[y][x] * this.tw, 0,
					this.tw, this.th,

					x * this.dw,
					y * this.dh,
					this.dw, this.dh
				);

				//If the tile isn't in the player's immediate line of sight, dull it out a little and don't
				//display anything variable (only constant things like tile type and any items dropped on it)
				if(this.player && this.player.visible.indexOf(this.sPos(x, y)) === -1)
					ctx.fillRect(x * this.dw, y * this.dh, this.dw, this.dh);

			}
		}
	}

	draw () {
		this.ctx.drawImage(this.mapctx.canvas, this.bx, this.by);
	}

	isWalkable (x, y) {
		if(this.outOfBounds(x, y)) return false;

		if(this.isCollidableTile(this.data[y][x])) return false;

		return true;
	}

	//Serialise and deserialise a map position as a number
	sPos (x, y) {
		return y * this.w + x;
	}
	dPos (serialised) {
		return {x: serialised % this.w, y: serialised / this.w << 0}
	}

	isCollidableTile (tile) {
		return tile === tiles.wall;
	}

	outOfBounds (x, y) {
		if(x < 0 || y < 0) return true;
		if(x >= this.w || y >= this.h) return true;

		return false;
	}

}
