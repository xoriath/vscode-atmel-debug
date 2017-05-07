
'use strict';

 // http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Breakpoints.html

import { IDispatcher, AbstractService } from './../AbstractService';

import { IBreakpointContext } from './IBreakpointContext';
import { BreakpointContext } from './BreakpointContext';
import { IBreakpointListener } from './IBreakpointListener';

export class BreakpointsService extends AbstractService<IBreakpointContext, IBreakpointListener> {

	private contextCounter: number;

	public constructor(dispatcher: IDispatcher) {
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
				let data = JSON.parse(eventData);
				resolve(self.fromJson(self, data));
			}).catch(reject);
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