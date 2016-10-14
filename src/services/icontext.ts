
'use strict';


export interface IContext {
	ID: string;

	setProperties(properties: any): Promise<any>;
	getProperties(): Promise<any>;
}