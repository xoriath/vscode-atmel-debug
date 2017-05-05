'use strict';

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

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

	public toString(): string {
		return `${this.ID} => ${this.Name}`;
	}

}

export interface IDeviceListener extends IContextListener<IDeviceContext> {

}

export class DeviceService extends Service<IDeviceContext, IDeviceListener> {

	public constructor(dispatcher: Dispatcher) {
		super('Device', dispatcher);
	}

	public setProperties(contextId: string, properties: any): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'setProperties', [contextId, properties]);
	}

	public getProperties(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'getProperties', [contextId]); // TODO; marshal into Context
	}

	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			default:
				return false;
		}
	}

	public fromJson(service: DeviceService, data: IDeviceContext): IDeviceContext {
		let context = new DeviceContext();

		context.deviceService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];
		context.Session = data['Session'];
		context.MemoryIDs = data['MemoryIDs'];
		context.RunControlID = data['RunControlID'];

		return context;
	}
}