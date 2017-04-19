
//Yggdrasil, The World Tree

//Pretty much an abstraction for dungeon floors and how they link together in one huge tree (which represents the entire world)
//Each node stores the pseudorandom number generator seed, the generation settings, staircase connections to other floors
//and any changes made to each floor including dropped items, exact monster details if the floor was visited recently and general
//floor features. (ie there is item X on tile Y)

//This class also handles automatic state saving at every level state change and provides an interface for autosaving in
//circumstances unknown to the class

class Yggdrasil {
	
	constructor () {

		this.current = new YgNode(0, 0, null);

		this.level = 0;

		//2D fragmented array, one array per depth level
		this.nodes = [[this.current]];

	}

}

class YgConnector {

	constructor (parent, type, data) {
		this.parent = parent;
		this.child = null;
		this.parent.children.push(this);
		this.type = type;
		if(this.type === 'stair') {
			this.parentX = data.px;
			this.parentY = data.py;
		}
	}

	loadChild () {}

}

class YgNode {

	constructor (level, seed, settings) {
		this.level = level;
		this.settings = settings;
		//this.settings.seed = seed;
		this.changes = [];
		this.parents = [];
		this.children = [];
	}

	addParent (connector) {
		this.parents.push(connector);
	}

	addChild (connector) {
		this.children.push(connector);
	}

	extrapolateConnectors (map) {
		for(let y = 0; y < map.h; y++) {
			for(let x = 0; x < this.w; x++) {
				if(map.data[y][x] === tiles.stair_down) {
					this.addChild(new YgConnector(this, 'stair', {px: x, py: y}));


				}// else if(map.data[y][x] === tiles.stair_up) {
				// 	this.addParent(new YgConnector(this, 'stair', {px: x, py: y}));
				// }
			}
		}
	}

}
