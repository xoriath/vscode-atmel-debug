
'use strict';

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';


// {
// 	"SLine":14,
// 	"ELine":14,
// 	"ECol":512,
// 	"Function":"testfunc2",
// 	"File":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug/.././main.c",
// 	"SAddr":"184",
// 	"EAddr":"185",
// 	"IsStmt":1
// }
export interface ILineNumbersContext extends IContext {
	SLine: number;
	ELine: number;
	ECol: number;
	Function: string;
	File: string;
	SAddr: number;
	EAddr: number;
	IsStmt: number;
}


export class LineNumbersContext implements ILineNumbersContext {

	public ID: string;

	public SLine: number;
	public ELine: number;
	public ECol: number;
	public Function: string;
	public File: string;
	public SAddr: number;
	public EAddr: number;
	public IsStmt: number;

	public setProperties(properties: any): void {

	}

	public getProperties(): Promise<any> {
		return Promise.resolve(); // TODO
	}


	public static fromJson(data: ILineNumbersContext): LineNumbersContext {
		let context = new LineNumbersContext();

		context.ID = data["ID"];
		context.SLine = data["SLine"];
		context.ELine = data["ELine"];
		context.ECol = data["ECol"];
		context.Function = data["Function"];
		context.File = data["File"];
		context.SAddr = data["SAddr"];
		context.EAddr = data["EAddr"];
		context.IsStmt = data["IsStmt"];

		return context;
	}

	public toString(): string {
		return `${this.ID}`;
	}
}

export class LineNumbersService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("LineNumbers", dispatcher);
	}

	public mapToSource(parentContext: string, startAddress: number, endAddress: number): Promise<LineNumbersContext[]> {
		let self = this;

		return new Promise<LineNumbersContext[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, "mapToSource", [parentContext, startAddress, endAddress]).then( (data: string) => {
				let contexts = <LineNumbersContext[]>JSON.parse(data[0]);

				let newContexts = [];
				for (let index in contexts) {
					newContexts.push(LineNumbersContext.fromJson(contexts[index]));
				}

				resolve(newContexts);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}
}