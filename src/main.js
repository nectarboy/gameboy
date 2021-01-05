const Gameboy = function () {

	var gb = this;

	// Frontend elements
	this.canvas = null;

	// =============== // 	Components //

	this.cpu = new Cpu (this);
	this.ppu = new Ppu (this);

	// =============== // 	Functions //

	this.Start = function () {
		this.Stop ();

		console.log ('started execution.');

		// Start all components
		this.cpu.LoopExe ();
	};

	this.Stop = function () {
		this.cpu.StopExe ();
		// Stop rest of components ...

		console.log ('stopped execution.');
	};

	this.Reset = function () {
		this.cpu.Reset ();
		this.cpu.Reset ();
	}

	this.ReadRomFile = function (file) {
		if (!file) {
			var msg = '(Invalid rom file!)';

			alert (msg);
			throw msg;
		}

		console.log ('loading rom...');

		var fr = new FileReader ();
		fr.onload = function () {
			gb.cpu.mem.LoadRom (fr.result); // Load Rom
		};
		fr.readAsArrayBuffer (file);
	};

	this.AttachCanvas = function (c) {
		this.canvas = c;
		this.ppu.ResetCtx ();
	};

};