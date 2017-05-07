
'use strict';

import { IDispatcher, AbstractService } from './../AbstractService';
import { IExpressionContext } from './IExpressionContext';
import { ExpressionContext } from './ExpressionContext';
import { IExpressionListener } from './IExpressionListener';

import { IStackTraceContext } from './../stacktrace/IStackTraceContext';


export class ExpressionService extends AbstractService<IExpressionContext, IExpressionListener> {

	public constructor(dispatcher: IDispatcher) {
		super('Expressions', dispatcher);
	}

	public getChildren(parentContext: string): Promise<IExpressionContext[]> {
		let self = this;

		return new Promise<IExpressionContext[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getChildren', [parentContext]).then( (data: string) => {
				let contextIds = <string[]>JSON.parse(data);
				let contexts = contextIds.map( (contextId) => self.getContext(contextId) );

				Promise.all(contexts).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	public getContext(contextId: string): Promise<IExpressionContext> {
		let self = this;

		return new Promise<IExpressionContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getContext', [contextId]).then( (data: string) => {
				let contextData = JSON.parse(data);
				let context = self.fromJson(self, contextData);
				this.contexts[context.ID] = context;
				resolve(context);
			}).catch(reject);
		});
	}

	public compute(context: IStackTraceContext, language: string, expression: string): Promise<IExpressionContext> {
		let self = this;

		return new Promise<IExpressionContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'compute', [context.ID, language, expression]).then( (data: string) => {
				let contextData = JSON.parse(data);
				let context = self.fromJson(self, contextData);
				resolve(context);
			}).catch(reject);
		});
	}

	public assign(contextId: string, value: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'assign', [contextId, value]);
	}

	public dispose(contextId: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'dispose', [contextId]);
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

	public fromJson(service: ExpressionService, data: IExpressionContext): IExpressionContext {
		let context = new ExpressionContext();

		context.service = service;

		context.ID = data['ID'];
		context.Numchildren = data['Numchildren'];
		context.Val = data['Val'];
		context.CanAssign = data['CanAssign'];
		context.Expression = data['Expression'];
		context.ExprPath = data['ExprPath'];
		context.FormatString = data['FormatString'];
		context.Type = data['Type'];
		context.Size = data['Size'];

		return context;
	}

}