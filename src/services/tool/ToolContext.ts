'use strict';

import { IToolContext } from './itoolContext';
import { ToolService } from './toolService';

export class ToolContext implements IToolContext {

	public ID: string;
	public Name: string;

	public DeviceId: string;

	public service: ToolService;

	public properties: any;

	public setProperties(properties: any): Promise<any> {
		return this.service.setProperties(this.ID, properties);
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public connect() {
		this.service.connect(this.ID);
	}

	public tearDownTool() {
		this.service.tearDownTool(this.ID);
	}

	public toString(): string {
		return `${this.ID} (${this.Name})`;
	}

}
