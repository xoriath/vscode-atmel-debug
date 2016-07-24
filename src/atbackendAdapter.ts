'use strict';

import * as WebSocket from 'ws';


export default class AtbackendAdapter {

	private client: WebSocket;

	private host: string;
	private port: number;

	public constructor(host: string, port: number) {

		this.host = host;
		this.port = port;

	}

	public connect(): void {
		let url = "ws://" + this.host + ":" + this.port;
		console.error("Connect to: " + url + '\n');

		this.client = new WebSocket(url);

		this.client.on('error', (error) => {
			console.error(error + "\n");
		});

		this.client.on('close', (code, message) => {
			console.error("close: " + code + " => " + message + "\n");
		});

		this.client.on('message', (data:string, flags) => {
			this.decodeTcfMessage(data);
		});
	}

	private decodeTcfMessage(data:string): void {
		let message = data[0];
		let messageData = data.substr(2);

		switch (message) {
			case 'E':
			    this.decodeEvent(messageData);
				break;
			case 'P':
				this.decodeIntermediateResult(messageData);
				break;
			case 'R':
				this.decodeFinalResult(messageData);
				break;
			case 'N':
				this.decodeUnknown(messageData);
				break;
			case 'F':
				this.decodeFlowControl(messageData);
				break;
			case 'C':
				this.decodeCommand(messageData);
				break;
			default:
				console.error("Unkown TCF message: '" + message + "'\n");
				break;
		}
	}

	private decodeEvent(data: string): void {
		let parts = data.split("\0");
		let serviceName = parts[0];
		let eventName = parts[1];
		let eventData = JSON.parse(parts[2]);

	}


	private decodeIntermediateResult(data: string): void {
		this.decodeResult(data);
	}

	private decodeFinalResult(data: string): void {
		this.decodeResult(data);
	}

	private decodeUnknown(data: string): void {
		this.decodeResult(data);
	}

	private decodeResult(data: string): void {
		let parts = data.split("\0");
		let token = +parts[0];
		let eventData = JSON.parse(parts[1]);

	}

	private decodeFlowControl(data: string): void {
		let parts = data.split("\0");
		let congestion = +parts[0];

	}

	private decodeCommand(data: string): void {
		let parts = data.split("\0");
		let token = +parts[0];
		let serviceName = parts[1];
		let commandName = parts[2];
		let commandData = JSON.parse(parts[3]);

	}
}
