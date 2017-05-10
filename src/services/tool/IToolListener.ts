'use strict';

import { IContextListener } from './../icontext';
import { IToolContext } from './itoolContext';
import { IAttachedTool } from './iattachedTool';

export interface IToolListener extends IContextListener<IToolContext> {
	attachedToolsChanged(attachedTools: IAttachedTool[]): void;
}
