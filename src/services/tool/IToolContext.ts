'use strict';

import { IContext } from './../IContext';

export interface IToolContext extends IContext {
	Name: string;
	DeviceId?: string;

	toString(): string;

	connect(): void;
	tearDownTool(): void;
}