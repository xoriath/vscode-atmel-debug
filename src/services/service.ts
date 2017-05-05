'use strict';

import { IService, IEventHandler } from './iservice';
import { IContext, IContextListener } from './icontext';

import { Dispatcher } from './../dispatcher';

abstract class Service<TContext extends IContext, TListener extends IContextListener<TContext>> implements IService {
	public name: string;
	protected dispatcher: Dispatcher;

	public contexts: Map<string, TContext> = new Map<string, TContext>();
	protected listeners: Array<TListener> = new  Array<TListener>();


	public constructor(name: string, dispatcher: Dispatcher) {
		this.name = name;
		this.dispatcher = dispatcher;

		this.dispatcher.eventHandler(name, (<IEventHandler>this));
	}

	protected log(message: string): void {
		this.dispatcher.log(`[${this.name}] ${message}`);
	}

	abstract fromJson(service: IService, data: TContext): TContext;

	public eventHandler(event: string, eventData: string[]): boolean {
		switch (event) {
			case 'contextAdded':
				this.handleContextAdded(eventData);
				return true;
			case 'contextChanged':
				this.handleContextChanged(eventData);
				return true;
			case 'contextRemoved':
				this.handleContextRemoved(eventData);
				return true;
			default:
				return false;
		}
	}

	private handleContextAdded(eventData: string[]): void {
		let self = this;

		let contextsData = <TContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<TContext>();

		contextsData.forEach(contextData => {
			let context = self.fromJson(self, contextData);
			this.contexts[context.ID] = context;
			newContexts.push(context);
		});

		this.log(`ContextAdded: ${newContexts}`);

		this.listeners.forEach(listener => {
			listener.contextAdded(newContexts);
		});
	}

	private handleContextChanged(eventData: string[]): void {
		let self = this;

		let contextsData = <TContext[]>JSON.parse(eventData[0]);
		let newContexts = new Array<TContext>();

		contextsData.forEach(contextData => {
			let context = self.fromJson(self, contextData);
			this.contexts[context.ID] = context;
			newContexts.push(context);
		});

		this.log(`ContextAdded: ${newContexts}`);

		this.listeners.forEach(listener => {
			listener.contextChanged(newContexts);
		});
	}

	private handleContextRemoved(eventData: string[]): void {
		let ids = <string[]>JSON.parse(eventData[0]);

		ids.forEach(id => {
			if (id in this.contexts) {
				delete this.contexts[id];
			}
		});

		this.log(`ContextRemoved: ${ids}`);

		this.listeners.forEach(listener => {
			listener.contextRemoved(ids);
		});
	}


	public addListener(listener: TListener): void {
		this.listeners.push(listener);
	}

	public removeListener(listener: TListener): void {
		this.listeners = this.listeners.filter( (value) => {
			return value !== listener;
		});
	}

	public getContext(id: string): Promise<TContext> {
		return Promise.resolve(this.contexts[id]);
	}


}

export { Dispatcher, Service }