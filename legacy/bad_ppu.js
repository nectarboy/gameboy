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
        // Reset drawing state
        this.vblanking = 
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

    // LCD enable methods
    this.TurnLcdOff = function () {
        this.vblank =
        this.drawing = false;

        this.stat.WriteMode (0); // When LCD disabled, stat mode is 0
        this.ClearImg (); // Clear screen on frontend
    };

    this.TurnLcdOn = function () {
        // Reset LY to 0
        this.ly = 0;
        // Don't forget to check for dos concedenes =)
        this.CheckCoincidence ();
        //this.CheckCoinIrq ();
        
        this.stat.WriteMode (2); // When LCD enabled again, mode 2
    };

    // =============== //   Scanlines //

    // Scanline positions
    this.lx = 
    this.ly = 0;

    // LY methods
    this.WriteLY = function () {
        this.ly ++;
    };

    this.AdvanceLY = function () {
        // Increment LY
        this.ly ++;

        // The vblank period !
        if (this.vblanking) {
            // On the first line of vblank ...
            if (this.drawing) {
                cpu.iflag.SetVblank (); // Request Vblank

                // Check to request mode1 irq
                this.stat.WriteMode (1);
                if (this.stat.mode1_irq_on)
                    cpu.iflag.SetLcdStat ();

                this.drawing = false; // Video mem is available once more
            }

            // If LY hits 154, reset back to 0
            if (this.ly === 154) {
                this.ly = 0;
                this.vblanking = false;
            }
        }
        else
            this.vblanking = this.ly === gbheight;

        // Check for a coincidence
        this.CheckCoincidence ();
        this.CheckCoinIrq ();

        mem.ioreg [0x44] = this.ly;
    };

    // Scanline function !
    this.DoScanline = function () {
        // Do nothing if LCD is off
        if (!this.lcdc.lcd_enabled)
            return;

        // When we're actually scanlining
        if (!this.vblanking) {
            // On the first line ...
            if (!this.drawing) {
                this.stat.WriteMode (0);
                this.drawing = true;
            }

            this.DrawBG ();
            this.CheckModeIrq ();
        }

        this.AdvanceLY ();
    };

    // STAT interrupt methods
    this.lyc = 0;

    this.CheckCoincidence = function () {
        if (this.ly === this.lyc)
            this.stat.SetCoincidence ();
        else if (this.stat.coincidence)
            this.stat.ClearCoincidence ();
    };

    this.CheckCoinIrq = function () {
        if (this.stat.coin_irq_on && this.stat.mode)
            cpu.iflag.SetLcdStat ();
    };

    this.CheckModeIrq = function () {
        if (
            this.stat.mode0_irq_on || this.stat.mode2_irq_on
        )
            cpu.iflag.SetLcdStat ();
    };

    // =============== //   Background Drawing //

    // BG scroll positions
    this.vblanking = 
    this.drawing = false;

    this.scrollx =
    this.scrolly = 0;

    this.subty = 0; // Used to decide which row of tile to render

    this.DrawBG = function () {
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