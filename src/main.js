const Gameboy = function () {

	var gameboy = this;

	// Components //

	this.cpu = null;
	this.ppu = null;
	this.mem = null;

	// Functions //

	this.reset = function (rom, canvas) {
		if (this.cpu)
			this.cpu.stopExe (); // Stop current program

		// Restart all components
		this.cpu = new Cpu (this, rom);
		this.ppu = new Ppu (this, canvas);

		console.log ('booting !');

		this.cpu.loopExe (); // Begin program
	};

	this.start = function (file, canvas) {
		if (!file)
			throw '(Invalid rom file!)';

		console.log ('loading rom...');

		var fr = new FileReader ();
		fr.onload = function () {
			gameboy.reset (fr.result, canvas);
		};
		fr.readAsArrayBuffer (file);
	};

	this.stop = function () {
		this.cpu.stopExe ();
	};

};