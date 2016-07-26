'use strict';

import * as WebSocket from 'ws';

import { IEventHandler } from './services/iservice';

export class Dispatcher {

	private ws: WebSocket;

	private host: string;
	private port: number;

	private sendToken: number = 1;

	private nil: string = '\x00';
	private eom: string = '\x03\x01';

	private pendingHandlers: Map<number, (eventData: string) => void>
		= new Map<number, (eventData: string) => void>();
	private eventHandlers: Map<string, IEventHandler>
		= new Map<string, IEventHandler>();

	private logger: (message: string) => void;

	public constructor(host: string, port: number, logger?: (message: string) => void) {
		this.host = host;
		this.port = port;

		if (logger)
			this.logger = logger;
	}

	public log(data: string): void {
		if (this.logger) {
			this.logger(`${data}\n\r`);
		}
		else {
			console.error(`${data}\n\r`);
		}
	}

	public connect(callback:(dispatcher: Dispatcher) => void): void {
		let url = "ws://" + this.host + ":" + this.port;
		this.log(`[Dispatcher] Connect to: ${url}`);

		this.ws = new WebSocket(url);

		this.ws.on('error', (error) => {
			this.log(`[Dispatcher] WS:error: ${error}`);
		});

		this.ws.on('close', (code, message) => {
			this.log(`[Dispatcher] WS:close: ${code} => ${message}`);
		});

		this.ws.on('message', (data:string, flags) => {
			this.handleMessage(data);
		});

		this.ws.on('open', () => {
			callback(this);
		});

	}

	public escapeNil(str: string): string {
		var ret = "";
		for(var i = 0; i < str.length; ++i) {
			if (str.charAt(i) == this.nil)
				ret += (' ');
			else if (str.charAt(i) == '\x03')
				ret += ('<');
			else if (str.charAt(i) == '\x01')
				ret += ('>');
			else
				ret += str.charAt(i);
		}

		return ret;
	}

	public eventHandler(service: string, handler: IEventHandler): void {
		this.log(`[Dispatcher] Registering event handler for ${service}`);
		this.eventHandlers[service] = handler;
	}

	private sendMessage(message: string): void {
		this.log(`>> ${this.escapeNil(message).substring(0, 80)}`);

		this.ws.send(message);
	}

	public sendCommand(serviceName: string, commandName: string, args: any[], callback?: (eventData: any) => void): void {
		let token = this.sendToken++;

		if (callback)
			this.pendingHandlers[token] = callback;

		this.sendMessage(`C${this.nil}${token}${this.nil}${serviceName}${this.nil}${commandName}${this.nil}${this.stringify(args)}${this.eom}`);
	}

	public sendEvent(serviceName: string, eventName: string, args: any[]): void {
		this.sendMessage(`E${this.nil}${serviceName}${this.nil}${eventName}${this.nil}${this.stringify(args)}${this.eom}`);
	}

	private stringify(args: any[]): string {
		var str = "";
		if (args) {
			for(var index in args) {
				str += JSON.stringify(args[index]) + this.nil;
			}
		}

		return str;
	}

	private unstringify(data: string[]): any[] {
		var args = []
		for(var index in data) {
			var element = data[index];
			if (element == "")
				args.push(null);
			else
				args.push(JSON.parse(element));
		}

		return args;
	}

	private handleMessage(data: string): void {
		this.log(`<< ${this.escapeNil(data).substring(0, 80)}`);

		let elements = data.split(this.nil);

		if (elements.length < 3) {
			throw "Message has too few parts";
		}
		if (elements.pop() != this.eom) {
			throw "Message has bad termination";
		}

		let message = elements.shift();

		switch (message) {
			case 'E':
			    this.decodeEvent(elements);
				break;
			case 'P':
				this.decodeIntermediateResult(elements);
				break;
			case 'R':
				this.decodeFinalResult(elements);
				break;
			case 'N':
				this.decodeUnknown(elements);
				break;
			case 'F':
				this.decodeFlowControl(elements);
				break;
			default:
				this.log("Unkown TCF message: '" + message + "'\n");
				break;
		}
	}

	private decodeEvent(data: string[]): void {
		let serviceName = data[0];
		let eventName = data[1];
		let eventData = data[2];

		this.handleEvent(serviceName, eventName, eventData);
	}


	private decodeIntermediateResult(data: string[]): void {
		let token = +data[0];
		let eventData = data[1];

		this.log(`[Dispatcher] Progress: ${eventData}`);
	}

	private decodeFinalResult(data: string[]): void {
		let token = +data[0];
		let eventData = data.pop();

		this.handleResponse(token, eventData);
	}

	private decodeUnknown(data: string[]): void {
		this.log(`[Dispatcher] Unknown: ${data}`);
	}

	private decodeFlowControl(data: string[]): void {
		let congestion = +data.shift();

		this.log(`[Dispatcher] Congestion: ${congestion}`);

	}

	private handleEvent(serviceName: string, eventName: string, eventData: string): void {
		if (serviceName in this.eventHandlers) {
			this.eventHandlers[serviceName].eventHandler(eventName, eventData);
		}
		else {
			this.log(`[Dispatcher] Event handler for ${serviceName} is not registered`);
		}
	}

	private handleResponse(token: number, args: string) {
		if (token in this.pendingHandlers) {
			var handler = this.pendingHandlers[token];
			delete this.pendingHandlers[token];

			handler(args);
		}
	}
}

