'use strict';

import { IContext } from './../IContext';

export interface IRegisterContext extends IContext {
	ProcessID: string;
	Size: number;
	Name: string;
}