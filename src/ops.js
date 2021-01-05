const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;
	var reg = cpu.reg;
	var reg16 = cpu.reg16;

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
			var byte = cpu.readByte (cpu.pc); // Byte after opcode
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
			var byte = cpu.readByte (cpu.pc); // Byte after opcode
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
			var e8 = cpu.readByte (cpu.pc) - 128; // Byte after opcode
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
			var byte = cpu.readByte (cpu.pc); // Byte after opcode
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = true;
			flag.car = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		BIT_u3_r8: function (r8) {
			var bitmask = 1 << (cpu.readByte (cpu.pc)); // Byte after opcode

			ops.checkZero (reg [r8] & bitmask);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		BIT_u3_r8: function () {
			var byte = cpu.readByte (reg16.hl);
			var bitmask = 1 << (cpu.readByte (cpu.pc)); // Byte after opcode

			ops.checkZero (byte & bitmask);
			flag.sub = false;
			flag.hcar = true;

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		
		CALL_n16: function () {
			var fulladdr = cpu.read16 (cpu.pc); // Get full address from instruction

			cpu.pushSP (fulladdr); // Push the first addr into the stack
			this.JP_n16 ();

			cpu.cycles += 2; // 4 + 2
		},
		CALL_cc_n16: function () {
			if (flag.zero)
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
			var byte = cpu.readByte (reg16.hl);

			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 2;
		},
		CP_a_n8: function () {
			var byte = cpu.readByte (cpu.pc);

			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 2;
			cpu.pc += 1;
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
			var addr = cpu.read16 (cpu.pc);

			cpu.cycles += 4;
			cpu.pc = addr - 1; // Sub 1 because it increments later, which we aint want
		},
		JP_cc_n16: function () {
			if (flag.zero)
				return this.JP_n16 ();

			cpu.cycles += 3; // Untaken
			cpu.pc += 2;
		},
		JP_hl: function () {
			cpu.pc = reg16.hl - 1; // Sub 1 because it increments later, which we aint want
		},

		JR_e8: function () {
			var e8 = cpu.readByte (cpu.pc) - 128;

			cpu.pc += e8;

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		JR_cc_e8: function () {
			if (flag.zero)
				return this.JR_e8 ();

			cpu.cycles += 2; // Untaken
			cpu.pc += 1;
		},

		LD_r8_r8: function (rx, ry) {
			cpu.writeReg (rx, reg [ry]);

			cpu.cycles += 1;
		},
		LD_r8_n8: function (r8) {
			var byte = cpu.readByte (cpu.pc);
			cpu.writeReg (r8, byte);

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		LD_r16_n16: function (r16) {
			var chunk = cpu.read16 (cpu.pc);
			cpu.writeReg16 (r16, chunk);

			cpu.cycles += 3;
			cpu.pc += 2;
		},
		LD_hl_r8: function (r8) {
			cpu.writeByte (reg16.hl, reg [r8]);

			cpu.cycles += 2;
		},
		LD_hl_n8: function () {
			var byte = cpu.readByte (cpu.pc);
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
			var chunk = cpu.read16 (cpu.pc);
			cpu.writeByte (chunk, reg.a);

			cpu.cycles += 4;
			cpu.pc += 2;
		},

		LDH_n8_a: function () {
			var byte = cpu.readByte (cpu.pc);

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
			var byte = cpu.readByte (cpu.read16 (cpu.pc)); // Byte pointed to by address
			cpu.writeReg ('a', byte);

			cpu.cycles += 4;
			cpu.pc += 2;
		},
		LDH_a_n8: function () {
			var byte = cpu.readByte (0xff00 + cpu.readByte (cpu.pc)); // Byte pointed to by io adress + n8
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
			var e8 = cpu.readByte (cpu.pc) - 128; // Signed byte

			ops.checkHcar (e8, cpu.sp);
			ops.checkCar (sum);

			cpu.writeReg16 ('hl', e8 + cpu.sp); // Store in reg hl

			flag.zero = false;
			flag.sub = false;
			flag.hcar = ((e8 & 0x3) + (cpu.sp & 0x3)) > 0x3;
			flag.car = ((e8 & 0x7) + (cpu.sp & 0x7)) > 0x7;

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
			var byte = cpu.readByte (cpu.pc);
			var res = cpu.writeReg ('a', reg.a | byte);

			ops.checkZero (res);
			flag.sub = false;
			flag.hcar = false;
			flag.car = false;

			cpu.cycles += 2;
			cpu.pc += 1;
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
			var u3 = cpu.readByte (cpu.pc) & 0x7;

			cpu.writeReg ('a', reg [r8] & ~(1 << u3)); // Clear bit u3 in r8

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		RES_u3_hl: function () {
			var u3 = cpu.readByte (cpu.pc) & 0x7;
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
			if (flag.zero) {
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
			cpu.pc += 1;
		},
		RL_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			var precar = flag.car;
			flag.car = (byte & (1 << 7)) !== 0;

			var res = cpu.writeByte (reg16.hl, (byte << 1) | precar); // Rotate byte
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
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
			cpu.pc += 1;
		},
		RLC_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeByte (reg16.hl, (byte << 1) | (byte >> 7)); // Rotate byte left

			// Flags //
			flag.car = (res & 1) !== 0;
			ops.checkZero (res);
			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
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
			cpu.pc += 1;
		},
		RR_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			var precar = flag.car;
			flag.car = (byte & (1 << 7)) !== 0; // Carry is msb

			var res = cpu.writeByte (reg16.hl, (byte >> 1) | (precar << 7)); // Rotate byte
			ops.checkZero (res);

			flag.hcar = flag.sub = false; // Clear remaining flags

			cpu.cycles += 4;
			cpu.pc += 1;
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
			cpu.pc += 1;
		},
		RRC_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeByte (reg16.hl, (byte >> 1) | (byte << 7)); // Rotate byte right

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
			var byte = (cpu.readByte (reg16.hl) + flag.car) & 0xff;

			var res = cpu.writeReg ('a', reg.a - byte);

			ops.checkZero (res);
			flag.sub = true;
			ops.checkSubHcar (res, byte); 
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},
		SBC_a_n8: function () {
			var byte = (cpu.readByte (cpu.pc) + flag.car) & 0xff;

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
			var u3 = cpu.readByte (cpu.pc) & 0x7;

			cpu.writeReg (r8, reg [r8] | (1 << u3)); // Set bit u3 in reg r8

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		SET_u3_hl: function () {
			var u3 = cpu.readByte (cpu.pc) & 0x7;
			var byte = cpu.readByte (reg16.hl); // Get current byte hl

			cpu.writeByte (reg16.hl, byte | (1 << u3)); // Set bit u3 in byte hl

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		SLA_r8: function (r8) {
			flag.car = (reg [r8] & (1 << 7)) !== 0; // Carry = bit shifted out

			var res = cpu.writeReg (r8, reg [r8] << 1);

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		SLA_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			flag.car = (byte & (1 << 7)) !== 0; // Carry = bit shifted out

			var res = cpu.writeByte (reg16.hl, byte << 1);

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		SRA_r8: function (r8) {
			flag.car = (reg [r8] & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeReg (r8, (reg [r8] >> 1) | (reg [r8] << 7)); // Arithmetic shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		SRA_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			flag.car = (byte & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeByte (reg16.hl, (byte >> 1) | (byte << 7)); // Arithmetic shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		SRL_r8: function (r8) {
			flag.car = (reg [r8] & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeReg (r8, reg [r8] >> 1); // Logical shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		SRL_hl: function () {
			var byte = cpu.readByte (reg16.hl);

			flag.car = (byte & 1) !== 0; // Carry = bit shifted out

			var res = cpu.writeByte (reg16.hl, byte >> 1); // Logical shift

			flag.zero = res === 0;
			flag.sub = flag.hcar = false;

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		STOP: function () {
			cpu.lowpower = true; // Set to low power mode
			cpu.writeByte (0xff04, 0); // Reset divider register

			this.pc += 1;
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
			var byte = cpu.readByte (reg16.hl);

			var res = cpu.writeReg ('a', reg.a - byte);

			flag.zero = res === 0;
			flag.sub = true;
			ops.checkSubHcar (res, byte);
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
		},
		SUB_a_n8: function () {
			var byte = cpu.readByte (cpu.pc);

			var res = cpu.writeReg ('a', reg.a - byte);

			flag.zero = res === 0;
			flag.sub = true;
			ops.checkSubHcar (res, byte);
			ops.checkSubCar (res, byte);

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		SWAP_r8: function (r8) {
			var res = cpu.writeReg (r8, (reg [r8] >> 4) | (reg [r8] << 4));

			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		SWAP_hl: function (hl) {
			var byte = cpu.readByte (reg16.hl);

			var res = cpu.writeByte (reg16.hl, (byte >> 4) | (byte << 4));

			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 4;
			cpu.pc += 1;
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
			var byte = cpu.readByte (reg16.hl);

			var res = cpu.writeReg ('a', reg.a ^ byte);
			
			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 2;	
		},
		XOR_a_n8: function () {
			var byte = cpu.readByte (cpu.pc);

			var res = cpu.writeReg ('a', reg.a ^ byte);
			
			flag.zero = res === 0;
			flag.sub = 
			flag.hcar = 
			flag.car = false;

			cpu.cycles += 2;
			cpu.pc += 1;	
		}

	};

	this.exeIns = function () {
		var opcode = cpu.readByte (cpu.pc ++);

		opcode += (opcode === 0xcb) * 0xff; // CB prefix

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
			}
			// RLCA
			case 0x07: {
				this.INS.RLCA ();
				break;
			}
			// LD n16 SP
			case 0x08: {
				this.INS.LD_n16_sp ();
				break;
			}
			// ADD HL BC
			case 0x09: {
				this.INS.ADD_hl_r16 ('bc');
				break;
			}
			// LD A BC
			case 0x0a: {
				this.INS.LD_a_r16 ('bc');
				break;
			}
			// DEC BC
			case 0x0b: {
				this.INS.DEC_r16 ('bc');
				break;
			}
			// INC C
			case 0x0c: {
				this.INS.INC_r8 ('c');
				break;
			}
			// DEC C
			case 0x0d: {
				this.INS.DEC_r8 ('c');
				break;
			}
			// LD C n8
			case 0x0e: {
				this.INS.LD_r8_n8 ('c');
				break;
			}
			// RRCA
			case 0x0f: {
				this.INS.RRCA ();
				break;
			}

			// STOP
			case 0x10: {
				this.INS.STOP ();
				break;
			}
			// LD DE n16
			case 0x11: {
				this.INS.LD_r16_n16 ('de');
				break;
			}
			// LD DE A
			case 0x12: {
				this.INS.LD_r16_a ('de');
				break;
			}
			// INC DE
			case 0x13: {
				this.INS.INC_r16 ('de');
				break;
			}
			// INC D
			case 0x14: {
				this.INS.INC_r8 ('d');
				break;
			}
			// DEC D
			case 0x15: {
				this.INS.DEC_r8 ('d');
				break;
			}
			// LD D n8
			case 0x16: {
				this.INS.LD_r8_n8 ('d');
				break;
			}
			// RLA
			case 0x17: {
				this.INS.RLA ();
				break;
			}
			// JR e8
			case 0x18: {
				this.INS.JR_e8 ();
				break;
			}
			// ADD HL DE
			case 0x19: {
				this.INS.ADD_hl_r16 ('de');
				break;
			}
			// LD A DE
			case 0x1a: {
				this.INS.LD_a_r16 ('de');
				break;
			}
			// DEC DE
			case 0x1b: {
				this.INS.DEC_r16 ('de');
				break;
			}
			// INC E
			case 0x1c: {
				this.INS.INC_r8 ('e');
				break;
			}
			// DEC E
			case 0x1d: {
				this.INS.DEC_r8 ('e');
				break;
			}
			// LD E n8
			case 0x1e: {
				this.INS.LD_r8_n8 ('e');
				break;
			}
			// RRA
			case 0x1f: {
				this.INS.RRA ();
				break;
			}

			// 
			
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