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
			// Get full address from instruction
			var fulladdr = (
				((cpu.readByte (cpu.pc + 1) && 0xff00) << 8)
				|
				(cpu.readByte (cpu.pc + 2))
			);

			cpu.pushSP (fulladdr); // Push the first addr into the stack

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
			var sum = reg.a - reg [r8];
			var res = sum & 0xff;

			cpu.setFlag (flag.sub);

			cpu.cycles += 1;
		}

	};

};