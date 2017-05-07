'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Run%20Control.html

import { IDispatcher, AbstractService } from './../AbstractService';
import { IRunControlContext } from './IRunControlContext';
import { RunControlContext } from './RunControlContext';
import { IRunControlListener } from './IRunControlListener';
import { ResumeMode } from './ResumeMode';


export class RunControlService extends AbstractService<IRunControlContext, IRunControlListener> {

	public constructor(dispatcher: IDispatcher) {
		super('RunControl', dispatcher);
	}

	public resume(contextId: string, mode: ResumeMode, count?: number): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'resume', [contextId, mode, count | 0]);
	}

	public suspend(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'suspend', [contextId]);
	}

	public terminate(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'terminate', [contextId]);
	}

	public detach(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'detach', [contextId]);
	}

	public setProperties(contextId: string, properties: any): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'setProperties', [contextId, properties]);
	}


	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			case 'contextSuspended':
				this.handleContextSuspended(eventData);
				return true;
			case 'contextResumed':
				this.handleContextResumed(eventData);
				return true;
			default:
				this.log(`No matching event handler: ${event}`);
				return false;
		}
	}

	private handleContextSuspended(eventData: string[]): void {
		let id = JSON.parse(eventData[0]);
		let pc = +JSON.parse(eventData[1]);
		let reason = JSON.parse(eventData[2]);
		let state = JSON.parse(eventData[3]);

		this.log(`ContextSuspended: ${id} => ${pc} (${reason})`);

		this.listeners.forEach(listener => {
			listener.contextSuspended(id, pc, reason, state);
		});
	}

	private handleContextResumed(eventData: string[]): void {
		let id = JSON.parse(eventData[0]);

		this.log(`ContextResumed: ${id}`);

		this.listeners.forEach(listener => {
			listener.contextResumed(id);
		});
	}

	public fromJson(service: RunControlService, data: IRunControlContext): IRunControlContext {
		let context = new RunControlContext();

		context.runcontrolservice = service;

		context.ID = data['ID'];
		context.CanSuspend = data['CanSuspend'];
		context.CanResume = data['CanResume'];
		context.CanCount = data['CanCount'];
		context.IsContainer = data['IsContainer'];
		context.HasState = data['HasState'];
		context.CanTerminate = data['CanTerminate'];

		return context;
	}

}