'use strict';

export interface IService extends IEventHandler {
	name: string;

}

export interface IEventHandler {
	eventHandler(event: string, eventData: string[]): void;
}