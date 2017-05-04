'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Registers.html

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

export interface IRegistersContext extends IContext {
	ProcessID: string;
	Size: number;
	Name: string;
}


export class RegistersContext implements IRegistersContext {
	public Name: string;
	public ID: string;
	public ProcessID: string;
	public Size: number;


	private registersService: RegistersService;


	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return this.registersService.get(this.ID);
	}

	public static fromJson(service: RegistersService, data: IRegistersContext): RegistersContext {
		let context = new RegistersContext();

		context.registersService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];
		context.ProcessID = data['ProcessID'];
		context.Size = data['Size'];

		return context;
	}

	public toString(): string {
		return `${this.Name}`;
	}
}

export interface IRegistersListener {
	contextAdded(contexts: IRegistersContext[]): void;
	contextChanged(contexts: IRegistersContext[]): void;
	contextRemoved(contextIds: string[]): void;
}

export class RegistersService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super('Registers', dispatcher);
	}

	public contexts: Map<string, IRegistersContext> = new Map<string, IRegistersContext>();

	private listeners: Array<IRegistersListener> = new Array<IRegistersListener>();

	public addListener(listener: IRegistersListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IRegistersListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value !== listener;
		});
	}

	public get(contextId: string): Promise<string> {
		let self = this;

		return new Promise<string>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'get', [contextId]).then( (data: string) => {
				resolve(data);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
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
			case 'registerChanged':
				this.handleRegisterChanged(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <RegistersContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<IRegistersContext>();

		for (let index in contextsData) {
			let context = RegistersContext.fromJson(this, contextsData[index]);
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
		let contextsData = <RegistersContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<IRegistersContext>();

		for (let index in contextsData) {
			let context = RegistersContext.fromJson(this, contextsData[index]);
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

	private handleRegisterChanged(eventData: string[]): void {
		let contextId = JSON.parse(eventData[0]);

		this.log(`RegisterChanged: ${contextId}`);
	}
}