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

	public eventHandler(event: string, eventData: string): void {
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

	private handleAttachedToolsChanged(eventData: string): void {
		// TODO:

		this.log(`AttachedToolsChanged: ${eventData}`);
	}

	private handleContextAdded(eventData: string): void {
		// TODO: into Service

		this.log(`ContextAdded: ${eventData}`);
	}

	private handleContextChanged(eventData: string): void {
		// TODO: into Service

		this.log(`ContextChanged: ${eventData}`);
	}

	private handleContextRemoved(eventData: string): void {
		// TODO: into Service

		this.log(`ContextRemoved: ${eventData}`);
	}

}