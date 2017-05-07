'use strict';

import { IContext } from './../IContext';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Memory.html

export interface IMemoryContext extends IContext {
	ID: string;
	BigEndian: boolean;
	AddressSize: number;
	Name: string;
	StartBound: number;
	EndBound: number;
}