'use strict';

import { IDispatcher, AbstractService } from './../AbstractService';
import { IMemoryContext } from './IMemoryContext';
import { IMemoryListener } from './IMemoryListener';
import { MemoryContext } from './MemoryContext';

import { SetMode } from './SetMode';


export class MemoryService extends AbstractService<IMemoryContext, IMemoryListener> {

	public constructor(dispatcher: IDispatcher) {
		super('Memory', dispatcher);
	}

	public getChildren(context: IMemoryContext) {

	}

	public setMemory(context: IMemoryContext, address: number, wordSize: number, byteCount: number, mode: SetMode, bytes: string): void {

	}

	public getMemory(context: IMemoryContext, address: number, wordSize: number, byteCount: number, mode: SetMode): void {

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

	public fromJson(service: MemoryService, data: IMemoryContext): IMemoryContext {
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