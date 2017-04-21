
//Yggdrasil, The World Tree

//Pretty much an abstraction for dungeon floors and how they link together in one huge tree (which represents the entire world)
//Each node stores the pseudorandom number generator seed, the generation settings, staircase connections to other floors
//and any changes made to each floor including dropped items, exact monster details if the floor was visited recently and general
//floor features. (ie there is item X on tile Y)

//This class also handles automatic state saving at every level state change and provides an interface for autosaving in
//circumstances unknown to the class

class Yggdrasil {
	
	constructor () {

		this.root = new YgNode(null, 0, {
			generate: false,
			spawn: 12,
			data: [
				[0,0,0,0,0],
				[0,5,5,5,0],
				[0,5,3,5,0],
				[0,5,5,5,0],
				[0,0,0,0,0]
			]
		});

		this.current = this.root;

		this.nodes = [this.root];

		this.level = 0;

	}

	up (map, x, y) {
		let parentCon = this.current.parents.filter(seg => seg.cx === x && seg.cy === y)[0];

		this.current = parentCon.parent;
		this.level--;
		map.generate(this.current.settings);

		map.player.x = parentCon.px;
		map.player.y = parentCon.py;

		map.player.updateMapVisibility();
		map.player.center();
	}

	down (map, x, y) {
		let childCon = this.current.children.filter(seg => seg.px === x && seg.py === y)[0];

		if(!childCon.child) {
			childCon.child = new YgNode(childCon, this.level + 1, mapGenSettings, Math.random());
			this.nodes.push(childCon.child);
			this.current = childCon.child;
			this.level++;
			map.generate(this.current.settings);
			this.current.extrapolateConnectors(map);
		} else {
			this.current = childCon.child;
			this.level++;
			map.generate(this.current.settings);
		}

		map.player.x = childCon.cx;
		map.player.y = childCon.cy;

		map.player.updateMapVisibility();
		map.player.center();
	}

}

class YgConnector {

	constructor (parent, type, data) {
		this.parent = parent;
		this.child = null;
		this.parent.children.push(this);
		this.type = type;
		if(this.type === 'stair') {
			this.px = data.px;
			this.py = data.py;
		}
	}

}

class YgNode {

	constructor (parent, level, settings, seed) {
		this.level = level;
		this.settings = JSON.parse(JSON.stringify(settings));
		this.settings.seed = seed || this.settings.seed || Math.random();
		this.changes = [];
		this.parents = parent ? [parent] : [];
		this.children = [];
	}

	extrapolateConnectors (map) {
		let parentNo = 0;
		for(let y = 0; y < map.h; y++) {
			for(let x = 0; x < map.w; x++) {
				if(map.data[y][x] === tiles.stair_down) {
					new YgConnector(this, 'stair', {px: x, py: y});
				} else if(map.data[y][x] === tiles.stair_up) {
					this.parents[parentNo].cx = x;
					this.parents[parentNo].cy = y;
					parentNo++;
				}
			}
		}
	}

}
