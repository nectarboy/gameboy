const Mem = function (nes, cpu) {

    var mem = this;

    // =============== //   Basic Functions //

    // =============== //   Memory Elements //

    // Bootrom - 0x0000 - 0x00ff
    // Credits to Optix ! https://github.com/Hacktix/Bootix
    // Or if its the default bootrom nintendo ig hehe
    this.bootrom = new Uint8Array ([49,254,255,175,33,255,159,50,203,124,32,251,33,38,255,14,17,62,128,50,226,12,62,243,226,50,62,119,119,62,252,224,71,17,4,1,33,16,128,26,205,149,0,205,150,0,19,123,254,52,32,243,17,216,0,6,8,26,19,34,35,5,32,249,62,25,234,16,153,33,47,153,14,12,61,40,8,50,13,32,249,46,15,24,243,103,62,100,87,224,66,62,145,224,64,4,30,2,14,12,240,68,254,144,32,250,13,32,247,29,32,242,14,19,36,124,30,131,254,98,40,6,30,193,254,100,32,6,123,226,12,62,135,226,240,66,144,224,66,21,32,210,5,32,79,22,32,24,203,79,6,4,197,203,17,23,193,203,17,23,5,32,245,34,35,34,35,201,206,237,102,102,204,13,0,11,3,115,0,131,0,12,0,13,0,8,17,31,136,137,0,14,220,204,110,230,221,221,217,153,187,187,103,99,110,14,236,204,221,220,153,159,187,185,51,62,60,66,185,165,185,165,66,60,33,4,1,17,168,0,26,19,190,32,254,35,125,254,52,32,245,6,25,120,134,35,5,32,251,134,32,254,62,1,224,80]);

    // Cartrom - 0x0000 - 0x8000 (last 0x4000 switchable)
    this.cartrom = new Uint8Array (0x8000);
    this.romName = '';

    // Video - 0x8000 - 0x9fff
    this.vram = new Uint8Array (0x2000); // 8KB of video ram

    // Cartram - 0xa000 - 0xbfff
    this.cartram = null; // variable amt of ram found in cart
    // Work ram - 0xc000 - 0xdfff
    this.wram = new Uint8Array (0x2000); // 8KB of ram to work with

    // (mirror memory of 0xc000) - 0xe000 - 0xfdff

    // OAM - 0xfe00 - 0xfe9f
    this.oam = new Uint8Array (0xa0);

    // (unusable memory) - 0xfea0 - 0xfeff

    // IO registers - 0xff00 - 0xff7f
    this.ioreg = new Uint8Array (0x80);

    // high ram - 0xff80 - 0xffff
    this.hram = new Uint8Array (0x80);

    // interrupt enable register - 0xffff
    this.iereg = 0;

    // =============== //   IO Registers //

    /* TODO
     * rework this so theres an object containing all mapped registers ?
     * make a function that does stuff on write, but its a switch statement 
     */

    this.ioonwrite = {
        // Joypad
        [0x00]: function (val) {
            nes.joypad.selectbutt = !(val & 0b00100000);
            nes.joypad.selectdpad = !(val & 0b00010000);
            
            nes.joypad.PollJoypad ();

            mem.ioreg [0x00] &= 0x0f; // Pressed bits are RO
            mem.ioreg [0x00] |= (val & 0xf0) | 0b11000000; // Top bits dont exist
        },

        // Serial Ports - used by test roms for output
        /*[0x01]: function (val) {
            mem.ioreg [0x01] = val;
            // console.log ('01: ' + val.toString (16));
        },
        [0x02]: function (val) {
            mem.ioreg [0x02] = val;
            // console.log ('02: ' + val.toString (16));
        },*/

        // Div timer - incs every 256 cycles
        [0x04]: function (val) {
            cpu.div = mem.ioreg [0x04] = 0; // Div is reset on write
        },
        // Tima timer - incs at a variable rate
        [0x05]: function (val) {
            cpu.tima = mem.ioreg [0x05] = val;
        },

        // Tima module
        [0x06]: function (val) {
            cpu.timamod = mem.ioreg [0x06] = val;
        },
        // TAC
        [0x07]: function (val) {
            // Input clock select
            var ii = val & 3;

            if (ii === 0) {
                cpu.timarate = 1024;
            }
            else {
                // 00   - 1024 cycles
                // 01   - 16 cycles
                // 10   - 64 cycles
                // 11   - 256 cycles
                cpu.timarate = 4 << (ii * 2);
            }

            cpu.timaenable = (val & 0b0100) ? true : false; // Bit 2

            mem.ioreg [0x07] // Set tac ioreg
                = val | 0b11111000; // Mask out unused bits
        },

        // IF
        [0x0f]: function (val) {
            // Set interrupt flags
            cpu.iflag.vblank      = (val & 0b00000001) ? true : false; // Bit 0
            cpu.iflag.lcd_stat    = (val & 0b00000010) ? true : false; // Bit 1
            cpu.iflag.timer       = (val & 0b00000100) ? true : false; // Bit 2
            cpu.iflag.serial      = (val & 0b00001000) ? true : false; // Bit 3
            cpu.iflag.joypad      = (val & 0b00010000) ? true : false; // Bit 4

            // Write to 0xff0f
            mem.ioreg [0x0f] = val | 0b11100000; // Unused bits always read 1
        },

        // ----- SQUARE CHANEL 1 ----- //
        // NR10 - sweep reg
        [0x10]: function (val) {
            nes.apu.chan1_sweep_time = (val & 0b01110000) >> 4;
            nes.apu.chan1_sweep_dec = (val & 0b1000) ? true : false;
            nes.apu.chan1_sweep_shift = (val & 0b0111) / 128;

            // Use this formula for sweep interval ! 8192 * (sweep/64)

            mem.ioreg [0x10] = val;
        },

        // NR11 - length and pattern duty
        [0x11]: function (val) {
            nes.apu.chan1_pattern_duty = (val & 0b11000000) >> 6;
            nes.apu.chan1_length_data = val & 0b00111111;

            mem.ioreg [0x11] = val | 0b00111111;
        },

        // NR12 - volume envelope
        [0x12]: function (val) {
            nes.apu.chan1_env_init = 
            nes.apu.chan1_env_vol = ((val & 0b11110000) >> 4) / 16;

            nes.apu.chan1_env_inc = (val & 0b1000) ? true : false;
            var sweep = nes.apu.chan1_env_sweep = val & 0b0111;

            nes.apu.chan1_env_interval = 512 * (sweep/64);
            nes.apu.chan1_env_on = sweep > 0;

            mem.ioreg [0x12] = val;
        },

        // NR13 - lower 8 bits of frequency
        [0x13]: function (val) {
            nes.apu.chan1_raw_freq &= 0x700; // Preserve top bits
            nes.apu.chan1_raw_freq |= val;
        },

        // NR14 - higher 3 bits of frequency
        [0x14]: function (val) {
            nes.apu.chan1_counter_select = (val & 0b01000000) ? true : false; 

            nes.apu.chan1_raw_freq &= 0xff; // Preserve bottom bits
            nes.apu.chan1_raw_freq |= (val & 0b0111) << 8;

            // Restart sound
            if (val & 0x80) {
                nes.apu.chan1_env_vol = nes.apu.chan1_env_init;
            }

            mem.ioreg [0x14] = val | 0b10111111;
        },

        // NR50 - i need this so pokemon blue dont freeze
        [0x24]: function (val) {
            mem.ioreg [0x24] = val;
        },

        // NR52 - Sound enable
        [0x26]: function (val) {
            nes.apu.soundOn = (val & 0x80) ? true : false;

            mem.ioreg [0x26] = val | 0b01111111;
        },

        // LCDC
        [0x40]: function (val) {
            var bits = [];
            var lcdc = nes.ppu.lcdc;

            for (var i = 0; i < 8; i ++) {
                bits [i] = (val & (1 << i)) ? true : false;
            }

            var lcdWasOn = lcdc.lcd_enabled;

            lcdc.bg_enabled             = bits [0];
            lcdc.sprites_enabled        = bits [1];
            lcdc.tall_sprites           = bits [2];
            lcdc.bg_tilemap_alt         = bits [3];
            lcdc.signed_addressing      = bits [4];
            lcdc.window_enabled         = bits [5];
            lcdc.window_tilemap_alt     = bits [6];
            lcdc.lcd_enabled            = bits [7];

            // Handle lcd enable changes
            if (lcdWasOn !== lcdc.lcd_enabled) {
                if (lcdc.lcd_enabled)
                    nes.ppu.TurnLcdOn ();
                else
                    nes.ppu.TurnLcdOff ();
            }

            mem.ioreg [0x40] = val;
        },

        // LCDC status
        [0x41]: function (val) {
            var ppu = nes.ppu;

            var preStat = mem.ioreg [0x41] & 0b01111000;

            ppu.stat.coin_irq_on   = (val & 0b01000000) ? true : false; // Bit 6
            ppu.stat.mode2_irq_on  = (val & 0b00100000) ? true : false; // Bit 5
            ppu.stat.mode1_irq_on  = (val & 0b00010000) ? true : false; // Bit 4
            ppu.stat.mode0_irq_on  = (val & 0b00001000) ? true : false; // Bit 3

            // Update stat signal on a change
            if ((val & 0b01111000) !== preStat)
                ppu.UpdateStatSignal ();

            // write to 0xff41
            mem.ioreg [0x41] &= 0b00000111; // Last 3 bits are RO
            mem.ioreg [0x41] |= (val & 0b11111000) | 0b10000000; // Top bit dont exist
        },

        // BG scroll y
        [0x42]: function (val) {
            nes.ppu.scrolly = mem.ioreg [0x42] = val;
        },
        // BG scroll x
        [0x43]: function (val) {
            nes.ppu.scrollx = mem.ioreg [0x43] = val;
        },

        // LY
        [0x44]: function (val) {
            // Read only ...
        },

        // LYC
        [0x45]: function (val) {
            nes.ppu.lyc = mem.ioreg [0x45] = val;
            nes.ppu.CheckCoincidence ();
            nes.ppu.UpdateStatSignal ();
        },

        // DMA transfer - TODO: add the proper timings ?? maybe
        [0x46]: function (val) {
            var dest = val << 8; // 0xXX00 - 0xXX9F

            for (var i = 0; i < 0xa0; i ++) {
                // Transfer data to vram
                var data = cpu.readByte (dest | i);
                cpu.writeByte (0xfe00 | i, data);
            }

            mem.ioreg [0x46] = val;

            //cpu.cycles += 160; // DMA takes 160 t cycles ??
        },

        // Pallete shades
        [0x47]: function (val) {
            var palshades = nes.ppu.palshades;

            for (var i = 0; i < 4; i ++) {
                // Get specific crumbs from val
                // A 'crumb' is a 2 bit number, i coined that :D
                palshades [i] = (val >> (i << 1)) & 3;
            }

            mem.ioreg [0x47] = val;
        },

        // Obj 0 - 1 shades
        [0x48]: function (val) {
            var objshades = nes.ppu.objshades [0];

            for (var i = 0; i < 4; i ++) {
                // Get specific crumbs from val
                // A 'crumb' is a 2 bit number, i coined that :D
                objshades [i] = (val >> (i << 1)) & 3;
            }

            mem.ioreg [0x48] = val;
        },
        [0x49]: function (val) {
            var objshades = nes.ppu.objshades [1];

            for (var i = 0; i < 4; i ++) {
                // Get specific crumbs from val
                // A 'crumb' is a 2 bit number, i coined that :D
                objshades [i] = (val >> (i << 1)) & 3;
            }

            mem.ioreg [0x49] = val;
        },

        // Window Y - Window X
        [0x4a]: function (val) {
            nes.ppu.wy = mem.ioreg [0x4a] = val;
        },
        [0x4b]: function (val) {
            nes.ppu.wx = val - 7; // 7px offset
            mem.ioreg [0x4b] = val;
        },

        // Disable bootrom
        [0x50]: function (val) {
            // If unmounted, set to read only !
            if (!cpu.bootromAtm)
                return;

            if (val & 1) {
                cpu.bootromAtm = false;
                console.log ('bootrom disabled.');
            }

            mem.ioreg [0x50] = val | 0b11111110; // Only 1 bit
        },
    };

    // =============== //   Basic Functions //

    this.Reset = function () {
        // Reset all memory pies to 0
        this.vram.fill (0);
        // this.wram.fill (0); // Turn this off for random ram emulation ig ?!?!
        // this.cartram.fill (0);
        this.oam.fill (0);
        this.ioreg.fill (0);
        this.hram.fill (0);
        cpu.ienable.Write (0);
        
        // Initialize unused bits in all io registers
        for (var i = 0; i < this.ioreg.length; i ++) {
            var ioonwrite = this.ioonwrite [i];
            if (ioonwrite && i !== 0x46) // Don't do a dma pls TwT
                ioonwrite (0);
        }

        // this.ioreg [0x44] = 144; // (Stub)

        // Reset mbc properties
        this.rombank = this.defaultRombank;
        this.rambank = this.defaultRambank;

        this.extrarombits = 0;
        this.rtcreg = 0;
    };

    // =============== //   Loading and Resetting //

    this.LoadRom = function (rom) {
        if (typeof rom !== 'object')
            throw 'this is not a rom !';

        rom = new Uint8Array (rom);

        this.GetRomProps (rom);

        // If no bads should have occured, we've loaded a rom !
        this.cartrom = rom;
        cpu.hasRom = true;
    };

    this.GetRomProps = function (rom) {
        // ---- ROM NAME ---- //
        this.romName = '';
        // Convert bytes to characters
        for (var i = 0x134; i < 0x13f; i ++) {
            this.romName += String.fromCharCode (rom [i]);
        }

        document.title = 'Pollen Boy: ' + this.romName;

        // ---- CGB MODE ---- //
        if (rom [0x143] === 0xc0)
            throw 'rom is gb color only :(';

        // ---- ROM SIZE ---- //
        var romSize = rom [0x148];

        // Dunno if these sizes are real ??
        if (romSize > 8) {
            if (romSize === 0x52) {
                this.maxrombanks = 72;
            }
            else if (romSize === 0x53) {
                this.maxrombanks = 80;
            }
            else if (romSize === 0x54) {
                this.maxrombanks = 96;
            }
            else
                throw `invalid rom banking ${romSize.toString (16)} !`;
        }
        // Official sizes B)
        else {
            this.maxrombanks = 2 << romSize;
        }

        // ---- RAM SIZE ---- //
        var ramSize = rom [0x149];

        if (ramSize > 0 && ramSize < 5) {
            this.maxrambanks = Math.floor ((1 << (ramSize * 2 - 1)) / 8); // idk how i even came up with dis
        }
        else {
            if (ramSize === 0x5)
                this.maxrambanks = 8;
            else if (ramSize === 0x0)
                this.maxrambanks = 0;
            else {
                throw `invalid ram banking ${ramSize.toString (16)} !`;
            }
        }

        this.cartram = new Uint8Array (this.maxrambanks * 0x2000);

        // ---- MBC TYPE ---- //
        this.defaultRombank =
        this.defaultRambank = 0;

        this.ramenabled = false;

        this.evenhasram = false;
        this.hastimer = false;
        this.hasbatterysave = false;

        this.hasrombanks =
        this.hasrambanks = false;

        switch (rom [0x147]) {
            // NO MBC
            case 0x9:
                this.hasbatterysave = true;
            case 0x8:
                this.evenhasram = true;
                this.ramenabled = true;
            case 0x0:
                this.mbc = 0;
                break;

            // MBC 1
            case 0x3:
                this.hasbatterysave = true;
            case 0x2:
                this.evenhasram = true;
            case 0x1:
                this.mbc = 1;
                this.defaultRombank = 1;
                this.defaultRambank = 0;
                break;

            // MBC 3 (with timer)
            case 0x10:
                this.evenhasram = true;
            case 0xf:
                this.hastimer = true;
                this.hasbatterysave = true;

                this.mbc = 3;
                this.defaultRombank = 1;
                this.defaultRambank = 0;
                break;

            // MBC 3 (no timer)
            case 0x13:
                this.hasbatterysave = true;
            case 0x12:
                this.evenhasram = true;
            case 0x11:
                this.mbc = 3;
                this.defaultRombank = 1;
                this.defaultRambank = 0;
                break;

            default:
                throw `unsupported rom mbc ${rom [0x147].toString (16)} !`;
        }
    };

    // Loading save data
    this.GetSramArray = function () {
        if (!this.evenhasram)
            throw 'no ram available !';
        if (!this.hasbatterysave)
            throw 'ram is not save data !';

        // Export save data
        var data = [];
        for (var i = 0; i < this.cartram.length; i ++)
            data [i] = this.cartram [i];

        return data;
    };
 
    // =============== //   MBC Controllers //

    // MBC properties
    this.mbc = 0;

    // Rom banks
    this.defaultRombank = 0
    this.defaultRambank = 0;

    this.rombank = 0;
    this.rambank = 0;
    this.rtcreg = 0;
    this.extrarombits = 0;

    // Other properties
    this.ramenabled = false;

    this.maxrombanks = 0; 
    this.maxrambanks = 0;

    this.hasrombanks = false;
    this.hasrambanks = false;

    // Stuff that comes with the cartridge
    this.evenhasram = false;
    this.hasbatterysave = false;
    this.hastimer = false;

    this.mbcRead = {
        // No MBC
        0: function (addr) {
            return mem.cartrom [addr];
        }
    };

    this.mbcRamRead = {
        // No MBC
        0: function (addr) {
            return mem.cartram [addr];
        }
    };

    this.mbcWrite = {
        // No MBC
        0: function (addr, val) {
            // u are a stinky poof
        }
    };

    this.mbcRamWrite = {
        // No MBC
        0: function (addr, val) {
            return mem.cartram [addr] = val;
        }
    };

    // =============== //   MBC 1 //

    // Reads
    this.mbcRead [1] = function (addr) {
        return mem.cartrom [
            (mem.rombank * 0x4000)
            + (addr & 0x3fff)
        ];
    };

    this.mbcRamRead [1] = function (addr) {
        if (mem.maxrambanks >= 4)
            return mem.cartram [
                (mem.rambank * 0x2000)
                + (addr & 0x1fff)
            ];
        else
            return mem.cartram [addr];
    };

    // Writes
    this.mbcWrite [1] = function (addr, val) {
        // EXTERNAL RAM ENABLE //
        if (addr < 0x2000) {
            mem.ramenabled = (val & 0xf) === 0xa ? true : false;
            return val;
        }
        // ROM BANK NUMBER //
        if (addr < 0x4000) {
            mem.rombank = val & 0b00011111; // Discard last 3 bits

            if (mem.maxrambanks < 4)
                mem.rombank |= mem.extrarombits << 5;

            mem.rombank += (
                mem.rombank === 0
                || mem.rombank === 0x20
                || mem.rombank === 0x40 
                || mem.rombank === 0x60
            );

            return val;
        }
        // RAM BANK NUMBER or EXTRA ROM BANK BITS //
        if (addr < 0x6000) {
            var crumb = val & 3;

            if (mem.maxrombanks >= 64)
                mem.extrarombits = crumb;

            mem.rambank = crumb;

            return val;
        }
    };

    this.mbcRamWrite [1] = function (addr, val) {
        if (mem.maxrambanks >= 4)
            mem.cartram [
                (mem.rambank * 0x2000)
                + (addr & 0x1fff)
            ] = val;
        else
            mem.cartram [addr] = val;

        return val;
    };

    // =============== //   MBC 3 //

    // Reads
    this.mbcRead [3] = function (addr) {
        return mem.cartrom [
            (mem.rombank * 0x4000)
            + (addr & 0x3fff)
        ];
    };

    this.mbcRamRead [3] = function (addr) {
        if (mem.maxrambanks >= 4)
            return mem.cartram [
                (mem.rambank * 0x2000)
                + (addr & 0x1fff)
            ];
        else
            return mem.cartram [addr];
    };

    // Writes
    this.mbcWrite [3] = function (addr, val) {
        // EXTRA RAM ENABLE //
        if (addr < 0x2000) {
            var bank = val & 0x0f;

            if (val === 0xa)
                mem.ramenabled = true;
            else if (val === 0)
                mem.ramenabled = false;

            return val;
        }

        // ROM BANK NUMBER //
        if (addr < 0x4000) {
            if (val > 0) {
                mem.rombank = val & 0b01111111; // Last bit is discarded
            }
            // We can't go to bank 0 bro !
            else
                mem.rombank = 1;

            return val;
        }

        // RAM BANK NUMBER or RTC REG SELECT //
        if (addr < 0x6000) {
            if (val < 0x4)
                mem.rambank = val;
            else if (val > 0x7 && val < 0xd)
                mem.rtcreg = val;

            return val;
        }

        // LATCH DATA CLOCK //
        if (addr < 0x8000) {
            // what

            return val;
        }

    };

    this.mbcRamWrite [3] = function (addr, val) {
        if (mem.maxrambanks >= 4)
            mem.cartram [
                (mem.rambank * 0x2000)
                + (addr & 0x1fff)
            ] = val;
        else
            mem.cartram [addr] = val;

        return val;
    };

};