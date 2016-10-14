
'use strict';

import { Dispatcher, Service } from './service';
import { IContext } from './icontext';


// {
// 	"ID":"g_1",
// 	"Numchildren":0,
// 	"Val":"0 '\\000'\n",
// 	"CanAssign":true,
// 	"Expression":"testfunc2_local",
// 	"ExprPath":"testfunc2_local",
// 	"FormatString":"",
// 	"Type":"uint8_t(a complex DWARF expression:\n     0: DW_OP_breg28 1 [$r28]\n.\n)",
// 	"Size":1
// }
export interface IExpressionContext extends IContext {
	Numchildren: number;
	Val: string;
	CanAssign: boolean;
	Expression: string;
	ExprPath: string;
	FormatString: string;
	Type: string;
	Size: number;
}


export class ExpressionContext implements IExpressionContext {

	public ID: string;
	public Numchildren: number;
	public Val: string;
	public CanAssign: boolean;
	public Expression: string;
	public ExprPath: string;
	public FormatString: string;
	public Type: string;
	public Size: number;

	private service: ExpressionsService;

	public setProperties(properties: any): void {

	}

	public getProperties(): Promise<any> {
		return Promise.resolve(); // TODO?
	}

	public assign(value: string): Promise<string> {
		return this.service.assign(this.ID, value);
	}


	public static fromJson(service: ExpressionsService, data: IExpressionContext): ExpressionContext {
		let context = new ExpressionContext();

		context.service = service;

		context.ID = data["ID"];
		context.Numchildren = data["Numchildren"];
		context.Val = data["Val"];
		context.CanAssign = data["CanAssign"];
		context.Expression = data["Expression"];
		context.ExprPath = data["ExprPath"];
		context.FormatString = data["FormatString"];
		context.Type = data["Type"];
		context.Size = data["Size"];

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

	public dispose(): void {
		if (this.service)
			this.service.dispose(this.ID);
	}
}

export class ExpressionsService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("Expressions", dispatcher);
	}

	public getChildren(parentContext: string): Promise<string[]> {
		let self = this;

		return new Promise<string[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, "getChildren", [parentContext]).then( (data: string) => {
				resolve(<string[]>JSON.parse(data));
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public getContext(contextId: string): Promise<ExpressionContext> {
		let self = this;

		return new Promise<ExpressionContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, "getContext", [contextId]).then( (data: string) => {
				let contextData = <ExpressionContext>JSON.parse(data);
				let context = ExpressionContext.fromJson(self, contextData);
				resolve(context);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public compute(contextId: string, language: string, expression: string): Promise<ExpressionContext> {
		let self = this;

		return new Promise<ExpressionContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, "compute", [contextId, language, expression]).then( (data: string) => {
				let contextData = <ExpressionContext>JSON.parse(data);
				let context = ExpressionContext.fromJson(self, contextData);
				resolve(context);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public assign(contextId: string, value: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "assign", [contextId, value]);
	}

	public dispose(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, "dispose", [contextId]);
	}



	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}
}