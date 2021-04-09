# <img src='https://github.com/nectarboy/gameboy/blob/main/docs/logo_small.png?raw=true'> Pollen Boy !

## Introduction
hey ! this is pollen boy, my very own gameboy emulator. it is written in pure javascript.
you can [try it online here !](https://nectarboy.github.io/gameboy)
it has most of the gameboys features, such as controls, display, etc

its not meant to be the fastest or most accurate emulator,
but it passes the basic tests, runs most games i tried,
and runs pretty smoothly considering i made this on a thinkpad uwu

with all this, pollen boy is a baby, and might have some janky bugs somewhere idk,
so be nice to it <3
if u have any feedback, criticism, or issues to say, please tell me !

<img src='https://github.com/nectarboy/gameboy/blob/main/docs/logo_love.png?raw=true'>
<img src='https://github.com/nectarboy/gameboy/blob/main/docs/logo_love.png?raw=true'>
<img src='https://github.com/nectarboy/gameboy/blob/main/docs/logo_love.png?raw=true'> 

PS - ive stopped working on pollen boy, ive been working on it since like november,
and im very happy how it turned out.

till now lacks color, better timing, some mbc support, the noise channel, etc etc,
but its time to give pollen boy some alone time <3
maybe ill come back in the summer and add all these things, or maybe not.

## Screenshots !
i love these screenshots so now you must look at them

![oh!](https://github.com/nectarboy/gameboy/blob/main/docs/demos/oh.png?raw=true)
![kirb forest](https://github.com/nectarboy/gameboy/blob/main/docs/kirby/forest.png?raw=true)
![HOLY SHIT MARIO](https://github.com/nectarboy/gameboy/blob/main/docs/marioland2/idk.png?raw=true)

![pokemon !](https://github.com/nectarboy/gameboy/blob/main/docs/pokemonblue/blue.png?raw=true)
![garlic fuck](https://github.com/nectarboy/gameboy/blob/main/docs/wario/save.png?raw=true)
![poop](https://github.com/nectarboy/gameboy/blob/main/docs/pokemonblue/poopboob.png?raw=true)

## Features
### Emulation
pollen boy has all the basic aspects of the gameboy, though some parts are not completely accurate.

the cpu is not emulated cycle accurately, so games that need very precise timings may not work.
i dont completely emulate **everything** about some aspects (... *yet*), like DMA or the HALT instruction.

as it is, i think it holds up pretty good, heres what it has.
- gameboy DMG CPU (no gameboy color :c)
- PPU and display
- audio (wip ofc)
- joypad
- save files
- interrupts and timers
- memory banking

### Teensies
pollen boy has a variety of what ill call teensies (little features not related to the gb itself)

right now, pollen boy has some of the basic teensies down, that youd expect from a standard emulator.
however, i still need to add some other things like a volume slider, mute button,
and maybe a popup with some advanced settings ?

heres what pollen boy has.
- pause and reset
- export / import saves
- color palletes
- volume slider (ofc ..)
- pitch warp slider (waw)

## How To Use
open the webpage, click <kbd>Choose ROM</kbd> and enjoy !
the default controls are:
```
D-Pad: Arrow Keys
B: X
A: Z
Start: Enter
Select: Right Shift
```
(you cant customize them ... *yet* ... i told u this was a wip ok)

## Settings
### Save Files
if a game has save support, you can click <kbd>Export</kbd> to download the save on your drive.
you can then <kbd>Import</kbd> save files onto games to continue your progress !

### Color Palletes
you can swap the default pallete from a list of color palletes i made, including my own, my sisters (mwah btw), and others i found on the internet ! i love this feature so love it too. or else.

additionally, if you click the <kbd>Custom</kbd> button, you can input your own pallete (in RGB hex of course) !

### Sound Settings
in sound settings you can change the volume and warp the pitch by dragging some sick ass sliders around ! yay !

a volume of 0 will disable sound emulation alltogether, to increase performance. also, the pitch warp feature is really funky so play around to get sum cool sounds !

## Some Test Screenshots
![nintendo logo my beloved](https://github.com/nectarboy/gameboy/blob/main/docs/bootrom.png?raw=true 'Nintendo® !!')
![pancake](https://github.com/nectarboy/gameboy/blob/main/docs/dmg-acid/10.png?raw=true 'pancake')
![bwarg uwu](https://github.com/nectarboy/gameboy/blob/main/docs/blargg/pass.png?raw=true 'ok.')

left to right - gameboy startup, dmg-acid2, cpu_instr.gb

## Importing Pollen Boy
check out `IMPORTING.md` in the root. though reconsider pls

## Special Thanks
thank you to everyone mentioned here. whether big or small, you all played a part to pollen boy, and ily.

### Resources 
- [the pandocs](https://gbdev.github.io/pandocs/)
- [izik1's opcode table](https://izik1.github.io/gbops/)
- [optix' GBEDG](https://hacktix.github.io/GBEDG/) (rlly good)
- [RGBDS instruction summary](https://rgbds.gbdev.io/docs/v0.4.1/gbz80.7)
- [wheremyfoodat's SM83 decoding reference](https://cdn.discordapp.com/attachments/465586075830845475/742438340078469150/SM83_decoding.pdf) "fuck that guy"
- [nightshade256's audio guide](https://nightshade256.github.io/2021/03/27/gb-sound-emulation.html) that shit helped out a lot. a lot.

### Life Savers
- [wheremyfoodat's peachy logs](https://github.com/wheremyfoodat/Gameboy-logs) walked so i could run
- [bootrom disassembly](https://gbdev.gg8.se/wiki/articles/Gameboy_Bootstrap_ROM) for kissing me on the cheeck
- [the emudev discord](https://discord.gg/dkmJAes) these are such amazing people (ilysm <33)

### Beautiful Ass Bitches
- [this blog](https://blog.rekawek.eu/2017/02/09/coffee-gb/) for inspiring me into making emulators
- [YY-CHR - the tile editor](https://w.atwiki.jp/yychr/) (where i got my first pallete from)
- [lospec.com](https://lospec.com/) (tons of amazing palletes)
- [this video](https://www.youtube.com/watch?v=RyjL-hckDt0&ab_channel=ParkerSimmonsAnimation) because its cool as fuck
- [stackoverflow](https://www.youtube.com/watch?v=D6qEOSc1jJc&ab_channel=LilCoop-Topic) jk fuck stackoverflow lmao

## The End
thank you for checking out my baby boy pollen boy <3
