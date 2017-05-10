'use strict';

import { IDispatcher, AbstractService } from './../abstractService';
import { IDeviceContext } from './ideviceContext';
import { IDeviceListener } from './ideviceListener';
import { DeviceContext } from './deviceContext';

export class DeviceService extends AbstractService<IDeviceContext, IDeviceListener> {

	public constructor(dispatcher: IDispatcher) {
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