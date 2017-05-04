'use strict';

import {
	DebugProtocol
} from 'vscode-debugprotocol';

/**
 * This interface should always match the schema found in the mock-debug extension manifest.
 */
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {

	atbackendHost: string;
	atbackendPort: number;

	program: string;
	tool: string;
	toolConnection: string;
	connectionProperties: any;

	device: string;

	interface: string;
	interfaceProperties: any;

	launchSuspended: boolean;
	launchAttached: boolean;
	cacheFlash: boolean;

	eraseRule: number; // enum
	preserveEeprom: boolean;
	ramSnippetAddress: number;
	progFlashFromRam: boolean;

	useGdb: boolean;
	gdbLocation: string;

	bootSegment: number; // enum

	packPath: string;

	remapSourcePathFrom: string;
	remapSourcePathTo: string;
}