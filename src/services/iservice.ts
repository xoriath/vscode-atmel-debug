'use strict';

export interface IService extends IEventHandler {
	name: string;

}

export interface IEventHandler {
	eventHandler(event: string, eventData: string[]): void;
}

export interface IProgressEventHandler {
	progress(progress: number, max: number, text?: string): void;
}

export interface ICongestionHandler {
	congestion(level: number): void;
}