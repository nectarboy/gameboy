const Cpu = function (nes) {

    var cpu = this;

    // =============== // CPU Timing //

    this.cyclespersec = 4194304; // 4194304

    this.cyclesperframe = 0;
    this.interval = 0;

    this.cpu_cpf = 0;

    // =============== //   Basic Elements //

    // Basic flags
    this.bootromAtm = false;
    this.hasRom = false;

    this.crashed = false;

    this.halted = false;
    this.haltbugAtm = false;

    this.ime = false;

    // =============== //   Registers and Flags //

    // Program
    this.pc = 0x0000; // A placeholder for the bootfirm
    this.cycles = 0;

    // Stack
    this.sp = 0x0000; // Stack pointer

    this.writeSP = function (addr) {
        this.sp = addr & 0xffff; // Mask to 16bit int
    };
    this.pushSP = function (val) {
        this.writeSP (this.sp - 1);
        this.writeByte (this.sp, (val & 0xff00) >> 8); // Hi byte
        this.writeSP (this.sp - 1);
        this.writeByte (this.sp, val & 0xff); // Lo byte

        return val & 0xffff; // Mask to 16bit int
    };
    this.popSP = function () {
        var lo = this.readByte (this.sp); // Lo byte
        this.writeSP (this.sp + 1);
        var hi = this.readByte (this.sp); // Hi byte
        this.writeSP (this.sp + 1);

        return (hi << 8) | lo; // Combine lo and hi together
    };

    // Registers A-L
    this.reg = {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        e: 0,
        f: 0,
        h: 0,
        l: 0
    };

    // 16 bit registers
    this.getReg16 = {
        af: function () {return this.get ('a', 'f')},
        bc: function () {return this.get ('b', 'c')},
        de: function () {return this.get ('d', 'e')},
        hl: function () {return this.get ('h', 'l')},

        get (rx, ry) {
            var hi = cpu.reg [rx];
            var lo = cpu.reg [ry];
            return (hi << 8) | lo;
        }
    };
    this.writeReg16 = {
        af: function (val) {return this.write ('a', 'f', val)},
        bc: function (val) {return this.write ('b', 'c', val)},
        de: function (val) {return this.write ('d', 'e', val)},
        hl: function (val) {return this.write ('h', 'l', val)},

        write (rx, ry, val) {
            val = val & 0xffff;
            cpu.reg [rx] = (val >> 8);      // Hi byte
            cpu.reg [ry] = (val & 0xff);    // Lo byte
            return val;
        }
    };

    /*this.writeReg = function (r8, val) {
        return this.reg [r8] = val & 0xff; // Mask to 8bit int
    };*/

    // Flags
    this.flag = {
        zero: false,
        sub: false,
        hcar: false,
        car: false
    };

    // =============== //   Gameboy Color //

    this.cgb = false;
    this.colorSpeed = false;

    this.wramBankAddr = 0;

    this.speedSwitchFast = function () {
        this.colorSpeed = true;

        // CPU timings
        this.cpu_cpf = this.cyclesperframe * 2;

        // PPU timings
        nes.ppu.ppu_oamlength = nes.ppu.oamlength * 2;
        nes.ppu.ppu_drawlength = nes.ppu.drawlength * 2;
        nes.ppu.ppu_hblanklength = nes.ppu.hblanklength * 2;
        nes.ppu.ppu_scanlinelength = nes.ppu.scanlinelength * 2;

        // APU timings
        nes.apu.apu_soundinterval = nes.apu.soundinterval * 2;
        nes.apu.apu_bufferinterval = nes.apu.bufferinterval * 2;

        nes.apu.apu_squarefreqmul = nes.apu.squarefreqmul * 2;
        nes.apu.apu_wavefreqmul = nes.apu.wavefreqmul * 2;
    };

    this.speedSwitchSlow = function () {
        this.colorSpeed = false;

        // CPU timings
        this.cpu_cpf = this.cyclesperframe;

        // PPU timings
        nes.ppu.ppu_oamlength = nes.ppu.oamlength;
        nes.ppu.ppu_drawlength = nes.ppu.drawlength;
        nes.ppu.ppu_hblanklength = nes.ppu.hblanklength;
        nes.ppu.ppu_scanlinelength = nes.ppu.scanlinelength

        // APU timings
        nes.apu.apu_soundinterval = nes.apu.soundinterval;
        nes.apu.apu_bufferinterval = nes.apu.bufferinterval;

        nes.apu.apu_squarefreqmul = nes.apu.squarefreqmul;
        nes.apu.apu_wavefreqmul = nes.apu.wavefreqmul;
    };

    this.refreshCycleTimings = function () {
        if (this.colorSpeed)
            this.speedSwitchFast();
        else
            this.speedSwitchSlow();
    }

    // =============== //   Interrupts //

    // IE and IF
    this.ienable = {
        vblank: false,      // Bit 0
        lcd_stat: false,    // Bit 1
        timer: false,       // Bit 2
        serial: false,      // Bit 3
        joypad: false,      // Bit 4

        /*SetBit: function (bit) {
            return this.Write (cpu.mem.iereg | (1 << bit)); // Set bit
        },
        ClearBit: function (bit) {
            return this.Write (cpu.mem.iereg & ~(1 << bit)); // Clear bit
        },*/

        Write (val) {
            // Set interrupt enables
            this.vblank      = (val & 0b00000001) ? true : false; // Bit 0
            this.lcd_stat    = (val & 0b00000010) ? true : false; // Bit 1
            this.timer       = (val & 0b00000100) ? true : false; // Bit 2
            this.serial      = (val & 0b00001000) ? true : false; // Bit 3
            this.joypad      = (val & 0b00010000) ? true : false; // Bit 4

            // Write to 0xffff
            return cpu.mem.iereg = val;
        }
    };

    this.iflag = {
        vblank: false,      // Bit 0
        lcd_stat: false,    // Bit 1
        timer: false,       // Bit 2
        serial: false,      // Bit 3
        joypad: false,      // Bit 4

        // Bit setting methods
        SetVblank () {
            cpu.mem.ioreg [0x0f] |= 0b00000001; // Set bit 0
            this.vblank = true;
        },
        SetLcdStat () {
            cpu.mem.ioreg [0x0f] |= 0b00000010; // Set bit 1
            this.lcd_stat = true;
        },
        SetTimer () {
            cpu.mem.ioreg [0x0f] |= 0b00000100; // Set bit 2
            this.timer = true;
        },
        SetSerial () {
            cpu.mem.ioreg [0x0f] |= 0b00001000; // Set bit 3
            this.serial = true;
        },
        SetJoypad () {
            cpu.mem.ioreg [0x0f] |= 0b00010000; // Set bit 4
            this.joypad = true;
        },

        // Bit clearing methods
        ClearVblank () {
            cpu.mem.ioreg [0x0f] &= 0b11111110; // Clear bit 0
            this.vblank = false;
        },
        ClearLcdStat () {
            cpu.mem.ioreg [0x0f] &= 0b11111101; // Clear bit 1
            this.lcd_stat = false;
        },
        ClearTimer () {
            cpu.mem.ioreg [0x0f] &= 0b11111011; // Clear bit 2
            this.timer = false;
        },
        ClearSerial () {
            cpu.mem.ioreg [0x0f] &= 0b11110111; // Clear bit 3
            this.serial = false;
        },
        ClearJoypad () {
            cpu.mem.ioreg [0x0f] &= 0b11101111; // Clear bit 4
            this.joypad = false;
        }
    };

this.CheckInterrupts = function () {
    if (!this.ime)
        return;

    // Vblank interrupt !
    if (this.ienable.vblank && this.iflag.vblank) {
        this.ExeInterrupt (0x40);
        this.iflag.ClearVblank ();

        // console.log ('V-BLANK');
    }
    // LCD-stat interrupt !
    else if (this.ienable.lcd_stat && this.iflag.lcd_stat) {
        this.ExeInterrupt (0x48);
        this.iflag.ClearLcdStat ();
    }
    // Timer interrupt !
    else if (this.ienable.timer && this.iflag.timer) {
        this.ExeInterrupt (0x50);
        this.iflag.ClearTimer ();
    }
    // Serial interrupt !
    else if (this.ienable.serial && this.iflag.serial) {
        this.ExeInterrupt (0x58);
        this.iflag.ClearSerial ();
    }
    // Joypad interrupt !
    else if (this.ienable.joypad && this.iflag.joypad) {
        this.ExeInterrupt (0x60);
        this.iflag.ClearJoypad ();
    }
};

    this.ExeInterrupt = function (vec, bit) {
        this.ops.INS.RST_vec (vec);     // 16 cycles
        this.ops.INS.DI ();             // 4 cycles
        // 20 cycles in total :3
    };

    // =============== //   Timers //

    this.div =
    this.tima = 0;

    this.timamod = 0; // What will be loaded into tima when it overflows

    this.timaenable = false;

    this.timarate = 0;
    this.divrate = 256; // Cycles

    // Clock tick functions
    this.DivTick = function () {
        return this.div // Increment div ...
            = this.mem.ioreg [0x04] += 1; // ... while setting div ioreg
    };

    this.TimaTick = function () {
        if (!this.timaenable)
            return;

        this.tima ++;
        // Overflow check
        if (this.tima > 0xff) {
            this.tima = this.timamod;
            this.iflag.SetTimer (); // Request timer interrupt
        }

        return this.mem.ioreg [0x05] = this.tima; // Set tima ioreg
    };

    // =============== //   CPU Timings //

    // Timers
    this.divclocks =
    this.timaclocks = 0;
    
    this.HandleTimers = function (cycled) {
        this.divclocks += cycled;
        if (this.divclocks >= this.divrate) {
            this.DivTick ();
            this.divclocks -= this.divrate;
        }

        if (!this.timaenable)
            return;

        this.timaclocks += cycled;
        // While cuz timarate b smoll sometimes
        while (this.timaclocks >= this.timarate) {
            this.TimaTick ();
            this.timaclocks -= this.timarate;
        }
    };

    // =============== //   Memory //

    this.mem = new Mem (nes, this);

    // Thank u to whoever gave me this code
    // I forgot ur name but may u rest forever
    // untouched in this shrivelled paradise
    // U walked so i could run bro gimme a kiss
    /* uint8 read_byte(uint16 addr) {
          if (addr < 0x100 && bootrom_enabled)
            return bootrom[addr];
          if (addr < 0x4000)
            return cart_rom[addr];
          if (addr < 0x8000)
            return cart_rom[cart_bank*0x4000 + (addr & 0x3FFF)];
        // etc for ram etc
    } */

    this.readByte = function (addr) {
        var mem = this.mem;

        // ROM //
        if (this.bootromAtm && addr < 0x100) {
            return mem.bootrom [addr];
        }
        if (addr < 0x4000) {
            if (!this.hasRom)
                return 0xff;
            return mem.cartrom [addr];
        }
        if (addr < 0x8000) {
            if (!this.hasRom)
                return 0xff;
            return mem.mbcRead [mem.mbc] (addr);
        }
        // VIDEO //
        if (addr < 0xa000) {
            var mode = nes.ppu.stat.mode;
            //if (mode === 3) // I turned off my LCD blocking cuz its bad
            //    return mode;

            return mem.vram [addr - 0x8000];
        }
        // CART RAM //
        if (addr < 0xc000) {
            if (!mem.ramenabled || !mem.evenhasram)
                return 0xff;
            return mem.mbcRamRead [mem.mbc] (addr - 0xa000);
        }
        // WORK RAM - NO BANK 0 //
        if (addr < 0xd000) {
            return mem.wram0 [addr - 0xc000];
        }
        // WORK RAM - CGB BANKABLE / NO BANK 1 //
        if (addr < 0xe000) {
            return mem.wram1 [addr - 0xc000 + this.wramBankAddr];
        }
        // ECHO RAM //
        if (addr < 0xfe00) {
            return mem.wram0 [addr - 0xe000];
        }
        // VIDEO (oam) //
        if (addr < 0xfea0) {
            var mode = nes.ppu.stat.mode;
            //if (mode > 1) // I turned off my LCD blocking cuz its bad
            //    return mode;

            return mem.oam [addr - 0xfe00];
        }
        // UNUSED //
        if (addr < 0xff00) {
            return 0; // Reading from unused yields 0
        }
        // IO REG
        if (addr < 0xff80) {
            return mem.IoRead (addr);
        }
        // HIGH
        if (addr < 0xffff) {
            return mem.hram [addr - 0xff80];
        }
        // INTERRUPT
        return mem.iereg;
    };
    
    this.writeByte = function (addr, val) {
        var mem = this.mem;

        // MBC CONTROL //
        if (addr < 0x8000) {
            mem.mbcWrite [mem.mbc] (addr, val);
        }
        // VIDEO //
        else if (addr < 0xa000) {
            //if (nes.ppu.stat.mode !== 3) // I turned off my LCD blocking cuz its bad
                mem.vram [addr - 0x8000] = val;
        }
        // CART RAM //
        else if (addr < 0xc000) {
            if (mem.ramenabled && mem.evenhasram)
                mem.mbcRamWrite [mem.mbc] (addr - 0xa000, val);
        }
        // WORK RAM - NO BANK 0 //
        else if (addr < 0xd000) {
            mem.wram0 [addr - 0xc000] = val;
        }
        // WORK RAM - CGB BANKABLE / NO BANK 1 //
        else if (addr < 0xe000) {
            mem.wram1 [addr - 0xc000 + this.wramBankAddr] = val;
        }
        // ECHO RAM //
        else if (addr < 0xfe00) {
            mem.wram0 [addr - 0xe000] = val;
        }
        // VIDEO (oam) //
        else if (addr < 0xfea0) {
            //if (nes.ppu.stat.mode > 1) // I turned off my LCD blocking cuz its bad
            //   return;

            // Write object properties to sprite pool
            addr -= 0xfe00;

            nes.ppu.spritePool
                [addr >> 2] [addr & 3] (val); // (4 bytes per sprite)

            mem.oam [addr] = val;
        }
        // UNUSED //
        else if (addr < 0xff00) {
            return;
        }
        // IO REG
        else if (addr < 0xff80) {
             mem.IoWrite (addr, val);
        }
        // HIGH
        else if (addr < 0xffff) {
            mem.hram [addr - 0xff80] = val;
        }
        // INTERRUPT
        else {
            this.ienable.Write (val);
        }
    };

    this.read16 = function (addr) {
        var hi = this.readByte (addr ++); //  Get high byte
        var lo = this.readByte (addr & 0xffff); //  Get low byte

        return (lo << 8) | hi; // Mask to 16bit int
    };
    this.read16alt = function (addr) {
        var hi = this.readByte (addr ++); //  Get high byte
        var lo = this.readByte (addr & 0xffff); //  Get low byte

        return (hi << 8) | lo; // Mask to 16bit int
    };

    this.write16 = function (addr, val) {
        this.writeByte (addr ++, val & 0xff); // Get low byte
        this.writeByte (addr & 0xffff, val >> 8); //  Get high byte
    };

    // =============== //   Instructions //

    this.ops = new Ops (this);

    // =============== //   Loop Functions //

    this.currentTimeout = null;

    this.msBefore =
    this.msAfter = 0;

    this.RunFrame = function (extracycles) {
        return this.Step (this.cpu_cpf - extracycles);
    };

    this.Step = function (cycles) {
        while (cycles > 0) {

            this.cycles = 0;

            // Handle program flow
            this.ops.ExeIns ();
            this.CheckInterrupts ();

            // Handle ppu, timers, and apu
            nes.ppu.HandleScan (this.cycles);
            this.HandleTimers (this.cycles);
            nes.apu.SoundController (this.cycles); // GOD FUCK THE APU

            cycles -= this.cycles;
        }

        return this.cycles;
    };

    this.LoopExe = function (extracycles) {
        this.msBefore = performance.now ();

        nes.joypad.PollJoypad (); // Poll joypad each frame !
        var cycled = this.RunFrame (extracycles);

        this.msAfter = performance.now ();
        var msSpent = this.msAfter - this.msBefore; // Time spent on emulation

        this.currentTimeout = setTimeout (() => {
            cpu.LoopExe (cycled); // Continue program loop
        }, this.interval - msSpent);
    };

    this.StopExe = function () {
        clearTimeout (this.currentTimeout);
    };

    this.GetMaxFps = function () {
        return 1000 / (this.msAfter - this.msBefore);
    };

    // Reset
    this.Reset = function () {
        this.crashed = false;

        // Reset flags
        this.flag.zero =
        this.flag.sub =
        this.flag.hcar =
        this.flag.car = false;

        this.halted = false;
        this.haltbugAtm = false;

        this.ime = false;

        // Reset timers
        this.div =
        this.tima = 0;
        this.timamod = 0;
        this.timaenable = false;

        // Reset cpu timings
        this.divclocks =
        this.timaclocks = 0;

        // Reset memory
        this.bootromAtm = true;
        this.mem.Reset ();

        // BOOTROM ENABLED CHANGES - this sentecne makes no sence ik shut up shut up shut up
        if (nes.bootromEnabled) {
            // Reset registers
            this.writeReg16.af (0x0000);
            this.writeReg16.bc (0x0000);
            this.writeReg16.de (0x0000);
            this.writeReg16.hl (0x0000);

            this.pc = 0x0000;
            this.sp = 0x0000;
        }
        else {
            this.Bootstrap (); // Manually bootstrap
        }

        // CGB
        this.wramBankAddr = 0;
        this.colorSpeed = false;
        this.refreshCycleTimings();
    };

    this.Bootstrap = function () {
        // Set registers to values occur in bootrom
        this.writeReg16.af (0x01b0);
        this.writeReg16.bc (0x0013);
        this.writeReg16.de (0x00d8);
        this.writeReg16.hl (0x014d);

        // Fix flags
        this.flag.zero  = (this.reg.f & (1 << 7)) !== 0;
        this.flag.sub   = (this.reg.f & (1 << 6)) !== 0;
        this.flag.hcar  = (this.reg.f & (1 << 5)) !== 0;
        this.flag.car   = (this.reg.f & (1 << 4)) !== 0;

        this.pc = 0x0100;
        this.sp = 0xfffe;

        // Set ioreg values
        this.mem.IoWrite (0x40, 0x91); // LCDC
        this.mem.IoWrite (0x47, 0xfc); // BGP
        this.mem.IoWrite (0x48, 0xff); // OBP 1
        this.mem.IoWrite (0x49, 0xff); // OBP 2
        this.mem.IoWrite (0x50, 0x01); // Disable bootrom

        // console.log (this.ops.GetLogLine (this.pc));
    };

    // =============== //   Debugging //

    this.Panic = function (e) {
        // Stop everything
        nes.Stop ();
        this.crashed = true;

        alert (e);
        throw e;
    };

};