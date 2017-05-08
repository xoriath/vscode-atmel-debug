'use strict';

import { IContext } from './../icontext';

export interface IToolContext extends IContext {
	Name: string;
	DeviceId?: string;

	toString(): string;

	connect(): void;
	tearDownTool(): void;
}