const Apu = function (nes) {

    var apu = this;

    var mem = nes.cpu.mem;

    // =============== //   Sound Context //

    this.ctx = new (window.AudioContext || window.webkitAudioContext) ();

    this.gainNode = apu.ctx.createGain ();
    this.gainNode.gain.value = 0.02;
    this.gainNode.connect (this.ctx.destination);

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

    this.chan1_counter_select = false;

    this.chan1_raw_freq = 0;

    setInterval (() => {
        if (!nes.cpu.hasRom)
            return;

        var freq = 131072 / (2048 - apu.chan1_raw_freq);
        
        var osc = apu.ctx.createOscillator ();

        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect (apu.gainNode);
        //osc.connect (apu.ctx.destination);

        osc.start ();

        setTimeout (() => {
            osc.stop ();
        }, 24);
    }, 32);

    // =============== //   Square Channel 2 //

};