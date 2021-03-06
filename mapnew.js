
class Map {

	constructor (ctx, w, h, start) {

		this.ctx = ctx;
		this.start = start;

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
		this.w = w;
		this.h = h;

		//Tileset
		this.tileset = new Image();
		this.tileset.src = 'test.png';
		this.tilesetLoaded = false;
		this.tileset.onload = () => {
			this.tilesetLoaded = true;
			if(this.generated) {
				this.start();
				player.center();
			}
		}

		this.data = [];
		this.visible = [];
		this.seed = 0;
		this.PRNG = null;

		this.generated = false;

	}

	//options has a bunch of cool tweaking properties
	//minRoomSize, maxRoomSize, minRooms, maxRooms,
	//connectorOpenChance, numDeadEnds (to remove,)
	//and seed (a float)
	generate (w, h, options) {

		this.w = w;
		this.h = h;

		options = typeof options === 'object' ? options : {};

		this.seed = typeof options.seed === 'number' ? options.seed : Math.random();
		this.PRNG = new PRNG(this.seed);

		//Initialise this.data and this.visible
		//this.visible just contains booleans, self explanatory usage
		for(let y = 0; y < this.h; y++) {
			this.data[y] = [];
			this.visible[y] = [];
			for(let x = 0; x < this.w; x++) {
				this.data[y][x] = 0;
				this.visible[y][x] = false;
			}
		}


		this.rooms = [];

		//Region ids array to track when to stop overwriting regions
		let originalRegions = [];

		//Min and max dimensions of an empty room, not including walls
		let minRoomSize = options.minRoomSize || 7,
			maxRoomSize = options.maxRoomSize || 15;

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

			originalRegions.push(n);

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
		//The aim is to unify the regions, so the regions variable doesn't have to be public

		let regions = [];

		//Set up the regions array
		for(let y = 0; y < this.h; y++) {
			regions[y] = [];
			for(let x = 0; x < this.w; x++) {
				regions[y][x] = -1;
			}
		}

		//Add rooms to the regions array
		for(let i = 0; i < this.rooms.length; i++) {
			for(let y = 0; y < this.rooms[i].h; y++) {
				for(let x = 0; x < this.rooms[i].w; x++){
					regions[this.rooms[i].y + y][this.rooms[i].x + x] = this.rooms[i].regionId;
				}
			}
		}


		//Now we fill the remaining space on the map with a maze
		//Basically a randomised flood fill that goes one way at a time and generates a 'perfect' maze
		//So, no two paths to the same place. We'll fix that when we join regions though with multiple
		//doors connecting rooms.

		let mazeEnds = [];

		//Reusing the previous stack
		done = [];

		//Serialise and deserialise a map position as a number
		const sPos = (x, y) => y * this.w + x;
		const dPos = serialised => {return {x: serialised % this.w, y: serialised / this.w << 0}};

		const mazeFill = (rId) => {

			originalRegions.push(rId);

			while(mazeEnds.length) {

				let currents = mazeEnds[0];
				if(done.indexOf(currents) !== -1){
					mazeEnds.shift();
					continue;
				}
				let current = dPos(currents);

				//Sides available to expand into
				let sides = [];

				if(current.x < this.w - 3 && regions[current.y][current.x + 2] === -1 && done.indexOf(sPos(current.x + 2, current.y)) === -1){
					sides.push([sPos(current.x + 1, current.y), sPos(current.x + 2, current.y)]);
				}
				if(current.y < this.h - 3 && regions[current.y + 2][current.x] === -1 && done.indexOf(sPos(current.x, current.y + 2)) === -1){
					sides.push([sPos(current.x, current.y + 1), sPos(current.x, current.y + 2)]);
				}

				if(current.x > 2 && regions[current.y][current.x - 2] === -1 && done.indexOf(sPos(current.x - 2, current.y)) === -1){
					sides.push([sPos(current.x - 1, current.y), sPos(current.x - 2, current.y)]);
				}
				if(current.y > 2 && regions[current.y - 2][current.x] === -1 && done.indexOf(sPos(current.x, current.y - 2)) === -1){
					sides.push([sPos(current.x, current.y - 1), sPos(current.x, current.y - 2)]);
				}

				if(sides.length) {
					let index = this.PRNG.rng(sides.length),
						side = dPos(sides[index][0]);
					regions[side.y][side.x] = rId;
					mazeEnds.push(sides[index][1]);
				}

				regions[current.y][current.x] = rId;
				done.push(currents);
				mazeEnds.shift();

			}

		}

		let regionId = 0;

		for(let y = 1; y < this.h; y += 2) {
			for(let x = 1; x < this.w; x += 2) {
				//Suitable for the recursive maze 
				if(regions[y][x] === -1) {
					mazeEnds.push(sPos(x, y));
					mazeFill(regionId++);
				}
			}
		}


		//Now we iterate through tiles to find ones with the following properties
		// They are a wall without a region
		// They have two empty tiles of distinct regions touching them
		//Any tile with those properties 

		let connectors = [];

		for(let y = 0; y < this.h; y++) {
			for(let x = 0; x < this.w; x++) {

				if(regions[y][x] !== -1) continue;

				let connectingRegions = [];

				if(x < this.w - 1 && connectingRegions.indexOf(regions[y][x + 1]) === -1) {
					connectingRegions.push(regions[y][x + 1]);
				}
				if(y < this.h - 1 && connectingRegions.indexOf(regions[y + 1][x]) === -1) {
					connectingRegions.push(regions[y + 1][x]);
				}
				if(x > 0 && connectingRegions.indexOf(regions[y][x - 1]) === -1) {
					connectingRegions.push(regions[y][x - 1]);
				}
				if(y > 0 && connectingRegions.indexOf(regions[y - 1][x]) === -1) {
					connectingRegions.push(regions[y - 1][x]);
				}

				if(connectingRegions.includes(-1))
					connectingRegions.splice(connectingRegions.indexOf(-1), 1);

				if(connectingRegions.length === 2) {
					connectors.push({
						c: sPos(x, y),
						r: connectingRegions
					});
				}

			}
		}


		//Now we need to randomly choose a master room
		//This master room's region will serve as a master region, which the whole map will be filled with by the end of the process

		const masterRoom = this.rooms[this.PRNG.rng(this.rooms.length)];
		this.masterRoom = masterRoom;

		//Used in conjunction with the originalRegions array
		let overwrittenRegions = [];

		//Find all connectors connecting to the master region
		const findConnectors = () => {
			let cns = [];

			for(let i = 0; i < connectors.length; i++) {
				if(connectors[i].r.indexOf(masterRoom.regionId) !== -1) {
					cns.push(connectors[i]);
				}
			}

			return cns;
		}

		//Percentage, whole number
		let connectorOpenChance = typeof options.connectorOpenChance === 'number' ? options.connectorOpenChance : 5;

		//Update connector's connecting regions as they are overwritten by the main region, and delete them if they no
		//longer connect separate regions, giving them a 5% chance of opening up regardless
		const updateConnectorRegions = () => {
			for(let i = connectors.length - 1; i >= 0; i--) {
				if(overwrittenRegions.indexOf(connectors[i].r[0]) !== -1) {
					connectors[i].r[0] = masterRoom.regionId;
				}
				if(overwrittenRegions.indexOf(connectors[i].r[1]) !== -1) {
					connectors[i].r[1] = masterRoom.regionId;
				}
				if(connectors[i].r[0] === connectors[i].r[1]) {
					if(this.PRNG.rng(100) < connectorOpenChance)
						openConnector(connectors[i]);

					connectors.splice(i, 1);
				}
			}
		}

		const openConnector = connector => {
			let pos = dPos(connector.c);
			regions[pos.y][pos.x] = masterRoom.regionId;
		}

		//Note that the regions array does not get updated, you can assume that at the end of this loop it is redunant
		//as all of the regions have been overwritten by the master region
		while(originalRegions.length - 1 > overwrittenRegions.length) {
			let cns = findConnectors();
			if(!cns.length) break;
			let connector = cns[this.PRNG.rng(cns.length)];
			overwrittenRegions.push( connector.r.filter(n => n !== masterRoom.regionId)[0] );
			openConnector(connector);
			updateConnectorRegions();
		}

 
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

					if(x < this.w - 1 && regions[y][x + 1] === -1) {
						dead.push(regions[y][x + 1]);
					}
					if(y < this.h - 1 && regions[y + 1][x] === -1) {
						dead.push(regions[y + 1][x]);
					}
					if(x > 0 && regions[y][x - 1] === -1) {
						dead.push(regions[y][x - 1]);
					}
					if(y > 0 && regions[y - 1][x] === -1) {
						dead.push(regions[y - 1][x]);
					}

					if(dead.length > 2)
						deadEnds.push(sPos(x, y));

				}
			}
		}

		//Remove a dead end from the map, but don't update the deadEnds array so we can do things like .forEach(removeDeadEnd) safely
		const removeDeadEnd = ends => {
			let end = dPos(ends);

			regions[end.y][end.x] = -1;
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


		//To finish off we overwrite this.data
		for(let y = 0; y < this.h; y++) {
			for(let x = 0; x < this.w; x++) {
				this.data[y][x] = regions[y][x] >= 0 ? 5 : this.data[y][x];
			}
		}


		//Start game! Wooot!
		this.generated = true;
		if(this.tilesetLoaded) {
			this.start();
			player.center();
		}

	}

	boundingBox (a, b) {
		return  a.x < b.x + b.w &&
				a.x + a.w > b.x &&
				a.y < b.y + b.h &&
				a.y + a.h > b.y;
	}

	prepare (ctx) {
		for(let y = 0; y < this.h; y++) {
			for(let x = 0; x < this.w; x++) {
				if(!this.visible[y][x]) continue;
				ctx.drawImage(
					this.tileset,

					this.data[y][x] * this.tw, 0,
					this.tw, this.th,

					x * this.dw,
					y * this.dh,
					this.dw, this.dh
				);
			}
		}
	}

	draw (canvas) {
		this.ctx.drawImage(canvas, this.bx, this.by)
	}

	isWalkable (x, y) {
		if(x < 0 || y < 0) return false;
		if(x >= this.w || y >= this.h) return false;

		if(Map.isCollidableTile(this.data[y][x])) return false;

		return true;
	}

	static isCollidableTile (tile) {
		return tile < 2;
	}

}
