'use strict';

import { Dispatcher, Service } from './service';

// NOTE: Not really implemented to spec
export class StreamService extends Service {

	public constructor(dispatcher: Dispatcher) {
		super("Stream", dispatcher);
	}

	public setLogBits(level: number) {
		// level is a bitmask
		this.dispatcher.sendCommand(this.name, "setLogBits", [level]);
	}

	public eventHandler(event: string, eventData: string[]): void {
		switch(event) {
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}
}