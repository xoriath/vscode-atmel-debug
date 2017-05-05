'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Processes.html

import { Dispatcher, Service } from './service';
import { IContext, IContextListener } from './icontext';

import { IDeviceContext } from './deviceService';

export interface IProcessesContext extends IContext {
	ID: string;
	ParentID: string;
	Name: string;
	Attached: boolean;
	CanTerminate: boolean;
	StdInID: string;
	StdOutID: string;
	StdErrID: string;
	RunControlId: string;

	terminate(): void;
}

export class ProcessesContext implements IProcessesContext {

	public ID: string;
	public ParentID: string;
	public Name: string;
	public Attached: boolean;
	public CanTerminate: boolean;
	public StdInID: string;
	public StdOutID: string;
	public StdErrID: string;

	public RunControlId: string;

	public processesService: ProcessesService;

	public properties: any;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

    // {"ID":"Proc_3",
	// "Name":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug\\GccApplication2.elf",
	// "RunControlId":"GdbRC_1"}

	public toString(): string {
		return `${this.ID}`;
	}

	public terminate(): Promise<any> {
		return this.processesService.terminate(this.ID);
	}

}

export interface IProcessesListener extends IContextListener<IProcessesContext> {
	exited(id: string, exitCode: number): void;
}

export class ProcessesService extends Service<IProcessesContext, IProcessesListener> {

	public constructor(dispatcher: Dispatcher) {
		super('Processes', dispatcher);
	}

	public launch(module: string, deviceContext: IDeviceContext, launchParameters: any): Promise<string> {
		let self = this;

		return new Promise<string>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'launch', [module, deviceContext.ID, launchParameters]).then( (data: string) => {
				resolve(data);
			}).catch( (error: Error) => {
				reject(error);
			});
		});
	}

	public terminate(id: string): Promise<string> {
		return this.dispatcher.sendCommand(this.name, 'terminate', [id]);
	}


	public eventHandler(event: string, eventData: string[]): boolean {
		if (super.eventHandler(event, eventData)) {
			return true;
		}

		switch (event) {
			case 'exited':
				this.handleExited(eventData);
				return true;
			default:
				return false;
		}
	}

	private handleExited(eventData: string[]): void {
		this.log(`Cannot handle exited event with data: ${eventData}`);
	}

	public fromJson(service: ProcessesService, data: IProcessesContext): ProcessesContext {
		let context = new ProcessesContext();

		context.processesService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];

		context.RunControlId = data['RunControlId'];

		return context;
	}

}