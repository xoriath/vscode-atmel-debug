'use strict';

import { Dispatcher, Service } from './service';

export class LocatorService extends Service {

	public peers: Array<string> = new Array<string>();
	public services: Array<string> = new Array<string>();

	private onHelloCallback: () => void;

	public constructor(dispatcher: Dispatcher) {
		super("Locator", dispatcher);
	}

	public sync(callback?: (eventData: any) => void): void {
		this.dispatcher.sendCommand(this.name, "sync", [], callback)
	}

	public hello(callback?: () => void): void {
		this.dispatcher.sendEvent(this.name, "Hello", [[]]);

		if (callback)
			this.onHelloCallback = callback;
	}

	private handlePeerAdded(eventData: string): void {
		this.peers.push(eventData);

		this.log(`New peer: ${eventData}`);
	}

	private handlePeerChanged(eventData: string): void {
		// TODO:

		this.log(`Changed peer: ${eventData}`);
	}

	private handlePeerRemoved(eventData: string): void {
		// TODO:

		this.log(`Removed peer: ${eventData}`);
	}

	private handlePeerHeartBeat(eventData: string): void {
		// TODO:

		this.log(`Heartbeat: ${eventData}`);
	}

	private handleHello(eventData: string): void {
		this.services = JSON.parse(eventData);

		this.log(`Hello: ${this.services}`);

		if (this.onHelloCallback) {
			this.onHelloCallback();
		}
	}

	public eventHandler(event: string, eventData: string): void {
		switch(event) {
			case "peerAdded":
				this.handlePeerAdded(eventData);
				break;
			case "peerChanged":
				this.handlePeerChanged(eventData);
				break;
			case "peerRemoved":
				this.handlePeerRemoved(eventData);
				break;
			case "peerHeartBeat":
				this.handlePeerHeartBeat(eventData);
				break;
			case "Hello":
				this.handleHello(eventData);
				break;
			default:
				this.log(`No matching event handler: ${event}`);
		}
	}

}