
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
import { RegistersService } from './services/registersService';
import { ExpressionsService, ExpressionContext } from './services/expressionsService';
import { LineNumbersService, LineNumbersContext } from './services/lineNumbersService';
import { StackTraceService, StackTraceContext } from './services/stackTraceService';
import { RunControlService, RunControlContext, IRunControlListener, ResumeMode } from './services/runControlService';
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
	device: string;

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

class DeviceListener implements IDeviceListener {
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
			"LaunchSuspended": true,
			"LaunchAttached": true,
			"CacheFlash": true,
			"EraseRule": 0,
			"PreserveEeprom": false,
			"RamSnippetAddress": "0x20000000",
			"ProgFlashFromRam": true,
			"UseGdb": true,
			"GdbLocation": "C:\\Program Files (x86)\\Atmel\\Studio\\7.0\\toolchain\\avr8\\avr8-gnu-toolchain\\bin\\avr-gdb.exe",
			"BootSegment": 2,
			"PackPath": "C:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"
		});
	}

	public contextChanged(contexts: IDeviceContext[]): void {
	}
	public contextRemoved(contextIds: string[]): void {
	}
}

class RunControlLaunchListener implements IRunControlListener {

	private service: RunControlService;

	public constructor(service: RunControlService) {
		this.service = service;
	}
	public contextAdded(contexts: RunControlContext[]): void {
	}
	public contextChanged(contexts: RunControlContext[]): void {
	}
	public contextRemoved(contextIds: string[]): void {
	}
	public contextSuspended(contextId: string, pc: number, reason: string, state: any): void {
		let context = <RunControlContext>this.service.contexts[contextId];
		switch (reason) {
			case "Reset":
				context.resume(ResumeMode.UntilActive);
				break;
			case "Step":

				break;

			default:
				break;
		}
	}
	public contextResumed(contextId: string): void {
	}
	public contextException(contextId: string, description: string): void {
	}
	public containerSuspended(contextId: string, pc: number, reason: string, state: any, contextIds: string[]): void {
	}
	public containerResumed(contextIds: string[]): void {
	}
 	public contextStateChanged(contextIds: string[]): void {
	}
}

class AtmelDebugSession extends DebugSession {

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

	}

	private dispatcher: Dispatcher;
	private services: Map<string, IService> = new Map<string, IService>();

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

		// this.sendEvent(new InitializedEvent());

		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsSetVariable = true;

		this.sendResponse(response);
	}

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		let processService = <ProcessesService>this.services["Processes"];
		for (let index in processService.contexts) {
			let context = <IProcessesContext>processService.contexts[index];
			context.terminate();
		}

		let toolService = <ToolService>this.services["Tools"];
		for (let index in toolService.contexts) {
			let context = <IToolContext>toolService.contexts[index];
			context.tearDownTool();
		}
	}

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		this.dispatcher = new Dispatcher(args.atbackendHost, args.atbackendPort, (message: string) => {
			this.sendEvent(new OutputEvent(message));
		});


		let toolListener: IToolListener = {
			contextAdded(contexts: IToolContext[]): void {
				let context = contexts[0];
				context.setProperties({
					"InterfaceProperties":
					{
						"KeepTimersRunning": true,
						"ProjectFolder": "c:\\users\\morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2"
					},
					"DeviceName": args.device,
					"PackPath": "C:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"
				})
			},
			contextChanged(contexts: IToolContext[]): void {
			},
			contextRemoved(contextIds: string[]): void {
			},
			attachedToolsChanged(attachedTools: IAttachedTool[]): void {
			}
		};


		this.dispatcher.connect((dispatcher: Dispatcher) => {
			let locator = new LocatorService(dispatcher);

			locator.hello(() => {
				let toolService = new ToolService(dispatcher);
				let deviceService = new DeviceService(dispatcher);
				let processService = new ProcessesService(dispatcher);
				let memoryService = new MemoryService(dispatcher);
				let registersService = new RegistersService(dispatcher);
				let runControlService = new RunControlService(dispatcher);
				let stackTraceService = new StackTraceService(dispatcher);
				let expressionsService = new ExpressionsService(dispatcher);
				let lineNumbersService = new LineNumbersService(dispatcher);

				this.services["Tool"] = toolService;
				this.services["Device"] = deviceService;
				this.services["Processes"] = processService;
				this.services["Memory"] = memoryService;
				this.services["Registers"] = registersService;
				this.services["RunControlService"] = runControlService;
				this.services["StackTrace"] = stackTraceService;
				this.services["Expressions"] = expressionsService;
				this.services["LineNumbers"] = lineNumbersService;

				toolService.addListener(toolListener);
				deviceService.addListener(new DeviceListener(args.program, processService));
				runControlService.addListener(new RunControlLaunchListener(runControlService));

				toolService.setupTool(args.tool, "", {});
			});
		});


	}

    protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments): void {

	}

    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {

	}

    protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments): void {

	}

    protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments): void {

	}

    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {

	}

	private resume(threadID: number, mode: ResumeMode): void {
		let runControlService = <RunControlService>this.services["RunControl"];

		// TODO, support threads?

		for (let index in runControlService.contexts) {
			let context = <RunControlContext>runControlService.contexts[index];
			context.resume(ResumeMode.Resume);
		}
	}

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.resume(args.threadId, ResumeMode.Resume);

		response.body.allThreadsContinued = true;
		this.sendResponse(response);
	}

    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.resume(args.threadId, ResumeMode.StepOver);

		response.body.allThreadsContinued = true;
		this.sendResponse(response);
	}

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		this.resume(args.threadId, ResumeMode.StepInto);

		response.body.allThreadsContinued = true;
		this.sendResponse(response);
	}

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		this.resume(args.threadId, ResumeMode.StepOut);

		response.body.allThreadsContinued = true;
		this.sendResponse(response);
	}

    protected stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void {

	}

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): void {

	}

    protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments): void {

	}

	private hashString(str: string): number {
		return str.split("").reduce( function(a, b) {
										a = ( (a<<5) - a ) + b.charCodeAt(0);
										return a & a
									}, 0);
	}

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {

		let processService = <ProcessesService>this.services["Processes"];

		let threads = [];
		for (let index in processService.contexts) {
			let context = <IProcessesContext>processService.contexts[index];
			threads.push(new Thread(
				this.hashString(context.ID),
				context.Name));
		}

		response.body.threads = threads;
		this.sendResponse(response);
	}

    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {

	}

    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

	}

    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {

	}

    protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments): void {

	}

    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {

	}
}

DebugSession.run(AtmelDebugSession);
