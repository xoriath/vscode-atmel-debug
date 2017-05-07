'use strict';

import { IContextListener } from './../IContext';
import { IProcessContext } from './IProcessContext';

export interface IProcessListener extends IContextListener<IProcessContext> {
	exited(id: string, exitCode: number): void;
}