'use strict';

import { IBreakpointContext } from './IBreakpointContext';
import { AccessMode } from './AccessMode';
import { BreakpointsService } from './BreakpointService';

export class BreakpointContext implements IBreakpointContext {

	public ID: string;
	public Enabled: boolean;
	public AccessMode: AccessMode;
	public File: string;
	public Line: number;
	public Column: number;
	public Address: number;
	public HitCount: number;

	public service: BreakpointsService;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return this.service.getProperties(this.ID);
	}

	public remove(): void {
		this.service.remove([this.ID]);
	}

	public toString(): string {
		if (this.ID) {
			return `${this.ID}`;
		}
		else {
			return '';
		}
	}
}