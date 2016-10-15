'use strict';

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

export interface IDeviceContext extends IContext {

}

export class DeviceContext implements IDeviceContext {

	public ID: string;
	public Name: string;
	public Session: number;
	public MemoryIDs: Array<string> = new Array<string>();
	public RunControlID: string;

	public deviceService: DeviceService;

	public properties: any;

	public setProperties(properties: any): Promise<any> {
		return this.deviceService.setProperties(this.ID, properties);
	}

	public getProperties(): Promise<any> {
		return this.deviceService.getProperties(this.ID);
	}

	public static fromJson(service: DeviceService, data: IDeviceContext): DeviceContext {
		let context = new DeviceContext();

		context.deviceService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];
		context.Session = data['Session'];
		context.MemoryIDs = data['MemoryIDs'];
		context.RunControlID = data['RunControlID'];

		return context;
	}

	public toString(): string {
		return `${this.ID} => ${this.Name}`;
	}

}

export interface IDeviceListener {
	contextAdded(contexts: IDeviceContext[]): void;
	contextChanged(contexts: IDeviceContext[]): void;
	contextRemoved(contextIds: string[]): void;
}

export class DeviceService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super('Device', dispatcher);
	}

	public contexts: Map<string, IDeviceContext> = new Map<string, IDeviceContext>();

	private listeners: Array<IDeviceListener> = new Array<IDeviceListener>();

	public addListener(listener: IDeviceListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IDeviceListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value !== listener;
		});
	}

	public getContext(id: string): IDeviceContext {
		return this.contexts[id];
	}

	public setProperties(contextId: string, properties: any): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'setProperties', [contextId, properties]);
	}

	public getProperties(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'getProperties', [contextId]); // TODO; marshal into Context
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
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <DeviceContext[]>JSON.parse(eventData[0]);
		let newContexts = [];

		for (let index in contextsData) {
			let context = DeviceContext.fromJson(this, contextsData[index]);
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
		let contextsData = <DeviceContext[]>JSON.parse(eventData[0]);
		let newContexts = [];

		for (let index in contextsData) {
			let context = DeviceContext.fromJson(this, contextsData[index]);
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
			if (id in this.contexts)
				delete this.contexts[id];
		}

		this.log(`ContextRemoved: ${ids}`);

		for (let index in this.listeners) {
			let listener: IDeviceListener = this.listeners[index];

			listener.contextRemoved(ids);
		}
	}
}