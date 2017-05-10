'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Processes.html

import { IDispatcher, AbstractService } from './../abstractService';
import { IProcessContext } from './iprocessContext';
import { ProcessContext } from './processContext';
import { IProcessListener } from './iprocessListener';

import { IDeviceContext } from './../device/ideviceContext';



export class ProcessService extends AbstractService<IProcessContext, IProcessListener> {

	public constructor(dispatcher: IDispatcher) {
		super('Processes', dispatcher);
	}

	public launch(module: string, deviceContext: IDeviceContext, launchParameters: any): Promise<IProcessContext> { // TODO: Promise<IProcessContext>
		let self = this;

		return new Promise<IProcessContext>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'launch', [module, deviceContext.ID, launchParameters]).then( (processId: string) => {
				let context = self.getContext(processId);
				resolve(context);
			}).catch(reject);
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

	public fromJson(service: ProcessService, data: IProcessContext): IProcessContext {
		let context = new ProcessContext();

		context.processesService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];

		context.RunControlId = data['RunControlId'];

		return context;
	}

}