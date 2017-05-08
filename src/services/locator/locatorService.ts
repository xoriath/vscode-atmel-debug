'use strict';

import { IDispatcher } from './../abstractService';
import { IEventHandler } from './../iservice';
import { IPeer } from './ipeer';

export class LocatorService implements IEventHandler {

	public peers: Array<IPeer> = new Array<IPeer>();
	public services: Array<string> = new Array<string>();

	private onHelloCallback: () => void;
	private dispatcher: IDispatcher;
	private name = 'Locator';

	public constructor(dispatcher: IDispatcher) {
		this.dispatcher = dispatcher;
	}

	private log(message: string): void {
		this.dispatcher.log(`[${this.name}] ${message}`);
	}

	public sync(): Promise<any> {
		return this.dispatcher.sendCommand(this.name, 'sync', []);
	}

	public hello(callback?: () => void): void {
		this.dispatcher.sendEvent(this.name, 'Hello', [[]]);

		if (callback) {
			this.onHelloCallback = callback;
		}
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

	public eventHandler(event: string, eventData: string[]): boolean {
		switch (event) {
			case 'peerAdded':
				this.handlePeerAdded(eventData);
				return true;
			case 'peerChanged':
				this.handlePeerChanged(eventData);
				return true;
			case 'peerRemoved':
				this.handlePeerRemoved(eventData);
				return true;
			case 'peerHeartBeat':
				this.handlePeerHeartBeat(eventData);
				return true;
			case 'Hello':
				this.handleHello(eventData);
				return true;
			default:
				this.log(`No matching event handler: ${event}`);
				return false;
		}
	}
}