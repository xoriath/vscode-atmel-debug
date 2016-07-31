'use strict';

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

	public setProperties(properties: any): void {

	}

	public getProperties(callback: (properties: any) => void): void {

	}

    //{"ID":"Proc_3",
	//"Name":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug\\GccApplication2.elf",
	//"RunControlId":"GdbRC_1"}
	public static fromJson(service: ProcessesService, data: IProcessesContext): ProcessesContext {
		let context = new ProcessesContext();

		context.processesService = service;

		context.ID = data["ID"];
		context.Name = data["Name"];

		context.RunControlId = data["RunControlId"];

		return context;
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
		super("Processes", dispatcher);
	}

	public contexts: Map<string, IProcessesContext> = new Map<string, IProcessesContext>();

	private listeners: Array<IProcessesListener> = new Array<IProcessesListener>();

	public addListener(listener: IProcessesListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IProcessesListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value != listener;
		})
	}

	public launch(module: string, deviceContext: IDeviceContext, launchParameters: any): void {
		this.dispatcher.sendCommand(this.name, "launch", [module, deviceContext.ID, launchParameters]);
	}

	public getContext(id: string): IProcessesContext {
		return this.contexts[id];
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
			case "exited":
				this.handleExited(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleExited(eventData: string[]): void {
		this.log(`Cannot handle exited event with data: ${eventData}`)
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <ProcessesContext[]>JSON.parse(eventData[0])
		let newContexts = []

		for (var index in contextsData) {
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
		let contextsData = <ProcessesContext[]>JSON.parse(eventData[0])
		let newContexts = []

		for (var index in contextsData) {
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
}