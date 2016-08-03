'use strict';

import { IDeviceContext, IDeviceListener } from './services/deviceService';
import { ProcessesService } from './services/processesService';
import { LaunchRequestArguments } from './launchRequestArguments';

export class ProcessLauncher implements IDeviceListener {
	private processService: ProcessesService;
	private module: string;
	private launchArgs : LaunchRequestArguments;
	private launchParameters = {};

	public constructor(module: string, processService: ProcessesService, args: LaunchRequestArguments) {
		this.processService = processService;
		this.module = module;
		this.launchArgs = args;

		this.launchParameters = {
			"LaunchSuspended": this.launchArgs.launchSuspended,
			"LaunchAttached": this.launchArgs.launchAttached,
			"CacheFlash": this.launchArgs.cacheFlash,
			"EraseRule": this.launchArgs.eraseRule,
			"PreserveEeprom": this.launchArgs.preserveEeprom,
			"RamSnippetAddress": this.launchArgs.ramSnippetAddress,
			"ProgFlashFromRam": this.launchArgs.progFlashFromRam,
			"UseGdb": this.launchArgs.useGdb,
			"GdbLocation": this.launchArgs.gdbLocation,
			"BootSegment": this.launchArgs.bootSegment,
			"PackPath": this.launchArgs.packPath
		}
	}

	public contextAdded(contexts: IDeviceContext[]): void {
		// Launch here!
		let context = contexts[0];
		this.processService.launch(this.module, context, this.launchParameters);
	}

	public contextChanged(contexts: IDeviceContext[]): void { }
	public contextRemoved(contextIds: string[]): void {	}
}