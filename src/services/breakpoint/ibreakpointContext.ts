'use strict';

import { IContext } from './../icontext';
import { AccessMode } from './accessMode';

export interface IBreakpointContext extends IContext {
	Enabled: boolean;
	AccessMode: AccessMode;
	File: string;
	Line: number;
	Column: number;
	Address: number;
	HitCount: number;
}