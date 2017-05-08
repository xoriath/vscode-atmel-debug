'use strict';

import { IStackTraceContext } from './istackTraceContext';
import { IFrameArg } from './iframeArg';

export class StackTraceContext implements IStackTraceContext {

	public ID: string;
	public Level: number;
	public IP: number;
	public ArgsString: string;
	public Func: string;
	public File: string;
	public Line: number;

	public Args: IFrameArg[];

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public toString(): string {
		return `${this.ID}`;
	}
}
