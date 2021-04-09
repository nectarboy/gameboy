const Gameboy = function () {

    var gb = this;

    // =============== //   Components //

    this.cpu = new Cpu (this);
    this.ppu = new Ppu (this);
    this.apu = new Apu (this);
    this.joypad = new Joypad (this);

    // =============== //   Settings //

    this.paused = false;

    this.keyboardEnabled = 
    this.controllerEnabled = false;

    this.bootromEnabled = false;

    // Audio pitch shift
    this.SetPitchShift = function (shift) {
        this.apu.pitchShift = shift;
    };

    // Alpha blend
    this.alphaBlend = 1;
    this.SetAlphaBlend = function (n) {
        this.alphaBlend = this.ppu.ctx.globalAlpha = n;
    };

    this.EnableAlphaBlend = function () {
        this.ppu.render_img_func = this.ppu.RenderImgSmooth;
    };

    this.DisableAlphaBlend = function () {
        this.ppu.render_img_func = this.ppu.RenderImg;
    };

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

    // Muting the volume immediately
    this.STFU = function () {
        try {
            this.apu.gainNode.gain.value = 0;
        }
        catch (e) {}
    };

    this.UnSTFU = function () {
        try {
            this.apu.gainNode.gain.value = this.volume;
        }
        catch (e) {}
    };

    // Attaching canvas
    this.canvas = null;
    this.AttachCanvas = function (canvas) {
        this.canvas = canvas;
        this.ppu.ResetCtx ();
    };

    // Sound enable
    this.soundenabled = false;
    this.soundcontroller_func = this.apu.SoundController;

    this.EnableSound = function () {
        this.soundenabled = true;
        this.apu.SoundController = this.soundcontroller_func;

        this.UnSTFU ();
    };

    this.DisableSound = function () {
        this.soundenabled = false;
        this.apu.SoundController = function () {};

        this.STFU ();
    };
    this.DisableSound (); // ... by default

    this.ToggleSoundEnable = function () {
        if (!this.soundenabled)
            this.EnableSound ();
        else
            this.DisableSound ();

        return this.soundenabled;
    };

    // Sound volume
    this.volume = 0;
    /**
     * @param {Number} vol
     *
     * A number between 1 and 0
     * (1 is full, 0 is no)
     */
    this.SetVolume = function (vol) {
        this.volume = 
        this.apu.gainNode.gain.value = vol;
    };

    // =============== //   Functions //

    this.Start = function () {
        if (this.cpu.crashed)
            throw 'sorry but you crashed :c<br>reset to start !';

        this.Stop ();

        console.log (
            'started execution.' // Nice lil border :3
            + '\n/---------------/'
        );

        // Start components
        this.cpu.LoopExe (0);
        // this.ppu.RenderLoop (); // This causes screen tearing 
        this.joypad.keyboardAPI.Start ();
        this.UnSTFU ();

        this.paused = false;
    };

    this.Stop = function () {
        this.cpu.StopExe ();
        // this.ppu.StopRendering ();
        this.joypad.keyboardAPI.Stop ();
        this.STFU ();

        this.paused = true;
        console.log ('stopped execution.');
    };

    // A default pause toggle function
    this.TogglePause = function () {
        if (this.cpu.crashed)
            throw 'sorry but you crashed :c<br>reset to start !';

        if (!this.paused)
            this.Stop ();
        else
            this.Start ();

        return this.paused;
    };

    this.Reset = function () {
        this.ppu.Reset ();
        this.apu.Reset ();
        this.joypad.Reset ();
        this.cpu.Reset ();
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

    // =============== //   Debug //
    
    this.Memdump = function (mem) {
        mem = this.cpu.mem [mem];

        var str = '';
        for (var i = 0; i < mem.length; i ++) {
            if (i && (i % 16) === 0)
                str += '\n';
            str += ('0' + mem [i].toString (16)).slice (-2) + ' ';
        }

        // Open popup
        var win = window.open("", "Memdump", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=400,height=400,top="+(screen.height/2)+",left="+(screen.width/2));
        win.document.body.innerHTML = '<pre>' + str + '</pre>';
    };

};