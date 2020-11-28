const Cpu = function (nes, rom) {

	var cpu = this;

	// =============== //	Basic Elements //

	// PC and Cycles
	this.pc = 0x0000; // A placeholder for the bootfirm
	this.cycles = 0;

	// Emulation
	this.isdrawing = false;

	// Misc Flags
	this.bootromAtm = true;
	this.rombank = 1;
	this.rambank = 1;

	// =============== //	Registers and Flags //

	// Registers A-L
	this.reg = {
		a: 1, // reg a explicitly set to 1 on boot
		b: 0,
		c: 0,
		d: 0,
		e: 0,
		f: 0,
		h: 0,
		l: 0
	};
	this.writeReg = function (r8, val) {
		return this.reg [r8] = val & 0xff; // Mask to 8bit int
	};

	this.reg16 = {
		getAF () {
			return this.getReg ('a', 'f');
		},
		writeAF (val) {
			return this.writeReg ('a', 'f', val);
		},
		getBC () {
			return this.getReg ('b', 'c');
		},
		writeBC (val) {
			return this.writeReg ('b', 'c', val);
		},
		getDE () {
			return this.getReg ('d', 'e');
		},
		writeDE (val) {
			return this.writeReg ('d', 'e', val);
		},
		getHL () {
			return this.getReg ('h', 'l');
		},
		writeHL (val) {
			return this.writeReg ('h', 'l', val);
		},

		getReg (rx, ry) {
			return ((cpu.reg [rx] << 8) | cpu.reg [ry]); // Combine 2 8bit to 1 16bit
		},
		writeReg (rx, ry, val) {
			cpu.writeReg (rx, ((val & 0xff00) >> 8)); //  Get high byte
			cpu.writeReg (ry, (val & 0xff)); // Get low byte
			return val;
		}
	};

	// Flags
	this.flag = {
		zero: {
			on: 0,
			mask: 1 << 7 // 7th bit in F reg
		},
		sub: {
			on: 0,
			mask: 1 << 6 // 6th bit in F reg
		},
		hcar: {
			on: 0,
			mask: 1 << 5 // 5th bit in F reg
		},
		car: {
			on: 0,
			mask: 1 << 4 // 4th bit in F reg
		},
	};

	this.getFlag = function (flag) {
		return (flag.on);
	};
	this.setFlag = function (flag) {
		this.reg.f |= flag.mask; // OR with specific bitmask to set a flag
		return (flag.on = 1);
	};
	this.clearFlag = function (flag) {
		this.reg.f &= (~flag.mask & 0xff); // AND with reversed bitmask to clear a flag
		return (flag.on = 0);
	};

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
			if (this.isdrawing)
				return 0xff;
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
			if (this.isdrawing)
				return 0xff;
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
		if (addr === 0xffff) {
			return mem.iereg;
		}

		return 0xff; // this shouldn't happen but ummm,,, take this shit instead ig
	};
	this.writeByte = function (addr, val) {
		var mem = this.mem;

		// ROM //
		if (addr < 0x100) {
			return mem.bootrom [addr] = val;
		}
		if (addr < 0x8000) {
			return val;
		}
		// VIDEO //
		if (addr < 0xa000) {
			if (this.isdrawing)
				return val;
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
			if (this.isdrawing)
				return val;
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
		if (addr === 0xffff) {
			return mem.iereg = val & 0xff;
		}

		return val; // default,,, i guess,,,
	};

	// =============== //	Basic Functions //

	this.currentTimeout = null;

	this.stepProgram = function () {
		this.pc ++;
	};

	this.loopExe = function () {
		this.stepProgram ();

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