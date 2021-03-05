    this.GetRomProps = function (rom) {
        // Rom name //
        this.romname = '';
        for (var i = 0x134; i < 0x13f; i ++) {
            this.romname += String.fromCharCode (rom [i]);
        }
        document.title = 'Pollen Boy: ' + this.romname;

        // GBC only mode //
        if (rom [0x143] === 0xc0)
            this.Error ('rom works only on gameboy color !');

        // Check MBC //
        switch (rom [0x147]) {
            // No MBC + ram
            case 0x8:
            case 0x9: {
                this.ramenabled = true;
            }
            // No MBC
            case 0x0: {
                this.mbc = 0;
                break;
            }

            // MBC 1 + ram
            case 0x3:
            case 0x2: {
                this.ramenabled = true;
            }
            // MBC 1
            case 0x1: {
                this.mbc = 1;
                break;
            }

            // MBC 2
            case 0x6:
            case 0x5: {
                this.mbc = 2;
                break;
            }

            // MBC 3 + ram
            case 0x13:
            case 0x12:
            case 0x10: {
                this.ramenabled = true;
            }
            // MBC 3
            case 0x11:
            case 0xf: {
                this.mbc = 3;
                break;
            }

            // MBC 5 + ram
            case 0x1e:
            case 0x1d:
            case 0x1b:
            case 0x1a: {
                this.ramenabled = true;
            }
            // MBC 5
            case 0x1c:
            case 0x19: {
                this.mbc = 5;
                break;
            }

            default: {
                this.Error ('unknown rom type !');
            }
        }

        // Max rom banks
        var romsize = rom [0x148];

        if (romsize > 8) {
            if (romsize === 0x54)
                this.maxrombanks = 96;
            else if (this.romsize === 0x53)
                this.maxrombanks = 80;
            else if (this.romsize === 0x52)
                this.maxrombanks = 72;
            else
                this.Error ('invalid rom size !');
        }
        else {
            this.rombanks = 2 << romsize;
        }

        // Max ram banks
        var ramsize = rom [0x149];

        if (ramsize > 0 && ramsize < 5) {
            this.maxrambanks = Math.floor ((1 << (ramsize * 2 - 1)) / 8); // ba3ref hal formula araf skot
        }
        else {
            if (ramsize === 0x5)
                this.maxrambanks = 8;
            else if (ramsize === 0x0)
                this.maxrambanks = 0;
            else
                this.Error ('invalid ram size !');
        }
    };