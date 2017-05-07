'use strict';

import { IDispatcher } from './../AbstractService';

// NOTE: Not really implemented to spec
export class StreamService {

	private dispatcher: IDispatcher;

	public constructor(dispatcher: IDispatcher) {
		this.dispatcher = dispatcher;
	}

	public setLogBits(level: number): Promise<string> {
		// level is a bitmask
		return this.dispatcher.sendCommand('Stream', 'setLogBits', [level]);
	}

	public eventHandler(event: string, eventData: string[]): void {
		switch (event) {
			default:
				this.dispatcher.log(`[Stream] No matching event handler: ${event}`);
		}
	}
}