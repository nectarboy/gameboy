const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;
	var reg = cpu.reg;
	var reg16 = cpu.reg16;

	// =============== //	Basic Functions //

	// Flags //
	this.checkHcar = function (a, b) {
		return flag.hcar = (((a & 0xf) + (b & 0xf)) > 0xf)
	};
	this.checkCar = function (sum) {
		return flag.car = (sum > 0xff)
	};
	this.checkZero = function (res) {
		return flag.zero = (res === 0)
	};

	this.checkHcar16 = function (a, b) {
		return flag.hcar = (((a & 0xfff) + (b & 0xfff)) > 0xfff)
	};
	this.checkCar16 = function (sum) {
		return flag.car = (sum > 0xffff)
	};

	this.checkSubCar = function (a, b) {
		return flag.car = (a < b)
	};
	this.checkSubHcar = function (a, b) {
		flag.hcar = ((a & 0xf) < (b & 0xf))
	};

	// Byte Rotations //
	this.rotLeft = function (n) {
		return (n << d) | (n >> 7); 
	};
	this.rotRight = function (n) {
		return (n >> d) | (n << 7); 
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
			var byte = cpu.readByte (reg16.hl);
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);

			cpu.cycles += 2;
		},
		ADC_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1); // Byte after opcode
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkHcar (byte, reg.a);

			cpu.cycles += 2;
			cpu.pc += 1; // Inc pc once more for 2 incs
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
			var byte = cpu.readByte (reg16.hl);
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 2;
		},
		ADD_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1); // Byte after opcode
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;

			var res = cpu.writeReg ('a', sum);

			flag.sub = false;
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		ADD_hl_r16: function (r16) {
			ops.checkHcar16 (reg16 [r16], reg16.hl);

			var sum = reg16 [r16] + reg16.hl;

			var res = cpu.writeReg16 ('hl', sum);

			flag.sub = false;
			ops.checkCar16 (sum);

			cpu.cycles += 2;
		},
		ADD_hl_sp: function () {
			var byte = cpu.readByte (cpu.sp);
			ops.checkHcar16 (byte, reg16.hl);

			var sum = byte + reg16.hl;

			var res = cpu.writeReg16 ('hl', sum);

			flag.sub = false;
			ops.checkCar16 (sum);

			cpu.cycles += 2;
		},

		ADD_sp_e8: function () {
			var e8 = cpu.readByte (cpu.pc + 1) - 128; // Byte after opcode
			ops.checkHcar (e8, cpu.sp);

			var sum = e8 + cpu.sp;

			var res = cpu.writeSP (sum);

			flag.zero = false;
			flag.sub = false;
			ops.checkCar (sum);

			cpu.cycles += 4;
			cpu.pc += 1;
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
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
		},
		AND_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1); // Byte after opcode
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		BIT_u3_r8: function (r8) {
			var bitmask = 1 << (cpu.readByte (cpu.pc + 1)); // Byte after opcode

			ops.checkZero (reg [r8] & bitmask);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		BIT_u3_r8: function () {
			var byte = cpu.readByte (reg16.hl);
			var bitmask = 1 << (cpu.readByte (cpu.pc + 1)); // Byte after opcode

			ops.checkZero (byte & bitmask);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		
		CALL_n16: function () {
			var fulladdr = cpu.read16 (cpu.pc + 1); // Get full address from instruction

			cpu.pushSP (fulladdr); // Push the first addr into the stack
			this.JP_n16 ();

			cpu.cycles += 2; // 4 + 2
		},
		CALL_cc_n16: function () {
			if (flag.car)
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
			var byte = cpu.readByte (reg16.hl)
			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 2;
		},
		CP_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1);
			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		CPL: function () {
			cpu.writeReg ('a', ~reg.a);

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
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeByte (reg16.hl, byte - 1);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte);

			cpu.cycles += 3;
		},
		DEC_r16: function (r16) {
			cpu.writeReg16 (r16, reg16 [r16] - 1);

			cpu.cycles += 2;
		},
		DEC_sp: function () {
			cpu.writeSP (cpu.sp - 1);

			cpu.cycles += 2;
		},

		DI: function () {
			cpu.ime = cpu.writeByte (0xffff, 0); // Disable ie located at 0xffff

			cpu.cycles += 1;
		},
		EI: function () {
			cpu.ime = cpu.writeByte (0xffff, 1); // Enable ie located at 0xffff

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
			var byte = cpu.readByte (reg16.hl);
			var sum = byte + 1;
			ops.checkHcar (byte, sum);

			var res = cpu.writeByte (reg16.hl, sum);

			ops.checkZero (res);
			flag.sub = false;

			cpu.cycles += 3;
		},
		INC_r16: function (r16) {
			cpu.writeByte (reg16 [r16], reg16 [r16] + 1);

			cpu.cycles += 2;
		},
		INC_sp: function () {
			cpu.writeSP (cpu.sp, cpu.sp + 1);

			cpu.cycles += 2;
		},

		JP_n16: function () {
			var addr = cpu.read16 (cpu.pc + 1);

			cpu.cycles += 4;
			cpu.pc = addr - 1; // Sub 1 because it increments later, which we aint want
		},
		JP_cc_n16: function () {
			if (flag.car)
				return this.JP_n16 ();

			cpu.cycles += 3; // Untaken
			cpu.pc += 2;
		},
		JP_hl: function () {
			cpu.pc = reg16.hl - 1; // Sub 1 because it increments later, which we aint want
		},

		JR_e8: function () {
			var e8 = cpu.readByte (cpu.pc + 1) - 128;

			cpu.pc += e8;

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		JR_cc_e8: function () {
			if (flag.car)
				return this.JR_e8 ();

			cpu.cycles += 2; // Untaken
			cpu.pc += 1;
		},

		LD_r8_r8: function (rx, ry) {
			cpu.writeReg (rx, reg [ry]);

			cpu.cycles += 1;
		},
		LD_r8_n8: function (r8) {
			var byte = cpu.readByte (cpu.pc + 1);
			cpu.writeReg (r8, byte);

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		LD_r16_n16: function (r16) {
			var chunk = cpu.read16 (cpu.pc + 1);
			cpu.writeReg16 (r16, chunk);

			cpu.cycles += 3;
			cpu.pc += 2;
		},
		LD_hl_r8: function (r8) {
			cpu.writeByte (reg16.hl, reg [r8]);

			cpu.cycles += 2;
		},
		LD_hl_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1);
			cpu.writeByte (reg16.hl, byte);

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		LD_r8_hl: function (r8) {
			var byte = cpu.readByte (reg16.hl);
			cpu.writeReg (r8, byte);

			cpu.cycles += 2;
		},
		LD_r16_a: function (r16) {
			cpu.writeByte (reg16 [r16], reg.a);

			cpu.cycles += 2;
		},
		LD_n16_a: function () {
			var chunk = cpu.read16 (cpu.pc + 1);
			cpu.writeByte (chunk, reg.a);

			cpu.cycles += 4;
			cpu.pc += 2;
		},

		LDH_n8_a: function () {
			var byte = cpu.readByte (cpu.pc + 1);

			cpu.writeByte (0xff00 + byte, reg.a);

			cpu.cycles += 3;
			cpu.pc += 1; 
		},
		LDH_c_a: function () {
			cpu.writeByte (0xff00 + reg.c, reg.a);

			cpu.cycles += 2;
		},

		LD_a_r16: function (r16) {
			var byte = cpu.readByte (reg16 [r16]);
			cpu.writeReg ('a', byte);

			cpu.cycles += 2;
		},
		LD_a_n16: function () {
			var byte = cpu.readByte (cpu.read16 (cpu.pc + 1)); // Byte pointed to by address
			cpu.writeReg ('a', byte);

			cpu.cycles += 4;
			cpu.pc += 2;
		},
		LDH_a_n8: function () {
			var byte = cpu.readByte (0xff00 + cpu.readByte (cpu.pc + 1)); // Byte pointed to by io adress + n8
			cpu.writeReg ('a', byte);

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		LDH_a_c: function () {
			var byte = cpu.readByte (0xff00 + reg.c); // Byte pointed to by io adress + reg c
			cpu.writeReg ('a', byte);

			cpu.cycles += 2;
		},

		LD_hli_a: function () {
			cpu.writeByte (reg16.hl, reg.a);
			cpu.writeReg16 ('hl', reg16.hl + 1);

			cpu.cycles += 2;
		},
		LD_hld_a: function () {
			cpu.writeByte (reg16.hl, reg.a);
			cpu.writeReg16 ('hl', reg16.hl - 1);

			cpu.cycles += 2;
		},
		LD_a_hld: function () {
			cpu.writeReg (reg.a, reg16.hl);
			cpu.writeReg16 ('hl', reg16.hl - 1);

			cpu.cycles += 2;
		},
		LD_a_hli: function () {
			cpu.writeReg (reg.a, reg16.hl);
			cpu.writeReg16 ('hl', reg16.hl + 1);

			cpu.cycles += 2;
		},

		LD_sp_n16: function () {
			cpu.writeSP (cpu.read16 (cpu.pc + 1)); // Byte after opcode

			cpu.cycles += 3;
			cpu.pc += 2;
		},

		LD_n16_sp: function () {
			var addr = cpu.read16 (cpu.pc + 1);
			cpu.write16 (addr, cpu.sp);

			cpu.cycles += 5;
			cpu.pc += 2;
		},

		LD_hl_spe8: function () {
			var e8 = cpu.readByte (cpu.pc + 1) - 128; // Signed byte
			var sum = e8 + cpu.sp;

			ops.checkHcar (e8, cpu.sp);
			ops.checkCar (sum);

			cpu.writeReg16 ('hl', sum); // Store in reg hl

			flag.zero = false;
			flag.sub = false;

			cpu.cycles += 3;
			cpu.pc += 1;
		},

		LD_sp_hl: function () {
			cpu.writeSP (reg16.hl);

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
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeReg ('a', reg.a | byte);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = false;
			flag.car = false;

			cpu.cycles += 2;
		},
		OR_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1);
			var res = cpu.writeReg ('a', reg.a | byte);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = false;
			flag.car = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		POP_af: function () {
			var lobyte = cpu.writeReg16 ('af', cpu.popSP ()) & 0xff; // Write popped chunk to reg af

			// Correct Flags
			flag.zero 	= lobyte & (1 << 7) ? true : false;
			flag.sub 	= lobyte & (1 << 6) ? true : false;
			flag.car 	= lobyte & (1 << 5) ? true : false;
			flag.hcar 	= lobyte & (1 << 4) ? true : false;

			cpu.cycles += 3;
		},
		POP_r16: function (r16) {
			cpu.writeReg16 (r16, cpu.popSP ());

			cpu.cycles += 3;
		},

		PUSH_af: function () {
			var hi = reg.a;
			var lo = (flag.zero << 7) | (flag.sub << 6) | (flag.car << 5) | (flag.hcar << 4);

			cpu.pushSP (cpu.writeReg16 ('af', (hi << 8) | lo)); // Combine hi and lo bytes into reg af

			cpu.cycles += 4;
		},
		PUSH_r16: function (r16) {
			cpu.pushSP (reg16 [r16]);

			cpu.cycles += 4;
		},

		RES_u3_r8: function (r8) {
			var u3 = cpu.readByte (cpu.pc + 1) & 0x7;

			cpu.writeReg ('a', reg [r8] & ~(1 << u3)); // Clear bit u3 in r8

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		RES_u3_hl: function () {
			var u3 = cpu.readByte (cpu.pc + 1) & 0x7;
			var byte = cpu.readByte (reg16.hl); // Byte pointed to be reg hl

			cpu.writeByte (reg16.hl, byte & ~(1 << u3)); // Clear bit u3 in byte hl

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		RET: function () {
			cpu.pc = cpu.popSP (); // Jump to instruction after the call

			cpu.cycles += 4;
		},
		RET_cc: function () {
			if (flag.car) {
				this.RET ();
				return this.cycles += 1; // Extra cycle
			}

			cpu.cycles += 2; // Untaken
		},
		RETI: function () {
			this.EI ();
			this.RET ();

			cpu.cycles -= 1; // Remove excess cycle
		},

		// Rotate Left INS //

		RL_r8: function (r8) {
			var precar = flag.car;
			flag.car = (reg [r8] & (1 << 7)) ? true : false;

			var res = cpu.writeReg (r8, (reg [r8] << 1) | precar); // Rotate reg r8
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		RL_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			var precar = flag.car;
			flag.car = (byte & (1 << 7)) ? true : false;

			var res = cpu.writeByte (reg16.hl, (byte << 1) | precar); // Rotate byte
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
		},
		RLA: function () {
			var precar = flag.car;
			flag.car = (reg.a & (1 << 7)) ? true : false;

			var res = cpu.writeReg ('a', (reg.a << 1) | precar); // Rotate reg a

			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		RLC_r8: function (r8) {
			var res = cpu.writeReg (r8, ops.rotLeft (reg [r8])); // Rotate reg r8 left

			// Flags //
			flag.car = (res & 1) ? true : false;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		RLC_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeByte (reg16.hl, ops.rotLeft (byte)); // Rotate byte left

			// Flags //
			flag.car = (res & 1) ? true : false;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
		},
		RLCA: function () {
			var res = cpu.writeReg ('a', ops.rotLeft (reg.a)); // Rotate reg a left

			// Flags //
			flag.car = (res & 1) ? true : false;
			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		// Rotate Right INS //

		RR_r8: function (r8) {
			var precar = flag.car;
			flag.car = (reg [r8] & (1 << 7)) ? true : false;

			var res = cpu.writeReg (r8, (reg [r8] >> 1) | precar); // Rotate reg r8
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		RR_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			var precar = flag.car;
			flag.car = (byte & (1 << 7)) ? true : false;

			var res = cpu.writeByte (reg16.hl, (byte >> 1) | precar); // Rotate byte
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
		},
		RRA: function () {
			var precar = flag.car;
			flag.car = (reg.a & (1 << 7)) ? true : false;

			var res = cpu.writeReg ('a', (reg.a >> 1) | precar); // Rotate reg a

			flag.zero = flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 1;
		},

		RRC_r8: function (r8) {
			var res = cpu.writeReg (r8, ops.rotRight (reg [r8])); // Rotate reg r8 right

			// Flags //
			flag.car = (res & 1) ? true : false;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		RRC_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeByte (reg16.hl, ops.rotRight (byte)); // Rotate byte right

			// Flags //
			flag.car = (res & 1) ? true : false;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
		},
		RRCA: function () {
			var res = cpu.writeReg ('a', ops.rotRight (reg.a)); // Rotate reg a right

			// Flags //
			flag.car = (res & 1) ? true : false;
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
			var byte = (cpu.readByte (reg16.hl) + flag.car) & 0xff;

			var res = cpu.writeReg ('a', reg.a - byte);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte); 
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},
		SBC_a_n8: function () {
			var byte = (cpu.readByte (cpu.pc + 1) + flag.car) & 0xff;

			var res = cpu.writeReg ('a', reg.a - byte);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte); 
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		SCF: function () {
			// Set the carry flag
			flag.car = true;
			// Clear some other flags
			flag.hcar = flag.sub = false;

			cpu.cycles += 1;
		},

		SET_u3_r8: function (r8) {
			var u3 = cpu.readByte (cpu.pc + 1) & 0x7;

			cpu.writeReg (r8, reg [r8] | (1 << u3)); // Set bit u3 in reg r8

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		SET_u3_hl: function () {
			var u3 = cpu.readByte (cpu.pc + 1) & 0x7;
			var byte = cpu.readByte (reg16.hl); // Get current byte hl

			cpu.writeByte (reg16.hl, byte | (1 << u3)); // Set bit u3 in byte hl

			cpu.cycles += 4;
			cpu.pc += 1;
		},

	};

	this.exeIns = function (opcode) {

		switch (opcode) {
			// NOP
			case 0x00: {
				this.INS.NOP ();
				break;
			}
			// LD BC n16
			case 0x01: {
				this.INS.LD_r16_n16 ('bc');
				break;
			}
			// LD BC A
			case 0x02: {
				this.INS.LD_r16_a ('bc');
				break;
			}
			// INC BC
			case 0x03: {
				this.INS.INC_r16 ('bc');
				break;
			}
			// INC B
			case 0x04: {
				this.INS.INC_r8 ('b');
				break;
			}
			// DEC B
			case 0x05: {
				this.INS.DEC_r8 ('b');
				break;
			}
			// LD B n8
			case 0x06: {
				this.INS.LD_r8_n8 ('b');
				break;
			};
			
			// PANIC PANIC PANIC PANIC PANIC !!!
			default: {
				console.log (
					'INVop\n' +
					'OP:', opcode.toString (16) + '\n' +
					'PC:', cpu.pc.toString (16)
				);
			}
		}
	};

};