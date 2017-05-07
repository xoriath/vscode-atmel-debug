'use strict';

import { IProcessContext } from './IProcessContext';
import { ProcessService } from './ProcessService';


// {"ID":"Proc_3",
// "Name":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug\\GccApplication2.elf",
// "RunControlId":"GdbRC_1"}


export class ProcessContext implements IProcessContext {

	public ID: string;
	public ParentID: string;
	public Name: string;
	public Attached: boolean;
	public CanTerminate: boolean;
	public StdInID: string;
	public StdOutID: string;
	public StdErrID: string;

	public RunControlId: string;

	public processesService: ProcessService;

	public properties: any;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public toString(): string {
		return `${this.ID}`;
	}

	public terminate(): Promise<any> {
		return this.processesService.terminate(this.ID);
	}

}
