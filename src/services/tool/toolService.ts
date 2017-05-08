'use strict';

import { IDispatcher, AbstractService } from './../abstractService';
import { IToolContext } from './itoolContext';
import { ToolContext} from './toolContext';
import { IToolListener } from './itoolListener';
import { IAttachedTool } from './iattachedTool';


export class ToolService extends AbstractService<IToolContext, IToolListener> {

	public constructor(dispatcher: IDispatcher) {
		super('Tool', dispatcher);
	}

	public attachedTools: Array<IAttachedTool> = new Array<IAttachedTool>();

	public getSupportedToolTypes(): Promise<string[]> {
		let self = this;

		return new Promise<string[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getSupportedToolTypes', []).then( (data: string) => {
				let supportedTools = <string[]>JSON.parse(data);
				resolve(supportedTools);
			}).catch(reject);
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
				self.getContext(context).then(resolve).catch(reject);
			}).catch(reject);
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