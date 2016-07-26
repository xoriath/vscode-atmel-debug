'use strict';

import { IService, IEventHandler } from './iservice';

import { Dispatcher } from './../dispatcher';

class Service implements IService {
	public name: string;

	protected dispatcher: Dispatcher;

	public constructor(name: string, dispatcher: Dispatcher) {
		this.name = name;
		this.dispatcher = dispatcher;

		this.dispatcher.eventHandler(name, (<IEventHandler>this));
	}

	public eventHandler(event: string, eventData: string): void {
		this.log(`Event handler not implemented for ${this.name}`);
	}

	protected log(message: string): void {
		this.dispatcher.log(`[${this.name}] ${message}`)
	}

}

export { Dispatcher, Service }