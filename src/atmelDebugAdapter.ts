
/// <reference path='./typings/ws.d.ts' />
'use strict';

import {
	DebugSession,
	InitializedEvent,
	TerminatedEvent,
	StoppedEvent,
	BreakpointEvent,
	OutputEvent,
	Event,
	Thread,
	StackFrame,
	Scope,
	Source,
	Handles,
	Breakpoint
} from 'vscode-debugadapter';

import {
	DebugProtocol
} from 'vscode-debugprotocol';

import { Dispatcher } from './dispatcher';
import { LocatorService } from './services/locatorService';
import { ToolService, IToolContext, IToolListener, IAttachedTool } from './services/toolService';
import { DeviceService, IDeviceContext, IDeviceListener } from './services/deviceService';
import { ProcessesService, IProcessesContext, IProcessesListener } from './services/processesService';
import { MemoryService } from './services/memoryService';
import { IService } from './services/iservice';

/**
 * This interface should always match the schema found in the mock-debug extension manifest.
 */

// 08 29 50 127: msg recv(0):C 113 Processes launch "c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug\\GccApplication2.elf" "SimDev_3"
//{
//	"LaunchSuspended":true,
//  "LaunchAttached":true,
//  "CacheFlash":true,
//  "EraseRule":0,
//  "PreserveEeprom":false,
//  "RamSnippetAddress":"0x20000000",
//  "ProgFlashFromRam":true,
//  "UseGdb":true,
//  "GdbLocation":"C:\\Program Files (x86)\\Atmel\\Studio\\7.0\\toolchain\\avr8\\avr8-gnu-toolchain\\bin\\avr-gdb.exe",
//  "BootSegment":2,
//  "PackPath":"C:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"
//}
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {

	atbackendHost: string;
	atbackendPort: number;

	program: string;
	tool: string;

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
}

class DeviceLauncher implements IDeviceListener {
	public processService: ProcessesService;
	public module: string;

	public constructor(module: string, processService: ProcessesService) {
		this.processService = processService;
		this.module = module;
	}

	public contextAdded(contexts: IDeviceContext[]): void {
				// Launch here!
				let context = contexts[0];

				this.processService.launch(this.module, context, {
					"LaunchSuspended":true,
					"LaunchAttached":true,
					"CacheFlash":true,
					"EraseRule":0,
					"PreserveEeprom":false,
					"RamSnippetAddress":"0x20000000",
					"ProgFlashFromRam":true,
					"UseGdb":true,
					"GdbLocation":"C:\\Program Files (x86)\\Atmel\\Studio\\7.0\\toolchain\\avr8\\avr8-gnu-toolchain\\bin\\avr-gdb.exe",
					"BootSegment":2,
					"PackPath":"C:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"
				});
	}

	public contextChanged(contexts: IDeviceContext[]): void {
	}
	public contextRemoved(contextIds: string[]): void {
	}
}

class AtmelDebugSession extends DebugSession {

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

		// this.sendEvent(new InitializedEvent());

		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsSetVariable = true;

		this.sendResponse(response);

	}

	private dispatcher: Dispatcher;
	private remoteServices: Map<string, IService> = new Map<string, IService>();

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		this.dispatcher = new Dispatcher(args.atbackendHost, args.atbackendPort, (message: string) => {
			this.sendEvent(new OutputEvent(message));
		});


		let toolListener: IToolListener = {
			contextAdded(contexts: IToolContext[]): void {
				let context = contexts[0];
				context.setProperties( {
					"InterfaceProperties":
						{"KeepTimersRunning":true,
						"ProjectFolder":"c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2"},
						"DeviceName":"ATmega128",
						"PackPath":"C:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"})
			},
			contextChanged(contexts: IToolContext[]): void {
			},
			contextRemoved(contextIds: string[]): void {
			},
			attachedToolsChanged(attachedTools: IAttachedTool[]): void {
			}
		};


		this.dispatcher.connect( (dispatcher: Dispatcher) => {
			let locator = new LocatorService(dispatcher);

			locator.hello( () => {
				let toolService = new ToolService(dispatcher);
				let deviceService = new DeviceService(dispatcher);
				let processService = new ProcessesService(dispatcher);
				let memoryService = new MemoryService(dispatcher);

				toolService.addListener(toolListener);
				deviceService.addListener(new DeviceLauncher(args.program, processService));

				toolService.setupTool("com.atmel.avrdbg.tool.simulator", "", {});
			});
		});
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {

	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {

	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {

	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {

	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {

	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {

	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {

	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {

	}



}

DebugSession.run(AtmelDebugSession);
