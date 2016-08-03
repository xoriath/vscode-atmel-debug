'use strict';

import { IToolContext, IToolListener, IAttachedTool } from './services/toolService';

export class DeviceLauncher implements IToolListener {

	private deviceName: string;
	private packPath: string;

	public constructor(deviceName: string, packPath: string) {
		this.deviceName = deviceName;
		this.packPath = packPath;
	}

	public contextAdded(contexts: IToolContext[]): void {
		let context = contexts[0];
		context.setProperties({
			"DeviceName": this.deviceName,
			"PackPath": this.packPath
		})
	}

	public contextChanged(contexts: IToolContext[]): void { }
	public contextRemoved(contextIds: string[]): void { }
	public attachedToolsChanged(attachedTools: IAttachedTool[]): void { }
}