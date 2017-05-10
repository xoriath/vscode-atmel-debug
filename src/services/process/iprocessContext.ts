'use strict';

import { IContext } from './../icontext';

export interface IProcessContext extends IContext {
	ID: string;
	ParentID: string;
	Name: string;
	Attached: boolean;
	CanTerminate: boolean;
	StdInID: string;
	StdOutID: string;
	StdErrID: string;
	RunControlId: string;

	terminate(): void;
}