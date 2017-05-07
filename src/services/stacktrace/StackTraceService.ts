
'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Stack%20Trace.html

import { IDispatcher, AbstractService } from './../AbstractService';
import { IStackTraceContext } from './IStackTraceContext';
import { StackTraceContext } from './StackTraceContext';
import { IStackTraceListener } from './IStackTraceListener';
import { IFrameArg } from './IFrameArg';

export class StackTraceService extends AbstractService<IStackTraceContext, IStackTraceListener> {

	public constructor(dispatcher: IDispatcher) {
		super('StackTrace', dispatcher);
	}

	public getChildren(parentContext: string): Promise<IStackTraceContext[]> {
		let self = this;

		return new Promise<IStackTraceContext[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getChildren', [parentContext]).then( (data: string) => {
				let contextIds = <string[]>JSON.parse(data);
				self.getContexts(contextIds).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	public getContext(contextId: string): Promise<StackTraceContext> {
		let self = this;
		return new Promise<StackTraceContext>( (resolve, reject) => {
			self.getContexts([contextId])
				.then( contexts => resolve(contexts[0]))
				.catch(reject);
		});
	}


	public getContexts(contexts: StackTraceContext[] | string[]): Promise<StackTraceContext[]> {
		let self = this;
		let ids: string[];
		if (contexts instanceof StackTraceContext[]) {
			ids = (<StackTraceContext[]>contexts).map(context => context.ID);
		} else {
			ids = <string[]>contexts;
		}

		return new Promise<StackTraceContext[]>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'getContext', [ids]).then( (data: string) => {
				let contextsData = <StackTraceContext[]>JSON.parse(data);
				let newContexts = new Array<IStackTraceContext>();

				for (let index in contextsData) {
					let context = self.fromJson(self, contextsData[index]);
					this.contexts[context.ID] = context;
					newContexts.push(context);
				}

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


	public fromJson(service: StackTraceService, data: IStackTraceContext): StackTraceContext {
		let context = new StackTraceContext();

		context.ID = data['ID'];
		context.Level = data['Level'];
		context.IP = data['IP'];
		context.ArgsString = data['ArgsString'];
		context.Func = data['Func'];
		context.File = data['File'];
		context.Line = data['Line'];
		context.Args = <IFrameArg[]>data['Args'];

		return context;
	}
}