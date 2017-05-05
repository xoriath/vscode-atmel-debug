
'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Stack%20Trace.html

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

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

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public toString(): string {
		return `${this.ID}`;
	}
}

export interface IStackTraceListener extends IContextListener<IStackTraceContext> {

}


export class StackTraceService extends Service<IStackTraceContext, IStackTraceListener> {

	public constructor(dispatcher: Dispatcher) {
		super('StackTrace', dispatcher);
	}

	public getChildren(parentContext: string): Promise<string[]> {
		let self = this;

		return new Promise<string[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getChildren', [parentContext]).then( (data: string) => {
				let contextIds = <string[]>JSON.parse(data);
				resolve(contextIds);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public getContext(contextId: string): Promise<StackTraceContext> {
		let self = this;
		return new Promise<StackTraceContext>( (resolve, reject) => {
			self.getContexts([contextId])
				.then( contexts => resolve(contexts[0]))
				.catch( reason => reject(reason));
		});
	}

	public getContexts(contextIds: string[]): Promise<StackTraceContext[]> {
		let self = this;

		return new Promise<StackTraceContext[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getContext', [contextIds]).then( (data: string) => {
				let contextsData = <StackTraceContext[]>JSON.parse(data);
				let newContexts = new Array<IStackTraceContext>();

				for (let index in contextsData) {
					let context = self.fromJson(self, contextsData[index]);
					this.contexts[context.ID] = context;
					newContexts.push(context);
				}

				resolve(newContexts);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
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


	public fromJson(service: StackTraceService, data: IStackTraceContext): StackTraceContext {
		let context = new StackTraceContext();

		context.ID = data['ID'];
		context.Level = data['Level'];
		context.IP = data['IP'];
		context.ArgsString = data['ArgsString'];
		context.Func = data['Func'];
		context.File = data['File'];
		context.Line = data['Line'];
		context.Args = <IStackTraceContextArgs[]>data['Args'];

		return context;
	}

}