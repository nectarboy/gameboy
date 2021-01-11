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

			cpu.cycles += 4;
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

			cpu.cycles += 8;
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

			cpu.cycles += 8;
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

			cpu.cycles += 4;
		},
		ADD_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var sum = reg.a + byte;
			flag.hcar = checkHcar (reg.a, byte);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 8;
		},
		ADD_a_n8 () {
			var byte = ops.Fetch ();

			var sum = reg.a + byte;
			flag.hcar = checkHcar (reg.a, byte);
			flag.car = checkCar (sum);

			var res = reg.a = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;

			cpu.cycles += 8;
		},

		ADD_hl_r16 (opcode) {
			var hl = getReg16.hl ();
			var r16 = getReg16 [algreg16 [opcode & 3]] ();

			var sum = hl + r16;
			flag.hcar = checkHcar16 (hl, r16);
			flag.car = checkCar16 (sum);

			writeReg16.hl (sum);

			flag.sub = false;

			cpu.cycles += 8;
		},

		ADD_hl_sp (opcode) {
			var hl = getReg16.hl ();
			var sp = cpu.sp;

			var sum = hl + sp;
			flag.hcar = checkHcar16 (hl, sp);
			flag.car = checkCar16 (sum);

			writeReg16.hl (sum);

			flag.sub = false;

			cpu.cycles += 8;
		},

		ADD_sp_e8 () {
			var sp = cpu.sp;
			var e8 = ops.Fetch () << 24 >> 24;

			var sum = sp + e8;
			flag.hcar = checkHcar (sp, e8);
			flag.car = checkCar (sum);

			cpu.sp = sum & 0xffff;

			flag.zero = flag.sub = false;

			cpu.cycles += 16;
		},

		// AND
		AND_a_r8 (opcode) {
			var r8 = reg [algreg [opcode & 7]];

			var res = reg.a &= r8;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 4;
		},
		AND_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = reg.a &= byte;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 8;
		},
		AND_a_n8 () {
			var byte = ops.Fetch ();

			var res = reg.a &= byte;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 8;
		},

		// BIT
		BIT_u3_r8 (opcode) {
			var u3 = ((opcode & 0x3f) / 8) | 0;
			var r8 = reg [algreg [opcode & 7]];

			flag.zero = !testBit (r8, u3);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 8;
		},
		BIT_u3_hl (opcode) {
			var u3 = ((opcode & 0x3f) / 8) | 0;
			var byte = cpu.readByte (getReg16.hl ());

			flag.zero = !testBit (byte, u3);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 12;
		},

		// CALL
		CALL_n16 () {
			cpu.pushSP (cpu.pc);

			var addr = ops.Fetch16 ();
			cpu.pc = addr;

			cpu.cycles += 24;
		},
		CALL_cc_n16 (cc) {
			if (cc)
				return this.CALL_n16 ();

			cpu.pc = (cpu.pc + 2) & 0xffff; // Imaginary chunk fetch (a chunk is my word for 16 bit num !)
			cpu.cycles += 12;
		},

		// CCF
		CCF () {
			flag.sub = flag.hcar = false;
			flag.car = !flag.car;

			cpu.cycles += 4;
		},

		// CP
		CP_a_r8 (opcode) {
			var r8 = reg [algreg [opcode & 7]];

			flag.hcar = checkSubHcar (reg.a, r8);
			flag.hcar = checkSubCar (reg.a, r8);

			var res = (reg.a - r8) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;

			cpu.cycles += 4;
		},
		CP_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			flag.hcar = checkSubHcar (reg.a, byte);
			flag.hcar = checkSubCar (reg.a, byte);

			var res = (reg.a - byte) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;

			cpu.cycles += 8;
		},
		CP_a_n8 () {
			var byte = ops.Fetch ();

			var res = (reg.a - byte) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = checkSubHcar (reg.a, byte);
			flag.hcar = checkSubCar (reg.a, byte);

			cpu.cycles += 8;

			return res; // Give the result a future :)
		},

		// CPL
		CPL () {
			reg.a = reg.a ^ 0xff; // Invert bits

			flag.sub = flag.hcar = true;

			cpu.cycles += 4;
		},

		// DAA
		DAA () {
			// ... i still dont know tf this is
			cpu.cycles += 4;
		},

		// DEC
		DEC_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = (reg [r8] - 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = (res & 0xf) === 0;

			reg [r8] = res;

			cpu.cycles += 4;
		},
		DEC_hl (opcode) {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var res = (byte - 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = (res & 0xf) === 0;

			cpu.writeByte (hl, res);

			cpu.cycles += 12;
		},
		DEC_r16 (opcode) {
			var r16 = algreg16 [opcode & 3];
			writeReg16 [r16] (getReg16 [r16] () - 1);

			cpu.cycles += 8;
		},

		DEC_sp () {
			cpu.writeSP (cpu.sp - 1);
			cpu.cycles += 4;
		},

		// DE - EI
		DI () {
			cpu.ime = false;
			cpu.cycles += 4;
		},
		EI () {
			cpu.ime = true;
			cpu.cycles += 4;
		},

		// HALT
		HALT () {
			// WIP ...
		},

		// INC
		INC_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = (reg [r8] + 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = (res & 0xf) === 0;

			reg [r8] = res;

			cpu.cycles += 4;
		},
		INC_hl () {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var res = (byte + 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = (res & 0xf) === 0;

			cpu.writeByte (hl, res);

			cpu.cycles += 12;
		},
		INC_r16 (opcode) {
			var r16 = algreg16 [opcode & 3];
			writeReg16 [r16] (getReg16 [r16] () + 1);

			cpu.cycles += 8;
		},
		INC_sp () {
			cpu.writeSP (cpu.sp + 1);
			cpu.cycles += 8;
		},

		// JP
		JP_n16 () {
			var addr = ops.Fetch16 ();
			cpu.pc = addr;

			cpu.cycles += 16;
		},
		JP_cc_n16 (cc) {
			if (cc)
				return this.JP_n16 ();

			cpu.pc = (cpu.pc + 2) & 0xffff; // Imaginary chunk fetch
			cpu.cycles += 12;
		},

		JP_hl () {
			cpu.pc = getReg16.hl ();
			cpu.cycles += 4;
		},

		// JR
		JR_e8 () {
			var e8 = cpu.Fetch () << 24 >> 24; // Compliment byte
			cpu.pc = (cpu.pc + e8) & 0xffff;

			cpu.cycles += 12;
		},
		JR_cc_e8 (cc) {
			if (cc)
				return this.JR_e8 ();

			cpu.pc = (cpu.pc + 1) & 0xffff;
			cpu.cycles += 8;
		},

		// LD
		LD_r8_r8 (opcode) {
			var rx = algreg [(opcode >> 3) & 7];
			var ry = algreg [opcode & 7];

			reg [rx] = reg [ry];

			cpu.cycles += 4;
		},
		LD_r8_n8 (opcode) {
			var r8 = algreg [(opcode >> 3) & 7];
			var byte = ops.Fetch ();

			reg [r8] = byte;

			cpu.cycles += 8;
		},

		LD_r16_n16 (opcode) {
			var r16 = algreg [opcode & 3];
			var chunk = ops.Fetch16 ();

			writeReg16 [r16] (chunk);

			cpu.cycles += 12;
		},

		LD_hl_r8 (opcode) {
			var hl = getReg16.hl ();
			var r8 = algreg [opcode & 7];

			cpu.writeByte (hl, reg [r8]);

			cpu.cycles += 8;
		},
		LD_hl_n8 () {
			var hl = getReg16.hl ();
			var byte = ops.Fetch ();

			cpu.writeByte (hl, byte);

			cpu.cycles += 12;
		},

		LD_r8_hl (opcode) {
			var r8 = algreg [(opcode >> 3) & 7];
			var hl = getReg16.hl ();

			reg [r8] = cpu.readByte (hl);

			cpu.cycles += 8;
		},

		LD_r16_a (opcode) {
			var r16 = getReg16 [algreg16 [opcode & 3]] ();
			cpu.writeByte (r16, reg.a);

			cpu.cycles += 8;
		},
		LD_n16_a () {
			var chunk = ops.Fetch16 ();
			cpu.writeByte (chunk, reg.a);

			cpu.cycles += 16;
		},

		// LDH
		LDH_n8_a () {
			var byte = ops.Fetch ();
			cpu.writeByte (0xff00 | byte, reg.a); // Write to ioreg at 0xff00 | byte

			cpu.cycles += 12;
		},
		LDH_c_a () {
			cpu.writeByte (0xff00 | reg.c, reg.a); // Write to ioreg at 0xff00 | byte

			cpu.cycles += 8;
		},
		LDH_a_n8 () {
			var byte = ops.Fetch ();
			reg.a = cpu.readByte (0xff00 | byte);

			cpu.cycles += 12;
		},
		LDH_a_c () {
			reg.a = cpu.readByte (0xff00 | reg.c);

			cpu.cycles += 8;
		},
		
		LD_a_r16 (opcode) {
			var r16 = getReg16 [algreg16 [opcode & 3]] ();
			reg.a = cpu.readByte (r16);

			cpu.cycles += 8;
		},
		LD_a_n16 (opcode) {
			var chunk = ops.Fetch16;
			reg.a = cpu.readByte (chunk);

			cpu.cycles += 8;
		},

		// LD HLI - LD HLD
		LD_hli_a () {
			var hl = getReg16.hl ();

			cpu.writeByte (hl, reg.a);
			writeReg16.hl (hl + 1); // Inc hl

			cpu.cycles += 8;
		},
		LD_hld_a () {
			var hl = getReg16.hl ();

			cpu.writeByte (hl, reg.a);
			writeReg16.hl (hl - 1); // Inc hl

			cpu.cycles += 8;
		},

		LD_a_hli () {
			var hl = getReg16.hl ();

			reg.a = cpu.readByte (hl);
			writeReg16.hl (hl + 1); // Inc hl

			cpu.cycles += 8;
		},
		LD_a_hld () {
			var hl = getReg16.hl ();

			reg.a = cpu.readByte (hl);
			writeReg16.hl (hl - 1); // Inc hl

			cpu.cycles += 8;
		},

		// LD SP
		LD_sp_n16 () {
			var chunk = ops.Fetch16 ();
			cpu.writeSP (chunk);

			cpu.cycles += 12;
		},
		LD_n16_sp () {
			var chunk = ops.Fetch16 ();
			cpu.write16 (chunk, cpu.sp); // Write sp to address n16

			cpu.cycles += 20;
		},
		LD_hl_spe8 () {
			var hl = getReg16.hl ();
			var e8 = ops.Fetch () << 24 >> 24; // Compliment byte

			var sum = cpu.sp + e8;
			var res = sum & 0xff;

			flag.zero = res === 0;
			flag.sub = false;
			flag.hcar = checkHcar (cpu.sp, e8);
			flag.car = checkCar (sum);

			writeReg16.hl (res);

			cpu.cycles += 12; // Phew .. !
		},
		LD_sp_hl () {
			cpu.writeSP (getReg16.hl ());
			cpu.cycles += 8;
		},

		// NOP
		NOP () {
			cpu.cycles += 4;
		},

		// OR

	};

	// =============== //	Fetching and Decoding //

	this.Fetch = function () {
		return cpu.readByte (cpu.pc);
		cpu.pc = (cpu.pc + 1) & 0xffff;
	};

	this.Fetch16 = function () {
		return cpu.read16 (cpu.pc);
		cpu.pc = (cpu.pc + 2) & 0xffff;
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