'use strict';

import { IEventHandler } from './services/IService';

export interface IDispatcher {
	connect(callback: (dispatcher: IDispatcher) => void): void;
	sendCommand(serviceName: string, commandName: string, args: any[]): Promise<string>;
	eventHandler(service: string, handler: IEventHandler): void;
	sendEvent(serviceName: string, eventName: string, args: any[]): void;

	log(data: string): void;
	debug(data: string): void;
}