const Ppu = function (nes, canvas) {

	var ppu = this;

	// =============== //	Basic Elements //

	// Resolution
	var gbwidth = 160;
	var gbheight = 144;

	// Color pallete
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

	// Canvas context
	this.ctx = canvas.getContext ('2d');

	// =============== //	Canvas Drawing //

	this.img = this.ctx.createImageData (gbwidth, gbheight);

	this.putPixel = function (ind, color) {
		ind = ind * 4;

		var img = this.img.data;
		var pal = this.pallete [color];

		img [ind] = pal.r;
		img [ind + 1] = pal.g;
		img [ind + 2] = pal.b;
		img [ind + 3] = 0xff; // Full opacity
	};

	this.thing = 0;

	this.renderImg = function () {
		this.ctx.putImageData (this.img, 0, 0);
	};

	this.clearImg = function () {
		for (var i = 0, l = this.img.data.length; i < l; i ++) {
			this.putPixel (i, 0);
		}
	};

	this.clearImg ();

};