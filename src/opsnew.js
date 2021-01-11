const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;

	var reg = cpu.reg;
	var getReg16 = cpu.getReg16;
	var setReg16 = cpu.setReg16;

	// =============== //	Basic Functions //

	// Carry and Half Carry //
	function checkHcar (a, b) {
		return (((a & 0xf) + (b & 0xf)) > 0xf);
	}
	function checkCar (sum) {
		return (sum > 0xff);
	}

	function checkHcar16 (a, b) {
		return (((a & 0xfff) + (b & 0xfff)) > 0xfff);
	}
	function checkCar16 (sum) {
		return (sum > 0xffff);
	}

	function checkSubCar (a, b) {
		return (a < b);
	}
	function checkSubHcar (a, b) {
		return ((a & 0xf) < (b & 0xf));
	}

	// Bit Operations //
	function testBit (n, b) {
		return (n & (1 << b)) !== 0;
	}
	function clearBit (n, b) {
		return n & ~(1 << b);
	}
	function setBit (n, b) {
		return n | (1 << b);
	}

	// =============== //	GB Instructions //

	// Algorithmic Decoding
	var algreg = {
		0: 'b',
		1: 'c',
		2: 'd',
		3: 'e',
		4: 'h',
		5: 'l',
		7: 'a'
	};

	var algreg16 = {
		0: 'bc',
		1: 'de',
		2: 'hl',
		3: 'af'
	};

	// Instructions
	this.INS = {
		// ADC
		ADC_a_r8 (opcode) {
			var r8 = reg [algreg [opcode & 7]];

			var val = r8 + flag.car;
			var sum = reg.a + val;
			flag.hcar = checkHcar (reg.a, val);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 1;
		},
		ADC_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var val = byte + flag.car;
			var sum = reg.a + val;
			flag.hcar = checkHcar (reg.a, val);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 2;
		},
		ADC_a_n8 () {
			var byte = ops.Fetch ();

			var val = byte + flag.car;
			var sum = reg.a + val;
			flag.hcar = checkHcar (reg.a, val);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 2;
		},

		// ADD
		ADD_a_r8 (opcode) {
			var r8 = reg [algreg [opcode & 7]];

			var sum = reg.a + r8;
			flag.hcar = checkHcar (reg.a, reg [r8]);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 1;
		},
		ADD_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var sum = reg.a + byte;
			flag.hcar = checkHcar (reg.a, byte);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 2;
		},
		ADD_a_n8 () {
			var byte = ops.Fetch ();

			var sum = reg.a + byte;
			flag.hcar = checkHcar (reg.a, byte);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 2;
		},

		ADD_hl_r16 (opcode) {
			var hl = getReg16.hl ();
			var r16 = getReg16 [algreg16 [opcode & 3]] ();

			var sum = hl + r16;
			flag.hcar = checkHcar16 (hl, r16);
			flag.car = checkCar16 (sum);

			writeReg16.hl (sum);

			flag.sub = false;

			cpu.cycles += 2;
		},

		ADD_hl_sp (opcode) {
			var hl = getReg16.hl ();
			var sp = cpu.sp;

			var sum = hl + sp;
			flag.hcar = checkHcar16 (hl, sp);
			flag.car = checkCar16 (sum);

			writeReg16.hl (sum);

			flag.sub = false;

			cpu.cycles += 2;
		},

		ADD_sp_e8 () {
			var sp = cpu.sp;
			var e8 = ops.Fetch () << 24 >> 24;

			var sum = sp + e8;
			flag.hcar = checkHcar (sp, e8);
			flag.car = checkCar (sum);

			cpu.sp = sum & 0xffff;

			flag.zero = flag.sub = false;

			cpu.cycles += 4;
		},

		// AND
		AND_a_r8 (opcode) {
			var r8 = reg [algreg [opcode & 7]];

			var res = reg.a &= r8;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 1;
		},
		AND_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = reg.a &= byte;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
		},
		AND_a_n8 () {
			var byte = ops.Fetch ();

			var res = reg.a &= byte;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
		},

		// BIT
		
	};

	// =============== //	Fetching and Decoding //

	this.Fetch = function () {
		return cpu.readByte (cpu.pc ++);
	};

	this.Decode = function (op) {

	};

	this.DecodeCB = function (op) {

	};

	this.ExeIns = function () {
		var prepc = cpu.pc;
		var opcode = this.Fetch ();

		// Prefixed
		if (opcode === 0xcb) {
			opcode = this.Fetch (); // Fetch once more
			this.DecodeCB (opcode);
		}
		// Non-prefixed
		else {
			this.Decode (opcode);
		}

		console.log (this.GetDebugMsg (opcode, prepc));
	};

	// =============== //	Debugging //

	this.InvOp = function (opcode, pc) {
		cpu.Panic (
			'INVop\n' + this.GetDebugMsg (opcode, pc)
		);
	};

	this.GetDebugMsg = function (opcode, pc) {
		return (
			'OP: ' + opcode.toString (16) + '\n' +
			'PC: ' + pc.toString (16)
		);
	};

};