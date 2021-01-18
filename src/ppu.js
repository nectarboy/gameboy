const Ppu = function (nes) {

	var ppu = this;

	var cpu = nes.cpu;
	var mem = cpu.mem;

	// =============== //	Basic Elements //

	this.lcdc = {
		bg_priority: false,
		sprite_enabled: false,
		sprite_size: false,
		bg_tilemap_alt: false,
		bg_window_start: false,
		window_enabled: false,
		window_tilemap_alt: false,
		lcd_enabled: false
	};

	this.palshades = {
		0: 0,
		1: 0,
		2: 0,
		3: 0
	};

	// =============== //	Screen Elements //

	var gbwidth = 256; // 160
	var gbheight = 144; // 144

	this.pallete = {
		0: {
			r: 0xde, g: 0xc6, b: 0x9c // WHITE
		},
		1: {
			r: 0xa5, g: 0x5a, b: 0xff // LITE GRAY
		},
		2: {
			r: 0x94, g: 0x29, b: 0x94 // DARK GRAY
		},
		3: {
			r: 0x00, g: 0x39, b: 0x73 // BLACK
		}
	};

	// =============== //	Canvas Drawing //

	this.ctx = null;
	this.img = null;
	this.timeout = null;

	this.interval = 1000 / 59.7; // GB refresh rate

	this.ResetCtx = function (c) {
		this.ctx = nes.canvas.getContext ('2d');
		this.img = this.ctx.createImageData (gbwidth, gbheight);

		this.ClearImg ();
	};

	this.PutPixel = function (x, y, color) {
		var ind = (y * gbwidth + x) * 4;

		var img = this.img.data;
		var pal = this.pallete [color];

		img [ind] = pal.r;
		img [ind + 1] = pal.g;
		img [ind + 2] = pal.b;
		img [ind + 3] = 0xff; // Full opacity
	};

	this.RenderImg = function () {
		this.ctx.putImageData (this.img, 0, 0);
	};

	this.RenderLoop = function () {
		this.RenderImg ();

		// Handle callback
		setTimeout (() => {
			this.timeout = requestAnimationFrame (() => {
				ppu.RenderLoop ();
			});
		}, this.interval);
	};

	this.StopRendering = function () {
		cancelAnimationFrame (this.timeout);
	};

	this.ClearImg = function () {
		for (var x = 0; x < gbwidth; x ++)
			for (var y = 0; y < gbheight; y ++)
				this.PutPixel (x, y, 0);
	};

	// Reset
	this.Reset = function () {
		// Reset blanking status
		this.hblanking = 
		this.vblanking = false;

		// Reset lcdc
		this.lcdc.bg_priority = false;
		this.lcdc.sprite_enabled = false;
		this.lcdc.sprite_size = false;
		this.lcdc.bg_tilemap_alt = false;
		this.lcdc.bg_window_start = false;
		this.lcdc.window_enabled = false;
		this.lcdc.window_tilemap_alt = false;
		this.lcdc.lcd_enabled = false;
	};

	// =============== //	Background Drawing //

	// Scanline positions
	this.lx = 
	this.ly = 0;

	// BG scroll positions
	this.scrollx =
	this.scrolly = 0;

	this.subty = 0; // Used to decide which row of tile to render

	// Scanlining
	/*this.DoScanline = function () {
		if (!this.lcdc.lcd_enabled)
			return;

		// Draw background

		this.subty = this.ly & 7;

		var bgdatastart = 0x8800 - (this.lcdc.bg_window_start * 0x800);

		var bgmapstart = 0x9800 + (this.lcdc.bg_tilemap_alt * 0x400);
		var bgmapend = bgmapstart + 0xa0;

		for (var i = bgmapstart; i < bgmapend; i ++) {
			var tile = cpu.readByte (i);
			var data = cpu.read16 (bgdatastart + (tile * 16) + (this.subty * 2));

			for (var ii = 0; ii < 8; ii ++) {
				var px = this.palshades [(data >> (ii * 2)) & 0x3];
				this.PutPixel (this.lx, this.ly, px);
			}

			this.lx ++;
		}

		// Vblanking
		this.ly ++;

		this.ly = this.ly * !(this.ly > 154); // If vblank is over, prepare for next frame

		this.vblanking = (this.ly > 143);
		mem.ioreg [0x44] = this.ly; // Set LY io reg

		// End
		cpu.cycles += 114; // 114 * 4
	};*/

	// DEBUG SCANLINE - draw tilemap
	this.DoScanline = function () {
		// Only advance line if vblanking
		if (this.ly > gbheight - 1) {
			return this.AdvanceLine ();
		}

		this.lx = 0;
		this.subty = this.ly & 7;

		// Draw tile data
		var bgdatastart = 0x8800 - (this.lcdc.bg_window_start * 0x800);

		for (var i = 0; i < gbwidth; i ++) {
			var addr = bgdatastart + ((i >> 3) * 16) + (this.subty * 2) + (this.ly >> 3) * 512;
			// base_addr + (ly / 8) * 32 +  lx / 8

			var data = cpu.read16 (addr);

			var px = this.palshades [(data >> ((i & 7) * 2)) & 0x3];
			this.PutPixel (this.lx, this.ly, px);

			this.lx ++;
		}

		// Advance line
		this.AdvanceLine ();
	};

	// Advance line and update ly 
	this.AdvanceLine = function () {
		this.ly ++;

		this.ly = this.ly * (this.ly < 154); // If vblank is over, reset
		mem.ioreg [0x44] = this.ly; // Set LY io reg
	}

};