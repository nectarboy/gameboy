const Cpu = function (nes) {

    var cpu = this;

    // =============== // CPU Timing //

    this.cyclespersec = 4194304; // 4194304

    this.cyclesperframe = 
    this.interval = 0;

    // =============== //   Basic Elements //

    // Basic flags
    this.bootromAtm = false;
    this.hasRom = false;

    this.lowpower = false;
    this.halted = false;

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
        cpu.writeByte (this.sp, (val & 0xff00) >> 8); // Hi byte
        this.writeSP (this.sp - 1);
        cpu.writeByte (this.sp, val & 0xff); // Lo byte

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
            = cpu.mem.ioreg [0x04] += 1; // ... while setting div ioreg
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

        return cpu.mem.ioreg [0x05] = this.tima; // Set tima ioreg
    };

    // =============== //   CPU Timings //

    // Timers
    this.divclocks =
    this.timaclocks = 0;
    
    this.HandleTimers = function (cycled) {
        this.divclocks += cycled;
        this.timaclocks += cycled;

        while (this.divclocks >= this.divrate) {
            this.DivTick ();
            this.divclocks -= this.divrate;
        }

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

        addr &= 0xffff;

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
            // Block read if lcd mode is 3
            if (mode === 3)
                return mode;
            return mem.vram [addr - 0x8000];
        }
        // CART RAM //
        if (addr < 0xc000) {
            if (!mem.ramenabled || !mem.evenhasram)
                return 0xff;
            return mem.mbcRamRead [mem.mbc] (addr - 0xa000);
        }
        // WORK RAM //
        if (addr < 0xe000) {
            return mem.wram [addr - 0xc000];
        }
        // ECHO RAM //
        if (addr < 0xff00) {
            return mem.wram [addr - 0xe000];
        }
        // VIDEO (oam) //
        if (addr < 0xfea0) {
            var mode = nes.ppu.stat.mode;
            // Block read if lcd mode is 2 or 3
            if (mode > 1)
                return mode;

            return mem.oam [addr - 0xfe00];
        } else
        // UNUSED //
        if (addr < 0xff00) {
            return 0; // Reading from unused yields 0
        }
        // IO REG
        if (addr < 0xff80) {
            var ioaddr = addr - 0xff00;

            if (!mem.ioonwrite [ioaddr]) // Unmapped mmio
                return 0xff;
            return mem.ioreg [ioaddr];
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

        addr &= 0xffff;
        val &= 0xff;

        // MBC CONTROL //
        if (addr < 0x8000) {
            mem.mbcWrite [mem.mbc] (addr, val);
            return val;
        }
        // VIDEO //
        if (addr < 0xa000) {
            var mode = nes.ppu.stat.mode;
            // Block write if lcd mode is 3
            if (mode === 3)
                return val;
            return mem.vram [addr - 0x8000] = val;
        }
        // CART RAM //
        if (addr < 0xc000) {
            if (mem.ramenabled && mem.evenhasram)
                mem.mbcRamWrite [mem.mbc] (addr - 0xa000, val);
            return val;
        }
        // WORK RAM //
        if (addr < 0xe000) {
            return mem.wram [addr - 0xc000] = val;
        }
        // ECHO RAM //
        if (addr < 0xfe00) {
            return mem.wram [addr - 0xe000] = val;
        }
        // VIDEO (oam) //
        if (addr < 0xfea0) {
            var mode = nes.ppu.stat.mode;
            // Block write if lcd mode is 2 or 3
            if (mode > 1)
                return val;

            // Write object properties to sprite pool
            addr -= 0xfe00;

            nes.ppu.spritePool
                [addr >> 2] [addr & 3] (val); // (4 bytes per sprite)

            return mem.oam [addr] = val;
        }
        // UNUSED //
        if (addr < 0xff00) {
            return val;
        }
        // IO REG
        if (addr < 0xff80) {
            var ioaddr = addr - 0xff00;

            var ioonwrite = mem.ioonwrite [ioaddr];
            if (ioonwrite)
                ioonwrite (val);
            return val;
        }
        // HIGH
        if (addr < 0xffff) {
            return mem.hram [addr - 0xff80] = val;
        }
        // INTERRUPT
        this.ienable.Write (val);
        return val;
    };

    this.read16 = function (addr) {
        var hi = this.readByte (addr); //  Get high byte
        var lo = this.readByte (addr + 1); //  Get low byte

        return (lo << 8) | hi; // Mask to 16bit int
    };
    this.read16alt = function (addr) {
        var hi = this.readByte (addr); //  Get high byte
        var lo = this.readByte (addr + 1); //  Get low byte

        return (hi << 8) | lo; // Mask to 16bit int
    };

    this.write16 = function (addr, val) {
        cpu.writeByte (addr, (val & 0xff)); // Get low byte
        cpu.writeByte (addr + 1, ((val & 0xff00) >> 8)); //  Get high byte

        return val & 0xffff;
    };

    // =============== //   Instructions //

    this.ops = new Ops (this);

    // =============== //   Loop Functions //

    this.currentTimeout = null;

    this.msBefore =
    this.msAfter = 0;

    this.Step = function (extracycles) {
        var ppu = nes.ppu;

        var precycles =
        this.cycles = 0;

        var cycles = this.cyclesperframe - extracycles;

        while (cycles > 0) {
            // Handle program flow
            this.ops.ExeIns ();
            this.CheckInterrupts ();

            // Get cycles elapsed
            var cycled = this.cycles - precycles;
            precycles = this.cycles;

            // Handle ppu and timers
            ppu.HandleScan (cycled);
            this.HandleTimers (cycled);

            cycles -= cycled;
        }

        return cycles;
    };

    this.LoopExe = function (extracycles) {
        this.msBefore = performance.now ();

        var cycled = this.Step (extracycles);

        this.msAfter = performance.now ();
        var msSpent = this.msAfter - this.msBefore; // Time spent on emulation

        this.currentTimeout = setTimeout (() => {
            cpu.LoopExe (cycled); // Continue program loop
        }, this.interval - msSpent);
    };

    this.StopExe = function () {
        clearTimeout (this.currentTimeout);
    };

    /*setInterval (() => {
        console.log (1000 / (this.msAfter - this.msBefore));
    }, 1000);*/

    // Reset
    this.Reset = function () {
        // Reset flags
        this.flag.zero =
        this.flag.sub =
        this.flag.hcar =
        this.flag.car = false;

        this.lowpower = false;
        this.halted = false;

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
        this.writeByte (0xff40, 0x91); // LCDC

        // Disable bootrom
        this.writeByte (0xff50, 1);

        // console.log (this.ops.GetLogLine (this.pc));
    };

    // =============== //   Debugging //

    this.Memdump = function (mem) {
        mem = this.mem [mem];

        var str = '';
        for (var i = 0; i < mem.length; i ++) {
            if (i && i % 16 === 0)
                str += '\n';
            str += ('0' + mem [i].toString (16)).slice (-2) + ' ';
        }

        // Open popup
        var win = window.open("", "Title", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=400,height=400,top="+(screen.height/2)+",left="+(screen.width/2));
        win.document.body.innerHTML = '<pre>' + str + '</pre>';
    };

    this.Panic = function (err) {
        // Program cannot progress any further now
        this.hasRom = false;
        this.bootromAtm = false;

        // Stop everything
        nes.Stop ();

        alert (err);
        throw err;
    };

};