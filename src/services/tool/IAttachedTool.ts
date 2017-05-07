'use strict';

import { IConnectionProperties } from './IConnectionProperties';

export interface IAttachedTool {
	ToolType: string;
	ConnectionProperties?: IConnectionProperties;
}
