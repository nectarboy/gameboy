## Importing Pollen Boy
This is a lil tedious so might change to modules, but here goes !

```Html
<!-- First, import all of the component files ... -->
<script src='cpu.js'></script>
<script src='ops.js'></script>
<script src='mem.js'></script>
<script src='ppu.js'></script>
<script src='apu.js'></script>
<script src='joypad.js'></script>
<script src='main.js'></script>

<!-- Don't forget this if you wanna download saves -->
<script src='filesaver.js'></script>
```

```Javascript
// Then, create a Gameboy object !
const gb = new Gameboy ();
gb.AttachCanvas (canvas); // ; Attach to canvas of choice

// Here are some default settings I use ...
gb.SetFPS (60);
gb.bootromEnabled = false;
gb.SetVolume (0.05);
gb.EnableSound ();
gb.keyboardEnabled = true;
```

```Javascript
// Finally, you load roms and start the GB !
any_file_input_or_sumn.onchange = function () {
    // Load a binary buffer from file input ...
    // And then ... fun taim :D
    gb.InsertRom (binBuffer);
    gb.Start ();
};
```
