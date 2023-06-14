const Apu = function (nes) {

    var apu = this;

    var mem = nes.cpu.mem;

    // =============== //   Audio Context //

    try { // If any errors are caught, then we use a dummy fallback.

    this.ctx = new (window.AudioContext || window.webkitAudioContext) ();

    this.buffer = this.ctx.createBuffer (1, 8192, 44000); // 3 channels, 4096 samples, 44khz

    this.gainNode = this.ctx.createGain ();
    this.gainNode.gain.value = 0; // Audio volume
    this.gainNode.connect (this.ctx.destination);

    // =============== //   Buffering //

    this.bufferInd = 0;

    // Buffer queue
    this.bufferQueues = {};
    this.bufferQueues.length = Math.floor (this.buffer.length / this.buffer.numberOfChannels);
    // Filling buffer quee
    for (var i = 0; i < this.buffer.numberOfChannels; i ++)
        this.bufferQueues [i] = new Float32Array (this.bufferQueues.length);

    // Buffer methods
    this.StepBuffer = function () {
        var sample = this.GetSample ();
        this.bufferQueues [0] [this.bufferInd ++] = sample;

        return (this.bufferInd >= this.bufferQueues.length); // True when buffer(s) are full !
    };

    this.GetSample = function () {
        // Channel 1
        var sample1 =
            this.duty [this.chan1_pattern_duty] [this.chan1_duty_step]
            * this.chan1_env_vol;

        // Channel 2
        var sample2 =
            this.duty [this.chan2_pattern_duty] [this.chan2_duty_step]
            * this.chan2_env_vol;

        // Channel 3
        var sample3;
        if (this.chan3_volshift === 4)
            sample3 = 0;
        else {
            sample3 = this.chan3GetSample ();
            sample3 = (sample3 + (sample3 - 0xf)) >> this.chan3_volshift;
            sample3 /= 0xf;
        }

        // Channel 4
        var sample4 = this.chan4_freq * this.chan4_env_vol;

        // Mix ...
        return (sample1 + sample2 + sample3 + sample4);
    };

    this.pitchShift = 0;
    var safariFallback = {value: 0};
    this.PlayBuffer = function () {
        var source = this.ctx.createBufferSource ();

        source.buffer = this.buffer;
        source.connect (this.gainNode);
        source.detune = safariFallback; // Safari doesn't support detune
        source.detune.value = this.pitchShift;

        source.start ();
    };

    this.FlushBuffer = function () {
        for (var i = 0; i < this.buffer.numberOfChannels; i ++) {
            var channel = this.buffer.getChannelData (i);
            for (var ii = 0; ii < channel.length; ii ++)
                channel [ii] = 0;
        }
    };

    this.CopyBufferQueues = function () {
        for (var i = 0; i < this.buffer.numberOfChannels; i ++)
            this.buffer.copyToChannel (this.bufferQueues [i], i);
    };

    }
    // The dummy fallback
    catch (e) {
        console.log ('audio not supported. using fallback !');
        this.bufferInd = 0;
        this.StepBuffer = this.PlayBuffer = this.FlushBuffer = this.CopyBufferQueues =
            function () {};
    }

    // Duty patterns
    this.duty = {
        0: [-1, -1, -1, -1, -1, -1, -1, 1], // 12.5%
        1: [1, -1, -1, -1, -1, -1, -1, 1], // 25%
        2: [1, -1, -1, -1, -1, 1, 1, 1], // 50%
        3: [-1, 1, 1, 1, 1, 1, 1, -1]  // 75%
    };

    // =============== //   Reset Function //

    this.Reset = function () {
        this.bufferInd = 0;

        this.soundclocks = 0;
        this.bufferclocks = 0;

        // Reset channel 1
        this.chan1_env_interval = 0;
        this.chan1_env_clocks = 0;
        this.chan1_freq_timer = 0;
        this.chan1_duty_step = 0;
        this.chan1_sweep_clocks = 0;
        this.chan1Disable ();

        // Reset channel 2
        this.chan2_env_interval = 0;
        this.chan2_env_clocks = 0;
        this.chan2_freq_timer = 0;
        this.chan2_duty_step = 0;

        // Reset channel 3
        this.chan3_freq_timer = 0;
        this.chan3_byte_step = 0;
        this.chan3_sample = 0;

        // Reset channel 4
        this.chan4_env_interval = 0;
        this.chan4_env_clocks = 0;
        this.chan4_freq_timer = 0;
        this.chan4_freq = 0;
        this.lfsr = 0x7fff;
        this.lfsr_width = false;

        this.length_step = false;

    };

    this.length_step = false;

    // =============== //   Square Channel 1 //

    // Properties
    this.chan1_on = false;

    this.chan1Disable = function () {
        this.chan1_on = false;
        this.chan1_env_vol = 0; // Mute lol
    };

    this.chan1Trigger = function () {
        this.chan1_on = true;
                    
        // Restart envelope
        this.chan1_env_vol = this.chan1_env_init;
        this.chan1_raw_freq = this.chan1_init_freq;

        // Restart length
        if (this.chan1_length === 0)
            this.chan1_length = 64; // Full

        // Restart sweep
        if (this.chan1_sweep_time > 0)
            this.chan1_sweep_clocks = this.chan1_sweep_time;
        else
            this.chan1_sweep_clocks = 8;

        if (this.chan1_sweep_num > 0 && this.CalcSweep () > 2047)
            this.chan1Disable ();
    };

    // Sweep register
    this.chan1_sweep_time = 0
    this.chan1_sweep_dec = false;
    this.chan1_sweep_num = 0;

    this.chan1_sweep_on = false;
    this.chan1_sweep_clocks = 0;

    this.CalcSweep = function () {
        var preFreq = this.chan1_raw_freq;
        var newFreq = preFreq >> this.chan1_sweep_num;

        newFreq = preFreq + (this.chan1_sweep_dec ? -newFreq : newFreq);
        return newFreq;
    };

    this.chan1UpdateSweep = function () {
        if (-- this.chan1_sweep_clocks > 0)
            return;

        // When clocks reaches 0 ...
        if (this.chan1_sweep_time > 0) {
            this.chan1_sweep_clocks = this.chan1_sweep_time;

            var newFreq = this.CalcSweep ();

            var overflow = newFreq > 2047;
            if (!overflow && this.chan1_sweep_num > 0) {
                this.chan1_raw_freq = newFreq;

                if (this.CalcSweep () > 2047)
                    this.chan1Disable ();
            }
            else if (overflow)
                this.chan1Disable ();
        }
        else
            this.chan1_sweep_clocks = 8;
    };

    // Length and pattern duty
    this.chan1_pattern_duty = 0;
    this.chan1_length = 0;

    this.chan1UpdateLength = function () {
        if (this.length_step && this.chan1_counter_select && -- this.chan1_length === 0)
            this.chan1Disable ();
    };

    // Volume envelope
    this.chan1_env_init = 0;
    this.chan1_env_inc = false;
    this.chan1_env_sweep = 0;
    this.chan1_env_clocks = 0;

    this.chan1_env_vol = 0;
    this.chan1_env_on = false;
    this.chan1_env_interval = 0;

    this.chan1UpdateEnvelope = function () {
        this.chan1_env_clocks ++;

        if (this.chan1_env_clocks >= this.chan1_env_interval) {
            this.chan1_env_clocks = 0;
            if (!this.chan1_env_on)
                return;

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
    };

    // Frequency + settings ??
    this.chan1_counter_select = false;
    this.chan1_init_freq = 0;
    this.chan1_raw_freq = 0;

    // Frequency timer
    this.chan1_freq_timer = 0;
    this.chan1_duty_step = 0;

    this.chan1UpdateFreq = function (cycled) {
        this.chan1_freq_timer -= cycled;
        if (this.chan1_freq_timer <= 0) {
            this.chan1_freq_timer += (2048 - this.chan1_raw_freq) * 4;

            this.chan1_duty_step ++;
            this.chan1_duty_step &= 7;
        }
    };

    // =============== //   Square Channel 2 //

    // Properties
    this.chan2_on = false;

    this.chan2Disable = function () {
        this.chan2_on = false;
        this.chan2_env_vol = 0; // Mute lol
    };

    this.chan2Trigger = function () {
        this.chan2_on = true;

        // Restart envelope
        this.chan2_env_vol = this.chan2_env_init;

        // Restart length
        if (this.chan2_length === 0)
            this.chan2_length = 64; // Full
    };

    // Length and pattern duty
    this.chan2_pattern_duty = 0;
    this.chan2_length = 0;

    this.chan2UpdateLength = function () {
        if (this.length_step && this.chan2_counter_select && -- this.chan2_length === 0)
            this.chan2Disable ();
    };

    // Volume envelope
    this.chan2_env_init = 0;
    this.chan2_env_inc = false;
    this.chan2_env_sweep = 0;
    this.chan2_env_clocks = 0;

    this.chan2_env_vol = 0;
    this.chan2_env_on = false;
    this.chan2_env_interval = 0;

    this.chan2UpdateEnvelope = function () {
        this.chan2_env_clocks ++;

        if (this.chan2_env_clocks >= this.chan2_env_interval) {
            this.chan2_env_clocks = 0;
            if (!this.chan2_env_on)
                return;

            // Inc
            if (this.chan2_env_inc) {
                this.chan2_env_vol += 1/15;
                if (this.chan2_env_vol > 1)
                    this.chan2_env_vol = 1;
            }
            // Dec
            else {
                this.chan2_env_vol -= (1/15);
                if (this.chan2_env_vol < 0)
                    this.chan2_env_vol = 0;
            }
        }
    };

    // Frequency + settings ??
    this.chan2_counter_select = false;
    this.chan2_raw_freq = 0;

    // Frequency timer
    this.chan2_freq_timer = 0;
    this.chan2_duty_step = 0;

    this.chan2UpdateFreq = function (cycled) {
        this.chan2_freq_timer -= cycled;
        if (this.chan2_freq_timer <= 0) {
            this.chan2_freq_timer += (2048 - this.chan2_raw_freq) * 4;

            this.chan2_duty_step ++;
            this.chan2_duty_step &= 7;
        }
    };

    // =============== //   Wave Channel 3 //

    this.chan3_on = false;

    this.chan3Disable = function () {
        this.chan3_on = false;
        this.chan3_volshift = 4;
    };

    this.chan3Trigger = function () {
        if (!this.chan3_playback)
            return;

        this.chan3_on = true;

        this.chan3_volshift = this.chan3_init_volshift;

        // Restart length
        if (this.chan3_length === 0)
            this.chan3_length = 256; // Full
    };

    // Playback enable
    this.chan3_playback = false;

    // Length
    this.chan3_length = 0;

    this.chan3UpdateLength = function () {
        if (this.length_step && this.chan3_counter_select && -- this.chan3_length === 0)
            this.chan3Disable ();
    };

    // Volume shift
    this.chan3_init_volshift = 0;
    this.chan3_volshift = 0;

    // Frequency + settings ??
    this.chan3_counter_select = false;
    this.chan3_raw_freq = 0;

    // Frequency timer
    this.chan3_freq_timer = 0;
    this.chan3_sample_step = 0;

    this.chan3UpdateFreq = function (cycled) {
        this.chan3_freq_timer -= cycled;
        if (this.chan3_freq_timer <= 0) {
            this.chan3_freq_timer += (2048 - this.chan3_raw_freq) * 2;

            this.chan3_sample_step ++;
            this.chan3_sample_step &= 0x1f;
        }
    };

    this.chan3GetSample = function () {
        return (
            ((mem.ioreg [0x30 + (this.chan3_sample_step >> 1)]
            >> (!(this.chan3_sample_step & 1) * 4))
            & 0xf) //>> this.chan3_volshift
        );
    };

     // =============== //   Noise Channel 4 //

    // Properties
    this.chan4_on = false;

    this.chan4Disable = function () {
        this.chan4_on = false;
        this.chan4_env_vol = 0; // Mute lol
    };

    this.chan4Trigger = function () {
        this.chan4_on = true;

        // Restart envelope
        this.chan4_env_vol = this.chan4_env_init;
        this.lfsr = 0x7fff;
        this.lfsr_width = false;

        // Restart length
        if (this.chan4_length === 0)
            this.chan4_length = 64; // Full
    };

    // Length
    this.chan4_length = 0;

    this.chan4UpdateLength = function () {
        if (this.length_step && this.chan4_counter_select && -- this.chan4_length === 0)
            this.chan4Disable ();
    };

    // Volume envelope
    this.chan4_env_init = 0;
    this.chan4_env_inc = false;
    this.chan4_env_sweep = 0;
    this.chan4_env_clocks = 0;

    this.chan4_env_vol = 0;
    this.chan4_env_on = false;
    this.chan4_env_interval = 0;

    this.chan4UpdateEnvelope = function () {
        this.chan4_env_clocks ++;

        if (this.chan4_env_clocks >= this.chan4_env_interval) {
            this.chan4_env_clocks = 0;
            if (!this.chan4_env_on)
                return;

            // Inc
            if (this.chan4_env_inc) {
                this.chan4_env_vol += 1/15;
                if (this.chan4_env_vol > 1)
                    this.chan4_env_vol = 1;
            }
            // Dec
            else {
                this.chan4_env_vol -= (1/15);
                if (this.chan4_env_vol < 0)
                    this.chan4_env_vol = 0;
            }
        }
    };

    // Frequency + settings ??
    this.chan4_counter_select = false;
    this.chan4_raw_freq = 0;

    // Frequency timer
    this.chan4_freq_timer = 0;
    this.lfsr = 0x7fff;
    this.lfsr_width = false;

    this.nextBitLFSR = function () {
        var x = ((this.lfsr & 1) ^ ((this.lfsr & 2) >> 1)) != 0;
        this.lfsr = this.lfsr >> 1;
        this.lfsr = this.lfsr | (x ? (1 << 14) : 0);
        if (this.lfsr_width) {
            this.lfsr = this.lfsr | (x ? (1 << 6) : 0);
        }
        if ((1 & ~this.lfsr) == 0)
        	return -1;
        return 1;
    };

    this.chan4UpdateFreq = function (cycled) {
        this.chan4_freq_timer -= cycled;
        if (this.chan4_freq_timer <= 0) {
            this.chan4_freq_timer += this.chan4_raw_freq;

            this.chan4_freq = this.nextBitLFSR();
        }
    };

    // =============== //   Sound Controller //

    this.soundclocks = 0;
    this.soundinterval = nes.cpu.cyclespersec / 512; // 8192 cycles

    this.bufferclocks = 0;
    this.bufferinterval = Math.ceil (nes.cpu.cyclespersec / this.buffer.sampleRate);

    this.soundOn = false;

    this.SoundController = function (cycled) {
        if (!this.soundOn)
            return;

        // Frequency timers
        this.chan1UpdateFreq (cycled);
        this.chan2UpdateFreq (cycled);
        this.chan3UpdateFreq (cycled);
        this.chan4UpdateFreq (cycled);

        // Every 512 hz ...
        this.soundclocks += cycled;
        if (this.soundclocks >= this.soundinterval) {
            // Channel 1
            if (this.chan1_on) {
                this.chan1UpdateEnvelope ();
                this.chan1UpdateSweep ();
                this.chan1UpdateLength ();
            }

            // Channel 2
            if (this.chan2_on) {
                this.chan2UpdateEnvelope ();
                this.chan2UpdateLength ();
            }

            // Channel 3
            if (this.chan3_on) {
                this.chan3UpdateLength ();
            }

            // Channel 4
            if (this.chan4_on) {
                this.chan4UpdateEnvelope ();
                this.chan4UpdateLength ();
            }

            this.length_step = !this.length_step;

            this.soundclocks -= this.soundinterval;
        }

        // Filling the buffer
        this.bufferclocks += cycled;
        if (this.bufferclocks >= this.bufferinterval) {
            // Step ...
            if (this.StepBuffer ()) {
                this.bufferInd = 0;

                this.CopyBufferQueues ();
                this.PlayBuffer ();
            }

            this.bufferclocks -= this.bufferinterval;
        }
    };

};
