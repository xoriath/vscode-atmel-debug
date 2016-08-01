
'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Stack%20Trace.html

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';

	// { "ID": "gdbProc_3:0:210",
	//   "Level": 0,
	//   "IP": 210,
	//   "ArgsString": "",
	//   "Func": "main",
	//   "File": "c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c\n",
	//   "Line": 24,
	//   "Args": [] }
export interface IStackTraceContext extends IContext {
	Level: number;
	IP: number;
	ArgsString: string;
	Func: string;
	File: string;
	Line: number;
	Args: IStackTraceContextArgs[];
}

export interface IStackTraceContextArgs {
	Name: string;
	Order: number;
	Type: string;
	Value: string;
}


export class StackTraceContext implements IStackTraceContext {

	public ID: string;
	public Level: number;
	public IP: number;
	public ArgsString: string;
	public Func: string;
	public File: string;
	public Line: number;

	public Args: IStackTraceContextArgs[];

	public setProperties(properties: any): void {

	}

	public getProperties(callback: (properties: any) => void): void {

	}


	public static fromJson(data: IStackTraceContext): StackTraceContext {
		let context = new StackTraceContext();

		context.ID = data["ID"];
		context.Level = data["Level"];
		context.IP = data["IP"];
		context.ArgsString = data["ArgsString"];
		context.Func = data["Func"];
		context.File = data["File"];
		context.Line = data["Line"];
		context.Args = <IStackTraceContextArgs[]>data["Args"];

		return context;
	}

	public toString(): string {
		return `${this.ID}`;
	}
}

export interface IStackTraceListener {

}


export class StackTraceService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("StackTrace", dispatcher);
	}

	public contexts: Map<string, StackTraceContext> = new Map<string, StackTraceContext>();

	private listeners: Array<IStackTraceListener> = new Array<IStackTraceListener>();

	public addListener(listener: IStackTraceListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: IStackTraceListener): void {
		this.listeners = this.listeners.filter( (value, index, array): boolean => {
			return value != listener;
		})
	}

	public getChildren(parentContext: string, callback: (children: string[]) => void): void {

		this.dispatcher.sendCommand(this.name, "getChildren", [parentContext], (errorReport, eventData) => {
			let contextIds = <string[]>JSON.parse(eventData);
			callback(contextIds);

		});
	}

	public getContext(contextIds: string[], callback: (frames: StackTraceContext[]) => void): void {
		this.dispatcher.sendCommand(this.name, "getContext", [contextIds], (errorReport, eventData) => {
			if (!eventData) {
				let error = JSON.parse(errorReport);
				throw `${error["Service"]}: ${error["Format"]}`;
			}

			else {
				let contextsData = <StackTraceContext[]>JSON.parse(eventData);
				let newContexts = [];

				for (let index in contextsData) {
					newContexts.push(StackTraceContext.fromJson(contextsData[index]))
				}

				callback(newContexts);
			}
		});
	}

	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}
}