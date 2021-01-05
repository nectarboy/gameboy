const Ppu = function (nes) {

	var ppu = this;

	// =============== //	Basic Elements //

	this.hblanking = 
	this.vblanking = false;

	this.lcdc = {
		bg_priority: false,
		sprite_enabled: false,
		sprite_size: false,
		bg_tilemap_alt: false,
		bg_window_start: false,
		window_enabled: false,
		window_tilemap_start: false,
		lcd_enabled: false
	};

	// =============== //	Screen Elements //

	var gbwidth = 160;
	var gbheight = 144;

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

	this.ResetCtx = function (c) {
		this.ctx = nes.canvas.getContext ('2d');
		this.img = this.ctx.createImageData (gbwidth, gbheight);

		this.clearImg ();
	};

	this.putPixel = function (ind, color) {
		ind = ind * 4;

		var img = this.img.data;
		var pal = this.pallete [color];

		img [ind] = pal.r;
		img [ind + 1] = pal.g;
		img [ind + 2] = pal.b;
		img [ind + 3] = 0xff; // Full opacity
	};

	this.renderImg = function () {
		this.ctx.putImageData (this.img, 0, 0);
	};

	this.clearImg = function () {
		for (var i = 0, l = this.img.data.length; i < l; i ++) {
			this.putPixel (i, 0);
		}
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
		this.lcdc.window_tilemap_start = false;
		this.lcdc.lcd_enabled = false;
	};

};