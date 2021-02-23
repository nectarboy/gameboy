	this.Decode = function (op, pc) {
		var hi = op & 0xf0;
		var lo = op & 0x0f;

		switch (hi) {

			// 0x00 - 0x40
			case 0x00: {
				switch (lo) {
					case 0x0: return this.INS.NOP ();
				}
			}
			case 0x10: {
				switch (lo) {
					case 0x0: return this.INS.STOP ();
				}
			}
			case 0x20: {
				switch (lo) {
					case 0x0: return this.INS.JR_cc_e8 (!flag.zero);
				}
			}
			case 0x30: {
				switch (lo) {
					case 0x0: return this.INS.JR_cc_e8 (!flag.carry);
					case 0x1: {

					}
				}
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
				if (lo & 7 === 6)
					return this.INS.LD_r8_hl (op);
				// LD r8 r8
				this.INS.LD_r8_r8 (op);
				break;
			}

			// 0x80 - 0xB0
			case 0x80: {
				var inhlop = lo & 7 === 6;

				if (lo < 8)
					inhlop ? this.INS.ADD_a_hl () : this.INS.ADD_a_r8 (op); // ADD
				else
					inhlop ? this.INS.ADC_a_hl () : this.INS.ADC_a_r8 (op); // ADC
				break;
			}
			case 0x90: {
				var inhlop = lo & 7 === 6;

				if (lo < 8)
					inhlop ? this.INS.SUB_a_hl () : this.INS.SUB_a_r8 (op); // SUB
				else
					inhlop ? this.INS.SBC_a_hl () : this.INS.SBC_a_r8 (op); // SBC
				break;
			}
			case 0xA0: {
				var inhlop = lo & 7 === 6;

				if (lo < 8)
					inhlop ? this.INS.AND_a_hl () : this.INS.AND_a_r8 (op); // AND
				else
					inhlop ? this.INS.XOR_a_hl () : this.INS.XOR_a_r8 (op); // XOR
				break;
			}
			case 0xB0: {
				var inhlop = lo & 7 === 6;

				if (lo < 8)
					inhlop ? this.INS.OR_a_hl () : this.INS.OR_a_r8 (op); // OR
				else
					inhlop ? this.INS.CP_a_hl () : this.INS.CP_a_r8 (op); // CP
				break;
			}

		}
	};

			// 0x00 - 0x40
			case 0x00: {
				switch (lo) {
					case 0x0: return this.INS.NOP ();
				}
			}
			case 0x10: {
				switch (lo) {
					case 0x0: return this.INS.STOP ();
				}
			}
			case 0x20: {
				switch (lo) {
					case 0x0: return this.INS.JR_cc_e8 (!flag.zero);
					case 0x1: return this.INS.LD_r16_n16 (op);
					case 0x2: return this.INS.LD_hli_a ();
					case 0x3: return this.INS.INC_r16 (op);
					case 0x4: return this.INS.INC_r8 (op);
					case 0x5: return this.INS.DEC_r8 (op);
				}
			}
			case 0x30: {
				switch (lo) {
					case 0x0: return this.INS.JR_cc_e8 (!flag.carry);
					case 0x1: {

					}
				}
			}