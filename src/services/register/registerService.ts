'use strict';

// http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Service%20-%20Registers.html

import { IDispatcher, AbstractService } from './../abstractService';
import { IRegisterContext }  from './iregisterContext';
import { RegisterContext } from './registerContext';
import { IRegisterListener } from './iregisterListener';

export class RegisterService extends AbstractService<IRegisterContext, IRegisterListener> {

	public constructor(dispatcher: IDispatcher) {
		super('Registers', dispatcher);
	}

	public get(contextId: string): Promise<string> {
		let self = this;

		return new Promise<string>(function(resolve, reject) {
			self.dispatcher.sendCommand(self.name, 'get', [contextId]).then( (data: string) => {
				resolve(data);
			}).catch(reject);
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


	public fromJson(service: RegisterService, data: IRegisterContext): IRegisterContext {
		let context = new RegisterContext();

		context.registersService = service;

		context.ID = data['ID'];
		context.Name = data['Name'];
		context.ProcessID = data['ProcessID'];
		context.Size = data['Size'];

		return context;
	}
}