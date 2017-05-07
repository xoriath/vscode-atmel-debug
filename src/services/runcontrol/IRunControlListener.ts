'use strict';

import { IContextListener } from './../IContext';
import { IRunControlContext } from './IRunControlContext';

export interface IRunControlListener extends IContextListener<IRunControlContext> {
	contextSuspended(contextId: string, pc: number, reason: string, state: any): void;
	contextResumed(contextId: string): void;
	contextException(contextId: string, description: string): void;
	containerSuspended(contextId: string, pc: number, reason: string, state: any, contextIds: string[]): void;
	containerResumed(contextIds: string[]): void;

	contextStateChanged(contextIds: string[]): void;
}