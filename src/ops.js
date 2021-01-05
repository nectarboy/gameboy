const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;
	var reg = cpu.reg;
	var getReg16 = cpu.getReg16;

	// =============== //	Basic Functions //

	// Flags //
	this.checkHcar = function (a, b) {
		return flag.hcar = (((a & 0xf) + (b & 0xf)) > 0xf);
	};
	this.checkCar = function (sum) {
		return flag.car = (sum > 0xff);
	};
	this.checkZero = function (res) {
		return flag.zero = (res === 0);
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

	// Thanks to 'Super S06' on Stack-Overflow :D
	this.uncomplement = function (byte) {
		return byte << 24 >> 24;
	};

	// =============== //	Instructions //

	this.INS = {

		ADC_a_r8: function (r8) {
			ops.checkHcar (reg [r8], reg.a);

			var sum = reg [r8] + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);

			cpu.cycles += 1;
		},
		ADC_a_hl: function () {
			var byte = cpu.readByte (getReg16.hl ());
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);

			cpu.cycles += 2;
		},
		ADC_a_n8: function () {
			var byte = ops.Fetch (); // Byte after opcode
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkHcar (byte, reg.a);

			cpu.cycles += 2;
		},

		ADD_a_r8: function (r8) {
			ops.checkHcar (reg [r8], reg.a);

			var sum = reg [r8] + reg.a;

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 1;
		},
		ADD_a_hl: function () {
			var byte = cpu.readByte (getReg16.hl ());
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 2;
		},
		ADD_a_n8: function () {
			var byte = ops.Fetch (); // Byte after opcode
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 2;
		},

		ADD_hl_r16: function (r16) {
			var hl = getReg16.hl ();
			r16 = getReg16 [r16] ();

			ops.checkHcar16 (r16, hl);

			var sum = r16 + hl;

			var res = cpu.writeReg16.hl (sum);

			flag.sub = false;
			ops.checkCar16 (sum);

			cpu.cycles += 2;
		},
		ADD_hl_sp: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (cpu.sp);
			ops.checkHcar16 (byte, hl);

			var sum = byte + hl;

			var res = cpu.writeReg16.hl (sum);

			flag.sub = false;
			ops.checkCar16 (sum);

			cpu.cycles += 2;
		},

		ADD_sp_e8: function () {
			var e8 = ops.uncomplement (ops.Fetch ()); // Byte after opcode
			ops.checkHcar (e8, cpu.sp);

			var sum = e8 + cpu.sp;

			var res = cpu.writeSP (sum);

			flag.zero = false;
			flag.sub = false;
			ops.checkCar (sum);

			cpu.cycles += 4;
		},

		AND_a_r8: function () {
			var res = cpu.writeReg ('a', reg [r8] & reg.a);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 1;
		},
		AND_a_hl: function (r8) {
			var byte = cpu.readByte (getReg16.hl ());
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
		},
		AND_a_n8: function () {
			var byte = ops.Fetch (); // Byte after opcode
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
		},

		BIT_u3_r8: function (u3, r8) {
			ops.checkZero (reg [r8] & (1 << u3));
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 2;
		},
		BIT_u3_r8: function (u3) {
			var byte = cpu.readByte (getReg16.hl ());

			ops.checkZero (byte & (1 << u3));
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 3;
		},
		
		CALL_n16: function () {
			var fulladdr = cpu.read16 (cpu.pc); // Get full address from instruction

			cpu.pushSP (fulladdr); // Push the first addr into the stack
			this.JP_n16 ();

			cpu.cycles += 2; // 4 + 2
		},
		CALL_cc_n16: function (cc) {
			if (cc)
				return this.CALL_n16 ();

			cpu.cycles += 3;
			cpu.pc += 2;
		},

		CCF: function () {
			// Invert carry flag
			flag.car = !flag.car;

			flag.sub = false;
			flag.hcar = false;

			cpu.cycles += 1;
		},

		CP_a_r8: function (r8) {
			var res = (reg.a - reg [r8]) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 1;
		},
		CP_a_hl: function () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 2;
		},
		CP_a_n8: function () {
			var byte = ops.Fetch ();

			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg.a);
			ops.checkSubCar (res, reg.a);

			cpu.cycles += 2;
		},

		CPL: function () {
			cpu.writeReg ('a', reg.a ^ 0xff); // Invert bits

			cpu.cycles += 1;
		},

		DAA: function () {
			// WIP
			cpu.cycles += 1;
		},

		DEC_r8: function (r8) {
			var res = cpu.writeReg (r8, reg [r8] - 1);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);

			cpu.cycles += 1;
		},
		DEC_hl: function (r8) {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = cpu.writeByte (hl, byte - 1);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte);

			cpu.cycles += 3;
		},
		DEC_r16: function (r16) {
			cpu.writeReg16 [r16] (getReg16 [r16] () - 1);

			cpu.cycles += 2;
		},
		DEC_sp: function () {
			cpu.writeSP (cpu.sp - 1);

			cpu.cycles += 2;
		},

		DI: function () {
			cpu.ime = false; // Disable all interrupts

			cpu.cycles += 1;
		},
		EI: function () {
			cpu.ime = true; // Enable all interrupts

			cpu.cycles += 1;
		},

		HALT: function () {
			cpu.running = false; // Halt execution until interrupt

			// If IME is enabled: after an interrupt has
			// occured, continue execution, else if IME
			// is disabled: when an interrupt is about
			// to occur, continue execution. Do this when
			// you handle interrupts !!!
		},

		INC_r8: function (r8) {
			var sum = reg [r8] + 1;
			ops.checkHcar (reg [r8], sum);

			var res = cpu.writeReg (r8, sum);

			ops.checkZero (res);
			flag.sub = false;

			cpu.cycles += 1;
		},
		INC_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var sum = byte + 1;
			ops.checkHcar (byte, sum);

			var res = cpu.writeByte (hl, sum);

			ops.checkZero (res);
			flag.sub = false;

			cpu.cycles += 3;
		},
		INC_r16: function (r16) {
			cpu.writeReg16 [r16] (getReg16 [r16] + 1);

			cpu.cycles += 2;
		},
		INC_sp: function () {
			cpu.writeSP (cpu.sp, cpu.sp + 1);

			cpu.cycles += 2;
		},

		JP_n16: function () {
			var addr = cpu.read16 (cpu.pc);

			cpu.cycles += 4;
			cpu.pc = addr - 1; // Sub 1 because it increments later, which we aint want
		},
		JP_cc_n16: function (cc) {
			if (cc)
				return this.JP_n16 ();

			cpu.cycles += 3; // Untaken
			cpu.pc += 2;
		},
		JP_hl: function () {
			cpu.pc = getReg16.hl () - 1; // Sub 1 because it increments later, which we aint want
		},

		JR_e8: function () {
			var e8 = ops.uncomplement (ops.Fetch ());

			cpu.pc = (cpu.pc + e8) & 0xffff;

			cpu.cycles += 3;
		},
		JR_cc_e8: function (cc) {
			if (cc)
				return this.JR_e8 ();

			cpu.cycles += 2; // Untaken
			cpu.pc += 1;
		},

		LD_r8_r8: function (rx, ry) {
			cpu.writeReg (rx, reg [ry]);

			cpu.cycles += 1;
		},
		LD_r8_n8: function (r8) {
			var byte = ops.Fetch ();
			cpu.writeReg (r8, byte);

			cpu.cycles += 2;
		},
		LD_r16_n16: function (r16) {
			var chunk = cpu.read16 (cpu.pc);
			cpu.writeReg16 [r16] (chunk);

			cpu.cycles += 3;
			cpu.pc += 2;
		},
		LD_hl_r8: function (r8) {
			cpu.writeByte (getReg16.hl (), reg [r8]);

			cpu.cycles += 2;
		},
		LD_hl_n8: function () {
			var byte = ops.Fetch ();
			cpu.writeByte (getReg16.hl (), byte);

			cpu.cycles += 3;
		},
		LD_r8_hl: function (r8) {
			var byte = cpu.readByte (getReg16.hl ());
			cpu.writeReg (r8, byte);

			cpu.cycles += 2;
		},
		LD_r16_a: function (r16) {
			cpu.writeByte (getReg16 [r16] (), reg.a);

			cpu.cycles += 2;
		},
		LD_n16_a: function () {
			var chunk = cpu.read16 (cpu.pc);
			cpu.writeByte (chunk, reg.a);

			cpu.cycles += 4;
			cpu.pc += 2;
		},

		LDH_n8_a: function () {
			var byte = ops.Fetch ();

			cpu.writeByte (0xff00 + byte, reg.a);

			cpu.cycles += 3;
		},
		LDH_c_a: function () {
			cpu.writeByte (0xff00 + reg.c, reg.a);

			cpu.cycles += 2;
		},

		LD_a_r16: function (r16) {
			var byte = cpu.readByte (getReg16 [r16] ());
			cpu.writeReg ('a', byte);

			cpu.cycles += 2;
		},
		LD_a_n16: function () {
			var byte = cpu.readByte (cpu.read16 (cpu.pc)); // Byte pointed to by address
			cpu.writeReg ('a', byte);

			cpu.cycles += 4;
			cpu.pc += 2;
		},
		LDH_a_n8: function () {
			var byte = cpu.readByte (0xff00 + ops.Fetch ()); // Byte pointed to by io adress + n8
			cpu.writeReg ('a', byte);

			cpu.cycles += 3;
		},
		LDH_a_c: function () {
			var byte = cpu.readByte (0xff00 + reg.c); // Byte pointed to by io adress + reg c
			cpu.writeReg ('a', byte);

			cpu.cycles += 2;
		},

		LD_hli_a: function () {
			var hl = getReg16.hl ();

			cpu.writeByte (hl, reg.a);
			cpu.writeReg16.hl (hl + 1);

			cpu.cycles += 2;
		},
		LD_hld_a: function () {
			var hl = getReg16.hl ();

			cpu.writeByte (hl, reg.a);
			cpu.writeReg16.hl (hl - 1);

			cpu.cycles += 2;
		},
		LD_a_hld: function () {
			var hl = getReg16.hl ();

			cpu.writeReg (reg.a, hl);
			cpu.writeReg16.hl (hl - 1);

			cpu.cycles += 2;
		},
		LD_a_hli: function () {
			var hl = getReg16.hl ();

			cpu.writeReg (reg.a, hl);
			cpu.writeReg16.hl (hl + 1);

			cpu.cycles += 2;
		},

		LD_sp_n16: function () {
			cpu.writeSP (cpu.read16 (cpu.pc)); // Byte after opcode

			cpu.cycles += 3;
			cpu.pc += 2;
		},

		LD_n16_sp: function () {
			var addr = cpu.read16 (cpu.pc);
			cpu.write16 (addr, cpu.sp);

			cpu.cycles += 5;
			cpu.pc += 2;
		},

		LD_hl_spe8: function () {
			var e8 = ops.Fetch () - 128; // Signed byte

			ops.checkHcar (e8, cpu.sp);
			ops.checkCar (sum);

			cpu.writeReg16 ('hl', e8 + cpu.sp); // Store in reg hl

			flag.zero = false;
			flag.sub = false;
			flag.hcar = ((e8 & 0x3) + (cpu.sp & 0x3)) > 0x3;
			flag.car = ((e8 & 0x7) + (cpu.sp & 0x7)) > 0x7;

			cpu.cycles += 3;
		},

		LD_sp_hl: function () {
			cpu.writeSP (getReg16.hl ());

			cpu.cycles += 2;
		},

		NOP: function () {
			cpu.cycles += 1;
		},

		OR_a_r8: function (r8) {
			var res = cpu.writeReg ('a', reg.a | reg [r8]);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = false;
			flag.car = false;

			cpu.cycles += 1;
		},
		OR_a_hl: function () {
			var byte = cpu.readByte (getReg16.hl ());
			var res = cpu.writeReg ('a', reg.a | byte);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = false;
			flag.car = false;

			cpu.cycles += 2;
		},
		OR_a_n8: function () {
			var byte = ops.Fetch ();
			var res = cpu.writeReg ('a', reg.a | byte);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = false;
			flag.car = false;

			cpu.cycles += 2;
		},

		POP_af: function () {
			var chunk = cpu.popSP ();

			this.writeReg ('a', ((chunk & 0xff00) >> 8)); //  Get high byte
			var lobyte = this.writeReg ('f', (chunk & 0xf0)); // Get low byte

			// Correct Flags
			flag.zero 	= lobyte & (1 << 7) ? true : false;
			flag.sub 	= lobyte & (1 << 6) ? true : false;
			flag.car 	= lobyte & (1 << 5) ? true : false;
			flag.hcar 	= lobyte & (1 << 4) ? true : false;

			cpu.cycles += 3;
		},
		POP_r16: function (r16) {
			cpu.writeReg16 [r16] (cpu.popSP ());

			cpu.cycles += 3;
		},

		PUSH_af: function () {
			var hi = reg.a;
			var lo = (flag.zero << 7) | (flag.sub << 6) | (flag.car << 5) | (flag.hcar << 4);

			cpu.pushSP (cpu.writeReg16 ('af', (hi << 8) | lo)); // Combine hi and lo bytes into reg af

			cpu.cycles += 4;
		},
		PUSH_r16: function (r16) {
			cpu.pushSP (getReg16 [r16] ());

			cpu.cycles += 4;
		},

		RES_u3_r8: function (u3, r8) {
			cpu.writeReg (r8, reg [r8] & ~(1 << u3)); // Clear bit u3 in r8

			cpu.cycles += 2;
		},
		RES_u3_hl: function (u3) {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl); // Byte pointed to be reg hl

			cpu.writeByte (hl, byte & ~(1 << u3)); // Clear bit u3 in byte hl

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		RET: function () {
			cpu.pc = cpu.popSP (); // Jump to instruction after the call

			cpu.cycles += 4;
		},
		RET_cc: function (cc) {
			if (cc) {
				this.RET ();
				return this.cycles += 1; // Extra cycle
			}

			cpu.cycles += 2; // Untaken
		},
		RETI: function () {
			this.RET ();
			// EI
			cpu.ime = true;
		},

		// Rotate Left INS //

		RL_r8: function (r8) {
			var precar = flag.car;
			flag.car = (reg [r8] & (1 << 7)) !== 0;

			var res = cpu.writeReg (r8, (reg [r8] << 1) | precar); // Rotate reg r8
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
		},
		RL_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);

			var precar = flag.car;
			flag.car = (byte & (1 << 7)) !== 0;

			var res = cpu.writeByte (hl, (byte << 1) | precar); // Rotate byte
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
		},
		RLA: function () {
			var precar = flag.car;
			flag.car = (reg.a & (1 << 7)) !== 0;

			var res = cpu.writeReg ('a', (reg.a << 1) | precar); // Rotate reg a

			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		RLC_r8: function (r8) {
			var res = cpu.writeReg (r8, (reg [r8] << 1) | (reg [r8] >> 7)); // Rotate reg r8 left

			// Flags //
			flag.car = (res & 1) !== 0;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
		},
		RLC_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = cpu.writeByte (hl, (byte << 1) | (byte >> 7)); // Rotate byte left

			// Flags //
			flag.car = (res & 1) !== 0;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
		},
		RLCA: function () {
			var res = cpu.writeReg ('a', (reg.a << 1) | (reg.a >> 7)); // Rotate reg a left

			// Flags //
			flag.car = (res & 1) !== 0;
			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		// Rotate Right INS //

		RR_r8: function (r8) {
			var precar = flag.car;
			flag.car = (reg [r8] & (1 << 7)) !== 0; // Carry is msb

			var res = cpu.writeReg (r8, (reg [r8] >> 1) | (precar << 7)); // Rotate reg r8
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
		},
		RR_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);

			var precar = flag.car;
			flag.car = (byte & (1 << 7)) !== 0; // Carry is msb

			var res = cpu.writeByte (hl, (byte >> 1) | (precar << 7)); // Rotate byte
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
		},
		RRA: function () {
			var precar = flag.car;
			flag.car = (reg.a & (1 << 7)) !== 0; // Carry is msb

			var res = cpu.writeReg ('a', (reg.a >> 1) | (precar << 7)); // Rotate reg a

			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		RRC_r8: function (r8) {
			var res = cpu.writeReg (r8, (reg [r8] >> 1) | (reg [r8] << 7)); // Rotate reg r8 right

			// Flags //
			flag.car = (res & 1) !== 0; // Carry is lsb
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
		},
		RRC_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);
			var res = cpu.writeByte (hl, (byte >> 1) | (byte << 7)); // Rotate byte right

			// Flags //
			flag.car = (res & 1) !== 0; // Carry is lsb
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
		},
		RRCA: function () {
			var res = cpu.writeReg ('a', (reg.a >> 1) | (reg.a << 7)); // Rotate reg a right

			// Flags //
			flag.car = (res & 1) !== 0; // Carry is lsb
			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		RST_vec: function (vec) {
			var fulladdr = cpu.read16 (vec); // Get full address from instruction

			cpu.pushSP (fulladdr); // Push the first addr into the stack
			this.JP_n16 ();

			// cpu.cycles += 0; (jump cycles are 4, == to rst cycles)
		},

		SBC_a_r8: function (r8) {
			var byte = (reg [r8] + flag.car) & 0xff;

			var res = cpu.writeReg ('a', reg.a - byte);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte); 
			ops.checkSubCar (res, byte);

			cpu.cycles += 1;
		},
		SBC_a_hl: function () {
			var byte = (cpu.readByte (getReg16.hl ()) + flag.car) & 0xff;

			var res = cpu.writeReg ('a', reg.a - byte);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte); 
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},
		SBC_a_n8: function () {
			var byte = (ops.Fetch () + flag.car) & 0xff;

			var res = cpu.writeReg ('a', reg.a - byte);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte); 
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},

		SCF: function () {
			// Set the carry flag
			flag.car = true;
			// Clear some other flags
			flag.hcar = flag.sub = false;

			cpu.cycles += 1;
		},

		SET_u3_r8: function (u3, r8) {
			cpu.writeReg (r8, reg [r8] | (1 << u3)); // Set bit u3 in reg r8

			cpu.cycles += 2;
		},
		SET_u3_hl: function (u3) {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl); // Get current byte hl
			cpu.writeByte (hl, byte | (1 << u3)); // Set bit u3 in byte hl

			cpu.cycles += 4;
		},

		SLA_r8: function (r8) {
			flag.car = (reg [r8] & (1 << 7)) !== 0; // Carry = bit shifted out

			var res = cpu.writeReg (r8, reg [r8] << 1);

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 2;
		},
		SLA_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);

			flag.car = (byte & (1 << 7)) !== 0; // Carry = bit shifted out

			var res = cpu.writeByte (hl, byte << 1);

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 4;
		},

		SRA_r8: function (r8) {
			flag.car = (reg [r8] & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeReg (r8, (reg [r8] >> 1) | (reg [r8] << 7)); // Arithmetic shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 2;
		},
		SRA_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);

			flag.car = (byte & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeByte (hl, (byte >> 1) | (byte << 7)); // Arithmetic shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 4;
		},

		SRL_r8: function (r8) {
			flag.car = (reg [r8] & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeReg (r8, reg [r8] >> 1); // Logical shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 2;
		},
		SRL_hl: function () {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);

			flag.car = (byte & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeByte (hl, byte >> 1); // Logical shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 4;
		},

		STOP: function () {
			cpu.lowpower = true; // Set to low power mode
			cpu.writeByte (0xff04, 0); // Reset divider register

			cpu.pc += 1;
		},

		SUB_a_r8: function (r8) {
			var prer8 = reg [r8];

			var res = cpu.writeReg ('a', reg.a - prer8);

			flag.zero = res === 0;
			flag.sub = true;
			ops.checkSubHcar (res, prer8);
			ops.checkSubCar (res, prer8);

			cpu.cycles += 1;
		},
		SUB_a_hl: function () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = cpu.writeReg ('a', reg.a - byte);

			flag.zero = res === 0;
			flag.sub = true;
			ops.checkSubHcar (res, byte);
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},
		SUB_a_n8: function () {
			var byte = ops.Fetch ();

			var res = cpu.writeReg ('a', reg.a - byte);

			flag.zero = res === 0;
			flag.sub = true;
			ops.checkSubHcar (res, byte);
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},

		SWAP_r8: function (r8) {
			var res = cpu.writeReg (r8, (reg [r8] >> 4) | (reg [r8] << 4));

			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 2;
		},
		SWAP_hl: function (hl) {
			var hl = getReg16.hl ();

			var byte = cpu.readByte (hl);

			var res = cpu.writeByte (hl, (byte >> 4) | (byte << 4));

			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 4;
		},

		XOR_a_r8: function (r8) {
			var res = cpu.writeReg ('a', reg.a ^ reg [r8]);
			
			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 1;	
		},
		XOR_a_hl: function () {
			var byte = cpu.readByte (getReg16.hl ());

			var res = cpu.writeReg ('a', reg.a ^ byte);
			
			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 2;	
		},
		XOR_a_n8: function () {
			var byte = ops.Fetch ();

			var res = cpu.writeReg ('a', reg.a ^ byte);
			
			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 2;
		}

	};

	this.Fetch = function () {
		return cpu.readByte (cpu.pc ++);
	};

	this.Decode = function (opcode) {
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
				return this.INS.INC_hl ();
			case 0x28:
				return this.INS.JR_cc_e8 (flag.zero);

			// 0 x 3 0
			case 0x31:
				return this.INS.LD_sp_n16 ();
			case 0x32:
				return this.INS.LD_hld_a ();
			case 0x3d:
				return this.INS.INC_r8 ('a');
			case 0x3e:
				return this.INS.LD_r8_n8 ('a');

			// 0 x 7 0
			case 0x77:
				return this.INS.LD_hl_r8 ('a');
			case 0x7b:
				return this.INS.LD_r8_r8 ('a', 'e');

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
			case 0xc1:
				return this.INS.POP_r16 ('bc');
			case 0xc5:
				return this.INS.PUSH_r16 ('bc');
			case 0xcd:
				return this.INS.CALL_n16 ();

			// 0 x E 0
			case 0xe0:
				return this.INS.LDH_n8_a ();
			case 0xe2:
				return this.INS.LDH_c_a ();
			case 0xea:
				return this.INS.LD_n16_a ();

			// 0 x F 0
			case 0xfe:
				return this.INS.CP_a_n8 ();
			
			// INVALID OPCODE - PANIC ! ! !
			default:
				return this.InvOp (opcode);

		}
	};

	this.DecodeCB = function (opcode) {
		switch (opcode) {

			// 0 x 1 0
			case 0x11:
				return this.INS.RL_r8 ('c'); 

			// 0 x 4 0
			case 0x4f:
				return this.INS.BIT_u3_r8 (1, 'A');

			// 0 x 7 0
			case 0x7c:
				return this.INS.BIT_u3_r8 (7, 'h');

			// INVALID OPCODE - PANIC ! ! !
			default:
				return this.InvOp (opcode);

		}
	};

	this.ExeIns = function () {
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

		this.InvOp (opcode);
	};

	// Debug
	this.InvOp = function (opcode) {
		console.log (
			'INVop\n' +
			'OP:', opcode.toString (16) + '\n' +
			'PC:', cpu.pc.toString (16)
		);
	};

};