'use strict';

import { ResumeMode } from './resumeMode';
import { IContext } from './../icontext';

// [{"ID":"GdbRC_7","CanSuspend":true,"CanResume":262143,"CanCount":262143,"IsContainer":false,"HasState":true,"CanTerminate":true}]
export interface IRunControlContext extends IContext {
	CanSuspend: boolean;
	CanResume: number;
	CanCount: number;
	IsContainer: boolean;
	HasState: boolean;
	CanTerminate: boolean;

	resume(mode: ResumeMode, count?: number): Promise<any>;
	suspend(): Promise<any>;
	terminate(): Promise<any>;
	detach(): Promise<any>;
}