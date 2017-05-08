'use strict';

import { IContext } from './../icontext';

export interface IRegisterContext extends IContext {
	ProcessID: string;
	Size: number;
	Name: string;
}