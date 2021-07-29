const Ppu = function (nes) {

    const ppu = this;

    const cpu = nes.cpu;
    const mem = cpu.mem;

    // =============== //   Basic Elements //

    this.lcdc = {
        bg_enabled: false,
        sprites_enabled: false,
        tall_sprites: false,
        bg_tilemap_alt: false,
        signed_addressing: false,
        window_enabled: false,
        window_tilemap_alt: false,
        lcd_enabled: false
    };

    // LCDC status
    this.stat = {
        // Interrupt enables
        coin_irq_on: false,     // Bit 6
        mode2_irq_on: false,    // Bit 5
        mode1_irq_on: false,    // Bit 4
        mode0_irq_on: false,    // Bit 3

        // Flags
        coincidence: false,     // Bit 2
        mode: 0                 // Bits 1 - 0
    };

    // Flag setting methods
    this.SetCoincidence = function () {
        this.stat.coincidence = true;
        mem.ioreg [0x41] |= 0b0100; // Set bit 2
    };
    this.ClearCoincidence = function () {
        this.stat.coincidence = false;
        mem.ioreg [0x41] &= ~0b0100; // Clear bit 2
    };

    this.WriteMode = function (mode) {
        this.stat.mode = mode;
        this.UpdateStatSignal ();

        // Write mode to bits 1 - 0
        mem.ioreg [0x41] &= 0b11111100; // Clear last 2 bits, ready for setting
        mem.ioreg [0x41] |= mode; // Write mode to last 2 bits
    };

    // Palletes
    this.palshades = {
        0: 0,
        1: 0,
        2: 0,
        3: 0
    };

    this.objshades = {
        0: {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        },
        1: {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        },
    };

    // =============== //   Screen Elements //

    const gbwidth = 160; // 160
    const gbheight = 144; // 144

    this.pallete = {
        0: {
            r: 0xff, g: 0xff, b: 0xff // WHITE
        },
        1: {
            r: 0xaa, g: 0xaa, b: 0xaa // LITE GRAY
        },
        2: {
            r: 0x55, g: 0x55, b: 0x55 // DARK GRAY
        },
        3: {
            r: 0x00, g: 0x00, b: 0x00 // BLACK
        },

        length: 4
    };

    this.pxMap = new Uint8Array (gbwidth * gbheight); // Used to decide what pixel data was drawn

    // =============== //   Canvas Drawing //

    this.ctx = null;
    this.img = null;
    this.timeout = null;

    this.interval = 1000 / 59.7; // GB refresh rate

    this.ResetCtx = function (c) {
        this.ctx = nes.canvas.getContext ('2d');
        this.img = this.ctx.createImageData (gbwidth, gbheight);

        this.ctx.globalAlpha = nes.alphaBlend;

        this.ClearImg ();
    };

    this.PutPixel = function (x, y, color) {
        const ind = y * gbwidth + x;
        var pind = 4 * ind;

        const img = this.img.data;
        const pal = this.pallete [color];

        img [pind++] = pal.r;
        img [pind++] = pal.g;
        img [pind++] = pal.b;
        img [pind]   = 0xff; // Full opacity

        return ind; // Don't let it go to waste <3
    };

    this.RenderImg = function () {
        this.ctx.putImageData (this.img, 0, 0);
    };

    // This has image interpolation - like a real GB :D
    this.RenderImgSmooth = function () {
        const tmpCanvas = document.createElement ('canvas');
        tmpCtx = tmpCanvas.getContext ('2d');
        tmpCtx.putImageData (this.img, 0, 0);

        this.ctx.drawImage (tmpCanvas, 0, 0);
    };

    this.render_img_func = this.RenderImg;

    // Deprecated !
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

        this.wx =
        this.wy = 
        this.wilc = 0;
        this.winOnThisFrame = false;

        this.scrollx =
        this.scrolly = 0;

        // Reset lcdc stat flags
        this.ClearCoincidence ();
        this.WriteMode (0);

        // Clear display
        this.ClearImg ();
        this.RenderImg ();
    };

    // LCD enable methods
    this.TurnLcdOff = function () {
        this.ppuclocks = 0;
        this.statsignal = false;

        this.WriteMode (0); // When LCD disabled, stat mode is 0

        this.ClearImg (); // Clear screen on frontend
        this.RenderImg ();
    };

    this.TurnLcdOn = function () {
        // Reset LY (and WILC) to 0
        this.ly = 
        this.wilc = 0;
        this.winOnThisFrame = false;
        // Don't forget to check for dos concedenes =)
        this.CheckCoincidence ();
        
        this.WriteMode (2); // When LCD enabled again, mode 2
    };

    // =============== //   Scanlines //

    this.ppuclocks = 0;

    this.statsignal = false;

    // Mode length constants in t-cycles
    this.oamlength = 80;
    this.drawlength = 172;
    this.hblanklength = 204;
    this.scanlinelength = 456;

    // Actual cycles the PPU will use - set externally in cpu.js !
    this.ppu_oamlength = 0;
    this.ppu_drawlength = 0;
    this.ppu_hblanklength = 0;
    this.ppu_scanlinelength = 0;

    // =============== //   Sprites //

    class BlankSprite {
        constructor () {
            this.x =
            this.y = 
            this.tile = 0;

            // Flags
            this.yflip = 
            this.xflip = false;
            this.pallete = 0;
        };

        // Byte write methods
        '0' (val) {
            this.y = val;
        }
        '1' (val) {
            this.x = val;
        }
        '2' (val) {
            this.tile = val;
        }
        '3' (val) {
            this.behind     = (val & 0b10000000) ? true : false;
            this.yflip      = (val & 0b01000000) ? true : false;
            this.xflip      = (val & 0b00100000) ? true : false;
            this.pallete    = (val & 0b00010000) ? 1 : 0;
        }
    }

    this.spritePool = new Array (40); // An object pool with 40 blank sprites
    for (var i = 0; i < this.spritePool.length; i ++)
        this.spritePool [i] = new BlankSprite ();

    this.acceptedSprites = []; // The good boys which fit draw conditions go here :)
    this.maxSpritesScan = 10;

    this.SearchOam = function () {
        this.acceptedSprites.length = 0; // Clear buffer

        // Search sprite pool
        for (var i = 0; i < this.spritePool.length; i ++) {

            const sprite = this.spritePool [i];

            const ly = this.ly + 16;
            const spriteHeight = this.lcdc.tall_sprites ? 16 : 8;

            if (
                sprite.x > 0                    // X > 0
                && ly >= sprite.y               // LY + 16 >= Y
                && ly < sprite.y + spriteHeight // LY + 16 < Y + height

                // Push !...
                && this.acceptedSprites.push (sprite) === this.maxSpritesScan
            )
                break; // ... then cut off buffer !

        }

        // Sort by x coordinates
        this.acceptedSprites.sort ((a, b) => {
            // Make sure its stable
            if (b.x === a.x)
                return -1;
            return b.x - a.x;
        });
    };

    // The almighty scanline handler ...

    this.HandleScan = function (cycled) {
        // Do nothing if LCD is off
        if (!this.lcdc.lcd_enabled)
            return;

        this.ppuclocks += cycled;

        switch (this.stat.mode) {

            // ---- OAM MODE 2 ---- //
            case 2: {
                if (this.ppuclocks >= this.ppu_oamlength) {
                    // Mode 2 is over ...
                    this.WriteMode (3);
                    this.SearchOam ();

                    this.ppuclocks -= this.ppu_oamlength;
                }
            }
            // ---- DRAW MODE 3 ---- //
            case 3: {
                // ... we're just imaginary plotting pixels dodododooo

                if (this.ppuclocks >= this.ppu_drawlength) {
                    // Mode 3 is over ...
                    this.WriteMode (0);
                    this.RenderScan (); // Finally render on hblank :D

                    this.ppuclocks -= this.ppu_drawlength;
                }
            }
            // ---- H-BLANK MODE 0 ---- //
            case 0: {
                // We're relaxin here ...

                if (this.ppuclocks >= this.ppu_hblanklength) {
                    // Advance LY
                    this.ly ++;

                    this.CheckCoincidence ();
                    mem.ioreg [0x44] = this.ly;

                    // When entering vblank period ...
                    if (this.ly === gbheight) {
                        cpu.iflag.SetVblank (); // Request vblank irq !
                        this.WriteMode (1);

                        this.render_img_func.bind (this) (); // Draw picture ! (in v-sync uwu)
                    }
                    else
                        this.WriteMode (2); // Reset

                    this.ppuclocks -= this.ppu_hblanklength;
                }
            }
            // ---- V-BLANK MODE 1 ---- //
            case 1: {
                if (this.ppuclocks >= this.ppu_scanlinelength) {
                    // Advance LY
                    this.ly ++;

                    // Check if out of vblank period ..
                    if (this.ly === 154) {
                        this.ly = 0;
                        this.wilc = 0;
                        this.winOnThisFrame = false;

                        this.CheckCoincidence ();

                        this.WriteMode (2); // Reset
                    }
                    else {
                        this.CheckCoincidence ();
                        this.UpdateStatSignal ();
                    }

                    mem.ioreg [0x44] = this.ly;

                    this.ppuclocks -= this.ppu_scanlinelength;
                }
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
        const presignal = this.statsignal;

        this.statsignal = 
            (this.stat.coin_irq_on && this.stat.coincidence)
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

    this.wx = 0;
    this.wy = 0;

    this.wilc = 0; // Window internal line counter
    this.winOnThisFrame = false;

    // BG scroll positions
    this.scrollx = 0;
    this.scrolly = 0;

    this.RenderScan = function () {
        // Ready up some stuff
        this.lx = 0;

        var x = this.scrollx;
        var wx = 0;

        const y = (this.ly + this.scrolly) & 0xff;
        const sub_ly = y & 7;
        const sub_wy = (this.wilc & 7) << 1; // (wilc % 8 * 2) 2 bits per pixel

        // Calculate tile data and map bases
        const tiledatabase = this.lcdc.signed_addressing ? 0x0000 : 0x1000; // 0x8000 - 0x9000
        // We don't actually use the correct values, cuz we're doing direct vram access :3

        const bgmapbase = this.lcdc.bg_tilemap_alt ? 0x9c00 : 0x9800;
        const winmapbase = this.lcdc.window_tilemap_alt ? 0x9c00 : 0x9800;

        const mapindy = bgmapbase + (y >> 3) * 32; // (y / 8 * 32) Beginning of background tile map
        const winindy = winmapbase + ((this.wilc >> 3) * 32) - 0x8000; // Vram access fix

        !this.winOnThisFrame && (this.winOnThisFrame = this.ly === this.wy);
        const inWindowRn = (this.lcdc.window_enabled && this.winOnThisFrame && this.wx < gbwidth);

        while (this.lx < gbwidth) {
            // ----- WINDOW ----- //
            if (inWindowRn && this.lx >= this.wx) {

                const mapind = winindy + (wx >> 3); // (x / 8) Background tile map
                var patind = mem.vram [mapind];     // Get tile index at map

                // Calculate tile data address
                if (!this.lcdc.signed_addressing)
                    patind = patind << 24 >> 24;    // Complement tile index in 0x8800 mode

                var addr =
                    tiledatabase + (patind << 4)    // (tile index * 16) Each tile is 16 bytes
                    + (sub_wy);                     // (sub_ly * 2) Each line of a tile is 2 bytes

                // Get tile line data
                const lobyte = mem.vram [addr ++];
                const hibyte = mem.vram [addr];

                // Mix and draw current tile line pixel
                const bitmask = 1 << ((wx ^ 7) & 7);
                const nib =
                    ((hibyte & bitmask) ? 2 : 0)
                    | ((lobyte & bitmask) ? 1 : 0);

                const pxind = this.PutPixel (this.lx, this.ly, this.palshades [nib]);
                this.pxMap [pxind] = nib;

                wx ++;

            }

            // ----- BACKGROUND ----- //
            else if (this.lcdc.bg_enabled) {

                const mapind = mapindy + (x >> 3);          // (x / 8) Background tile map
                var patind = mem.vram [mapind - 0x8000];    // Get tile index at map

                // Calculate tile data address
                if (!this.lcdc.signed_addressing)
                    patind = patind << 24 >> 24;    // Complement tile index in 0x8800 mode

                var addr =
                    tiledatabase + (patind << 4)    // (tile index * 16) Each tile is 16 bytes
                    + (sub_ly << 1);                // (sub_ly * 2) Each line of a tile is 2 bytes

                // Get tile line data
                const lobyte = mem.vram [addr ++];
                const hibyte = mem.vram [addr];

                // Mix and draw current tile line pixel
                const bitmask = 1 << ((x ^ 7) & 7);
                const nib =
                    ((hibyte & bitmask) ? 2 : 0)
                    | ((lobyte & bitmask) ? 1 : 0);

                const pxind = this.PutPixel (this.lx, this.ly, this.palshades [nib]);
                this.pxMap [pxind] = nib;

                x ++;
                x &= 0xff;

            }
            else {
                var pxind = this.PutPixel (this.lx, this.ly, 0);
                this.pxMap [pxind] = 0;
            }

            // Next !
            this.lx ++;
        }

        // For every scan we draw a window, inc WILC
        this.wilc += inWindowRn;

        // ----- SPRITES ----- //
        if (this.lcdc.sprites_enabled) {

            for (var i = 0; i < this.acceptedSprites.length; i ++) {
                var sprite = this.acceptedSprites [i];

                var row = this.ly + 16 - sprite.y;

                var realY = sprite.y - 16 + row;
                var realX = sprite.x - 8;

                // Don't draw offscreen sprites
                if (realY >= gbheight)
                    continue;

                var tile = sprite.tile;
                var height = 7;

                // If dubby sprites on set tall tile lsb to 0
                if (this.lcdc.tall_sprites) {
                    tile &= 0xfe;
                    height = 15;
                }

                // Calculate address
                var addr =
                    (tile << 4)
                    
                    // (sprite row * 2) we account for yflip as well
                    + (sprite.yflip
                        ? ((row ^ height) & height) << 1
                        : row << 1);

                var pxind_y = realY * gbwidth;

                // Get tile data
                var lobyte = mem.vram [addr ++];
                var hibyte = mem.vram [addr]

                // Mix and draw all 8 pixels
                for (var ii = 0; ii < 8; ii ++) {
                    // Check for horizontal flip
                    var bitmask = sprite.xflip
                        ? 1 << (ii & 7)
                        : 1 << ((ii ^ 7) & 7);

                    // Get pixel data
                    var nib =
                        ((hibyte & bitmask) ? 2 : 0)
                        | ((lobyte & bitmask) ? 1 : 0);

                    var sx = realX + ii;
                    if (
                        !nib // pixels are transparent

                        // Don't draw offscreen pixels
                        || sx >= gbwidth
                        || sx < 0

                        // BG priority thingy
                        || (sprite.behind && this.pxMap [pxind_y + sx])
                    )
                        continue;

                    // Mix and draw !
                    var px = this.objshades [sprite.pallete] [nib];
                    this.PutPixel (sx, realY, px);
                }
                // Next sprite pls !
            }

        }

        // Fin !
    };

};