
'use strict';

import { IDispatcher, AbstractService } from './../abstractService';
import { ILineNumberContext } from './ilineNumberContext';
import { LineNumberContext } from './lineNumberContext';
import { ILineNumberListener } from './ilineNumberListener';



export class LineNumberService extends AbstractService<ILineNumberContext, ILineNumberListener> {

	public constructor(dispatcher: IDispatcher) {
		super('LineNumbers', dispatcher);
	}

	public mapToSource(parentContext: string, startAddress: number, endAddress: number): Promise<ILineNumberContext[]> {
		let self = this;

		return new Promise<ILineNumberContext[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'mapToSource', [parentContext, startAddress, endAddress]).then( (data: string) => {
				let contexts = <any[]>JSON.parse(data[0]);

				let newContexts = new Array<ILineNumberContext>();
				contexts.forEach(context => {
					newContexts.push(self.fromJson(self, context));
				});

				resolve(newContexts);
			}).catch(reject);
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

	public fromJson(service: LineNumbersService, data: any): ILineNumberContext {
		let context = new LineNumberContext();

		context.ID = data['ID'];
		context.SLine = data['SLine'];
		context.ELine = data['ELine'];
		context.ECol = data['ECol'];
		context.Function = data['Function'];
		context.File = data['File'];
		context.SAddr = data['SAddr'];
		context.EAddr = data['EAddr'];
		context.IsStmt = data['IsStmt'];

		return context;
	}
}