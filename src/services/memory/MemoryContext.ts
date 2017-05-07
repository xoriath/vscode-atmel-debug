'use strict';

import { IMemoryContext } from './IMemoryContext';
import { MemoryService } from './MemoryService';

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