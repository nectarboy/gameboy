const Ppu = function (nes) {

    var ppu = this;

    var cpu = nes.cpu;
    var mem = cpu.mem;

    // =============== //   Basic Elements //

    this.vblanking = false;

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
        coin_irq: false,    // Bit 6
        mode2_irq: false,   // Bit 5
        mode1_irq: false,   // Bit 4
        mode0_irq: false,   // Bit 3

        // Flags
        coincidence: false, // Bit 2
        mode: 0,            // Bits 1 - 0

        // Flag setting methods
        SetCoincidence () {
            this.coincidence = true;
            mem.ioreg [0x41] |= (1 << 6); // Set bit 6
        },
        ClearCoincidence () {
            this.coincidence = false;
            mem.ioreg [0x41] &= ~(1 << 6); // Clear bit 6
        },

        WriteMode (mode) {
            this.mode = mode;

            // Write mode to bits 1 - 0
            mem.ioreg [0x41] &= 0b11111100; // Clear last 2 bits, ready for setting
            mem.ioreg [0x41] |= mode; // Write mode to last 2 bits
        }
    };

    this.lyc = 0;

    this.palshades = {
        0: 0,
        1: 0,
        2: 0,
        3: 0
    };

    this.drawing = false;

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

    // Reset
    this.Reset = function () {
        this.vblanking = false;
        this.drawing = false;

        // Reset scanline positions
        this.lx =
        this.ly =
        this.subty =

        this.scrollx =
        this.scrolly = 0;

        // Reset lcdc stat flags
        this.stat.coincidence = false;
        this.stat.mode = 0;
    };

    // What happens when the lcd is turned off
    this.TurnLcdOff = function () {
        this.vblanking = false;

        this.stat.WriteMode (0); // LCDC stat mode is 0
        this.ClearImg (); // Screen is blank
        this.drawing = false; // Video data is accessible now
    };

    this.TurnLcdOn = function () {
        // Ly starts from 0
        this.ly = 0;
        this.CheckCoincidence ();
        this.OnStatChange ();

        mem.ioreg [0x44] = 0;
    };

    // =============== //   Background Drawing //

    // Scanline positions
    this.lx = 
    this.ly = 0;

    // BG scroll positions
    this.scrollx =
    this.scrolly = 0;

    this.subty = 0; // Used to decide which row of tile to render

    // Scanlining
    this.DoScanline = function () {
        if (!this.lcdc.lcd_enabled)
            return;

        var shouldIrq = false;

        if (!this.vblanking) {

            if (!this.drawing) {
                this.stat.WriteMode (0);
                this.drawing = true;
            }

            // Prepare for a new scanline !!!
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

            // Check if should request mode 0 / 2 irq
            // shouldIrq = this.stat.mode0_irq || this.stat.mode2_irq;

        }
        // Finally ...

        // Check for stat interrupt
        /*var whatACoin = this.ly === this.lyc;
        if (whatACoin)
            this.stat.SetCoincidence ();
        else if (this.stat.coincidence)
            this.stat.ClearCoincidence ();

        // Check if should request coincidence irq
        !shouldIrq && (shouldIrq = whatACoin && this.stat.coin_irq);*/

        if (shouldIrq)
            cpu.iflag.SetLcdStat ();

        // Fin !
        // Advance to the next line
        this.AdvanceLine ();
        this.OnStatChange ();
    };

    this.CheckCoincidence = function () {
        // Check for coincidence
        var whatACoin = this.ly === this.lyc;
        if (whatACoin)
            this.stat.SetCoincidence ();
        else if (this.stat.coincidence)
            this.stat.ClearCoincidence ();
    };

    // Check if any stat irq conditions are met
    this.OnStatChange = function () {
        if (
            (this.stat.coin_irq && this.stat.coincidence)
            || this.stat.mode2_irq
            || this.stat.mode0_irq
        )
            cpu.iflag.SetLcdStat ();
    };

    // Advance line and update ly 
    this.AdvanceLine = function () {
        this.ly ++;

        // Vblank period ...
        if (this.vblanking) {
            if (this.drawing) {
                cpu.iflag.SetVblank (); // Set vblank
                this.stat.WriteMode (1); // Mode 1 (vblank)

                // Mode 1 (vblank) irq
                if (this.stat.mode1_irq)
                    cpu.iflag.SetLcdStat ();

                this.drawing = false;
            }

            // If vblank is over, reset ly
            if (this.ly === 154) {
                this.ly = 0;
                this.vblanking = false;
            }
        }
        else
            this.vblanking = this.ly === gbheight; // Check if vblanking

        this.CheckCoincidence ();

        mem.ioreg [0x44] = this.ly; // Set LY io reg
    };

    // DEBUG SCANLINE - draws tile data
    /*this.DebugScanline = function () {
        // When vblanking ...
        if (this.ly >= gbheight) {
            if (this.lcdc.lcd_enabled && this.ly === gbheight) {
                //cpu.iflag.SetVblank (); // Set vblank
            }

            return this.AdvanceLine ();
        }

        this.lx = 0;
        this.subty = this.ly & 7;

        // Draw tile data
        var bgdatastart = 0x8800 - (this.lcdc.signed_addressing * 0x800);

        this.lx = 0;
        while (this.lx < gbwidth) {
            var addr = bgdatastart + ((this.lx >> 3) * 16) + (this.subty * 2) + (this.ly >> 3) * 512;

            var lobyte = cpu.readByte (addr ++);
            var hibyte = cpu.readByte (addr);

            // var px = this.palshades [(data >> (((this.lx ^ 7) & 7) * 2)) & 3];

            var bitmask = 1 << ((this.lx ^ 7) & 7);
            var px = this.palshades [
                (((hibyte & bitmask) !== 0) << 1)
                | ((lobyte & bitmask) !== 0)
            ];
            this.PutPixel (this.lx, this.ly, px);

            this.lx ++;
        }

        // Advance line
        this.AdvanceLine ();

        // End
        // cpu.cycles += 456; // 114 * 4
    };*/

};