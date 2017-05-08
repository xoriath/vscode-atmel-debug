'use strict';

import { IConnectionProperties } from './iconnectionProperties';

export interface IAttachedTool {
	ToolType: string;
	ConnectionProperties?: IConnectionProperties;
}
