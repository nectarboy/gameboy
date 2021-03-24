const Apu = function (nes) {

    var apu = this;

    var mem = nes.cpu.mem;

    // =============== //   Audio Context //

    this.ctx = new (window.AudioContext || window.webkitAudioContext) ();

    this.buffer = this.ctx.createBuffer (1, 4096, 22000); // 4 channels, 4096 samples, 44khz

    this.gainNode = this.ctx.createGain ();
    this.gainNode.gain.value = 0; // Audio volume
    this.gainNode.connect (this.ctx.destination);

    // =============== //   Buffering //

    try {

    this.lastBufferStop = 0;
    this.StepBuffer = function (cycles) {
        var freq = this.chan1_getFreq ();

        // Buffer channel 1
        var buffer1 = this.buffer.getChannelData (0);
        var halfSquarePeriod = (this.buffer.sampleRate / freq) * 0.5;

        var i = 0;

        var ii = this.lastBufferStop;
        var length = ii + cycles;
        while (ii < length) {
            var sample1 = ((i / halfSquarePeriod) & 1) ? this.chan1_env_vol : -this.chan1_env_vol;

            buffer1 [ii] = sample1;;

            i ++;
            ii ++;
        }

        this.lastBufferStop = ii;

        return ii >= this.buffer.length; // True when buffer is full !
    };

    this.PlayBuffer = function () {
        var source = this.ctx.createBufferSource ();

        source.buffer = this.buffer;
        source.connect (this.gainNode);

        source.start ();
    };

    this.FlushBuffer = function () {
        for (var i = 0; i < this.buffer.numberOfChannels; i ++)
            for (var ii = 0; ii < buffer.length; ii ++)
                buffer [ii] = 0;
    };

    }
    catch (e) {
        console.log ('audio not supported. using fallback !');
        this.StepBuffer = this.PlayBuffer = this.FlushBuffer =
            function () {};
    }

    // =============== //   Reset Function //

    this.Reset = function () {
        this.lastBufferStop = 0;
        this.soundclocks = 0;

        // Reset channel 1
        this.chan1_env_vol = 0;
        this.chan1_env_on = false;
        this.chan1_env_interval = 0;
        this.chan1_env_clocks = 0;
    };

    // =============== //   Square Channel 1 //

    // Sweep register
    this.chan1_sweep_time = 0
    this.chan1_sweep_dec = false;
    this.chan1_sweep_num = 0;

    // Length and pattern duty
    this.chan1_pattern_duty = 0;
    this.chan1_length_data = 0;

    // Volume envelope
    this.chan1_env_init = 0;
    this.chan1_env_inc = false;
    this.chan1_env_sweep = 0;
    this.chan1_env_clocks = 0;

    this.chan1_env_vol = 0;
    this.chan1_env_on = false;
    this.chan1_env_interval = 0;

    // Frequency + settings ??
    this.chan1_counter_select = false;
    this.chan1_raw_freq = 0;

    // Frequency methods
    this.chan1_getFreq = function () {
        return 131072 / (2048 - this.chan1_raw_freq);
    };

    // =============== //   Square Channel 2 //

    // =============== //   Sound Controller //

    this.soundclocks = 0;
    this.soundinterval = 8192; // 4194304 / 512

    this.soundOn = false;

    this.SoundController = function (cycled, cycledThisFrame) {
        if (!this.soundOn)
            return;

        this.soundclocks += cycled;

        if (this.soundclocks >= this.soundinterval) {
            // ---- CHANNEL 1 ---- //
            // Update envelope
            this.chan1_env_clocks ++;
            if (this.chan1_env_clocks >= this.chan1_env_interval) {
                if (this.chan1_env_on) {
                    // Inc
                    if (this.chan1_env_inc) {
                        this.chan1_env_vol += 1/15;
                        if (this.chan1_env_vol > 1)
                            this.chan1_env_vol = 1;
                    }
                    // Dec
                    else {
                        this.chan1_env_vol -= (1/15);
                        if (this.chan1_env_vol < 0)
                            this.chan1_env_vol = 0;
                    }
                }

                this.chan1_env_clocks = 0;
            }

            // Filling the buffer
            var bufferFull = this.StepBuffer (512);
            if (bufferFull) {
                this.lastBufferStop = 0;
                this.PlayBuffer ();
            }

            this.soundclocks -= this.soundinterval;
        }
    };

};