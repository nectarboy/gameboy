const Mem = function (nes, rom) {

	var mem = this;

	// =============== //	Memory Elements //

	// Cartrom - 0x0000 - 0x8000 (last 0x4000 switchable)
	this.cartrom = new Uint8Array (rom); // store the full rom for later switching

	// Bootrom - 0x0000 - 0x00ff
	this.bootrom = new Uint8Array ([49,254,255,175,33,255,159,50,203,124,32,251,33,38,255,14,17,62,128,50,226,12,62,243,226,50,62,119,119,62,252,224,71,17,4,1,33,16,128,26,205,149,0,205,150,0,19,123,254,52,32,243,17,216,0,6,8,26,19,34,35,5,32,249,62,25,234,16,153,33,47,153,14,12,61,40,8,50,13,32,249,46,15,24,243,103,62,100,87,224,66,62,145,224,64,4,30,2,14,12,240,68,254,144,32,250,13,32,247,29,32,242,14,19,36,124,30,131,254,98,40,6,30,193,254,100,32,6,123,226,12,62,135,226,240,66,144,224,66,21,32,210,5,32,79,22,32,24,203,79,6,4,197,203,17,23,193,203,17,23,5,32,245,34,35,34,35,201,206,237,102,102,204,13,0,11,3,115,0,131,0,12,0,13,0,8,17,31,136,137,0,14,220,204,110,230,221,221,217,153,187,187,103,99,110,14,236,204,221,220,153,159,187,185,51,62,60,66,185,165,185,165,66,60,33,4,1,17,168,0,26,19,190,32,254,35,125,254,52,32,245,6,25,120,134,35,5,32,251,134,32,254,62,1,224,80]);

	// Video - 0x8000 - 0x9fff
	this.vram = new Uint8Array (0x2000); // 8KB of video ram

	// Cartram - 0xa000 - 0xbfff
	this.cartram = new Uint8Array (0x2000); // Switchable ram found in cart
	// Work ram - 0xc000 - 0xdfff
	this.wram = new Uint8Array (0x2000); // 2KB of ram to work with

	// (mirror memory of 0xc000) - 0xe000 - 0xfdff

	// OAM - 0xfe00 - 0xfe9f
	this.oam = new Uint8Array (0xa0);

	// (unusable memory) - 0xfea0 - 0xfeff

	// IO registers - 0xff00 - 0xff7f
	this.ioreg = new Uint8Array (0x80);

	// high ram - 0xff80 - 0xfffe
	this.hram = new Uint8Array (0x19);

	// interrupt enable register - 0xffff
	this.iereg = 0;

	// =============== //	Rom Properties //

	// Cart Name
	var str = '';
	for (var i = 0x134; i < 0x144; i ++) {
		str += String.fromCharCode (mem.cartrom [i]);
	}
	console.log (document.title = str);

};