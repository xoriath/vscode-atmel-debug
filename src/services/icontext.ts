
'use strict';


export interface IContext {
	ID: string;

	setProperties(properties: any): void;
	getProperties(): Promise<any>;
}