'use strict';

import { IContext } from './../icontext';

// {
// 	"SLine":14,
// 	"ELine":14,
// 	"ECol":512,
// 	"Function":"testfunc2",
// 	"File":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug/.././main.c",
// 	"SAddr":"184",
// 	"EAddr":"185",
// 	"IsStmt":1
// }
export interface ILineNumberContext extends IContext {
	SLine: number;
	ELine: number;
	ECol: number;
	Function: string;
	File: string;
	SAddr: number;
	EAddr: number;
	IsStmt: number;
}