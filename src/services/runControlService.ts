'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Run%20Control.html

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

// [{"ID":"GdbRC_7","CanSuspend":true,"CanResume":262143,"CanCount":262143,"IsContainer":false,"HasState":true,"CanTerminate":true}]
export interface IRunControlContext extends IContext {
	CanSuspend: boolean;
	CanResume: number;
	CanCount: number;
	IsContainer: boolean;
	HasState: boolean;
	CanTerminate: boolean;
}


export class RunControlContext implements IRunControlContext {
	public ID: string;
	public CanSuspend: boolean;
	public CanResume: number;
	public CanCount: number;
	public IsContainer: boolean;
	public HasState: boolean;
	public CanTerminate: boolean;


	private runcontrolservice: RunControlService;


	public setProperties(properties: any): Promise<any> {
		return this.runcontrolservice.setProperties(this.ID, properties);
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error("NOT IMPLEMENTED"));
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

	public static fromJson(service: RunControlService, data: IRunControlContext): RunControlContext {
		let context = new RunControlContext();

		context.runcontrolservice = service;

		context.ID = data["ID"];
		context.CanSuspend = data["CanSuspend"];
		context.CanResume = data["CanResume"];
		context.CanCount = data["CanCount"];
		context.IsContainer = data["IsContainer"];
		context.HasState = data["HasState"];
		context.CanTerminate = data["CanTerminate"];

		return context;
	}

	public toString(): string {
		return `${this.ID}`;
	}
}

export interface IRunControlListener {
	contextAdded(contexts: RunControlContext[]): void;
	contextChanged(contexts: RunControlContext[]): void;
	contextRemoved(contextIds: string[]): void;

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

export class RunControlService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("RunControl", dispatcher);
	}

	public contexts: Map<string, RunControlContext> = new Map<string, RunControlContext>();

	private listeners: Array<IRunControlListener> = new Array<IRunControlListener>();

	public addListener(listener: IRunControlListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IRunControlListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value != listener;
		})
	}


	public resume(contextId: string, mode: ResumeMode, count?: number): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "resume", [contextId, mode, count | 0]);
	}

	public suspend(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "suspend", [contextId]);
	}

	public terminate(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "terminate", [contextId]);
	}

	public detach(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "detach", [contextId]);
	}

	public setProperties(contextId: string, properties: any): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "setProperties", [contextId, properties]);
	}


	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			case "contextAdded":
				this.handleContextAdded(eventData);
				break;
			case "contextChanged":
				this.handleContextChanged(eventData);
				break;
			case "contextRemoved":
				this.handleContextRemoved(eventData);
				break;
			case "contextSuspended":
				this.handleContextSuspended(eventData);
				break;
			case "contextResumed":
				this.handleContextResumed(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <RunControlContext[]>JSON.parse(eventData[0])
		let newContexts = []

		for (var index in contextsData) {
			let context = RunControlContext.fromJson(this, contextsData[index]);
			this.contexts[context.ID] = context;
			newContexts.push(context);
		}

		this.log(`ContextAdded: ${newContexts}`);

		for (let index in this.listeners) {
			let listener = this.listeners[index];

			listener.contextAdded(newContexts);
		}
	}

	private handleContextChanged(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <RunControlContext[]>JSON.parse(eventData[0])
		let newContexts = []

		for (var index in contextsData) {
			let context = RunControlContext.fromJson(this, contextsData[index]);
			this.contexts[context.ID] = context;
			newContexts.push(context);
		}

		this.log(`ContextAdded: ${newContexts}`);

		for (let index in this.listeners) {
			let listener = this.listeners[index];

			listener.contextChanged(newContexts);
		}
	}

	private handleContextRemoved(eventData: string[]): void {
		// TODO: into Service

		let ids = <string[]>JSON.parse(eventData[0]);
		for(var index in ids) {
			let id = ids[index];
			if (id in this.contexts)
				delete this.contexts[id];
		}

		this.log(`ContextRemoved: ${ids}`);

		for (let index in this.listeners) {
			let listener = this.listeners[index];

			listener.contextRemoved(ids);
		}
	}

	private handleContextSuspended(eventData: string[]): void {
		let id = JSON.parse(eventData[0]);
		let pc = +JSON.parse(eventData[1]);
		let reason = JSON.parse(eventData[2]);
		let state = JSON.parse(eventData[3]);

		this.log(`ContextSuspended: ${id} => ${pc} (${reason})`);

		for (let index in this.listeners) {
			let listener = this.listeners[index];

			listener.contextSuspended(id, pc, reason, state);
		}
	}

	private handleContextResumed(eventData: string[]): void {
		let id = JSON.parse(eventData[0]);

		this.log(`ContextResumed: ${id}`);

		for (let index in this.listeners) {
			let listener = this.listeners[index];

			listener.contextResumed(id);
		}
	}

}