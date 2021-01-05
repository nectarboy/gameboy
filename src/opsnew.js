const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;

	var reg = cpu.reg;
	var getreg16 = cpu.getreg16;
	var setreg16 = cpu.setreg16;

	// =============== //	Basic Functions //

	// Carry and Half Carry //
	this.checkHcar = function (a, b) {
		return flag.hcar = (((a & 0xf) + (b & 0xf)) > 0xf);
	};
	this.checkCar = function (sum) {
		return flag.car = (sum > 0xff);
	};

	this.checkHcar16 = function (a, b) {
		return flag.hcar = (((a & 0xfff) + (b & 0xfff)) > 0xfff);
	};
	this.checkCar16 = function (sum) {
		return flag.car = (sum > 0xffff);
	};

	this.checkSubCar = function (a, b) {
		return flag.car = (a < b);
	};
	this.checkSubHcar = function (a, b) {
		flag.hcar = ((a & 0xf) < (b & 0xf));
	};

	// Bit Operations //
	this.bitSet = function (n, b) {
		return (n & (1 << b)) !== 0;
	};
	this.clearBit = function (n, b) {
		return n & ~(1 << b);
	};
	this.setBit = function (n, b) {
		return n | (1 << b);
	};

	// =============== //	GB Instructions //

	// =============== //	Fetching and Decoding //

	this.fetchOp = function () {
		return cpu.readByte (cpu.pc ++);
	};

	this.decodeOp = function (op) {

	};

	this.decodePrefixed = function (op) {

	};

	this.exeIns = function () {
		var op = this.fetchOp ();

		// Prefixed
		if (op === 0xcb) {
			op = this.fetchOp (); // Fetch again
			decodePrefixed (op);
		}
		// Non-prefixed
		else {
			this.decodeOp ();
		}
	};

};