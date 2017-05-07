'use strict';

import { ILineNumberContext } from './ILineNumberContext';

export class LineNumberContext implements ILineNumberContext {

	public ID: string;

	public SLine: number;
	public ELine: number;
	public ECol: number;
	public Function: string;
	public File: string;
	public SAddr: number;
	public EAddr: number;
	public IsStmt: number;

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