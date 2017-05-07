'use strict';

import { IContext } from './../IContext';
import { AccessMode } from './AccessMode';

export interface IBreakpointContext extends IContext {
	Enabled: boolean;
	AccessMode: AccessMode;
	File: string;
	Line: number;
	Column: number;
	Address: number;
	HitCount: number;
}