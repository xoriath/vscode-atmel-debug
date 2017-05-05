'use strict';

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

export interface IConnectionProperties {
	Type: string;
	SerialNumber: string;
	UsbVendorId: string;
	UsbProductId: number;
}

export interface IAttachedTool {
	ToolType: string;
	ConnectionProperties?: IConnectionProperties;
}

export interface IToolContext extends IContext {
	Name: string;
	DeviceId?: string;

	toString(): string;

	connect(): void;
	tearDownTool(): void;
}

export class ToolContext implements IToolContext {

	public ID: string;
	public Name: string;

	public DeviceId: string;

	public service: ToolService;

	public properties: any;

	public setProperties(properties: any): Promise<any> {
		return this.service.setProperties(this.ID, properties);
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public connect() {
		this.service.connect(this.ID);
	}

	public tearDownTool() {
		this.service.tearDownTool(this.ID);
	}

	public toString(): string {
		return `${this.ID} (${this.Name})`;
	}

}

export interface IToolListener extends IContextListener<IToolContext> {
	attachedToolsChanged(attachedTools: IAttachedTool[]): void;
}

export class ToolService extends Service<IToolContext, IToolListener> {

	public constructor(dispatcher: Dispatcher) {
		super('Tool', dispatcher);
	}

	public attachedTools: Array<IAttachedTool> = new Array<IAttachedTool>();

	public getSupportedToolTypes(): Promise<string[]> {
		let self = this;

		return new Promise<string[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getSupportedToolTypes', []).then( (data: string) => {
				let supportedTools = <string[]>JSON.parse(data);
				resolve(supportedTools);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public pollForTools(shouldPoll: boolean) {
		this.dispatcher.sendCommand(this.name, 'pollForTools', [shouldPoll]);
	}

	// TODO; parse any
	public getAttachedTools(toolType: string): Promise<any> {
		return this.dispatcher.sendCommand(this.name, 'getAttachedTools', [toolType]);
	}

	public setupTool(toolType: string, connectionType: string, connectionProperties: any): Promise<IToolContext> {
		let self = this;

		return new Promise<IToolContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'setupTool', [toolType, connectionType, connectionProperties]).then( (data: string) => {
				let context = JSON.parse(data);

				resolve(self.getContext(context));
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public connect(id: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'connect', [id]);
	}

	public tearDownTool(id: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'tearDownTool', [id]);
	}

	public setProperties(contextId: string, properties: any): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'setProperties', [contextId, properties]);
	}

	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			case 'attachedToolsChanged':
				this.handleAttachedToolsChanged(eventData);
				return true;
			default:
				return false;
		}
	}

	private handleAttachedToolsChanged(eventData: string[]): void {
		this.attachedTools = <IAttachedTool[]>JSON.parse(eventData[0]);
		this.log(`AttachedToolsChanged: ${eventData}`);


		this.listeners.forEach(listener => {
			listener.attachedToolsChanged(this.attachedTools);
		});
	}

	public fromJson(service: ToolService, data: IToolContext): ToolContext {
		let context = new ToolContext();

		context.service = service;

		context.ID = data['ID'];
		context.Name = data['Name'];

		if ('DeviceID' in data) {
			context.DeviceId = data['DeviceId'];
		}

		return context;
	}
}