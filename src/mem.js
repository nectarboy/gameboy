const Mem = function (nes) {

	var mem = this;

	// =============== //	Memory Elements //

	// Bootrom - 0x0000 - 0x00ff
	this.bootrom = new Uint8Array ([49,254,255,175,33,255,159,50,203,124,32,251,33,38,255,14,17,62,128,50,226,12,62,243,226,50,62,119,119,62,252,224,71,17,4,1,33,16,128,26,205,149,0,205,150,0,19,123,254,52,32,243,17,216,0,6,8,26,19,34,35,5,32,249,62,25,234,16,153,33,47,153,14,12,61,40,8,50,13,32,249,46,15,24,243,103,62,100,87,224,66,62,145,224,64,4,30,2,14,12,240,68,254,144,32,250,13,32,247,29,32,242,14,19,36,124,30,131,254,98,40,6,30,193,254,100,32,6,123,226,12,62,135,226,240,66,144,224,66,21,32,210,5,32,79,22,32,24,203,79,6,4,197,203,17,23,193,203,17,23,5,32,245,34,35,34,35,201,206,237,102,102,204,13,0,11,3,115,0,131,0,12,0,13,0,8,17,31,136,137,0,14,220,204,110,230,221,221,217,153,187,187,103,99,110,14,236,204,221,220,153,159,187,185,51,62,60,66,185,165,185,165,66,60,33,4,1,17,168,0,26,19,190,32,254,35,125,254,52,32,245,6,25,120,134,35,5,32,251,134,32,254,62,1,224,80]);

	// Cartrom - 0x0000 - 0x8000 (last 0x4000 switchable)
	this.cartrom = new Uint8Array (0x8000);

		// Rom properties
		this.mbc = 0;

		this.romname = '';
		this.maxrombanks = 0;
		this.rombank = 1;

		this.ramenabled = false;
		this.maxrambanks = 0;
		this.rambank = 1;

	// Video - 0x8000 - 0x9fff
	this.vram = new Uint8Array (0x2000); // 8KB of video ram

	// Cartram - 0xa000 - 0xbfff
	this.cartram = new Uint8Array (0x2000); // 8kb switchable ram found in cart
	// Work ram - 0xc000 - 0xdfff
	this.wram = new Uint8Array (0x2000); // 8KB of ram to work with

	// (mirror memory of 0xc000) - 0xe000 - 0xfdff

	// OAM - 0xfe00 - 0xfe9f
	this.oam = new Uint8Array (0xa0);

	// (unusable memory) - 0xfea0 - 0xfeff

	// IO registers - 0xff00 - 0xff7f
	this.ioreg = new Uint8Array (0x80);

	// high ram - 0xff80 - 0xffff
	this.hram = new Uint8Array (0x80);

	// interrupt enable register - 0xffff
	this.iereg = 0;

	// =============== //	Loading and Resetting //

	this.LoadRom = function (rom) {
		if (typeof rom !== 'object')
			return this.Error ('this is not a rom !');

		this.cartrom = new Uint8Array (rom);
		this.GetRomProps ();

		nes.cpu.hasrom = true;
	};

	this.GetRomProps = function () {
		// Rom name //
		this.romname = '';
		for (var i = 0x134; i < 0x13f; i ++) {
			this.romname += String.fromCharCode (mem.cartrom [i]);
		}
		document.title = 'Pollen Boy - ' + this.romname;

		// GBC only mode //
		if (mem.cartrom [0x143] === 0xc0)
			this.Error ('rom works only on gameboy color !');

		// Check MBC //
		switch (mem.cartrom [0x147]) {
			// No MBC + ram
			case 0x8:
			case 0x9: {
				this.ramenabled = true;
			}
			// No MBC
			case 0x0: {
				this.mbc = 0;
				this.ramenabled = false;
				break;
			}

			// MBC 1 + ram
			case 0x3:
			case 0x2: {
				this.ramenabled = true;
			}
			// MBC 1
			case 0x1: {
				this.mbc = 1;
				break;
			}

			// MBC 2
			case 0x6:
			case 0x5: {
				this.mbc = 2;
				break;
			}

			// MBC 3 + ram
			case 0x13:
			case 0x12:
			case 0x10: {
				this.ramenabled = true;
			}
			// MBC 3
			case 0x11:
			case 0xf: {
				this.mbc = 3;
				break;
			}

			// MBC 5 + ram
			case 0x1e:
			case 0x1d:
			case 0x1b:
			case 0x1a: {
				this.ramenabled = true;
			}
			// MBC 5
			case 0x1c:
			case 0x19: {
				this.mbc = 5;
				break;
			}

			default: {
				this.Error ('unknown rom MBC type !');
			}
		}

		// Max rom banks
		var romsize = mem.cartrom [0x148];

		if (romsize > 8) {
			if (romsize === 0x54)
				this.maxrombanks = 96;
			else if (this.romsize === 0x53)
				this.maxrombanks = 80;
			else if (this.romsize === 0x52)
				this.maxrombanks = 72;
			else
				this.Error ('invalid rom size !');
		}
		else {
			this.rombanks = 2 << romsize;
		}

		// Max ram banks
		var ramsize = mem.cartram [0x149];

		if (ramsize > 0 && ramsize < 5) {
			this.cartram = Math.floor ((1 << (ramsize * 2 - 1)) / 8);
		}
		else {
			if (ramsize === 0x5)
				this.maxrambanks = 8;
			else if (ramsize === 0x0)
				this.maxrambanks = 0;
			else
				this.Error ('invalid ram size !');
		}
	};

	this.Reset = function () {
		// Reset all memory pies to 0
		this.vram.fill (0);
		this.wram.fill (0);
		this.oam.fill (0);
		this.ioreg.fill (0);
		this.hram.fill (0);
		this.iereg = 0;

		// Reset rom properties
		this.mbc = 0;
		this.rombank = 1;
		this.rambank = 1;
		this.ramenabled = false;
	};

	this.Error = function (msg) {
		alert (msg);
		throw msg;
	};

	// =============== //	IO Registers //

	this.ioonwrite = {
		// Serial Ports - used by test roms for output
		[0x01]: function (val) {
			mem.ioreg [0x01] = val;
			console.log ('01: ' + val.toString (16));
		},
		[0x02]: function (val) {
			mem.ioreg [0x02] = val;
			console.log ('02: ' + val.toString (16));
		},

		// Div timer - incs every 256 cycles
		[0x04]: function (val) {
			mem.ioreg [0x04] = 0; // Reset
		},

		// LCDC
		[0x40]: function (val) {
			var bits = [];
			var lcdc = nes.ppu.lcdc;

			for (var i = 0; i < 8; i ++) {
				bits [i] = (val & (1 << i)) !== 0;
			}

			lcdc.bg_priority = bits [0];
			lcdc.sprite_enabled = bits [1];
			lcdc.sprite_size = bits [2];
			lcdc.bg_tilemap_alt = bits [3];
			lcdc.bg_window_start = bits [4];
			lcdc.window_enabled = bits [5];
			lcdc.window_tilemap_alt = bits [6];
			lcdc.lcd_enabled = bits [7];

			mem.ioreg [0x40] = val;
		},

		// BG scroll y
		[0x42]: function (val) {
			nes.ppu.scrolly = mem.ioreg [0x42] = val;
		},
		// BG scroll x
		[0x43]: function (val) {
			nes.ppu.scrollx = mem.ioreg [0x43] = val;
		},

		// Pallete shades
		[0x47]: function (val) {
			var palshades = nes.ppu.palshades;

			for (var i = 0; i < 4; i ++) {
				// Get specific crumbs from val
				// A 'crumb' is a 2 bit number, i coined that :D
				palshades [i] = (val >> (i * 2)) & 0x3;
			}

			mem.ioreg [0x47] = val;
		},

		// Enable / disable bootrom
		[0x50]: function (val) {
			nes.cpu.bootromAtm = (val === 0);

			mem.ioreg [0x50] = val;
		}
	};

	// =============== //	MBC Elements //

	// TODO - import rom properties from cpu to here
	this.mbcControl = {
		1: function (addr) {
			// EXTRA RAM ENABLE //
			if (addr < 0x2000) {
				this.ramenabled = (val & 0xf) === 0x0a; // Value with 0xa enables
				return val;
			}
			// ROM BANK NUMBER //
			if (addr < 0x4000) {
				this.rombank = val | 0b11100000; // First 3 bits are always 1
				return val;
			}
			// EXTRA ROM BANK BITS //
			if (addr < 0x6000) {

			}
		}
	};

};