'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Run%20Control.html

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

// [{"ID":"GdbRC_7","CanSuspend":true,"CanResume":262143,"CanCount":262143,"IsContainer":false,"HasState":true,"CanTerminate":true}]
export interface IRunControlContext extends IContext {
	CanSuspend: boolean;
	CanResume: number;
	CanCount: number;
	IsContainer: boolean;
	HasState: boolean;
	CanTerminate: boolean;

	resume(mode: ResumeMode, count?: number): Promise<any>;
	suspend(): Promise<any>;
	terminate(): Promise<any>;
	detach(): Promise<any>;
}


export class RunControlContext implements IRunControlContext {
	public ID: string;
	public CanSuspend: boolean;
	public CanResume: number;
	public CanCount: number;
	public IsContainer: boolean;
	public HasState: boolean;
	public CanTerminate: boolean;

	public runcontrolservice: RunControlService;


	public setProperties(properties: any): Promise<any> {
		return this.runcontrolservice.setProperties(this.ID, properties);
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public resume(mode: ResumeMode, count?: number): Promise<any> {
		return this.runcontrolservice.resume(this.ID, mode, count);
	}

	public suspend(): Promise<any> {
		return this.runcontrolservice.suspend(this.ID);
	}

	public terminate(): Promise<any> {
		return this.runcontrolservice.terminate(this.ID);
	}

	public detach(): Promise<any> {
		return this.runcontrolservice.detach(this.ID);
	}

	public toString(): string {
		return `${this.ID}`;
	}
}

export interface IRunControlListener extends IContextListener<IRunControlContext> {
	contextSuspended(contextId: string, pc: number, reason: string, state: any): void;
	contextResumed(contextId: string): void;
	contextException(contextId: string, description: string): void;
	containerSuspended(contextId: string, pc: number, reason: string, state: any, contextIds: string[]): void;
	containerResumed(contextIds: string[]): void;

	contextStateChanged(contextIds: string[]): void;
}

export enum ResumeMode {
	Resume = 0,
	StepOver = 1,
	StepInto = 2,
	StepOverLine = 3,
	StepIntoLine = 4,
	StepOut = 5,
	ReverseResume = 6,
	ReverseStepOver = 7,
	ReverseStepInto = 8,
	ReverseStepOverLine = 9,
	ReversStepIntoLine = 10,
	ReverseStepOut = 11,
	StepOverRange = 12,
	StepIntoRange = 13,
	ReverseStepOverRange = 14,
	ReverseStepIntoRange = 15,
	UntilActive = 16,
	Goto = 17
}

export class RunControlService extends Service<IRunControlContext, IRunControlListener> {

	public constructor(dispatcher: Dispatcher) {
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

	public fromJson(service: RunControlService, data: IRunControlContext): RunControlContext {
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