'use strict';

import { IRunControlContext } from './IRunControlContext';
import { ResumeMode } from './ResumeMode';
import { RunControlService } from './RunControlService';

export class RunControlContext implements IRunControlContext {
	public ID: string;
	public CanSuspend: boolean;
	public CanResume: number;
	public CanCount: number;
	public IsContainer: boolean;
	public HasState: boolean;
	public CanTerminate: boolean;

	public runcontrolservice: RunControlService;


	public setProperties(properties: any): Promise<any> {
		return this.runcontrolservice.setProperties(this.ID, properties);
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public resume(mode: ResumeMode, count?: number): Promise<any> {
		return this.runcontrolservice.resume(this.ID, mode, count);
	}

	public suspend(): Promise<any> {
		return this.runcontrolservice.suspend(this.ID);
	}

	public terminate(): Promise<any> {
		return this.runcontrolservice.terminate(this.ID);
	}

	public detach(): Promise<any> {
		return this.runcontrolservice.detach(this.ID);
	}

	public toString(): string {
		return `${this.ID}`;
	}
}