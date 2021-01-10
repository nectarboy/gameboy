const Gameboy = function () {

	var gb = this;

	this.canvas = null;

	// =============== // 	Components //

	this.cpu = new Cpu (this);
	this.ppu = new Ppu (this);

	// =============== //	Settings //

	this.settings = {
		enable_bootrom: bool => gb.cpu.bootrom_enabled = bool,
		set_pitchshift: num => num,
	};

	// =============== // 	Functions //

	this.Start = function () {
		this.Stop ();

		console.log ('started execution.');

		// Start all components
		this.cpu.LoopExe (0);
		this.ppu.RenderLoop ();
	};

	this.Stop = function () {
		this.cpu.StopExe ();
		this.ppu.StopRendering ();

		console.log ('stopped execution.');
	};

	this.Reset = function () {
		this.cpu.Reset ();
		this.ppu.Reset ();
	}

	this.ReadRomFile = function (file, then) {
		console.log ('loading rom...');

		var fr = new FileReader ();
		fr.onload = function () {
			gb.cpu.mem.LoadRom (fr.result); // Load Rom
			then (); // And then ...
		};
		fr.readAsArrayBuffer (file);
	};

	this.AttachCanvas = function (c) {
		this.canvas = c;
		this.ppu.ResetCtx ();
	};

};