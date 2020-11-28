const Ppu = function (nes, canvas) {

	// =============== //	Basic Elements //

	// Resolution
	this.gbwidth = 160;
	this.gbheight = 144;

	// Color pallete
	this.pallete = {
		0: '#DEC69C',	// WHITE
		1: '#A55AFF',	// LITE GRAY
		2: '#942994',	// DARK GRAY
		3: '#003973'	// BLACK
	};

	// Canvas context
	this.ctx = canvas.getContext ('2d');

	this.ctx.fillStyle = '#003973';
	this.ctx.fillRect (0, 0, this.gbwidth, this.gbheight);

};