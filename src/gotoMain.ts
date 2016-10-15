'use strict';

import { IProcessesListener, IProcessesContext } from './services/processesService';
import { AtmelDebugSession } from './atmelDebugAdapter';
import { InitializedEvent } from 'vscode-debugadapter';

export class GotoMain implements IProcessesListener {

	private session: AtmelDebugSession;

	public constructor(session: AtmelDebugSession) {
		this.session = session;
	}

	public contextAdded(contexts: IProcessesContext[]): void {
		this.session.sendEvent(new InitializedEvent());
		this.session.goto("main");
	}

	public contextChanged(contexts: IProcessesContext[]): void { }
	public contextRemoved(contextIds: string[]): void {	}
	public exited(id: string, exitCode: number): void {	}
}