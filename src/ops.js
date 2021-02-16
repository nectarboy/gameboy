const Ops = function (cpu) {

    var ops = this;

    var flag = cpu.flag;

    var reg = cpu.reg;
    var getReg16 = cpu.getReg16;
    var writeReg16 = cpu.writeReg16;

    // =============== //   Basic Functions //

    // Carry and Half Carry //
    function checkHcar (a, b) {
        return ((a & 0xf) + (b & 0xf)) > 0xf;
    }
    function checkCar (sum) {
        return sum > 0xff;
    }

    function checkHcar16 (a, b) {
        return ((a & 0xfff) + (b & 0xfff)) > 0xfff;
    }
    function checkCar16 (sum) {
        return sum > 0xffff;
    }

    function checkSubCar (a, b) {
        return a < b;
    }
    function checkSubHcar (a, b) {
        return (a & 0xf) < (b & 0xf);
    }

    // Bit Operations //
    function testBit (n, b) {
        return (n & (1 << b)) ? true : false;
    }
    function clearBit (n, b) {
        return n & ~(1 << b);
    }
    function setBit (n, b) {
        return n | (1 << b);
    }

    // =============== //   GB Instructions //

    // Algorithmic Decoding
    var algreg = {
        0: 'b',
        1: 'c',
        2: 'd',
        3: 'e',
        4: 'h',
        5: 'l',
        7: 'a'
    };

    var algreg16 = {
        0: 'bc',
        1: 'de',
        2: 'hl',
        3: 'af'
    };

    // Instructions
    this.INS = {

        // ADC
        ADC_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];
            var val = r8 + flag.car; // + carry

            var sum = reg.a + val;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = ((reg.a & 0xf) + (r8 & 0xf) + flag.car) > 0xf;
            flag.car = checkCar (sum);

            reg.a = res;

            cpu.cycles += 4;
        },
        ADC_a_hl () {
            var byte = cpu.read16 (getReg16.hl ()); // Byte pointed by hl
            var val = byte + flag.car; // + carry

            var sum = reg.a + val;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = ((reg.a & 0xf) + (byte & 0xf) + flag.car) > 0xf;
            flag.car = checkCar (sum);

            reg.a = res;

            cpu.cycles += 8;
        },
        ADC_a_n8 () {
            var byte = ops.Fetch ();
            var val = byte + flag.car; // + carry

            var sum = reg.a + val;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = ((reg.a & 0xf) + (byte & 0xf) + flag.car) > 0xf;
            flag.car = checkCar (sum);

            reg.a = res;

            cpu.cycles += 8;
        },

        // ADD
        ADD_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];

            var sum = reg.a + r8;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = checkHcar (reg.a, r8);
            flag.car = checkCar (sum);

            reg.a = res;

            cpu.cycles += 4;
        },
        ADD_a_hl () {
            var byte = cpu.readByte (getReg16.hl ()); // Byte pointed to by hl

            var sum = reg.a + byte;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = checkHcar (reg.a, byte);
            flag.car = checkCar (sum);

            reg.a = res;

            cpu.cycles += 8;
        },
        ADD_a_n8 () {
            var byte = ops.Fetch ();

            var sum = reg.a + byte;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = checkHcar (reg.a, byte);
            flag.car = checkCar (sum);

            reg.a = res;

            cpu.cycles += 8;
        },

        ADD_hl_r16 (opcode) {
            var hl = getReg16.hl ();
            var r16 = getReg16 [algreg16 [(opcode >> 4) & 3]] ();

            var sum = hl + r16;
            flag.hcar = checkHcar16 (hl, r16);
            flag.car = checkCar16 (sum);

            writeReg16.hl (sum);

            flag.sub = false;

            cpu.cycles += 8;
        },

        ADD_hl_sp () {
            var hl = getReg16.hl ();
            var sp = cpu.sp;

            var sum = hl + sp;
            flag.hcar = checkHcar16 (hl, sp);
            flag.car = checkCar16 (sum);

            writeReg16.hl (sum);

            flag.sub = false;

            cpu.cycles += 8;
        },

        ADD_sp_e8 () {
            var e8 = ops.Fetch () << 24 >> 24;

            var sum = cpu.sp + e8;
            flag.hcar = checkHcar (cpu.sp, e8);
            flag.car = (sum & 0xff) < (cpu.sp & 0xff);

            cpu.writeSP (sum);

            flag.zero = flag.sub = false;

            cpu.cycles += 16;
        },

        // AND
        AND_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];

            var res = reg.a &= r8;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = true;
            flag.car = false;

            cpu.cycles += 4;
        },
        AND_a_hl () {
            var byte = cpu.readByte (getReg16.hl ());

            var res = reg.a &= byte;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = true;
            flag.car = false;

            cpu.cycles += 8;
        },
        AND_a_n8 () {
            var byte = ops.Fetch ();

            var res = reg.a &= byte;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = true;
            flag.car = false;

            cpu.cycles += 8;
        },

        // BIT
        BIT_u3_r8 (opcode) {
            var u3 = (opcode & 0b00111111) >> 3;
            var r8 = reg [algreg [opcode & 7]];

            flag.zero = !testBit (r8, u3);
            flag.sub = false;
            flag.hcar = true;

            cpu.cycles += 8;
        },
        BIT_u3_hl (opcode) {
            var u3 = (opcode & 0b00111111) >> 3;
            var byte = cpu.readByte (getReg16.hl ());

            flag.zero = !testBit (byte, u3);
            flag.sub = false;
            flag.hcar = true;

            cpu.cycles += 12;
        },

        // CALL
        CALL_n16 () {
            var addr = ops.Fetch16 ();

            cpu.pushSP (cpu.pc);
            cpu.pc = addr;

            cpu.cycles += 24;
        },
        CALL_cc_n16 (cc) {
            if (cc)
                return this.CALL_n16 ();

            cpu.pc = (cpu.pc + 2) & 0xffff; // Imaginary chunk fetch (a chunk is my word for 16 bit num !)
            cpu.cycles += 12;
        },

        // CCF
        CCF () {
            flag.sub = flag.hcar = false;
            flag.car = !flag.car;

            cpu.cycles += 4;
        },

        // CP
        CP_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];

            flag.hcar = checkSubHcar (reg.a, r8);
            flag.car = checkSubCar (reg.a, r8);

            var res = (reg.a - r8) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;

            cpu.cycles += 4;
        },
        CP_a_hl () {
            var byte = cpu.readByte (getReg16.hl ());

            flag.hcar = checkSubHcar (reg.a, byte);
            flag.car = checkSubCar (reg.a, byte);

            var res = (reg.a - byte) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;

            cpu.cycles += 8;
        },
        CP_a_n8 () {
            var byte = ops.Fetch ();

            var res = (reg.a - byte) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = checkSubHcar (reg.a, byte);
            flag.car = checkSubCar (reg.a, byte);

            cpu.cycles += 8;
        },

        // CPL
        CPL () {
            reg.a = reg.a ^ 0xff; // Invert bits

            flag.sub = flag.hcar = true;

            cpu.cycles += 4;
        },

        // DAA - WIP
        DAA () {
            // I copied all of this so shut up
            var corr = 0;

            var setCar = false;

            if (flag.car || (!flag.sub && (reg.a & 0xf) > 0x09))
                corr |= 0x6;

            if (flag.car || (!flag.sub && reg.a > 0x99)) {
                corr |= 0x60;
                setCar = true;
            }

            var res
                = (reg.a
                + flag.sub ? -corr : corr)
                & 0xff;
            
            flag.zero = res === 0; 
            flag.hcar = false;
            flag.car = setCar;

            reg.a = res;

            cpu.cycles += 4;
        },

        // DEC
        DEC_r8 (opcode) {
            var r8 = algreg [(opcode >> 3) & 7];

            var res = (reg [r8] - 1) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = (res & 0xf) === 0xf;

            reg [r8] = res;

            cpu.cycles += 4;
        },
        DEC_hl () {
            var hl = getReg16.hl ();
            var byte = cpu.readByte (hl);

            var res = (byte - 1) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = (res & 0xf) === 0xf;

            cpu.writeByte (hl, res);

            cpu.cycles += 12;
        },
        DEC_r16 (opcode) {
            var r16 = algreg16 [(opcode >> 4) & 3];
            writeReg16 [r16] (getReg16 [r16] () - 1);

            cpu.cycles += 8;
        },

        DEC_sp () {
            cpu.writeSP (cpu.sp - 1);
            cpu.cycles += 8;
        },

        // DE - EI
        DI () {
            cpu.ime = false;
            cpu.cycles += 4;
        },
        EI () {
            cpu.ime = true;
            cpu.cycles += 4;
        },

        // HALT - WIP
        HALT () {
            // ...
        },

        // INC
        INC_r8 (opcode) {
            var r8 = algreg [(opcode >> 3) & 7];

            var res = (reg [r8] + 1) & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = (res & 0xf) === 0;

            reg [r8] = res;

            cpu.cycles += 4;
        },
        INC_hl () {
            var hl = getReg16.hl ();
            var byte = cpu.readByte (hl);

            var res = (byte + 1) & 0xff;

            flag.zero = res === 0;
            flag.sub = false;
            flag.hcar = (res & 0xf) === 0;

            cpu.writeByte (hl, res);

            cpu.cycles += 12;
        },
        INC_r16 (opcode) {
            var r16 = algreg16 [(opcode >> 4) & 3];
            writeReg16 [r16] (getReg16 [r16] () + 1);

            cpu.cycles += 8;
        },
        INC_sp () {
            cpu.writeSP (cpu.sp + 1);
            cpu.cycles += 8;
        },

        // JP
        JP_n16 () {
            var addr = ops.Fetch16 ();
            cpu.pc = addr;

            cpu.cycles += 16;
        },
        JP_cc_n16 (cc) {
            if (cc)
                return this.JP_n16 ();

            cpu.pc = (cpu.pc + 2) & 0xffff; // Imaginary chunk fetch
            cpu.cycles += 12;
        },

        JP_hl () {
            cpu.pc = getReg16.hl ();
            cpu.cycles += 4;
        },

        // JR
        JR_e8 () {
            var e8 = ops.Fetch () << 24 >> 24; // Compliment byte
            cpu.pc = (cpu.pc + e8) & 0xffff;

            cpu.cycles += 12;
        },
        JR_cc_e8 (cc) {
            if (cc)
                return this.JR_e8 ();

            cpu.pc = (cpu.pc + 1) & 0xffff; // Imaginary fetch
            cpu.cycles += 8;
        },

        // LD
        LD_r8_r8 (opcode) {
            var rx = algreg [(opcode >> 3) & 7];
            var ry = algreg [opcode & 7];

            reg [rx] = reg [ry];

            cpu.cycles += 4;
        },
        LD_r8_n8 (opcode) {
            var r8 = algreg [(opcode >> 3) & 7];
            var byte = ops.Fetch ();

            reg [r8] = byte;

            cpu.cycles += 8;
        },

        LD_r16_n16 (opcode) {
            var r16 = algreg16 [(opcode >> 4) & 3];
            var chunk = ops.Fetch16 ();

            writeReg16 [r16] (chunk);

            cpu.cycles += 12;
        },

        LD_hl_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];
            var hl = getReg16.hl ();

            cpu.writeByte (hl, r8);

            cpu.cycles += 8;
        },
        LD_hl_n8 () {
            var hl = getReg16.hl ();
            var byte = ops.Fetch ();

            cpu.writeByte (hl, byte);

            cpu.cycles += 12;
        },

        LD_r8_hl (opcode) {
            var r8 =  algreg [(opcode >> 3) & 7];
            var hl = getReg16.hl ();

            reg [r8] = cpu.readByte (hl);

            cpu.cycles += 8;
        },

        LD_r16_a (opcode) {
            var r16 = getReg16 [algreg16 [(opcode >> 4) & 3]] ();
            cpu.writeByte (r16, reg.a);

            cpu.cycles += 8;
        },
        LD_n16_a () {
            var chunk = ops.Fetch16 ();
            cpu.writeByte (chunk, reg.a);

            cpu.cycles += 16;
        },

        // LDH
        LDH_n8_a () {
            var byte = ops.Fetch ();
            cpu.writeByte (0xff00 | byte, reg.a); // Write to ioreg at 0xff00 | byte

            cpu.cycles += 12;
        },
        LDH_c_a () {
            cpu.writeByte (0xff00 | reg.c, reg.a); // Write to ioreg at 0xff00 | byte

            cpu.cycles += 8;
        },
        LDH_a_n8 () {
            var byte = ops.Fetch ();
            reg.a = cpu.readByte (0xff00 | byte);

            cpu.cycles += 12;
        },
        LDH_a_c () {
            reg.a = cpu.readByte (0xff00 | reg.c);

            cpu.cycles += 8;
        },
        
        LD_a_r16 (opcode) {
            r16 = getReg16 [algreg16 [(opcode >> 4) & 3]] ();
            reg.a = cpu.readByte (r16);

            cpu.cycles += 8;
        },
        LD_a_n16 () {
            var chunk = ops.Fetch16 ();
            reg.a = cpu.readByte (chunk);

            cpu.cycles += 16;
        },

        // LD HLI - LD HLD
        LD_hli_a () {
            var hl = getReg16.hl ();

            cpu.writeByte (hl, reg.a);
            writeReg16.hl (hl + 1); // Inc hl

            cpu.cycles += 8;
        },
        LD_hld_a () {
            var hl = getReg16.hl ();

            cpu.writeByte (hl, reg.a);
            writeReg16.hl (hl - 1); // Dec hl

            cpu.cycles += 8;
        },

        LD_a_hli () {
            var hl = getReg16.hl ();

            reg.a = cpu.readByte (hl);
            writeReg16.hl (hl + 1); // Inc hl

            cpu.cycles += 8;
        },
        LD_a_hld () {
            var hl = getReg16.hl ();

            reg.a = cpu.readByte (hl);
            writeReg16.hl (hl - 1); // Dec hl

            cpu.cycles += 8;
        },

        // LD SP
        LD_sp_n16 () {
            var chunk = ops.Fetch16 ();
            cpu.writeSP (chunk);

            cpu.cycles += 12;
        },
        LD_n16_sp () {
            var chunk = ops.Fetch16 ();
            cpu.write16 (chunk, cpu.sp); // Write sp to address n16

            cpu.cycles += 20;
        },
        LD_hl_spe8 () {
            var hl = getReg16.hl ();
            var e8 = ops.Fetch () << 24 >> 24; // Compliment byte

            var sum = cpu.sp + e8;
            var res = writeReg16.hl (sum);

            flag.zero =
            flag.sub = false;
            flag.hcar = checkHcar (cpu.sp, e8);
            flag.car = (sum & 0xff) < (cpu.sp & 0xff);

            cpu.cycles += 12; // Phew .. !
        },
        LD_sp_hl () {
            cpu.writeSP (getReg16.hl ());
            cpu.cycles += 8;
        },

        // NOP
        NOP () {
            cpu.cycles += 4;
        },

        // OR
        OR_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]]

            var res = reg.a |= r8;

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.cycles += 4;
        },
        OR_a_hl () {
            var byte = cpu.readByte (getReg16.hl ());

            var res = reg.a |= byte;

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.cycles += 8;
        },
        OR_a_n8 () {
            var byte = ops.Fetch ();

            var res = reg.a |= byte;

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.cycles += 8;
        },

        // POP
        POP_af () {
            var chunk = cpu.popSP ();

            writeReg16.af (chunk & 0xfff0); // Remove unused bits from f

            // Set flags from reg f
            flag.zero   = testBit (reg.f, 7);
            flag.sub    = testBit (reg.f, 6);
            flag.hcar   = testBit (reg.f, 5);
            flag.car    = testBit (reg.f, 4);

            cpu.cycles += 12;
        },
        POP_r16 (opcode) {
            var r16 = algreg16 [(opcode >> 4) & 3];
            writeReg16 [r16] (cpu.popSP ());

            cpu.cycles += 12;
        },

        // PUSH
        PUSH_af () {
            // Mask flags into reg f
            var newf = (
                (flag.zero << 7) | (flag.sub << 6) | (flag.hcar << 5) | (flag.car << 4)
            );

            cpu.pushSP ((reg.a << 8) | newf); // Mask reg a and f into af

            cpu.cycles += 16;
        },
        PUSH_r16 (opcode) {
            var r16 = getReg16 [algreg16 [(opcode >> 4) & 3]] ();
            cpu.pushSP (r16);

            cpu.cycles += 16;
        },

        // RES
        RES_u3_r8 (opcode) {
            var u3 = (opcode & 0b00111111) >> 3;
            var r8 = algreg [opcode & 7];

            reg [r8] = clearBit (reg [r8], u3);

            cpu.cycles += 8;
        },
        RES_u3_hl (opcode) {
            var u3 = (opcode & 0b00111111) >> 3;
            var hl = getReg16.hl ();

            var byte = cpu.readByte (hl);
            cpu.writeByte (hl, clearBit (byte, u3));

            cpu.cycles += 16;
        },

        // RET
        RET () {
            cpu.pc = cpu.popSP ();
            cpu.cycles += 16;
        },
        RET_cc (cc) {
            if (cc) {
                this.RET ();
                cpu.cycles += 4;
            }
            else
                cpu.cycles += 8;
        },
        RETI () {
            cpu.ime = true;
            this.RET (); // 16 cycles
        },

        // RL
        RL_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = ((reg [r8] << 1) | flag.car) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 7);

            reg [r8] = res;

            cpu.cycles += 8;
        },
        RL_hl () {
            var hl = getReg16.hl ();

            var byte = cpu.readByte (hl);
            var res = ((byte << 1) | flag.car) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 7);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },
        RLA () {
            var res = ((reg.a << 1) | flag.car) & 0xff;

            flag.zero = 
            flag.sub =
            flag.hcar = false;
            flag.car = testBit (reg.a, 7);

            reg.a = res;

            cpu.cycles += 4;
        },

        // RLC
        RLC_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = ((reg [r8] << 1) | (reg [r8] >> 7)) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 7);

            reg [r8] = res;

            cpu.cycles += 8;
        },
        RLC_hl () {
            var hl = getReg16.hl ();

            var byte = cpu.readByte (hl);
            var res = ((byte << 1) | (byte >> 7)) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 7);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },
        RLCA () {
            var res = ((reg.a << 1) | (reg.a >> 7)) & 0xff;

            flag.zero = 
            flag.sub =
            flag.hcar = false;
            flag.car = testBit (reg.a, 7);

            reg.a = res;

            cpu.cycles += 4;
        },

        // RR
        RR_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = ((reg [r8] >> 1) | (flag.car << 7)) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 0);

            reg [r8] = res;

            cpu.cycles += 8;
        },
        RR_hl () {
            var hl = getReg16.hl ();

            var byte = cpu.readByte (hl);
            var res = ((byte >> 1) | (flag.car << 7)) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 0);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },
        RRA () {
            var res = ((reg.a >> 1) | (flag.car << 7)) & 0xff;

            flag.zero = 
            flag.sub =
            flag.hcar = false;
            flag.car = testBit (reg.a, 0);

            reg.a = res;

            cpu.cycles += 4;
        },

        // RRC
        RRC_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = ((reg [r8] >> 1) | (reg [r8] << 7)) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 0);

            reg [r8] = res;

            cpu.cycles += 8;
        },
        RRC_hl () {
            var hl = getReg16.hl ();

            var byte = cpu.readByte (hl);
            var res = ((byte >> 1) | (byte << 7)) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 0);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },
        RRCA () {
            var res = ((reg.a >> 1) | (reg.a << 7)) & 0xff;

            flag.zero = 
            flag.sub =
            flag.hcar = false;
            flag.car = testBit (reg.a, 0);

            reg.a = res;

            cpu.cycles += 4;
        },

        // RST
        RST_vec (vec) {
            cpu.pushSP (cpu.pc);
            cpu.pc = vec;

            cpu.cycles += 16;
        },

        // SBC
        SBC_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];
            var val = r8 + flag.car; // r8 + carry

            var sum = reg.a - val;
            var res = sum & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = (reg.a & 0xf) < ((r8 & 0xf) + flag.car);
            flag.car = checkSubCar (reg.a, val);

            reg.a = res;

            cpu.cycles += 4;
        },
        SBC_a_hl () {
            var byte = cpu.readByte (getReg16.hl ()); // HL's byte
            var val = byte + flag.car; // + carry

            var res = (reg.a - val) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = (reg.a & 0xf) < ((byte & 0xf) + flag.car);
            flag.car = checkSubCar (reg.a, val);

            reg.a = res;

            cpu.cycles += 8;
        },
        SBC_a_n8 () {
            var byte = ops.Fetch ();
            var val = byte + flag.car; // + carry

            var res = (reg.a - val) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = (reg.a & 0xf) < ((byte & 0xf) + flag.car);
            flag.car = checkSubCar (reg.a, val);

            reg.a = res;

            cpu.cycles += 8;
        },

        // SCF
        SCF () {
            flag.sub = flag.hcar = false;
            flag.car = true;

            cpu.cycles += 4;
        },

        // SET
        SET_u3_r8 (opcode) {
            var u3 = (opcode & 0b00111111) >> 3;
            var r8 = algreg [opcode & 7];

            reg [r8] = setBit (reg [r8], u3);

            cpu.cycles += 8;
        },
        SET_u3_hl (opcode) {
            var u3 = (opcode & 0b00111111) >> 3;
            var hl = getReg16.hl ();

            var byte = cpu.readByte (hl);
            cpu.writeByte (hl, setBit (byte, u3));

            cpu.cycles += 16;
        },

        // SLA
        SLA_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = (reg [r8] << 1) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 7);

            reg [r8] = res;

            cpu.cycles += 8;
        },
        SLA_hl () {
            var hl = getReg16.hl ();
            var byte = cpu.readByte (hl);

            var res = (byte << 1) & 0xff;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 7);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },

        // SRA
        SRA_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var bit = reg [r8] & (1 << 7);
            var res = (reg [r8] >> 1 | bit);

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 0);

            reg [r8] = res;

            cpu.cycles += 8;
        },
        SRA_hl () {
            var hl = getReg16.hl ();
            var byte = cpu.readByte (hl);

            var bit = byte & (1 << 7);
            var res = (byte >> 1 | bit);

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 0);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },

        // SRL
        SRL_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = reg [r8] >> 1;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (reg [r8], 0); 

            reg [r8] = res;

            cpu.cycles += 8;
        },
        SRL_hl () {
            var hl = getReg16.hl ();
            var byte = cpu.readByte (hl);

            var res = byte >> 1;

            flag.zero = res === 0;
            flag.sub = flag.hcar = false;
            flag.car = testBit (byte, 0);

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },

        // STOP - WIP
        STOP () {
            cpu.Panic ('Shitfuck uh ,, We came across a STOP instruction ..! PANIC AAAAA');

            // GBC behavior ig - this wont execute on DMG so nyah
            cpu.WriteByte (0xff04, 0); // Reset div
            cpu.pc = (cpu.pc + 1) & 0xffff; // Imaginary fetch 
        },

        // SUB
        SUB_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];

            flag.hcar = checkSubHcar (reg.a, r8);
            flag.car = checkSubCar (reg.a, r8);

            var res = (reg.a - r8) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;

            reg.a = res;

            cpu.cycles += 4;
        },
        SUB_a_hl () {
            var byte = cpu.readByte (getReg16.hl ());

            flag.hcar = checkSubHcar (reg.a, byte);
            flag.car = checkSubCar (reg.a, byte);

            var res = (reg.a - byte) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;

            reg.a = res;

            cpu.cycles += 8;
        },
        SUB_a_n8 () {
            var byte = ops.Fetch ();

            var res = (reg.a - byte) & 0xff;

            flag.zero = res === 0;
            flag.sub = true;
            flag.hcar = checkSubHcar (reg.a, byte);
            flag.car = checkSubCar (reg.a, byte);

            reg.a = res;

            cpu.cycles += 8;
        },

        // SWAP
        SWAP_r8 (opcode) {
            var r8 = algreg [opcode & 7];

            var res = ((reg [r8] << 4) | (reg [r8] >> 4)) & 0xff; // Swap bits

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            reg [r8] = res;

            cpu.cycles += 8;
        },
        SWAP_hl () {
            var hl = getReg16.hl ();
            var byte = cpu.readByte (hl);

            var res = ((byte << 4) | (byte >> 4)) & 0xff; // Swap bits

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.writeByte (hl, res);

            cpu.cycles += 16;
        },

        // XOR
        XOR_a_r8 (opcode) {
            var r8 = reg [algreg [opcode & 7]];

            var res = reg.a ^= r8;

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.cycles += 4;
        },
        XOR_a_hl () {
            var byte = cpu.readByte (getReg16.hl ());

            var res = reg.a ^= byte;

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.cycles += 8;
        },
        XOR_a_n8 () {
            var byte = ops.Fetch ();

            var res = reg.a ^= byte;

            flag.zero = res === 0;
            flag.sub =
            flag.hcar =
            flag.car = false;

            cpu.cycles += 8;
        }

    };

    // =============== //   Fetching and Decoding //

    this.Fetch = function () {
        var byte = cpu.readByte (cpu.pc);
        cpu.pc = (cpu.pc + 1) & 0xffff;

        return byte;
    };

    this.Fetch16 = function () {
        var chunk = cpu.read16 (cpu.pc);
        cpu.pc = (cpu.pc + 2) & 0xffff;

        return chunk;
    };

    this.Decode = function (op, pc) {
        var hi = op & 0xf0;
        var lo = op & 0x0f;

        switch (hi) {

            // 0x00 - 0x40
            case 0x00:
            case 0x10:
            case 0x20:
            case 0x30: {
                switch (lo) {

                    case 0x0: {
                        if (hi === 0x00)
                            return this.INS.NOP ();
                        if (hi === 0x10)
                            return this.INS.STOP ();
                        if (hi === 0x20)
                            return this.INS.JR_cc_e8 (!flag.zero);
                        if (hi === 0x30)
                            return this.INS.JR_cc_e8 (!flag.car);
                    }
                    case 0x1: {
                        // LD r16 n16
                        if (hi === 0x30)
                            return this.INS.LD_sp_n16 ();
                        return this.INS.LD_r16_n16 (op);
                    }
                    case 0x2: {
                        // LD HL+ / HL- A
                        if (hi === 0x20)
                            return this.INS.LD_hli_a ();
                        if (hi === 0x30)
                            return this.INS.LD_hld_a ();
                        // LD r16 a
                        return this.INS.LD_r16_a (op);
                    }
                    case 0x3: {
                        // INC SP
                        if (hi === 0x30)
                            return this.INS.INC_sp ();
                        // INC r16
                        return this.INS.INC_r16 (op);
                    }
                    case 0x4: {
                        // INC (HL)
                        if (hi === 0x30)
                            return this.INS.INC_hl ();
                        // INC r8
                        return this.INS.INC_r8 (op);
                    }
                    case 0x5: {
                        // DEC (HL)
                        if (hi === 0x30)
                            return this.INS.DEC_hl ();
                        // DEC r8
                        return this.INS.DEC_r8 (op);
                    }
                    case 0x6: {
                        // LD (HL) n8
                        if (hi === 0x30)
                            return this.INS.LD_hl_n8 ();
                        // LD r8 n8
                        return this.INS.LD_r8_n8 (op);
                    }
                    case 0x7: {
                        if (hi === 0x00)
                            return this.INS.RLCA ();
                        if (hi === 0x10)
                            return this.INS.RLA ();
                        if (hi === 0x20)
                            return this.INS.DAA ();
                        if (hi === 0x30)
                            return this.INS.SCF ();
                    }
                    case 0x08: {
                        if (hi === 0x00)
                            return this.INS.LD_n16_sp ();
                        if (hi === 0x10)
                            return this.INS.JR_e8 ();
                        if (hi === 0x20)
                            return this.INS.JR_cc_e8 (flag.zero);
                        if (hi === 0x30)
                            return this.INS.JR_cc_e8 (flag.car);
                    }
                    case 0x09: {
                        // ADD HL SP
                        if (hi === 0x30)
                            return this.INS.ADD_hl_sp ();
                        // ADD HL r16
                        return this.INS.ADD_hl_r16 (op);
                    }
                    case 0x0a: {
                        // LD A HL+ / HL-
                        if (hi === 0x30)
                            return this.INS.LD_a_hld ();
                        if (hi === 0x20)
                            return this.INS.LD_a_hli ();
                        // LD A r16
                        return this.INS.LD_a_r16 (op);
                    }
                    case 0x0b: {
                        // DEC SP
                        if (hi === 0x30)
                            return this.INS.DEC_sp ();
                        // DEC r16
                        return this.INS.DEC_r16 (op);
                    }
                    case 0x0c: {
                        // INC r8
                        return this.INS.INC_r8 (op);
                    }
                    case 0x0d: {
                        // DEC r8
                        return this.INS.DEC_r8 (op); 
                    }
                    case 0x0e: {
                        // LD r8 n8
                        return this.INS.LD_r8_n8 (op);
                    }
                    case 0x0f: {
                        if (hi === 0x00)
                            return this.INS.RRCA ();
                        if (hi === 0x10)
                            return this.INS.RRA ();
                        if (hi === 0x20)
                            return this.INS.CPL ();
                        if (hi === 0x30)
                            return this.INS.CCF ();
                    }

                }
                break;
            }

            // 0x40 - 0x80
            case 0x70: {
                // HALT
                if (lo === 6)
                    return this.INS.HALT ();
                // LD (HL) r8
                if (lo < 8)
                    return this.INS.LD_hl_r8 (op);
            }
            case 0x60:
            case 0x50:
            case 0x40: {
                // LD r8 (HL)
                if ((lo & 7) === 6)
                    return this.INS.LD_r8_hl (op);
                // LD r8 r8
                this.INS.LD_r8_r8 (op);
                break;
            }

            // 0x80 - 0xC0
            case 0x80: {
                var inhlop = (lo & 7) === 6;

                if (lo < 8)
                    inhlop ? this.INS.ADD_a_hl () : this.INS.ADD_a_r8 (op); // ADD
                else
                    inhlop ? this.INS.ADC_a_hl () : this.INS.ADC_a_r8 (op); // ADC
                break;
            }
            case 0x90: {
                var inhlop = (lo & 7) === 6;

                if (lo < 8)
                    inhlop ? this.INS.SUB_a_hl () : this.INS.SUB_a_r8 (op); // SUB
                else
                    inhlop ? this.INS.SBC_a_hl () : this.INS.SBC_a_r8 (op); // SBC
                break;
            }
            case 0xA0: {
                var inhlop = (lo & 7) === 6;

                if (lo < 8)
                    inhlop ? this.INS.AND_a_hl () : this.INS.AND_a_r8 (op); // AND
                else
                    inhlop ? this.INS.XOR_a_hl () : this.INS.XOR_a_r8 (op); // XOR
                break;
            }
            case 0xB0: {
                var inhlop = (lo & 7) === 6;

                if (lo < 8)
                    inhlop ? this.INS.OR_a_hl () : this.INS.OR_a_r8 (op); // OR
                else
                    inhlop ? this.INS.CP_a_hl () : this.INS.CP_a_r8 (op); // CP
                break;
            }

            // 0xC0 - 0xFF
            case 0xc0:
            case 0xd0:
            case 0xe0:
            case 0xf0: {

                switch (lo) {
                    case 0x0: {
                        if (hi === 0xc0)
                            return this.INS.RET_cc (!flag.zero);
                        if (hi === 0xd0)
                            return this.INS.RET_cc (!flag.car);
                        if (hi === 0xe0)
                            return this.INS.LDH_n8_a ();
                        if (hi === 0xf0)
                            return this.INS.LDH_a_n8 ();
                    }
                    case 0x1: {
                        // POP AF
                        if (hi === 0xf0)
                            return this.INS.POP_af ();
                        // POP r16
                        return this.INS.POP_r16 (op);
                    }
                    case 0x2: {
                        if (hi === 0xc0)
                            return this.INS.JP_cc_n16 (!flag.zero);
                        if (hi === 0xd0)
                            return this.INS.JP_cc_n16 (!flag.car);
                        if (hi === 0xe0)
                            return this.INS.LDH_c_a ();
                        if (hi === 0xf0)
                            return this.INS.LDH_a_c ();
                    }
                    case 0x3: {
                        // JP n16
                        if (hi === 0xc0)
                            return this.INS.JP_n16 ();
                        // DI
                        if (hi === 0xf0)
                            return this.INS.DI ();
                        // PANIC
                        return this.IllOp (op, pc);
                    }
                    case 0x4: {
                        // CALL NZ n16
                        if (hi === 0xc0)
                            return this.INS.CALL_cc_n16 (!flag.zero);
                        // CALL NC n16
                        if (hi === 0xd0)
                            return this.INS.CALL_cc_n16 (!flag.car);
                        // PANIC
                        return this.IllOp (op, pc);
                    }
                    case 0x5: {
                        // PUSH AF
                        if (hi === 0xf0)
                            return this.INS.PUSH_af ();
                        // PUSH r16
                        return this.INS.PUSH_r16 (op);
                    }
                    case 0x6: {
                        if (hi === 0xc0)
                            return this.INS.ADD_a_n8 ();
                        if (hi === 0xd0)
                            return this.INS.SUB_a_n8 ();
                        if (hi === 0xe0)
                            return this.INS.AND_a_n8 ();
                        if (hi === 0xf0)
                            return this.INS.OR_a_n8 ();
                    }
                    case 0x7: {
                        // RST vec
                        return this.INS.RST_vec (hi - 0xc0);
                    }
                    case 0x8: {
                        if (hi === 0xc0)
                            return this.INS.RET_cc (flag.zero);
                        if (hi === 0xd0)
                            return this.INS.RET_cc (flag.car);
                        if (hi === 0xe0)
                            return this.INS.ADD_sp_e8 ();
                        if (hi === 0xf0)
                            return this.INS.LD_hl_spe8 ();
                    }
                    case 0x9: {
                        if (hi === 0xc0)
                            return this.INS.RET ();
                        if (hi === 0xd0)
                            return this.INS.RETI ();
                        if (hi === 0xe0)
                            return this.INS.JP_hl ();
                        if (hi === 0xf0)
                            return this.INS.LD_sp_hl ();
                    }
                    case 0xa: {
                        if (hi === 0xc0)
                            return this.INS.JP_cc_n16 (flag.zero);
                        if (hi === 0xd0)
                            return this.INS.JP_cc_n16 (flag.car);
                        if (hi === 0xe0)
                            return this.INS.LD_n16_a ();
                        if (hi === 0xf0)
                            return this.INS.LD_a_n16 ();
                    }
                    case 0xb: {
                        // EI
                        if (hi === 0xf0)
                            return this.INS.EI ();
                        // PANIC
                        return this.IllOp (op, pc);
                    }
                    case 0xc: {
                        // CALL Z n16
                        if (hi === 0xc0)
                            return this.INS.CALL_cc_n16 (flag.zero);
                        // CALL C n16
                        if (hi === 0xd0)
                            return this.INS.CALL_cc_n16 (flag.car);
                        // PANIC
                        return this.IllOp (op, pc);
                    }
                    case 0xd: {
                        // CALL n16
                        if (hi === 0xc0)
                            return this.INS.CALL_n16 ();
                        // PANIC
                        return this.IllOp (op, pc);
                    }
                    case 0xe: {
                        if (hi === 0xc0)
                            return this.INS.ADC_a_n8 ();
                        if (hi === 0xd0)
                            return this.INS.SBC_a_n8 ();
                        if (hi === 0xe0)
                            return this.INS.XOR_a_n8 ();
                        if (hi === 0xf0)
                            return this.INS.CP_a_n8 ();
                    }
                    case 0xf: {
                        return this.INS.RST_vec (hi - 0xb8);
                    }
                }

                break;
            }

            default: {
                return this.InvOp (op, pc); // This rlly shouldnt happen ...
            }

        }
    };

    this.DecodeCB = function (op, pc) {
        var hicrumb = (op & 0b11000000) >> 6;

        function nohl () {
            return (op & 7) !== 6;
        }

        if (hicrumb === 0) {
            var opgrp = (op & 0b00111111) >> 3;
            switch (opgrp) {
                case 0: return nohl () ? this.INS.RLC_r8 (op) : this.INS.RLC_hl ();
                case 1: return nohl () ? this.INS.RRC_r8 (op) : this.INS.RRC_hl ();
                case 2: return nohl () ? this.INS.RL_r8 (op) : this.INS.RL_hl ();
                case 3: return nohl () ? this.INS.RR_r8 (op) : this.INS.RR_hl ();
                case 4: return nohl () ? this.INS.SLA_r8 (op) : this.INS.SLA_hl ();
                case 5: return nohl () ? this.INS.SRA_r8 (op) : this.INS.SRA_hl ();
                case 6: return nohl () ? this.INS.SWAP_r8 (op) : this.INS.SWAP_hl ();
                case 7: return nohl () ? this.INS.SRL_r8 (op) : this.INS.SRL_hl ();
            }
        }
        else if (hicrumb === 1) {
            nohl () ? this.INS.BIT_u3_r8 (op) : this.INS.BIT_u3_hl (op);
        }
        else if (hicrumb === 2) {
            nohl () ? this.INS.RES_u3_r8 (op) : this.INS.RES_u3_hl (op);
        }
        else if (hicrumb === 3) {
            nohl () ? this.INS.SET_u3_r8 (op) : this.INS.SET_u3_hl (op);
        }
        else {
            return this.InvOp (op, pc); // This rlly shouldnt happen ...
        }
    };

    /* TODO
     * rework it so on setup, it gets all possible
       opcodes from algorithmic decoding and maps it into an object
       so its faster :D
     * thats it ig DO YOUR STUDIES BRUH !!!
     */

    /*var biglog = '';
    var logcount = 0;
    var logmax = 47932; // Lines in peach's bootlog*/

    this.ExeIns = function () {
        // Logging
        /*biglog += this.GetLogLine (cpu.pc) + '\n';
        logcount ++;

        if (logcount === logmax) {
            var win = window.open("", "Title", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=500,top="+(screen.height/2)+",left="+(screen.width/2));
            win.document.body.innerHTML = '<pre>' + biglog + '</pre>';

            throw 'BRUH';
        }*/

        var opcode = this.Fetch ();

        // Prefixed
        if (opcode === 0xcb) {
            opcode = this.Fetch (); // Fetch once more
            this.DecodeCB (opcode, cpu.pc);
        }
        // Non-prefixed
        else {
            this.Decode (opcode, cpu.pc);
        }
    };

    // =============== //   Debugging //

    this.InvOp = function (opcode, pc) {
        cpu.Panic (
            'Crashed; INVOP !\n' + this.GetDebugMsg (opcode, pc)
        );
    };

    this.IllOp = function (opcode, pc) {
        cpu.Panic (
            'Crashed; ILLOP\n' + this.GetDebugMsg (opcode, pc)
        );
    };

    this.GetDebugMsg = function (opcode, pc) {
        return (
            'OP: ' + opcode.toString (16) + '\n' +
            'PC: ' + pc.toString (16)
        );
    };

    this.GetLogLine = function (pc) {
        var toHex = n => ('0' + n.toString (16)).slice (-2);
        var toHex16 = n => ('000' + n.toString (16)).slice (-4);

        return (
            'A: ' + toHex (reg.a) +
            ' F: ' + toHex ((flag.zero << 7) | (flag.sub << 6) | (flag.hcar << 5) | (flag.car << 4)) +
            ' B: ' + toHex (reg.b) +
            ' C: ' + toHex (reg.c) +
            ' D: ' + toHex (reg.d) +
            ' E: ' + toHex (reg.e) +
            ' H: ' + toHex (reg.h) +
            ' L: ' + toHex (reg.l) +

            ' SP: ' + toHex16 (cpu.sp) +
            ' PC: ' + '00:' + toHex16 (pc) + // '00' is a placeholder for rombank
            ' (' + toHex (cpu.readByte (pc)) + ')'
        );
    };

};