'use strict';

import { IDeviceContext } from './IDeviceContext';
import { DeviceService } from './DeviceService';

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

	public toString(): string {
		return `${this.ID} => ${this.Name}`;
	}

}