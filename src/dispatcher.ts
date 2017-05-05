'use strict';

import * as WebSocket from 'ws';

import { IEventHandler, IProgressEventHandler, ICongestionHandler } from './services/iservice';

export class Dispatcher {

	private ws: WebSocket;

	private host: string;
	private port: number;

	private sendToken: number = 1;

	private nil: string = '\x00';
	private eom: string = '\x03\x01';

	private pendingHandlers = new Map<number, any[]>();
	private eventHandlers = new Map<string, IEventHandler>();
	private progressHandlers = new Array<IProgressEventHandler>();
	private congestionHandlers = new Array<ICongestionHandler>();

	private logger: (message: string) => void;
	private debugLogger: (message: string) => void;

	public constructor(host: string, port: number, logger?: (message: string) => void, debugLogger?: (message: string) => void) {
		this.host = host;
		this.port = port;

		if (logger) {
			this.logger = logger;
		}
		if (debugLogger) {
			this.debugLogger = debugLogger;
		}
	}

	public log(data: string): void {
		if (this.logger) {
			this.logger(`${data}\n\r`);
		}
		else {
			console.error(`${data}\n\r`);
		}
	}

	public debug(data: string): void {
		if (this.debugLogger) {
			this.debugLogger(`${data}\n\r`);
		}
	}

	public connect(callback: (dispatcher: Dispatcher) => void): void {
		let url = 'ws://' + this.host + ':' + this.port;
		this.log(`[Dispatcher] Connect to: ${url}`);

		this.ws = new WebSocket(url);

		this.ws.on('error', (error) => {
			this.log(`[Dispatcher] WS:error: ${error}`);
			throw error;
		});

		this.ws.on('close', (code, message) => {
			this.log(`[Dispatcher] WS:close: ${code} => ${message}`);
		});

		this.ws.on('message', (data: string, flags: { binary: boolean }) => {
			this.handleMessage(data);
		});

		this.ws.on('open', () => {
			callback(this);
		});

	}

	public escapeNil(str: string): string {
		let self = this;
		let ret = '';

		for (let i = 0; i < str.length; ++i) {
			if (str.charAt(i) === self.nil) {
				ret += (' <nil> ');
			}
			else if (str.charAt(i) === '\x03') {
				ret += ('<');
			}
			else if (str.charAt(i) === '\x01') {
				ret += ('>');
			}
			else {
				ret += str.charAt(i);
			}
		}

		return ret;
	}

	public eventHandler(service: string, handler: IEventHandler): void {
		let self = this;

		self.log(`[Dispatcher] Registering event handler for ${service}`);
		self.eventHandlers[service] = handler;
	}


	public progressHandler(handler: IProgressEventHandler): void {
		let self = this;
		self.progressHandlers.push(handler);
	}

	public congestionHandler(handler: ICongestionHandler): void {
		let self = this;
		self.congestionHandlers.push(handler);
	}

	private sendMessage(message: string): void {
		let self = this;

		self.debug(`>> ${self.escapeNil(message)}`);

		self.ws.send(message);
	}

	public sendCommand(serviceName: string, commandName: string, args: any[]): Promise<string> {
		let self = this;
		let token = this.sendToken++;

		return new Promise(function(resolve, reject) {
			self.pendingHandlers[token] = [ resolve, reject ];

			self.sendMessage(`C${self.nil}${token}${self.nil}${serviceName}${self.nil}${commandName}${self.nil}${self.stringify(args)}${self.eom}`);
		});
	}

	public sendEvent(serviceName: string, eventName: string, args: any[]): void {
		let self = this;
		this.sendMessage(`E${self.nil}${serviceName}${self.nil}${eventName}${self.nil}${self.stringify(args)}${self.eom}`);
	}

	private stringify(args: any[]): string {
		let self = this;
		let str = '';

		if (args) {
			args.forEach(arg => {
				str += JSON.stringify(arg) + self.nil;
			});
		}

		return str;
	}

	private unstringify(data: string[]): any[] {
		let args = new Array<{}>();

		data.forEach(element => {
			if (element === '') {
				args.push(null);
			}
			else {
				args.push(JSON.parse(element));
			}
		});

		return args;
	}

	private handleMessage(data: string): void {
		let self = this;

		this.debug(`<< ${self.escapeNil(data)}`);

		let elements = data.split(self.nil);

		if (elements.length < 3) {
			throw `Message has too few parts`;
		}
		if (elements.pop() !== self.eom) {
			throw `Message has bad termination`;
		}

		let message = elements.shift();

		switch (message) {
			case 'E':
				self.decodeEvent(elements);
				break;
			case 'P':
				self.decodeIntermediateResult(elements);
				break;
			case 'R':
				self.decodeFinalResult(elements);
				break;
			case 'N':
				self.decodeUnknown(elements);
				break;
			case 'F':
				self.decodeFlowControl(elements);
				break;
			default:
				self.log(`Unkown TCF message: ${message}`);
				break;
		}
	}

	private decodeEvent(data: string[]): void {
		let serviceName = data.shift();
		let eventName = data.shift();
		let eventData = data;

		this.handleEvent(serviceName, eventName, eventData);
	}


	private decodeIntermediateResult(data: string[]): void {
		// let token = +data[0];
		let eventData = JSON.parse(data[1]);

		this.progressHandlers.forEach(handler => {
			handler.progress(+eventData['ProgressComplete'], +eventData['ProgressTotal'], eventData['Description'])
		});

		this.log(`[Dispatcher] Progress: ${eventData}`);
	}

	private decodeFinalResult(data: string[]): void {
		let token = +data[0];
		let errorReport = data[1];
		let eventData = data[2];

		this.handleResponse(token, errorReport, eventData);
	}

	private decodeUnknown(data: string[]): void {
		this.log(`[Dispatcher] Unknown: ${data}`);
	}

	private decodeFlowControl(data: string[]): void {
		let congestion = +data.shift();

		this.congestionHandlers.forEach(handler => {
			handler.congestion(congestion);
		});

		this.log(`[Dispatcher] Congestion: ${congestion}`);

	}

	private handleEvent(serviceName: string, eventName: string, eventData: string[]): void {
		if (serviceName in this.eventHandlers) {
			let handler: IEventHandler = this.eventHandlers[serviceName];
			handler.eventHandler(eventName, eventData);
		}
		else {
			this.debug(`[Dispatcher] Event handler for ${serviceName} is not registered`);
		}
	}

	private handleResponse(token: number, errorReport: string, args: string) {
		if (errorReport) {
			this.log(`[Dispatcher] Response error (${token}): ${errorReport}`);
		}

		if (token in this.pendingHandlers) {
			let [resolve, reject] = this.pendingHandlers[token];

			delete this.pendingHandlers[token];

			if (errorReport) {
				reject(Error(errorReport));
			}
			else {
				resolve(args);
			}
		}
	}
}

