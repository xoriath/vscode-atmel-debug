'use strict';

import { Dispatcher, Service } from './service';

// From http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Specification.html#LocatorPeer
export interface IPeer {
	ID: string;
	ServiceManagerID?: string;
	AgentID?: string;
	Name?: string;
	OSName?: string;
	TransportName?: string;
	Host?: string;
	Aliases?: string;
	Addresses?: string;
	Port?: string;
}

export class LocatorService extends Service {

	public peers: Array<IPeer> = new Array<IPeer>();
	public services: Array<string> = new Array<string>();

	private onHelloCallback: () => void;

	public constructor(dispatcher: Dispatcher) {
		super("Locator", dispatcher);
	}

	public sync(): Promise<any> {
		return this.dispatcher.sendCommand(this.name, "sync", []);
	}

	public hello(callback?: () => void): void {
		this.dispatcher.sendEvent(this.name, "Hello", [[]]);

		if (callback)
			this.onHelloCallback = callback;
	}

	private handlePeerAdded(eventData: string[]): void {
		let peer = <IPeer>JSON.parse(eventData[0]);
		this.peers.push(peer);

		this.log(`New peer: ${peer}`);
	}

	private handlePeerChanged(eventData: string[]): void {
		// TODO:

		this.log(`Changed peer: ${eventData}`);
	}

	private handlePeerRemoved(eventData: string[]): void {
		// TODO:

		this.log(`Removed peer: ${eventData}`);
	}

	private handlePeerHeartBeat(eventData: string[]): void {
		// TODO:

		this.log(`Heartbeat: ${eventData}`);
	}

	private handleHello(eventData: string[]): void {
		this.services = JSON.parse(eventData[0]);

		this.log(`Hello: ${this.services}`);

		if (this.onHelloCallback) {
			this.onHelloCallback();
		}
	}

	public eventHandler(event: string, eventData: string[]): void {
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