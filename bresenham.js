
//Takes p1, p2 of form {x: number, y: number}
//eg BresenhamLine({x: 1, y: 1}, {x: 2, y: 3})
//Returns array of points of above form
//eg [{x: 1, y: 1}, {x: 2, y: 2}, {x: 2, y: 3}]

function BresenhamLine(x0, y0, x1, y1) {
	const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
	if(steep) {
		let temp;
		//swap x0,y0
		temp = x0; x0 = y0; y0 = temp;
		//swap x1,y1
		temp = x1; x1 = y1; y1 = temp;
	}

	let sign = 1;
	if(x0 > x1) {
		sign = -1;
		x0 *= -1;
		x1 *= -1;
	}

	let dx = x1-x0,
		dy = Math.abs(y1 - y0),
		err = (dx / 2),
		ystep = y0 < y1 ? 1 : -1,
		y = y0;

	let points = [];

	for(let x = x0; x <= x1; x++) {
		if(steep)
			points.push({x: y, y: sign * x});
		else
			plot({x: sign * x, y: y});

		err -= dy;

		if(err < 0) {
			y += ystep;
			err += dx;
		}
	}

	return points;
}
