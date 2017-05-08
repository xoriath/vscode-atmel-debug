'use strict';

import { IRegisterContext } from './iregisterContext';
import { RegisterService } from './registerService';

export class RegisterContext implements IRegisterContext {
	public Name: string;
	public ID: string;
	public ProcessID: string;
	public Size: number;

	public registersService: RegisterService;

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
