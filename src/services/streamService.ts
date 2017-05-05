'use strict';

import { Dispatcher } from './service';

// NOTE: Not really implemented to spec
export class StreamService {

	private dispatcher: Dispatcher;

	public constructor(dispatcher: Dispatcher) {
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