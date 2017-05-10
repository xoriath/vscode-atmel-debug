'use strict';

import { IExpressionContext } from './iexpressionContext';
import { ExpressionService } from './expressionService';

export class ExpressionContext implements IExpressionContext {

	public ID: string;
	public Numchildren: number;
	public Val: string;
	public CanAssign: boolean;
	public Expression: string;
	public ExprPath: string;
	public FormatString: string;
	public Type: string;
	public Size: number;

	public service: ExpressionService;

	public setProperties(properties: any): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public getProperties(): Promise<any> {
		return Promise.reject(Error('NOT IMPLEMENTED'));
	}

	public assign(value: string): Promise<string> {
		return this.service.assign(this.ID, value);
	}

	public toString(): string {
		if (this.ID) {
			return `${this.ID}`;
		}
		else {
			return '';
		}
	}

	public dispose(): void {
		if (this.service) {
			this.service.dispose(this.ID);
		}
	}
}