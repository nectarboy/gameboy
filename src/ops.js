const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;

	var reg = cpu.reg;
	var getReg16 = cpu.getReg16;
	var writeReg16 = cpu.writeReg16;

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
		ADC_a_r8 (r8) {
			r8 = reg [r8];

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
		ADD_a_r8 (r8) {
			r8 = reg [r8];

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

		ADD_hl_r16 (r16) {
			var hl = getReg16.hl ();
			r16 = getReg16 [r16] ();

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
			var u3 = (opcode & 0b00111111) >> 3;
			var r8 = reg [algreg [opcode & 7]];

			flag.zero = !testBit (r8, u3);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 8;
		},
		BIT_u3_hl (opcode) {
			var u3 = (opcode & 0b00111111) >> 3;
			var byte = cpu.readByte (getReg16.hl ());

			flag.zero = !testBit (byte, u3);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 12;
		},

		// CALL
		CALL_n16 () {
			cpu.pushSP (cpu.pc + 1);

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
		CP_a_r8 (r8) {
			r8 = reg [r8];

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
		},

		// CPL
		CPL () {
			reg.a = reg.a ^ 0xff; // Invert bits

			flag.sub = flag.hcar = true;

			cpu.cycles += 4;
		},

		// DAA - WIP
		DAA () {
			// ... i still dont know tf this is
			cpu.cycles += 4;
		},

		// DEC
		DEC_r8 (r8) {
			var res = (reg [r8] - 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = (res & 0xf) === 0;

			reg [r8] = res;

			cpu.cycles += 4;
		},
		DEC_hl () {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var res = (byte - 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = (res & 0xf) === 0;

			cpu.writeByte (hl, res);

			cpu.cycles += 12;
		},
		DEC_r16 (r16) {
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

		// HALT - WIP
		HALT () {
			// WIP ...
		},

		// INC
		INC_r8 (r8) {
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
		INC_r16 (r16) {
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
			var e8 = ops.Fetch () << 24 >> 24; // Compliment byte
			cpu.pc = (cpu.pc + e8) & 0xffff;

			cpu.cycles += 12;
		},
		JR_cc_e8 (cc) {
			if (cc)
				return this.JR_e8 ();

			cpu.pc = (cpu.pc + 1) & 0xffff; // Imaginary fetch
			cpu.cycles += 8;
		},

		// LD
		LD_r8_r8 (rx, ry) {
			reg [rx] = reg [ry];
			cpu.cycles += 4;
		},
		LD_r8_n8 (r8) {
			var byte = ops.Fetch ();
			reg [r8] = byte;

			cpu.cycles += 8;
		},

		LD_r16_n16 (r16) {
			var chunk = ops.Fetch16 ();
			writeReg16 [r16] (chunk);

			cpu.cycles += 12;
		},

		LD_hl_r8 (r8) {
			var hl = getReg16.hl ();
			r8 = reg [r8];

			cpu.writeByte (hl, r8);

			cpu.cycles += 8;
		},
		LD_hl_n8 () {
			var hl = getReg16.hl ();
			var byte = ops.Fetch ();

			cpu.writeByte (hl, byte);

			cpu.cycles += 12;
		},

		LD_r8_hl (r8) {
			var hl = getReg16.hl ();
			reg [r8] = cpu.readByte (hl);

			cpu.cycles += 8;
		},

		LD_r16_a (r16) {
			r16 = getReg16 [r16] ();
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
		
		LD_a_r16 (r16) {
			r16 = getReg16 [r16] ();
			reg.a = cpu.readByte (r16);

			cpu.cycles += 8;
		},
		LD_a_n16 () {
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
			writeReg16.hl (hl - 1); // Dec hl

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
			writeReg16.hl (hl - 1); // Dec hl

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
		OR_a_r8 (r8) {
			r8 = reg [r8];

			var res = reg.a |= r8;

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.cycles += 4;
		},
		OR_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = reg.a |= byte;

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.cycles += 8;
		},
		OR_a_n8 () {
			var byte = ops.Fetch ();

			var res = reg.a |= byte;

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.cycles += 8;
		},

		// POP
		POP_af () {
			var chunk = cpu.popSP ();

			writeReg16.af (chunk & 0xfff0); // Remove unused bits from f

			// Set flags from reg f
			flag.zero = reg.f & (1 << 7) !== 0;
			flag.sub = reg.f & (1 << 6) !== 0;
			flag.hcar = reg.f & (1 << 5) !== 0;
			flag.car = reg.f & (1 << 4) !== 0;

			cpu.cycles += 12;
		},
		POP_r16 (r16) {
			writeReg16 [r16] (cpu.popSP ());
			cpu.cycles += 12;
		},

		// PUSH
		PUSH_af () {
			// Mask flags into reg f
			var newf = (
				(flag.zero << 7) |(flag.sub << 6) | (flag.hcar << 5) | (flag.car << 4)
			);

			cpu.pushSP (newf);

			cpu.cycles += 16;
		},
		PUSH_r16 (r16) {
			r16 = getReg16 [r16] ();
			cpu.pushSP (r16);

			cpu.cycles += 16;
		},

		// RES
		RES_u3_r8 (opcode) {
			var u3 = (opcode & 0b00111111) >> 3;
			var r8 = algreg [opcode & 7];

			reg [r8] = clearBit (reg [r8], u3);

			cpu.cycles += 8;
		},
		RES_u3_hl (opcode) {
			var u3 = (opcode & 0b00111111) >> 3;
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			cpu.writeByte (hl, clearBit (reg [r8], u3));

			cpu.cycles += 16;
		},

		// RET
		RET () {
			cpu.pc = cpu.popSP ();
			cpu.cycles += 16;
		},
		RET_cc (cc) {
			if (cc) {
				this.RET ();
				cpu.cycles += 4;
			}
			else
				cpu.cycles += 8;
		},
		RETI () {
			cpu.ime = true;
			this.RET (); // 16 cycles
		},

		// RL
		RL_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = ((reg [r8] << 1) | flag.car) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (reg [r8], 7);

			reg [r8] = res;

			cpu.cycles += 8;
		},
		RL_hl () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = ((byte << 1) | flag.car) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (byte, 7);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},
		RLA () {
			var res = ((reg.a << 1) | flag.car) & 0xff;

			flag.zero = 
			flag.sub =
			flag.hcar = false;
			flag.car = testBit (reg.a, 7);

			reg.a = res;

			cpu.cycles += 4;
		},

		// RLC
		RLC_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = ((reg [r8] << 1) | (reg [r8] >> 7)) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (reg [r8], 7);

			reg [r8] = res;

			cpu.cycles += 8;
		},
		RLC_hl () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = ((byte << 1) | (byte >> 7)) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (byte, 7);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},
		RLCA () {
			var res = ((reg.a << 1) | (reg.a >> 7)) & 0xff;

			flag.zero = 
			flag.sub =
			flag.hcar = false;
			flag.car = testBit (res, 7);

			reg.a = res;

			cpu.cycles += 4;
		},

		// RR
		RR_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = ((reg [r8] >> 1) | (flag.car << 7)) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (reg [r8], 0);

			reg [r8] = res;

			cpu.cycles += 8;
		},
		RR_hl () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = ((byte >> 1) | (flag.car << 7)) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (byte, 0);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},
		RRA () {
			var res = ((reg.a >> 1) | (flag.car << 7)) & 0xff;

			flag.zero = 
			flag.sub =
			flag.hcar = false;
			flag.car = testBit (reg.a, 0);

			reg.a = res;

			cpu.cycles += 4;
		},

		// RRC
		RRC_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = ((reg [r8] >> 1) | (reg [r8] << 7)) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (res, 0);

			reg [r8] = res;

			cpu.cycles += 8;
		},
		RRC_hl () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = ((byte >> 1) | (byte << 7)) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (res, 0);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},
		RRCA () {
			var res = ((reg.a >> 1) | (reg.a << 7)) & 0xff;

			flag.zero = 
			flag.sub =
			flag.hcar = false;
			flag.car = testBit (res, 0);

			reg.a = res;

			cpu.cycles += 4;
		},

		// RST
		RST_vec (vec) {
			cpu.pushSP (cpu.pc);
			cpu.pc = vec;

			cpu.cycles += 16;
		},

		// SBC
		SBC_a_r8 (r8) {
			var val = reg [r8] + flag.car; // r8 + carry

			var res = (reg.a - val) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = checkSubHcar (reg.a, val);
			flag.car = checkCar (reg.a, val);

			reg.a = res;

			cpu.cycles += 4;
		},
		SBC_a_hl () {
			var hl = getReg16.hl ();
			var val = cpu.readByte (hl) + flag.car; // hl's byte + carry

			var res = (reg.a - val) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = checkSubHcar (reg.a, val);
			flag.car = checkCar (reg.a, val);

			reg.a = res;

			cpu.cycles += 8;
		},
		SBC_a_n8 () {
			var val = ops.Fetch () + flag.car; // fetched byte + carry

			var res = (reg.a - val) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = checkSubHcar (reg.a, val);
			flag.car = checkCar (reg.a, val);

			reg.a = res;

			cpu.cycles += 8;
		},

		// SCF
		SCF () {
			flag.sub = flag.hcar = false;
			flag.car = true;

			cpu.cycles += 4;
		},

		// SET
		SET_u3_r8 (opcode) {
			var u3 = (opcode & 0b00111111) >> 3;
			var r8 = algreg [opcode & 7];

			reg [r8] = setBit (reg [r8], u3);

			cpu.cycles += 8;
		},
		SET_u3_hl (opcode) {
			var u3 = (opcode & 0b00111111) >> 3;
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			cpu.writeByte (hl, setBit (byte, u3));

			cpu.cycles += 16;
		},

		// SLA
		SLA_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = (reg [r8] << 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (reg [r8], 7);

			reg [r8] = res;

			cpu.cycles += 8;
		},
		SLA_hl () {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var res = (byte << 1) & 0xff;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (byte, 7);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},

		// SRA
		SRA_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var bit = reg [r8] & (1 << 7);
			var res = (reg [r8] >> 1 | bit);

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (reg [r8], 0);

			reg [r8] = res;

			cpu.cycles += 8;
		},
		SRA_hl () {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var bit = byte & (1 << 7);
			var res = (byte >> 1 | bit);

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (byte, 0);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},

		// SRL
		SRL_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = reg [r8] >> 1;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (reg [r8], 0); 

			reg [r8] = res;

			cpu.cycles += 8;
		},
		SRL_hl () {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var res = byte >> 1;

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;
			flag.car = testBit (byte, 0);

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},

		// STOP - WIP
		STOP () {
			// ...
			cpu.pc = (cpu.pc + 1) & 0xffff; // Imaginary fetch 
		},

		// SUB
		SUB_a_r8 (r8) {
			r8 = reg [r8];

			flag.hcar = checkSubHcar (reg.a, r8);
			flag.hcar = checkSubCar (reg.a, r8);

			var res = (reg.a - r8) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;

			reg.a = res;

			cpu.cycles += 4;
		},
		SUB_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			flag.hcar = checkSubHcar (reg.a, byte);
			flag.hcar = checkSubCar (reg.a, byte);

			var res = (reg.a - byte) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;

			reg.a = res;

			cpu.cycles += 8;
		},
		SUB_a_n8 () {
			var byte = ops.Fetch ();

			var res = (reg.a - byte) & 0xff;

			flag.zero = res === 0;
			flag.sub = true;
			flag.hcar = checkSubHcar (reg.a, byte);
			flag.hcar = checkSubCar (reg.a, byte);

			reg.a = res;

			cpu.cycles += 8;
		},

		// SWAP
		SWAP_r8 (opcode) {
			var r8 = algreg [opcode & 7];

			var res = ((reg [r8] << 4) | (reg [r8] >> 4)) & 0xff; // Swap bits

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			reg [r8] = res;

			cpu.cycles += 8;
		},
		SWAP_hl () {
			var hl = getReg16.hl ();
			var byte = cpu.readByte (hl);

			var res = ((byte << 4) | (byte >> 4)) & 0xff; // Swap bits

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.writeByte (hl, res);

			cpu.cycles += 16;
		},

		// XOR
		XOR_a_r8 (r8) {
			r8 = reg [r8];

			var res = reg.a ^= r8;

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.cycles += 4;
		},
		XOR_a_hl () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = reg.a ^= byte;

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.cycles += 8;
		},
		XOR_a_n8 () {
			var byte = ops.Fetch ();

			var res = reg.a ^= byte;

			flag.zero = res === 0;
			flag.sub =
			flag.hcar =
			flag.car = false;

			cpu.cycles += 8;
		}

	};

	// =============== //	Fetching and Decoding //

	this.Fetch = function () {
		var byte = cpu.readByte (cpu.pc);
		cpu.pc = (cpu.pc + 1) & 0xffff;

		return byte;
	};

	this.Fetch16 = function () {
		var chunk = cpu.read16 (cpu.pc);
		cpu.pc = (cpu.pc + 2) & 0xffff;

		return chunk;
	};

	this.Decode = function (opcode, pc) {
		switch (opcode) {

			// 0 x 0 0
			case 0x00:
				return this.INS.NOP ();
			case 0x01:
				return this.INS.LD_r16_n16 ('bc');
			case 0x02:
				return this.INS.LD_r16_a ('bc');
			case 0x03:
				return this.INS.INC_r16 ('bc');
			case 0x04:
				return this.INS.INC_r8 ('b');
			case 0x05:
				return this.INS.DEC_r8 ('b');
			case 0x06:
				return this.INS.LD_r8_n8 ('b');
			case 0x07:
				return this.INS.RLCA ();
			case 0x08:
				return this.INS.LD_n16_sp ();
			case 0x09:
				return this.INS.ADD_hl_r16 ('bc');
			case 0x0a:
				return this.INS.LD_a_r16 ('bc');
			case 0x0b:
				return this.INS.DEC_r16 ('bc');
			case 0x0c:
				return this.INS.INC_r8 ('c');
			case 0x0d:
				return this.INS.DEC_r8 ('c');
			case 0x0e:
				return this.INS.LD_r8_n8 ('c');
			case 0x0f:
				return this.INS.RRCA ();

			// 0 x 1 0
			case 0x10:
				return this.INS.STOP ();
			case 0x11:
				return this.INS.LD_r16_n16 ('de');
			case 0x12:
				return this.INS.LD_r16_a ('de');
			case 0x13:
				return this.INS.INC_r16 ('de');
			case 0x14:
				return this.INS.INC_r8 ('d');
			case 0x15:
				return this.INS.DEC_r8 ('d');
			case 0x16:
				return this.INS.LD_r8_n8 ('d');
			case 0x17:
				return this.INS.RLA ();
			case 0x18:
				return this.INS.JR_e8 ();
			case 0x19:
				return this.INS.ADD_hl_r16 ('de');
			case 0x1a:
				return this.INS.LD_a_r16 ('de');
			case 0x1b:
				return this.INS.DEC_r16 ('de');
			case 0x1c:
				return this.INS.INC_r8 ('e');
			case 0x1d:
				return this.INS.DEC_r8 ('e');
			case 0x1e:
				return this.INS.LD_r8_n8 ('e');
			case 0x1f:
				return this.INS.RRA ();

			// 0 x 2 0
			case 0x20:
				return this.INS.JR_cc_e8 (!flag.zero);
			case 0x21:
				return this.INS.LD_r16_n16 ('hl');
			case 0x22:
				return this.INS.LD_hli_a ();
			case 0x23:
				return this.INS.INC_r16 ('hl');
			case 0x24:
				return this.INS.INC_r8 ('h');
			case 0x28:
				return this.INS.JR_cc_e8 (flag.zero);
			case 0x2a:
				return this.INS.LD_a_hli ();
			case 0x2e:
				return this.INS.LD_r8_n8 ('l');

			// 0 x 3 0
			case 0x30:
				return this.INS.JR_cc_e8 (!flag.car);
			case 0x31:
				return this.INS.LD_sp_n16 ();
			case 0x32:
				return this.INS.LD_hld_a ();
			case 0x34:
				return this.INS.INC_hl ();
			case 0x3c:
				return this.INS.INC_r8 ('a');
			case 0x3d:
				return this.INS.DEC_r8 ('a');
			case 0x3e:
				return this.INS.LD_r8_n8 ('a');

			// 0 x 4 0
			case 0x46:
				return this.INS.LD_r8_hl ('b');
			case 0x47:
				return this.INS.LD_r8_r8 ('b', 'a');
			case 0x4f:
				return this.INS.LD_r8_r8 ('c', 'a');

			// 0 x 5 0
			case 0x57:
				return this.INS.LD_r8_r8 ('d', 'a');
			case 0x5f:
				return this.INS.LD_r8_r8 ('e', 'a');

			// 0 x 6 0
			case 0x60:
				return this.INS.LD_r8_r8 ('h', 'b');
			case 0x61:
				return this.INS.LD_r8_r8 ('h', 'c');
			case 0x61:
				return this.INS.LD_r8_r8 ('h', 'd');
			case 0x63:
				return this.INS.LD_r8_r8 ('h', 'e');
			case 0x64:
				return this.INS.LD_r8_r8 ('h', 'h');
			case 0x65:
				return this.INS.LD_r8_r8 ('h', 'l');
			case 0x61:
				return this.INS.LD_r8_hl ('h');
			case 0x67:
				return this.INS.LD_r8_r8 ('h', 'a');
			case 0x68:
				return this.INS.LD_r8_r8 ('l', 'b');
			case 0x69: // funy
				return this.INS.LD_r8_r8 ('l', 'c');
			case 0x6c:
				return this.INS.LD_r8_r8 ('l', 'h');
			case 0x6e:
				return this.INS.LD_r8_hl ('l');

			// 0 x 7 0
			case 0x70:
				return this.INS.LD_hl_r8 ('b');
			case 0x71:
				return this.INS.LD_hl_r8 ('c');
			case 0x72:
				return this.INS.LD_hl_r8 ('d');
			case 0x73:
				return this.INS.LD_hl_r8 ('e');
			case 0x74:
				return this.INS.LD_hl_r8 ('h');
			case 0x75:
				return this.INS.LD_hl_r8 ('l');
			case 0x77:
				return this.INS.LD_hl_r8 ('a');
			case 0x78:
				return this.INS.LD_r8_r8 ('a', 'b');
			case 0x7b:
				return this.INS.LD_r8_r8 ('a', 'e');
			case 0x7c:
				return this.INS.LD_r8_r8 ('a', 'h');

			// 0 x 9 0
			case 0x90:
				return this.INS.SUB_a_r8 ('b');

			// 0 x A 0
			case 0xa8:
				return this.INS.XOR_a_r8 ('b');
			case 0xa9:
				return this.INS.XOR_a_r8 ('c');
			case 0xaa:
				return this.INS.XOR_a_r8 ('d');
			case 0xab:
				return this.INS.XOR_a_r8 ('e');
			case 0xac:
				return this.INS.XOR_a_r8 ('h');
			case 0xad:
				return this.INS.XOR_a_r8 ('l');
			case 0xae:
				return this.INS.XOR_a_hl ();
			case 0xaf:
				return this.INS.XOR_a_r8 ('a');

			// 0 x C 0
			case 0xc0:
				return this.INS.RET_cc (!flag.zero);
			case 0xc1:
				return this.INS.POP_r16 ('bc');
			case 0xc3:
				return this.INS.JP_n16 ();
			case 0xc5:
				return this.INS.PUSH_r16 ('bc');
			case 0xc8:
				return this.INS.RET_cc (flag.zero);
			case 0xc9:
				return this.INS.RET ();
			case 0xcd:
				return this.INS.CALL_n16 ();
			case 0xce:
				return this.INS.ADC_a_n8 ();

			// 0 x D 0
			case 0xd0:
				return this.INS.RET_cc (!flag.car);
			case 0xd6:
				return this.INS.SUB_a_n8 ();
			case 0xd8:
				return this.INS.RET_cc (flag.car);

			// 0 x E 0
			case 0xe0:
				return this.INS.LDH_n8_a ();
			case 0xe1:
				return this.INS.POP_r16 ('hl');
			case 0xe2:
				return this.INS.LDH_c_a ();
			case 0xe5:
				return this.INS.PUSH_r16 ('hl');
			case 0xe6:
				return this.INS.AND_a_n8 ();
			case 0xea:
				return this.INS.LD_n16_a ();

			// 0 x F 0
			case 0xf0:
				return this.INS.LDH_a_n8 ();
			case 0xf1:
				return this.INS.POP_af ();
			case 0xf3:
				return this.INS.DI ();
			case 0xf5:
				return this.INS.PUSH_af ();
			case 0xfe:
				return this.INS.CP_a_n8 ();
			case 0xff:
				return this.INS.RST_vec (0x38);
			
			// INVALID OPCODE - PANIC ! ! !
			default:
				return this.InvOp (opcode, pc);

		}
	};

	this.DecodeCB = function (op, pc) {
		var hicrumb = (op & 0b11000000) >> 6;

		function nohl () {
			return (op & 7) !== 6;
		}

		if (hicrumb === 0) {
			var opgrp = (op & 0b00111111) >> 3;
			switch (opgrp) {
				case 0: return nohl () ? this.INS.RLC_r8 (op) : this.INS.RLC_hl ();
				case 1: return nohl () ? this.INS.RRC_r8 (op) : this.INS.RRC_hl ();
				case 2: return nohl () ? this.INS.RL_r8 (op) : this.INS.RL_hl ();
				case 3: return nohl () ? this.INS.RR_r8 (op) : this.INS.RR_hl ();
				case 4: return nohl () ? this.INS.SLA_r8 (op) : this.INS.SLA_hl ();
				case 5: return nohl () ? this.INS.SRA_r8 (op) : this.INS.SRA_hl ();
				case 6: return nohl () ? this.INS.SWAP_r8 (op) : this.INS.SWAP_hl ();
				case 7: return nohl () ? this.INS.SRL_r8 (op) : this.INS.SRL_hl ();
			}
		}
		else if (hicrumb === 1) {
			nohl () ? this.INS.BIT_u3_r8 (op) : this.INS.BIT_u3_hl (op);
		}
		else if (hicrumb === 2) {
			nohl () ? this.INS.RES_u3_r8 (op) : this.INS.RES_u3_hl (op);
		}
		else if (hicrumb === 3) {
			nohl () ? this.INS.SET_u3_r8 (op) : this.INS.SET_u3_hl (op);
		}
		else {
			return this.InvOp (op, pc); // This rlly shouldnt happen ...
		}
	};

	var biglog = '';
	var logcount = 0;
	var logmax = 47932; // Lines in peach's bootlog

	this.ExeIns = function () {
		var prepc = cpu.pc;
		var opcode = this.Fetch ();

		/*biglog += this.GetLogLine (opcode, prepc) + '\n';
		logcount ++;

		if (logcount === logmax) {
			var win = window.open("", "Title", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=500,top="+(screen.height/2)+",left="+(screen.width/2));
			win.document.body.innerHTML = '<pre>' + biglog + '</pre>';

			throw 'BRUH';
		}*/

		// Prefixed
		if (opcode === 0xcb) {
			opcode = this.Fetch (); // Fetch once more
			this.DecodeCB (opcode, cpu.pc);
		}
		// Non-prefixed
		else {
			this.Decode (opcode, cpu.pc);
		}
	};

	// =============== //	Debugging //

	this.InvOp = function (opcode, pc) {
		cpu.Panic (
			'INVop\n' + this.GetDebugMsg (opcode, pc)
		);
	};

	this.IllOp = function (opcode, pc) {
		cpu.Panic (
			'ILLOP\n' + this.GetDebugMsg (opcode, pc)
		);
	};

	this.GetDebugMsg = function (opcode, pc) {
		return (
			'OP: ' + opcode.toString (16) + '\n' +
			'PC: ' + pc.toString (16)
		);
	};

	this.GetLogLine = function (opcode, pc) {
		var toHex = n => ('0' + n.toString (16)).slice (-2);
		var toHex16 = n => ('000' + n.toString (16)).slice (-4);

		return (
			'A: ' + toHex (reg.a) +
			' F: ' + toHex ((flag.zero << 7) |(flag.sub << 6) | (flag.hcar << 5) | (flag.car << 4)) +
			' B: ' + toHex (reg.b) +
			' C: ' + toHex (reg.c) +
			' D: ' + toHex (reg.d) +
			' E: ' + toHex (reg.e) +
			' H: ' + toHex (reg.h) +
			' L: ' + toHex (reg.l) +

			' SP: ' + toHex16 (cpu.sp) +
			' PC: ' + toHex16 (pc) +
			' (' + toHex (opcode) + ')'
		);
	};

};