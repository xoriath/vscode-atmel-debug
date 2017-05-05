'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Registers.html

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

export interface IRegistersContext extends IContext {
	ProcessID: string;
	Size: number;
	Name: string;
}


export class RegistersContext implements IRegistersContext {
	public Name: string;
	public ID: string;
	public ProcessID: string;
	public Size: number;

	public registersService: RegistersService;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return this.registersService.get(this.ID);
	}

	public toString(): string {
		return `${this.Name}`;
	}
}

export interface IRegistersListener extends IContextListener<IRegistersContext> {

}

export class RegistersService extends Service<IRegistersContext, IRegistersListener> {

	public constructor(dispatcher: Dispatcher) {
		super('Registers', dispatcher);
	}

	public get(contextId: string): Promise<string> {
		let self = this;

		return new Promise<string>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'get', [contextId]).then( (data: string) => {
				resolve(data);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			case 'registerChanged':
				this.handleRegisterChanged(eventData);
				return true;
			default:
				return false;
		}
	}

	private handleRegisterChanged(eventData: string[]): void {
		let contextId = JSON.parse(eventData[0]);

		this.log(`RegisterChanged: ${contextId}`);
	}


	public fromJson(service: RegistersService, data: IRegistersContext): RegistersContext {
		let context = new RegistersContext();

		context.registersService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];
		context.ProcessID = data['ProcessID'];
		context.Size = data['Size'];

		return context;
	}
}