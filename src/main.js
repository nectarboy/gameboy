const Gameboy = function () {

    var gb = this;

    // =============== //   Components //

    this.cpu = new Cpu (this);
    this.ppu = new Ppu (this);
    this.joypad = new Joypad (this);

    // =============== //   Settings //

    this.paused = false;

    this.keyboardEnabled = 
    this.controllerEnabled = false;

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

    // Attaching canvas
    this.canvas = null;
    this.AttachCanvas = function (canvas) {
        this.canvas = canvas;
        this.ppu.ResetCtx ();
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
        this.cpu.LoopExe (1); // Don't go too harsh the first frame !
        // this.ppu.RenderLoop (); // This causes screen tearing 
        this.joypad.keyboardAPI.Start ();
    };

    this.Stop = function () {
        this.cpu.StopExe ();
        // this.ppu.StopRendering ();
        this.joypad.keyboardAPI.Stop ();

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

    // Battery save files
    this.InsertSram = function (data) {
        var mem = this.cpu.mem;

        if (!mem.evenhasram || !mem.hasbatterysave)
            throw 'cannot load save !';

        var length = Math.min (data.length, mem.cartram.length);
        for (var i = 0; i < data.length; i ++)
            mem.cartram [i] = data [i];

        this.Reset ();
    };

    this.GetSramArray = function () {
        var mem = this.cpu.mem;

        if (!mem.evenhasram || !mem.hasbatterysave)
            throw 'no save file available !';

        // Export save data
        var data = [];
        for (var i = 0; i < mem.cartram.length; i ++)
            data [i] = mem.cartram [i];

        return data;
    };

};