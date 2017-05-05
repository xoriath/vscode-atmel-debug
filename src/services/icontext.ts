
'use strict';

export interface IContext {
	ID: string;

	setProperties(properties: any): Promise<any>;
	getProperties(): Promise<any>;
}


export interface IContextListener<Context extends IContext> {
	contextAdded(contexts: Context[]): void;
	contextChanged(contexts: Context[]): void;
	contextRemoved(contextIds: string[]): void;
}