'use strict';

import { IContext } from './../IContext';
import { IFrameArg } from './IFrameArg';

// { "ID": "gdbProc_3:0:210",
//   "Level": 0,
//   "IP": 210,
//   "ArgsString": "",
//   "Func": "main",
//   "File": "c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c\n",
//   "Line": 24,
//   "Args": [] }
export interface IStackTraceContext extends IContext {
	Level: number;
	IP: number;
	ArgsString: string;
	Func: string;
	File: string;
	Line: number;
	Args: IFrameArg[];
}
