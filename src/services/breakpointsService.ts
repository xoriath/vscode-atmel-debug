
'use strict';

 // http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Breakpoints.html

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

export enum AccessMode {
	Read = 0x01,
	Write = 0x02,
	Execute = 0x04,
	Change = 0x08
}

export interface IBreakpoint extends IContext {
	Enabled: boolean;
	AccessMode: AccessMode;
	File: string;
	Line: number;
	Column: number;
	Address: number;
	HitCount: number;
}


export class BreakpointContext implements IBreakpoint {

	public ID: string;
	public Enabled: boolean;
	public AccessMode: AccessMode;
	public File: string;
	public Line: number;
	public Column: number;
	public Address: number;
	public HitCount: number;

	private service: BreakpointsService;

	public setProperties(properties: any): void {

	}

	public getProperties(callback: (properties: any) => void): void {

	}

	public remove(): void {
		this.service.remove(this.ID);
	}

	public static fromJson(service: BreakpointsService, data: IBreakpoint): BreakpointContext {
		let context = new BreakpointContext();

		context.service = service;

		context.ID = data["ID"];
		context.AccessMode = data["AccessMode"];
		context.Enabled = data["Enabled"];
		context.File =  data["File"];
		context.Line = data["Line"];
		context.Column = data["Column"];
		context.Address = +data["Address"];
		context.HitCount = data["HitCount"];

		return context;
	}

	public toString(): string {
		if (this.ID) {
			return `${this.ID}`;
		}
		else {
			return "";
		}
	}
}

export class BreakpointsService extends Service {

	private contextCounter: number;

	public constructor(dispatcher: Dispatcher) {
		super("Breakpoints", dispatcher);

		this.contextCounter = 0;
	}

	public add(parameters: any): void {
		this.dispatcher.sendCommand(this.name, "add", [parameters]);
	}

	public getProperties(contextId: string, callback: (breakpoint: BreakpointContext) => void): void {
		this.dispatcher.sendCommand(this.name, "getProperties", [contextId], (errorReport, eventData) => {
			let data = <BreakpointContext>JSON.parse(eventData);
			let breakpoint = BreakpointContext.fromJson(this, data);

			callback(breakpoint);
		})
	}

	public getError(contextId: string, callback: (error:any) => void): void {
		this.dispatcher.sendCommand(this.name, "getError", [contextId], (errorReport, eventData) => {
			callback(eventData); // TODO; what is in this field?
		})
	}

	public remove(contextId: string): void {
		this.dispatcher.sendCommand(this.name, "remove", [contextId]);
	}

	public getNextBreakpointId(): number {
		return ++this.contextCounter;
	}

	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}
}