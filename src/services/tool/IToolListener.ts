'use strict';

import { IContextListener } from './../IContext';
import { IToolContext } from './IToolContext';
import { IAttachedTool } from './IAttachedTool';

export interface IToolListener extends IContextListener<IToolContext> {
	attachedToolsChanged(attachedTools: IAttachedTool[]): void;
}
