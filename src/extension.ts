/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('extension.getProgramName', () => {
		return vscode.window.showInputBox({
			placeHolder: "Please enter the name of an elf file",
			value: "*.elf"
		});
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {

}
