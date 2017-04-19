
class Entity {

	constructor (ctx, map) {
		this.x = 0;
		this.y = 0;
		this.ctx = ctx;
		this.map = map;
		this.visible = [];
	}

	draw () {
		this.ctx.drawImage(
			this.map.tileset,

			6 * this.map.tw, 0,
			this.map.tw, this.map.th,

			this.map.bx + this.x * this.map.dw,
			this.map.by + this.y * this.map.dh,
			this.map.dw, this.map.dh
		);
	}

	//Checks if a tile relative to the current position is walkable, used for collision detection
	isWalkable (dx, dy) {
		return this.map.isWalkable(this.x + dx, this.y + dy);
	}

	//Center entity on the screen given screen dimensions, w and h (global)
	center () {
		this.map.bx = Math.floor(w / 2 - this.x * this.map.dw - this.map.dw / 2);
		this.map.by = Math.floor(h / 2 - this.y * this.map.dh - this.map.dh / 2);
	}

}

class Player extends Entity {

	handleKeystroke (keymap, i) {
		if(i === 37 || i === 38 || i === 39 || i === 40)
			this.move(keymap);
	}

	move (keymap) {
		let u = keymap[38],
			d = keymap[40],
			l = keymap[37],
			r = keymap[39];

		//Up down left right for standard movement
		//Shift+[arrowkey]+[arrowkey] for diagonal movement
		//ie shift+up+left is up-left diagonal
		//While holding two arrow keys at once any further movements will be diagonal
		if(!keymap[16]) {
			if(u && this.isWalkable(0, -1))
				this.y--;
			if(d && this.isWalkable(0, 1))
				this.y++;
			if(l && this.isWalkable(-1, 0))
				this.x--;
			if(r && this.isWalkable(1, 0))
				this.x++;
		} else {
			if(u && !d && l && !r && this.isWalkable(-1, -1)) {
				this.x--;
				this.y--;
			} else if(u && !d && !l && r && this.isWalkable(1, -1)) {
				this.x++;
				this.y--;
			} else if(!u && l && d && !r && this.isWalkable(-1, 1)) {
				this.x--;
				this.y++;
			} else if(!u && d && !l && r && this.isWalkable(1, 1)) {
				this.x++;
				this.y++;
			}
		}

		this.updateMapVisibility();
		this.center();
	}

	updateMapVisibility () {

		this.visible = [];

		this.map.visible[this.y][this.x] = true;
		this.visible.push(this.map.sPos(this.x, this.y));

		this.map.visible[this.y + 1][this.x] = true;
		this.visible.push(this.map.sPos(this.x, this.y + 1));
		this.map.visible[this.y][this.x + 1] = true;
		this.visible.push(this.map.sPos(this.x + 1, this.y));

		this.map.visible[this.y - 1][this.x] = true;
		this.visible.push(this.map.sPos(this.x, this.y - 1));
		this.map.visible[this.y][this.x - 1] = true;
		this.visible.push(this.map.sPos(this.x - 1, this.y));

		this.map.visible[this.y + 1][this.x + 1] = true;
		this.visible.push(this.map.sPos(this.x + 1, this.y + 1));
		this.map.visible[this.y - 1][this.x - 1] = true;
		this.visible.push(this.map.sPos(this.x - 1, this.y - 1));

		this.map.visible[this.y + 1][this.x - 1] = true;
		this.visible.push(this.map.sPos(this.x - 1, this.y + 1));
		this.map.visible[this.y - 1][this.x + 1] = true;
		this.visible.push(this.map.sPos(this.x + 1, this.y - 1));

		//Update only the part of the map the player moved into and out of
		this.map.patch(mapctx, this.x - 2, this.y - 2, 5, 5);

	}

	//Check if a staircase going down is under the player's feet, and if so, go down
	staircaseDown () {
		if(this.map.data[this.y][this.x] === 3) {

			this.map.generate(this.map.w, this.map.h, mapGenSettings);
			this.map.yggdrasil.addNode(
				this.map.yggdrasil.currentNode,
				this.map.sPos(this.x, this.y),
				this.map.stairs, map.seed,
				mapGenSettings
			);

			this.updateMapVisibility();
			this.map.prepare();
		}
	}

	//Check if a staircase going up is under the player's feet, and if so, go up
	staircaseUp () {
		if(this.map.data[this.y][this.x] === 2) {
			this.map.generate(this.map.w, this.map.h);
			this.updateMapVisibility();
			this.map.prepare();
		}
	}

}
