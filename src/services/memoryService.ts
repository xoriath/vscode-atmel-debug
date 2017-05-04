'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Memory.html

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';


enum Status {
	ByteValid = 0x00,
	ByteUnknown = 0x01,
	ByteInvalid = 0x02,
	ByteCannotRead = 0x04,
	ByteCannotWrite = 0x08
}

enum SetMode {
	ContinueOnError = 0x1,
	Verify = 0x2
}

export interface IMemoryContext extends IContext {
	ID: string;
	BigEndian: boolean;
	AddressSize: number;
	Name: string;
	StartBound: number;
	EndBound: number;
}

export interface IAddressRange {
	addr: number;
	size: number;
}

export class MemoryContext implements IMemoryContext {
	public ID: string;
	public BigEndian: boolean;
	public AddressSize: number;
	public Name: string;
	public StartBound: number;
	public EndBound: number;


	private memoryService: MemoryService;


	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public static fromJson(service: MemoryService, data: IMemoryContext): MemoryContext {
		let context = new MemoryContext();

		context.memoryService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];
		context.BigEndian = data['BigEndian'];
		context.AddressSize = data['AddressSize'];
		context.StartBound = data['StartBound'];
		context.EndBound = data['EndBound'];

		return context;
	}

	public toString(): string {
		return `${this.Name}`;
	}
}

export interface IMemoryListener {
	contextAdded(contexts: IMemoryContext[]): void;
	contextChanged(contexts: IMemoryContext[]): void;
	contextRemoved(contextIds: string[]): void;
}

export class MemoryService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super('Memory', dispatcher);
	}

	public contexts: Map<string, MemoryContext> = new Map<string, MemoryContext>();

	private listeners: Array<IMemoryListener> = new Array<IMemoryListener>();

	public addListener(listener: IMemoryListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IMemoryListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value !== listener;
		});
	}

	public getChildren(context: IContext) {

	}

	public setMemory(context: IContext, address: number, wordSize: number, byteCount: number, mode: SetMode, bytes: string): void {

	}

	public getMemory(context: IContext, address: number, wordSize: number, byteCount: number, mode: SetMode): void {

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
			case 'memoryChanged':
				this.handleMemoryChanged(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <MemoryContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<IMemoryContext>();

		for (let index in contextsData) {
			let context = MemoryContext.fromJson(this, contextsData[index]);
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
		let contextsData = <MemoryContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<IMemoryContext>();

		for (let index in contextsData) {
			let context = MemoryContext.fromJson(this, contextsData[index]);
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

	private handleMemoryChanged(eventData: string[]): void {
		// let contextId = JSON.parse(eventData[0]);
		// let ranges = <IAddressRange[]>JSON.parse(eventData[1]);

		this.log(`MemoryChanged: ${eventData}`);
	}
}