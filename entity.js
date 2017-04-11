
class Entity {

	constructor (ctx, map) {
		this.x = 0;
		this.y = 0;
		this.ctx = ctx;
		this.map = map;
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
		if(keymap[38] && this.isWalkable(0, -1))
			this.y--;
		if(keymap[37] && this.isWalkable(-1, 0))
			this.x--;
		if(keymap[40] && this.isWalkable(0, 1))
			this.y++;
		if(keymap[39] && this.isWalkable(1, 0))
			this.x++;

		this.updateMapVisibility();
		this.center();
	}

	updateMapVisibility () {

		this.map.visible[this.y][this.x] = true;

		this.map.visible[this.y + 1][this.x] = true;
		this.map.visible[this.y][this.x + 1] = true;

		this.map.visible[this.y - 1][this.x] = true;
		this.map.visible[this.y][this.x - 1] = true;

		this.map.visible[this.y + 1][this.x + 1] = true;
		this.map.visible[this.y - 1][this.x - 1] = true;

		this.map.visible[this.y + 1][this.x - 1] = true;
		this.map.visible[this.y - 1][this.x + 1] = true;

		//Update only the part of the map the player moved into
		this.map.patch(mapctx, this.x - 1, this.y - 1, 3, 3);

	}

	//Check if a staircase going up is under the player's feet, and if so, go up
	staircaseUp () {
		if(map.data[player.y][player.x] === 2) {
			map.PRNG = new PRNG();
			map.generate(map.w, map.h);
			map.visible.forEach((arr, i) => {map.visible[i] = arr.map(n => true)})
			map.prepare(mapctx);
		}
	}

}
