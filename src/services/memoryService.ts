'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Memory.html

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';


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

	public memoryService: MemoryService;


	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public toString(): string {
		return `${this.Name}`;
	}
}

export interface IMemoryListener extends IContextListener<IMemoryContext> {

}

export class MemoryService extends Service<IMemoryContext, IMemoryListener> {

	public constructor(dispatcher: Dispatcher) {
		super('Memory', dispatcher);
	}

	public getChildren(context: IContext) {

	}

	public setMemory(context: IContext, address: number, wordSize: number, byteCount: number, mode: SetMode, bytes: string): void {

	}

	public getMemory(context: IContext, address: number, wordSize: number, byteCount: number, mode: SetMode): void {

	}


	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			case 'memoryChanged':
				this.handleMemoryChanged(eventData);
				return true;
			default:
				return false;
		}
	}

	private handleMemoryChanged(eventData: string[]): void {
		// let contextId = JSON.parse(eventData[0]);
		// let ranges = <IAddressRange[]>JSON.parse(eventData[1]);

		this.log(`MemoryChanged: ${eventData}`);
	}

	public fromJson(service: MemoryService, data: IMemoryContext): MemoryContext {
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

}