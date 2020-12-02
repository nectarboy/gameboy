const Ops = function (cpu) {

	var ops = this;

	var flag = cpu.flag;
	var reg = cpu.reg;
	var reg16 = cpu.reg16;

	// =============== //	Basic Functions //

	// Flags //
	this.checkHcar = function (a, b) {
		if (((a & 0xf) + (b & 0xf)) > 0xf)
			return cpu.setFlag (flag.hcar);
		else
			return cpu.clearFlag (flag.hcar);
	};
	this.checkCar = function (sum) {
		if (sum > 0xff)
			return cpu.setFlag (flag.car);
		else
			return cpu.clearFlag (flag.car);
	};
	this.checkZero = function (res) {
		if (res === 0)
			return cpu.setFlag (flag.zero);
		else
			return cpu.clearFlag (flag.zero);
	};

	this.checkHcar16 = function (a, b) {
		if (((a & 0xfff) + (b & 0xfff)) > 0xfff)
			return cpu.setFlag (flag.hcar);
		else
			return cpu.clearFlag (flag.hcar);
	};
	this.checkCar16 = function (sum) {
		if (sum > 0xffff)
			return cpu.setFlag (flag.car);
		else
			return cpu.clearFlag (flag.car);
	};

	this.checkSubCar = function (a, b) {
		if (a < b)
			return cpu.setFlag (flag.car);
		else
			return cpu.clearFlag (flag.car);
	};
	this.checkSubHcar = function (a, b) {
		if ((a & 0xf) < (b & 0xf))
			return cpu.setFlag (flag.hcar);
		else
			return cpu.clearFlag (flag.hcar);
	};

	// =============== //	Instructions //

	this.INS = {

		ADC_a_r8: function (r8) {
			ops.checkHcar (reg [r8], reg.a);

			var sum = reg [r8] + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);

			cpu.cycles += 1;
		},
		ADC_a_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);

			cpu.cycles += 2;
		},
		ADC_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1); // Byte after opcode
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);
			ops.checkHcar (byte, reg.a);

			cpu.cycles += 2;
			cpu.pc += 1; // Inc pc once more for 2 incs
		},

		ADD_a_r8: function (r8) {
			ops.checkHcar (reg [r8], reg.a);

			var sum = reg [r8] + reg.a;

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 1;
		},
		ADD_a_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 2;
		},
		ADD_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1); // Byte after opcode
			ops.checkHcar (byte, reg.a);

			var sum = byte + reg.a;

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);
			ops.checkCar (sum);

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		ADD_hl_r16: function (r16) {
			ops.checkHcar16 (reg16 [r16], reg16.hl);

			var sum = reg16 [r16] + reg16.hl;

			var res = cpu.writeReg16 ('hl', sum);

			cpu.clearFlag (flag.sub);
			ops.checkCar16 (sum);

			cpu.cycles += 2;
		},
		ADD_hl_sp: function () {
			var byte = cpu.readByte (cpu.sp);
			ops.checkHcar16 (byte, reg16.hl);

			var sum = byte + reg16.hl;

			var res = cpu.writeReg16 ('hl', sum);

			cpu.clearFlag (flag.sub);
			ops.checkCar16 (sum);

			cpu.cycles += 2;
		},

		ADD_sp_e8: function () {
			var e8 = cpu.readByte (cpu.pc + 1) - 128; // Byte after opcode
			ops.checkHcar (e8, cpu.sp);

			var sum = e8 + cpu.sp;

			var res = cpu.writeSP (sum);

			cpu.clearFlag (flag.zero);
			cpu.clearFlag (flag.sub);
			ops.checkCar (sum);

			cpu.cycles += 4;
			cpu.pc += 1;
		},

		AND_a_r8: function () {
			var res = cpu.writeReg ('a', reg [r8] & reg.a);

			ops.checkZero (res);
			cpu.clearFlag (flag.sub);
			cpu.setFlag (flag.hcar);
			cpu.clearFlag (flag.car);

			cpu.cycles += 1;
		},
		AND_a_hl: function (r8) {
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			cpu.clearFlag (flag.sub);
			cpu.setFlag (flag.hcar);
			cpu.clearFlag (flag.car);

			cpu.cycles += 2;
		},
		AND_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1); // Byte after opcode
			var res = cpu.writeReg ('a', byte & reg.a);

			ops.checkZero (res);
			cpu.clearFlag (flag.sub);
			cpu.setFlag (flag.hcar);
			cpu.clearFlag (flag.car);

			cpu.cycles += 2;
			cpu.pc += 1;
		},

		BIT_u3_r8: function (r8) {
			var bitmask = 1 << (cpu.readByte (cpu.pc + 1)); // Byte after opcode

			ops.checkZero (reg [r8] & bitmask);
			cpu.clearFlag (flag.sub);
			cpu.setFlag (flag.hcar);

			cpu.cycles += 2;
			cpu.pc += 1;
		},
		BIT_u3_r8: function () {
			var byte = cpu.readByte (reg16.hl);
			var bitmask = 1 << (cpu.readByte (cpu.pc + 1)); // Byte after opcode

			ops.checkZero (byte & bitmask);
			cpu.clearFlag (flag.sub);
			cpu.setFlag (flag.hcar);

			cpu.cycles += 3;
			cpu.pc += 1;
		},
		
		CALL_n16: function () {
			var fulladdr = cpu.read16 (cpu.pc + 1); // Get full address from instruction

			cpu.pushSP (fulladdr); // Push the first addr into the stack
			this.JP_n16 ();

			cpu.cycles += 6;
			cpu.pc += 2;
		},
		CALL_cc_n16: function () {
			if (flag.car.on)
				return this.CALL_n16 ();

			cpu.cycles += 3;
			cpu.pc += 2;
		},

		CCF: function () {
			// Invert carry flag
			if (flag.car.on)
				cpu.clearFlag (flag.car);
			else
				cpu.setFlag (flag.car);

			cpu.clearFlag (flag.sub);
			cpu.clearFlag (flag.hcar);

			cpu.cycles += 1;
		},

		CP_a_r8: function (r8) {
			var res = (reg.a - reg [r8]) & 0xff;

			ops.checkZero (res);
			cpu.setFlag (flag.sub);
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 1;
		},
		CP_a_hl: function () {
			var byte = cpu.readByte (reg16.hl)
			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			cpu.setFlag (flag.sub);
			ops.checkSubHcar (res, reg [r8]);
			ops.checkSubCar (res, reg [r8]);

			cpu.cycles += 2;
		},
		CP_a_n8: function () {
			var byte = cpu.readByte (cpu.pc + 1);
			var res = (reg.a - byte) & 0xff;

			ops.checkZero (res);
			cpu.setFlag (flag.sub);
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
			cpu.setFlag (flag.sub);
			ops.checkSubHcar (res, reg [r8]);

			cpu.cycles += 1;
		},
		DEC_hl: function (r8) {
			var byte = cpu.readByte (reg16.hl);
			var res = cpu.writeByte (reg16.hl, byte - 1);

			ops.checkZero (res);
			cpu.setFlag (flag.sub);
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
			cpu.clearFlag (flag.sub);

			cpu.cycles += 1;
		},
		INC_hl: function () {
			var byte = cpu.readByte (reg16.hl);
			var sum = byte + 1;
			ops.checkHcar (byte, sum);

			var res = cpu.writeByte (reg16.hl, sum);

			ops.checkZero (res);
			cpu.clearFlag (flag.sub);

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
			if (flag.car.on)
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
			if (flag.car.on)
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
			cpu.write16 (reg16 [r16], reg.a);

			cpu.cycles += 2;
		},
		LD_n16_a: function () {
			var chunk = cpu.read16 (cpu.pc + 1);
			cpu.write16 (chunk, reg.a);

			cpu.cycles += 4;
			cpu.pc += 2;
		},

		NOP: function () {
			cpu.cycles += 1;
		}

	};

	this.exeIns = function () {
		var opcode = cpu.readByte (cpu.pc);

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
			// PANIC PANIC PANIC PANIC PANIC !!!
			default: {
				console.log (
					'INVop\n' +
					'OP:', opcode.toString (16),
					'\nPC:', cpu.pc.toString (16)
				);
			}
		}
	}

};