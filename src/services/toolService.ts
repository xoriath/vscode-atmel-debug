'use strict';

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

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

	public setProperties(properties: any): void {
		this.service.setProperties(this.ID, properties);
	}

	public getProperties(callback: (properties: any) => void): void {

	}

	public connect() {
		this.service.connect(this.ID);
	}

	public tearDownTool() {
		this.service.tearDownTool(this.ID);
	}

	public static fromJson(service: ToolService, data: IToolContext): ToolContext {
		let context = new ToolContext();

		context.service = service;

		context.ID = data["ID"];
		context.Name = data["Name"];

		if ("DeviceID" in data) {
			context.DeviceId = data["DeviceId"];
		}

		return context;
	}

	public toString(): string {
		return `${this.ID} (${this.Name})`;
	}

}

export interface IToolListener {
	contextAdded(contexts: IToolContext[]): void;
	contextChanged(contexts: IToolContext[]): void;
	contextRemoved(contextIds: string[]): void;
	attachedToolsChanged(attachedTools: IAttachedTool[]): void;
}

export class ToolService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("Tool", dispatcher);
	}

	public supportedTools: Array<string> = new Array<string>();
	public attachedTools: Array<IAttachedTool> = new Array<IAttachedTool>();

	public contexts: Map<string, IToolContext> = new Map<string, IToolContext>();

	private listeners: Array<IToolListener> = new  Array<IToolListener>();

	public addListener(listener: IToolListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IToolListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value != listener;
		})
	}

	public getContext(id: string): IToolContext {
		return this.contexts[id];
	}

	public pollForTools(shouldPoll: boolean) {
		this.dispatcher.sendCommand(this.name, "pollForTools", [shouldPoll])
	}

	public getSupportedToolTypes(callback: (eventData: string[]) => void) {
		this.dispatcher.sendCommand(this.name, "getSupportedToolTypes", [], (eventData: any) => {
			this.supportedTools = JSON.parse(eventData);
			callback(this.supportedTools);
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

	public connect(id: string): void {
		this.dispatcher.sendCommand(this.name, "connect", [id]);
	}

	public tearDownTool(id: string): void {
		this.dispatcher.sendCommand(this.name, "tearDownTool", [id]);
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