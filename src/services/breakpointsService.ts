
'use strict';

 // http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Breakpoints.html

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

export enum AccessMode {
	Read = 0x01,
	Write = 0x02,
	Execute = 0x04,
	Change = 0x08
}

export interface IBreakpointContext extends IContext {
	Enabled: boolean;
	AccessMode: AccessMode;
	File: string;
	Line: number;
	Column: number;
	Address: number;
	HitCount: number;
}


export class BreakpointContext implements IBreakpointContext {

	public ID: string;
	public Enabled: boolean;
	public AccessMode: AccessMode;
	public File: string;
	public Line: number;
	public Column: number;
	public Address: number;
	public HitCount: number;

	public service: BreakpointsService;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return this.service.getProperties(this.ID);
	}

	public remove(): void {
		this.service.remove([this.ID]);
	}

	public toString(): string {
		if (this.ID) {
			return `${this.ID}`;
		}
		else {
			return '';
		}
	}
}

export interface IBreakpointListener extends IContextListener<IBreakpointContext> {

}

export class BreakpointsService extends Service<IBreakpointContext, IBreakpointListener> {

	private contextCounter: number;

	public constructor(dispatcher: Dispatcher) {
		super('Breakpoints', dispatcher);

		this.contextCounter = 0;
	}

	public add(parameters: any): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'add', [parameters]);
	}

	public getProperties(contextId: string): Promise<IBreakpointContext> {
		let self = this;

		return new Promise<IBreakpointContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getProperties', [contextId]).then( (eventData: string) => {
				let data = <IBreakpointContext>JSON.parse(eventData);
				resolve(self.fromJson(self, data));
			}).catch( (reason: Error) => {
				reject(reason);
			});
		});
	}

	public getError(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'getError', [contextId]);
	}

	public remove(contextIds: string[]): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'remove', [contextIds]);
	}

	public getNextBreakpointId(): string {
		return `${++this.contextCounter}`;
	}

	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			default:
				return false;
		}
	}


	public fromJson(service: BreakpointsService, data: IBreakpointContext): IBreakpointContext {
		let context = new BreakpointContext();

		context.service = service;

		context.ID = data['ID'];
		context.AccessMode = data['AccessMode'];
		context.Enabled = data['Enabled'];
		context.File =  data['File'];
		context.Line = data['Line'];
		context.Column = data['Column'];
		context.Address = +data['Address'];
		context.HitCount = data['HitCount'];

		return context;
	}
}