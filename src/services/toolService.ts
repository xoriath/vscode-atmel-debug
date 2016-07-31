'use strict';

import { Dispatcher, Service } from './service';

export class ToolService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("Tool", dispatcher);
	}

	public pollForTools(shouldPoll: boolean) {
		this.dispatcher.sendCommand(this.name, "pollForTools", [shouldPoll])
	}

	public getSupportedToolTypes(callback: (eventData: string[]) => void) {
		this.dispatcher.sendCommand(this.name, "getSupportedToolTypes", [], (eventData: any) => {
			callback(JSON.parse(eventData));
		});
	}

	public getAttachedTools(toolType: string, callback: (eventData: any) => void) {
		this.dispatcher.sendCommand(this.name, "getAttachedTools", [toolType], callback);
	}

	public setupTool(toolType: string, connectionType: string, connectionProperties: any, callback?: (context: IToolContext) => void ): void {
		this.dispatcher.sendCommand(this.name, "setupTool", [toolType, connectionType, connectionProperties], (errorReport: string, eventData: any) => {
			let context = JSON.parse(eventData);
			if (callback) {
				callback(this.getContext(context));
			}
		})
	}

	public setProperties(contextId: string, properties: any): void {
		this.dispatcher.sendCommand(this.name, "setProperties", [contextId, properties]);
	}

	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			case "attachedToolsChanged":
				this.handleAttachedToolsChanged(eventData);
				break;
			case "contextAdded":
				this.handleContextAdded(eventData);
				break;
			case "contextChanged":
				this.handleContextChanged(eventData);
				break;
			case "contextRemoved":
				this.handleContextRemoved(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

	private handleAttachedToolsChanged(eventData: string[]): void {
		this.attachedTools = <IAttachedTool[]>JSON.parse(eventData[0]);
		this.log(`AttachedToolsChanged: ${eventData}`);


		for (let index in this.listeners) {
			let listener: IToolListener = this.listeners[index];

			listener.attachedToolsChanged(this.attachedTools);
		}
	}

	private handleContextAdded(eventData: string[]): void {
		// TODO: into Service
		let contextsData = <ToolContext[]>JSON.parse(eventData[0])
		let newContexts = []

		for (var index in contextsData) {
			let context = ToolContext.fromJson(this, contextsData[index]);
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
		let contextsData = <ToolContext[]>JSON.parse(eventData[0])
		let newContexts = []

		for (var index in contextsData) {
			let context = ToolContext.fromJson(this, contextsData[index]);
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
		for(var index in ids) {
			let id = ids[index];
			if (id in this.contexts)
				delete this.contexts[id];
		}

		this.log(`ContextRemoved: ${ids}`);

		for (let index in this.listeners) {
			let listener: IToolListener = this.listeners[index];

			listener.contextRemoved(ids);
		}
	}

}