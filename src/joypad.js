const Joypad = function (nes) {

	var joypad = this;

	var mem = nes.cpu.mem;

	// =============== //   Basic Elements //

	// Joypad buttons
	this.up =
	this.down =
	this.left =
	this.right =

	this.b =
	this.a =

	this.start =
	this.select = false; // 1 means unpressed

	// Joypad selects
	this.selectbutt = // Butt lol
	this.selectdpad = false;

	// =============== //   Basic Functions //

	// We do this every once a while
	this.PollJoypad = function () {
		var pressed = 0;

		// Buttons
		pressed |= this.selectbutt
			&& ((this.start << 3) | (this.select << 2) | (this.b << 1) | (this.a));

		// D-pad
		pressed |= this.selectdpad
			&& ((this.down << 3) | (this.up << 2) | (this.left << 1) | (this.right));

		var preJoy = mem.ioreg [0x00];

		mem.ioreg [0x00] &= 0xf0; // Clear press bits ...
		var postJoy = mem.ioreg [0x00] |= ~pressed; // ... and write pressed bits !

		if (postJoy < preJoy)
			nes.cpu.iflag.SetJoypad ();
	};

	// Reset
	this.Reset = function () {
		mem.ioreg [0x00] |= 0x0f; // Reset button states

		// Reset button states
		this.up =
		this.down =
		this.left =
		this.right =
		this.b =
		this.a =
		this.start =
		this.select = false; // 1 means unpressed

		// Reset selects
		this.selectbutt =
		this.selectdpad = false;
	};

	// =============== //   Key Events //

	this.keybinds = {
		up: 'ArrowUp',
		down: 'ArrowDown',
		left: 'ArrowLeft',
		right: 'ArrowRight',

		b: 'KeyX',
		a: 'KeyZ',

		start: 'Enter',
		select: 'ShiftRight'
	};

	this.listener = {
		// -- Key state setter -- //
		SetKeyState (code, val) {
			var keybinds = joypad.keybinds;

			switch (code) {
				case keybinds.up:
					joypad.up = val;
					break;
				case keybinds.down:
					joypad.down = val;
					break;
				case keybinds.left:
					joypad.left = val;
					break;
				case keybinds.right:
					joypad.right = val;
					break;

				case keybinds.b:
					joypad.b = val;
					break;
				case keybinds.a:
					joypad.a = val;
					break;

				case keybinds.start:
					joypad.start = val;
					break;
				case keybinds.select:
					joypad.select = val;
					break;

				default:
					return false;
			}

			return true;
		},

		// -- On key press -- //
		pressed: {},

		OnKeyDown (e) {
			// Check if holding down
			if (this.pressed [e.keyCode])
				return e.preventDefault ();
			this.pressed [e.keyCode] = true;

			if (this.SetKeyState (e.code, true))
				e.preventDefault ();
		},

		OnKeyUp (e) {
			delete this.pressed [e.keyCode]; // Reset pressed keystate

			this.SetKeyState (e.code, false);
		},

		// -- Event listeners -- //
		Start () {
			document.addEventListener ('keydown', downlisten);
			document.addEventListener ('keyup', uplisten);
		},

		Stop () {
			document.removeEventListener ('keydown', downlisten);
			document.removeEventListener ('keyup', uplisten);

			joypad.Reset ();
		}

	};

	// Because event listeners redefine 'this', we use an external function
	function downlisten (e) {
		joypad.listener.OnKeyDown (e);
	}
	function uplisten (e) {
		joypad.listener.OnKeyUp (e);
	}
	
};