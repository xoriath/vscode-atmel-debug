'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Processes.html

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

import { IDeviceContext } from './deviceService';

export interface IProcessesContext extends IContext {
	ID: string;
	ParentID: string;
	Name: string;
	Attached: boolean;
	CanTerminate: boolean;
	StdInID: string;
	StdOutID: string;
	StdErrID: string;
	RunControlId: string;

	terminate(): void;
}

export class ProcessesContext implements IProcessesContext {

	public ID: string;
	public ParentID: string;
	public Name: string;
	public Attached: boolean;
	public CanTerminate: boolean;
	public StdInID: string;
	public StdOutID: string;
	public StdErrID: string;

	public RunControlId: string;

	public processesService: ProcessesService;

	public properties: any;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

    // {"ID":"Proc_3",
	// "Name":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug\\GccApplication2.elf",
	// "RunControlId":"GdbRC_1"}
	public static fromJson(service: ProcessesService, data: IProcessesContext): ProcessesContext {
		let context = new ProcessesContext();

		context.processesService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];

		context.RunControlId = data['RunControlId'];

		return context;
	}

	public toString(): string {
		return `${this.ID}`;
	}

	public terminate(): Promise<any> {
		return this.processesService.terminate(this.ID);
	}

}

export interface IProcessesListener {
	contextAdded(contexts: IProcessesContext[]): void;
	contextChanged(contexts: IProcessesContext[]): void;
	contextRemoved(contextIds: string[]): void;

	exited(id: string, exitCode: number): void;
}

export class ProcessesService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super('Processes', dispatcher);
	}

	public contexts: Map<string, IProcessesContext> = new Map<string, IProcessesContext>();

	private listeners: Array<IProcessesListener> = new Array<IProcessesListener>();

	public addListener(listener: IProcessesListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IProcessesListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value !== listener;
		});
	}

	public launch(module: string, deviceContext: IDeviceContext, launchParameters: any): Promise<string> {
		let self = this;

		return new Promise<string>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'launch', [module, deviceContext.ID, launchParameters]).then( (data: string) => {
				resolve(data);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public getContext(id: string): IProcessesContext {
		return this.contexts[id];
	}

	public terminate(id: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'terminate', [id]);
	}


	public eventHandler(event: string, eventData: string[]): void {
		switch (event) {
			case 'contextAdded':
				this.handleContextAdded(eventData);
				break;
			case 'contextChanged':
				this.handleContextChanged(eventData);
				break;
			case 'contextRemoved':
				this.handleContextRemoved(eventData);
				break;
			case 'exited':
				this.handleExited(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleExited(eventData: string[]): void {
		this.log(`Cannot handle exited event with data: ${eventData}`);
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <ProcessesContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<IProcessesContext>();

		for (let index in contextsData) {
			let context = ProcessesContext.fromJson(this, contextsData[index]);
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
		let contextsData = <ProcessesContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<IProcessesContext>();

		for (let index in contextsData) {
			let context = ProcessesContext.fromJson(this, contextsData[index]);
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
		for (let index in ids) {
			let id = ids[index];
			if (id in this.contexts) {
				delete this.contexts[id];
			}
		}

		this.log(`ContextRemoved: ${ids}`);

		for (let index in this.listeners) {
			let listener = this.listeners[index];

			listener.contextRemoved(ids);
		}
	}
}