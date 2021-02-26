const Gameboy = function () {

    var gb = this;

    this.canvas = null;

    // =============== //   Components //

    this.cpu = new Cpu (this);
    this.ppu = new Ppu (this);
    this.joypad = new Joypad (this);

    // =============== //   Settings //

    this.paused = false;

    this.bootromEnabled = false;
    this.pitchShift = 0;

    // Throttle / FPS
    this.fps = 0;
    this.SetFPS = function (fps) {
        this.fps = fps;
        this.cpu.cyclesperframe = this.cpu.cyclespersec / fps;
        this.cpu.interval = 1000 / fps;

        return fps;
    };

    // Pallete customizer
    /**
     * @param {Array} hexArray
     *
     * Each number in hexArray must be a RBG hex string.
     */
    this.SetPallete = function (hexArray) {
        var pallete = this.ppu.pallete;

        for (var i = 0; i < pallete.length; i ++) {
            var hex = parseInt (hexArray [i], 16);

            pallete [i].r = (hex & 0xff0000) >> 16;
            pallete [i].g = (hex & 0x00ff00) >> 8;
            pallete [i].b = (hex & 0x0000ff) >> 0;
        }
    };

    // =============== //   Functions //

    this.Start = function () {
        this.Stop ();

        this.paused = false;
        console.log (
            'started execution.' // Nice lil border :3
            + '\n/---------------/'
        );

        // Start components
        this.cpu.LoopExe (0);
        // this.ppu.RenderLoop (); // This causes screen tearing 
        this.joypad.listener.Start ();
    };

    this.Stop = function () {
        this.cpu.StopExe ();
        // this.ppu.StopRendering ();
        this.joypad.listener.Stop ();

        this.paused = true;
        console.log ('stopped execution.');
    };

    // A default pause toggle function
    this.TogglePause = function () {
        if (!this.paused)
            this.Stop ();
        else
            this.Start ();

        return this.paused;
    };

    this.Reset = function () {
        this.cpu.Reset ();
        this.ppu.Reset ();
        this.joypad.Reset ();
    };

    this.InsertRom = function (rom) {
        console.log ('loading rom...');

        this.cpu.mem.LoadRom (rom);
        this.Reset ();
    };

    this.AttachCanvas = function (c) {
        this.canvas = c;
        this.ppu.ResetCtx ();
    };

};