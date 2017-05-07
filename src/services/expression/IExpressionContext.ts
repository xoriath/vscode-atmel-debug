'use strict';

import { IContext } from './../IContext';

// {
// 	"ID":"g_1",
// 	"Numchildren":0,
// 	"Val":"0 '\\000'\n",
// 	"CanAssign":true,
// 	"Expression":"testfunc2_local",
// 	"ExprPath":"testfunc2_local",
// 	"FormatString":"",
// 	"Type":"uint8_t(a complex DWARF expression:\n     0: DW_OP_breg28 1 [$r28]\n.\n)",
// 	"Size":1
// }
export interface IExpressionContext extends IContext {
	Numchildren: number;
	Val: string;
	CanAssign: boolean;
	Expression: string;
	ExprPath: string;
	FormatString: string;
	Type: string;
	Size: number;

	assign(value: string): Promise<string>;
	dispose(): void;
}