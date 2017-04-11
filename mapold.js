

//RNG using Math.random, DO NOT USE FOR MAP GENERATION, use PRNG instead

// const rng = n => Math.floor(Math.random() * n);
// const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;


//Pseudo-Random Number Generator (PRNG), uses the Linear Congruential Generator (LCG) algorithm
//Uses some big seeds I found on wikipedia

//Use a separate PRNG with a Math.random() seed for each level's generation and Math.random() for monster/loot generation
//That way, instead of storing entire map data trees in RAM, we can have a tree of map level seeds to generate from

//Always generate things in the same order, no asynchronous operations using the same PRNG as synchronous ones
//The whole point of using a PRNG is so that you can save the seed to retrieve the same results later

class PRNG {

	//Seed is a decimal like Math.random()
	constructor (seed) {

		this.params = {
			M: 4294967296,
			A: 1664525,
			C: 1
		}

		this.seed = Math.floor((seed || Math.random()) * this.params.M);
		this.params.Z = this.seed;

	}

	//Returns next pseudorandom float
	next () {
		this.params.Z = (this.params.A * this.params.Z + this.params.C) % this.params.M;
		return this.Z / this.M;
	}

	//Returns the next float as a  pseudorandom whole number
	rng (n) {
		return Math.floor(this.next() * n);
	}

	//Returns the next float as a pseudorandom whole number in a range min-max
	range (min, max) {
		return Math.floor(this.next() * (max - min)) + min;
	}

}
