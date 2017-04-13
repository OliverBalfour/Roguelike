
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const mapc = document.createElement('canvas');
const mapctx = mapc.getContext('2d');

let w, h;

const windowResize = () => {
	w = canvas.width = innerWidth;
	h = canvas.height = innerHeight;

	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.msImageSmoothingEnabled = false;
	ctx.imageSmoothingEnabled = false;

	mapctx.mozImageSmoothingEnabled = false;
	mapctx.webkitImageSmoothingEnabled = false;
	mapctx.msImageSmoothingEnabled = false;
	mapctx.imageSmoothingEnabled = false;
}
window.onresize = windowResize;
windowResize();

const client = {
	keys: [],
	ktimers: []
}

document.addEventListener('keydown', (e) => {
	let k = e.which || e.keyCode;
	client.keys[k] = 0;
	client.ktimers[k] = -1;
	if(k === 188) {
		player.staircaseUp();
	}
});
document.addEventListener('keyup', (e) => {
	client.keys[e.which || e.keyCode] = client.ktimers[e.which || e.keyCode] = false;
});

const loop = () => {

	requestAnimationFrame(loop);
	ctx.clearRect(0, 0, innerWidth, innerHeight);

	time.ldt = time.dt;
	time.dt = Date.now();
	time.delta = time.dt - time.ldt;
	if(time.dt - time.st > time.second * 1000) {
		time.second++;
		time.fps = time.fpsc;
		time.fpsc = 1;
	} else {
		time.fpsc++;
	}

	for(i in client.keys){
		//For some reason the index is passed as a string... WTF JavaScript?!
		i = parseInt(i);
		if(client.keys[i] !== false){
			client.keys[i] += time.delta;
			if(Math.floor(client.keys[i] / 300) > client.ktimers[i]){
				client.ktimers[i] += 300;
				player.handleKeystroke(client.keys, i);
			}
		}
	}

	map.draw(mapc);
	player.draw();

	//Red guide dot in the middle of the screen
	//ctx.fillStyle = 'red';
	//ctx.fillRect(w / 2 - 1, h / 2 - 1, 2, 2);

	//FPS
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, 120, 30);
	ctx.font = '12px verdana';
	ctx.fillStyle = 'white';
	ctx.fillText(Math.floor(1000 / time.delta) + ' fps, ' + Math.floor(time.fps) + ' stable.', 10, 20);

}


const time = {
	//Start time
	st: Date.now(),
	//Last delta time (time last frame)
	ldt: Date.now(),
	//Delta time (time at beginning of current frame)
	dt: Date.now() + 1,
	//Delta this frame (time between this and last frames)
	delta: 1,
	//Seconds since start time
	second: 0,
	//Frames per second counter
	fpsc: 0,
	//Frames per second
	fps: 0
}


const map = new Map(ctx, 42 * 2 + 1, 42 * 2 + 1, loop);

map.generate(map.w, map.h, {
	minRoomSize: 5,
	maxRoomsSize: 13,
	minRooms: 20,
	maxRooms: 25,
	connectorOpenChance: 10,
	numDeadEnds: 100000,
	seed: 5
});


const player = new Player(ctx, map);

player.x = map.masterRoom.x + (map.masterRoom.w - 1) / 2;
player.y = map.masterRoom.y + (map.masterRoom.h - 1) / 2;
player.updateMapVisibility();
player.center();

map.setPlayer(player);

mapc.width = map.w * map.dw;
mapc.height = map.h * map.dh;


map.prepare(mapctx);


const cheats = {
	noWalls: () => {map.isWalkable = () => true},
	magicMap: () => {map.visible.forEach((arr, i) => {map.visible[i] = arr.map(n => true)}); map.prepare(mapctx)}
}
