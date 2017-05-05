# vscode-atmel-debug

Debug adapter for Visual Studio code for the Atmel debug backend.

<p align="center">
  <a href="https://travis-ci.org/xoriath/vscode-atmel-debug"><img src="https://travis-ci.org/xoriath/vscode-atmel-debug.svg?branch=master" alt="Travis"></a>
  <a href="https://github.com/xoriath/vscode-atmel-debug/releases">
    <img src="https://img.shields.io/github/release/xoriath/vscode-atmel-debug.svg" alt="Release">
    <img src="https://img.shields.io/github/downloads/atom/atom/latest/total.svg" alt="Downloads - Total">
    <img src="https://img.shields.io/github/downloads/atom/atom/total.svg" alt="Downloads - Latest">
  </a>
</p>

This debug extension connect the Visual Studio Code debug system onto
the Atmel debug backend (atbackend). This enabled debugging of all Atmel microcontrollers
that are supported in the Atmel Studio 7.0 environment.

<p align="center">
  <img src="https://github.com/xoriath/vscode-atmel-debug/blob/master/images/screenshot-1.png" alt="Travis">
</p>
## Status
Launching, stepping, breakpoints, call stack, registers and variable inspection is working.
Only tested using the simulator in atbackend.

Implementation of hardware support needs some more property passing between VSCode and atbackend,
mainly relating to interface configuration.


## Running
For now, some manual setup is needed to use this (more polish to come).

### atbackend
The atbackend executable is located in the atbackend folder inside any Atmel Studio installation.

Run atbackend with the `/websocket-port` argument, with some free port number given.
```
C:\Program Files (x86)\Atmel\Studio\7.0\atbackend>atbackend /websocket-port=4712
```

### Code
The following launch.json is used to launch on the simulator.

Note that for now, the `atbackendPort` need to match the one used when starting the atbackend process.
The path to the `elf` file is also needed. This needs to be compiled separately for now (using for instance Atmel Studio).

NB: Not all parameters are actually used. This is the set of parameters that Atmel Studio passes when a debug session is launched.

NB2: the `debugServer` parameters indicates that this is set up for debugging the adapter itself.

```json
{
    "version": "0.2.0",

    "debugServer": 4710,

    "configurations": [
        {
            "name": "atmel-debug",
            "type": "atbackend",

            "atbackendHost": "127.0.0.1",
            "atbackendPort": 4712,

            "request": "launch",
            "program": "${workspaceRoot}/GccApplication2/Debug/GccApplication2.elf",
            "tool": "com.atmel.avrdbg.tool.simulator",
            "device": "ATmega128",

            "launchAttached": true,
            "launchSuspended": true,

            "preserveEeprom": false,
            "bootSegment": 2,
            "cacheFlash": true,
            "eraseRule": 0,
            "useGdb": true,
            "gdbLocation": "C:/Program Files (x86)/Atmel/Studio/7.0/toolchain/avr8/avr8-gnu-toolchain/bin/avr-gdb.exe",
            "progFlashFromRam": false,
            "ramSnippetAddress": "0x20000000",
            "packPath": "C:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"
        }
    ]
}
```

The instance of Visual Studio code that is debugging the elf file should be started with the `--extensionDevelopmentPath=`
argument pointing to the extension workspace.

