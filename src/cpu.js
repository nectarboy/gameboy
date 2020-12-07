const Cpu = function (nes, rom) {

	var cpu = this;

	// =============== //	Basic Elements //

	// Basic Flags
	this.bootromAtm = true;
	this.running = true;

	this.rombank = 1;
	this.rambank = 1;

	// =============== //	Registers and Flags //

	// Program
	this.pc = 0x0000; // A placeholder for the bootfirm
	this.cycles = 0;

	// Stack
	this.sp = 0xfffe; // Stack pointer (0xfffe is placeholder)

	this.writeSP = function (addr) {
		this.sp = addr & 0xffff; // Mask to 16bit int
	};
	this.pushSP = function (val) {
		this.writeSP (this.sp - 1);
		cpu.writeByte (this.sp, (val & 0xff00) >> 8); // Hi byte
		this.writeSP (this.sp - 1);
		cpu.writeByte (this.sp, val & 0xff); // Lo byte

		return val & 0xffff; // Mask to 16bit int
	};
	this.popSP = function () {
		this.writeSP (this.sp + 1);
		var lo = cpu.readByte (this.sp); // Lo byte
		this.writeSP (this.sp + 1);
		var hi = cpu.readByte (this.sp); // Hi byte

		return (hi << 8) | lo; // Combine lo and hi together
	};

	// Registers A-L
	this.reg = {
		a: 0,
		b: 0,
		c: 0,
		d: 0,
		e: 0,
		f: 0,
		h: 0,
		l: 0
	};
	this.reg16 = {
		af: 0,
		bc: 0,
		de: 0,
		hl: 0
	};

	this.writeReg = function (r8, val) {
		return this.reg [r8] = val & 0xff; // Mask to 8bit int
	};
	this.writeReg16 = function (r16, val) {
		this.writeReg (r16 [0], ((val & 0xff00) >> 8)); //  Get high byte
		this.writeReg (r16 [1], (val & 0xff)); // Get low byte
		return this.reg16 [r16] = val & 0xffff; // Return 16bit int of val
	};

	// Flags
	this.flag = {
		zero: false,
		sub: false,
		hcar: false,
		car: false
	};

	// Interrupt Master Flag
	this.ime = 0; // Off by default

	// =============== // 	Memory //

	this.mem = new Mem (nes, rom);

	/* uint8 read_byte(uint16 addr) {
		  if (addr < 0x100 && bootrom_enabled)
		    return bootrom[addr];
		  if (addr < 0x4000)
		    return cart_rom[addr];
		  if (addr < 0x8000)
		    return cart_rom[cart_bank*0x4000 + (addr & 0x3FFF)];
		// etc for ram etc
	} */

	this.readByte = function (addr) {
		var mem = this.mem;

		addr = addr & 0xffff; // Mask to 16bit int

		// ROM //
		if (this.bootromAtm && addr < 0x100) {
			return mem.bootrom [addr];
		}
		if (addr < 0x4000) {
			return mem.cartrom [addr];
		}
		if (addr < 0x8000) {
			return mem.cartrom [this.rombank * 0x4000 + (addr & 0x3fff)]; // switchable rom
		}
		// VIDEO //
		if (addr < 0xa000) {
			return mem.vram [addr - 0x8000];
		}
		// WORK //
		if (addr < 0xc000) {
			return mem.cartram [addr - 0xa000]; // WIP
		}
		if (addr < 0xe000) {
			return mem.wram [addr - 0xc000];
		}
		if (addr < 0xff00) {
			return mem.wram [addr - 0xe000]; // Echo ram
		}
		// VIDEO (oam) //
		if (addr < 0xfea0) {
			return mem.oam [addr - 0xfe00];
		} else
		// UNUSED //
		if (addr < 0xff00) {
			return 0; // Reading from unused yields 0
		}
		// IO REG
		if (addr < 0xff80) {
			return mem.ioreg [addr - 0xff00]; // WIP
		}
		// HIGH
		if (addr < 0xffff) {
			return mem.hram [addr - 0xff80];
		}
		// INTERRUPT
		return mem.iereg;
	};
	this.writeByte = function (addr, val) {
		var mem = this.mem;

		addr = addr & 0xffff; // Mask to 16bit int
		val = val & 0xff; // Mask to 8bit int

		// ROM //
		if (addr < 0x8000) {
			return val;
			// MBC control WIP
		}
		// VIDEO //
		if (addr < 0xa000) {
			return mem.vram [addr - 0x8000] = val;
		}
		// WORK //
		if (addr < 0xc000) {
			return mem.cartram [addr - 0xa000] = val; // WIP
		}
		if (addr < 0xe000) {
			return mem.wram [addr - 0xc000] = val;
		}
		if (addr < 0xff00) {
			return mem.wram [addr - 0xe000] = val; // Echo ram
		}
		// VIDEO (oam) //
		if (addr < 0xfea0) {
			return mem.oam [addr - 0xfe00] = val;
		}
		// UNUSED //
		if (addr < 0xff00) {
			return val;
		}
		// IO REG
		if (addr < 0xff80) {
			return mem.ioreg [addr - 0xff00] = val; // WIP
		}
		// HIGH
		if (addr < 0xffff) {
			return mem.hram [addr - 0xff80] = val;
		}
		// INTERRUPT
		this.ime = val;
		return mem.iereg = val;
	};

	this.read16 = function (addr) {
		var hi = this.readByte (addr); //  Get high byte
		var lo = this.readByte (addr + 1); //  Get low byte

		return (hi << 8) | lo; // Mask to 16bit int
	};
	/*this.write16 = function (addr, val) {
		cpu.writeByte (addr, ((val & 0xff00) >> 8)); //  Get high byte
		cpu.writeByte (addr + 1, (val & 0xff)); // Get low byte

		return val & 0xffff;
	};*/
	this.write16 = function (addr, val) {
		cpu.writeByte (addr, (val & 0xff)); // Get low byte
		cpu.writeByte (addr + 1, ((val & 0xff00) >> 8)); //  Get high byte

		return val & 0xffff;
	};

	// =============== //	Basic Functions //

	this.currentTimeout = null;

	this.step = function () {
		if (this.running) {

			var opcode = cpu.readByte (this.pc);
			this.ops.exeIns (opcode);

			nes.ppu.renderImg ();

			this.pc ++;
		}
	};

	this.loopExe = function () {
		this.step ();

		this.currentTimeout = setTimeout (() => {
			cpu.loopExe (); // Continue program loop
		}, 100);
	};

	this.stopExe = function () {
		clearTimeout (this.currentTimeout);
	};

	// =============== //	Debugging //

	this.memdump = function () {
		console.log (this.mem);
	};

	// =============== //	Instructions //

	this.ops = new Ops (this);

};