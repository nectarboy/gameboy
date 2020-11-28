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
	this.checkSub = function () {

	};

	// =============== //	Instructions //

	this.INS = {

		ADC_a_r8: function (r8) {
			var sum = reg [r8] + reg.a;
			sum += ops.checkCar (sum); // Add carry

			var res = cpu.writeReg ('a', sum);

			cpu.clearFlag (flag.sub);
			ops.checkZero (res);
			ops.checkHcar (reg [r8], reg.a);

			cpu.cycles += 1;
		},

	};

};