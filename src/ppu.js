const Ppu = function (nes) {

    var ppu = this;

    var cpu = nes.cpu;
    var mem = cpu.mem;

    // =============== //   Basic Elements //

    this.lcdc = {
        bg_priority: false,
        sprite_enabled: false,
        sprite_size: false,
        bg_tilemap_alt: false,
        signed_addressing: false,
        window_enabled: false,
        window_tilemap_alt: false,
        lcd_enabled: false
    };

    // LCDC status
    this.stat = {
        // Interrupt enables
        coin_irq_on: false,    // Bit 6
        mode2_irq_on: false,   // Bit 5
        mode1_irq_on: false,   // Bit 4
        mode0_irq_on: false,   // Bit 3

        // Flags
        coincidence: false, // Bit 2
        mode: 0            // Bits 1 - 0
    };

    // Flag setting methods
    this.SetCoincidence = function () {
        this.stat.shouldCoinIrq = this.stat.coin_irq_on;
        mem.ioreg [0x41] |= 0b00000100; // Set bit 6
    },
    this.ClearCoincidence = function () {
        this.stat.shouldCoinIrq = false;
        mem.ioreg [0x41] &= ~0b00000100; // Clear bit 6
    },

    this.WriteMode = function (mode) {
        this.stat.mode = mode;
        this.UpdateStatSignal ();

        // Write mode to bits 1 - 0
        mem.ioreg [0x41] &= 0b11111100; // Clear last 2 bits, ready for setting
        mem.ioreg [0x41] |= mode; // Write mode to last 2 bits
    }

    this.palshades = {
        0: 0,
        1: 0,
        2: 0,
        3: 0
    };

    // =============== //   Screen Elements //

    var gbwidth = 160; // 160
    var gbheight = 144; // 144

    this.pallete = {
        0: {
            r: 0xde, g: 0xc6, b: 0x9c // WHITE
        },
        1: {
            r: 0xa5, g: 0x5a, b: 0xff // LITE GRAY
        },
        2: {
            r: 0x94, g: 0x29, b: 0x94 // DARK GRAY
        },
        3: {
            r: 0x00, g: 0x39, b: 0x73 // BLACK
        }
    };

    // =============== //   Canvas Drawing //

    this.ctx = null;
    this.img = null;
    this.timeout = null;

    this.interval = 1000 / 59.7; // GB refresh rate

    this.ResetCtx = function (c) {
        this.ctx = nes.canvas.getContext ('2d');
        this.img = this.ctx.createImageData (gbwidth, gbheight);

        this.ClearImg ();
    };

    this.PutPixel = function (x, y, color) {
        var ind = (y * gbwidth + x) * 4;

        var img = this.img.data;
        var pal = this.pallete [color];

        img [ind] = pal.r;
        img [ind + 1] = pal.g;
        img [ind + 2] = pal.b;
        img [ind + 3] = 0xff; // Full opacity
    };

    this.RenderImg = function () {
        this.ctx.putImageData (this.img, 0, 0);
    };

    this.RenderLoop = function () {
        this.RenderImg ();

        // Handle callback
        setTimeout (() => {
            this.timeout = requestAnimationFrame (() => {
                ppu.RenderLoop ();
            });
        }, this.interval);
    };

    this.StopRendering = function () {
        cancelAnimationFrame (this.timeout);
    };

    this.ClearImg = function () {
        for (var x = 0; x < gbwidth; x ++)
            for (var y = 0; y < gbheight; y ++)
                this.PutPixel (x, y, 0);
    };

    // =============== //   Basic Functions //

    this.Reset = function () {
        this.ppuclocks = 0;
        this.statsignal = false;

        // Reset scanline positions
        this.lx =
        this.ly =
        this.subty =

        this.scrollx =
        this.scrolly = 0;

        // Reset lcdc stat flags
        this.ClearCoincidence ();
        this.WriteMode (0);
    };

    // LCD enable methods
    this.TurnLcdOff = function () {
        this.ppuclocks = 0;
        this.statsignal = false;

        this.WriteMode (0); // When LCD disabled, stat mode is 0
        this.ClearImg (); // Clear screen on frontend
    };

    this.TurnLcdOn = function () {
        // Reset LY to 0
        this.ly = 0;
        // Don't forget to check for dos concedenes =)
        this.CheckCoincidence ();
        
        this.WriteMode (2); // When LCD enabled again, mode 2
    };

    // =============== //   Scanlines //

    this.ppuclocks = 0;

    this.statsignal = false;

    // Mode lengths in t-cycles
    this.oamlength = 80;
    this.drawlength = 172;
    this.hblanklength = 204;
    this.scanlinelength = 456;

    // The almighty scanline handler ...

    this.HandleScan = function (cycled) {
        // Do nothing if LCD is off
        if (!this.lcdc.lcd_enabled)
            return;

        this.ppuclocks += cycled;

        var prestat = this.statsignal; // Pre-statsignal
        var curr_mode = this.stat.mode;

        // ---- OAM MODE 2 ---- //
        if (curr_mode === 2) {

            if (this.ppuclocks >= this.oamlength) {
                // Mode 2 is over ...
                this.WriteMode (3);

                this.ppuclocks -= this.oamlength;
            }

        }
        // ---- DRAW MODE 3 ---- //
        else if (curr_mode === 3) {

            // ... we're just imaginary plotting pixels dodododooo

            if (this.ppuclocks >= this.drawlength) {
                // Mode 3 is over ...
                this.WriteMode (0);
                this.RenderScan (); // Finally render on hblank :D

                this.ppuclocks -= this.drawlength;
            }

        }
        // ---- H-BLANK MODE 0 ---- //
        else if (curr_mode === 0) {

            // We're relaxin here ...

            if (this.ppuclocks >= this.hblanklength) {
                // Advance LY
                this.ly ++;

                this.CheckCoincidence ();
                mem.ioreg [0x44] = this.ly;

                // When entering vblank period ...
                if (this.ly === gbheight) {
                    this.RenderImg (); // Draw picture ! (in v-sync uwu)
                    cpu.iflag.SetVblank (); // Request vblank irq !

                    this.WriteMode (1);
                }
                else
                    this.WriteMode (2); // Reset

                this.ppuclocks -= this.hblanklength;
            }

        }
        // ---- V-BLANK MODE 1 ---- //
        else if (curr_mode === 1) {

            if (this.ppuclocks >= this.scanlinelength) {
                // Advance LY
                this.ly ++;

                // Check if out of vblank period ..
                if (this.ly === 154) {
                    this.ly = 0;
                    this.CheckCoincidence ();

                    this.WriteMode (2); // Reset
                }
                else {
                    this.CheckCoincidence ();
                    this.UpdateStatSignal ();
                }

                mem.ioreg [0x44] = this.ly;

                this.ppuclocks -= this.scanlinelength;
            }

        }
    };

    // Coincidence check function
    this.lyc = 0;
    this.CheckCoincidence = function () {
        // Yes !
        if (this.ly === this.lyc)
            this.SetCoincidence ();
        // No !
        else
            this.ClearCoincidence ();
    }

    // Update signal state
    this.UpdateStatSignal = function () {
        var presignal = this.statsignal;

        this.statsignal = 
            this.stat.shouldCoinIrq
            || (this.stat.mode2_irq_on && this.stat.mode === 2)
            || (this.stat.mode0_irq_on && this.stat.mode === 0)
            || (this.stat.mode1_irq_on && this.stat.mode === 1)

        if (!presignal && this.statsignal)
            cpu.iflag.SetLcdStat ();
    };

    // =============== //   Background Drawing //

    // Scanline positions
    this.lx = 
    this.ly = 0;

    // BG scroll positions
    this.scrollx =
    this.scrolly = 0;

    this.subty = 0; // Used to decide which row of tile to render

    this.RenderScan = function () {
        this.lx = 0;

        var x = (this.lx + this.scrollx) & 0xff;
        var y = (this.ly + this.scrolly) & 0xff;

        this.subty = y & 7;

        // Calculate tile data base
        var tiledatabase = 0x9000 - (this.lcdc.signed_addressing * 0x1000);

        // Calculate background map base
        var bgmapbase = 0x9800 + (this.lcdc.bg_tilemap_alt * 0x400);

        var mapindy = bgmapbase + (y >> 3) * 32; // (y / 8 * 32) Beginning of background tile map

        while (this.lx < gbwidth) {
            var mapind = mapindy + (x >> 3); // (x / 8) Background tile map
            var patind = cpu.readByte (mapind); // Get tile index at map

            // Calculate tile data address

            if (!this.lcdc.signed_addressing)
                patind = patind << 24 >> 24; // Complement tile index in 0x8800 mode

            var addr =
                tiledatabase + (patind << 4) // (tile index * 16) Each tile is 16 bytes
                + (this.subty << 1); // (subty * 2) Each line of a tile is 2 bytes

            // Get tile line data
            var lobyte = cpu.readByte (addr ++);
            var hibyte = cpu.readByte (addr);

            // Mix and draw current tile line pixel
            var bitmask = 1 << ((x ^ 7) & 7);
            var px = this.palshades [
                ((hibyte & bitmask) ? 2 : 0)
                | ((lobyte & bitmask) ? 1 : 0)
            ];
            this.PutPixel (this.lx, this.ly, px);

            // Fin !
            this.lx ++;
            x ++;
            x &= 0xff;
        }
    };

};