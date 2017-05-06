'use strict';

import * as vscode from 'vscode';

import { IProgressEventHandler } from './services/iservice';

export class ProgressReporter implements IProgressEventHandler {

	public progress(progress: number, max: number, text?: string): void {
		let description = text || '';

		vscode.window

		vscode.window.showProgress({
			location: vscode.ProgressLocation.Window
			title: 'atbackend'
		}, (progress) => {
			progress.report({ message: `${description} (${(progress / max) * 100}%)`});
		}
	}
}