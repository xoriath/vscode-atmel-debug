'use strict';

import { IContextListener } from './../icontext';
import { IProcessContext } from './iprocessContext';

export interface IProcessListener extends IContextListener<IProcessContext> {
	exited(id: string, exitCode: number): void;
}