
/// <reference path='./typings/ws.d.ts' />
'use strict';

const path = require('path');

import {
	DebugSession,
	InitializedEvent,
	TerminatedEvent,
	StoppedEvent,
	ContinuedEvent,
	BreakpointEvent,
	OutputEvent,
	Event,
	Thread,
	StackFrame,
	Scope,
	Variable,
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
import { StreamService } from './services/streamService';
import { BreakpointsService, BreakpointContext, AccessMode } from './services/breakpointsService';
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
			"GdbLocation": "D:\\Program Files (x86)\\Atmel\\Studio\\7.0\\toolchain\\avr8\\avr8-gnu-toolchain\\bin\\avr-gdb.exe",
			"BootSegment": 2,
			"PackPath": "D:/Program Files (x86)/Atmel/Studio/7.0/Packs/atmel/ATmega_DFP/1.0.106/Atmel.ATmega_DFP.pdsc"
		});
	}

	public contextChanged(contexts: IDeviceContext[]): void {
	}
	public contextRemoved(contextIds: string[]): void {
	}
}

class ProcessListener implements IProcessesListener {

	private session: AtmelDebugSession;

	public constructor(session: AtmelDebugSession) {
		this.session = session;
	}

	public contextAdded(contexts: IProcessesContext[]): void {
		this.session.sendEvent(new InitializedEvent());
		this.session.goto("main");
	}
	public contextChanged(contexts: IProcessesContext[]): void {

	}
	public contextRemoved(contextIds: string[]): void {

	}
	public exited(id: string, exitCode: number): void {

	}
}

class AtmelDebugSession extends DebugSession implements IRunControlListener {

	private DEBUG: boolean = false;

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

	}

	private dispatcher: Dispatcher;
	private services: Map<string, IService>;

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body.supportsConfigurationDoneRequest = false;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsSetVariable = true;
		response.body.supportsStepBack = false;

		this.sendResponse(response);
	}

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		if ("Processes" in this.services) {
			let processService = <ProcessesService>this.services["Processes"];
			for (let index in processService.contexts) {
				let context = <IProcessesContext>processService.contexts[index];
				context.terminate();
			}
		}

		if ("Tools" in this.services) {
			let toolService = <ToolService>this.services["Tools"];
			for (let index in toolService.contexts) {
				let context = <IToolContext>toolService.contexts[index];
				context.tearDownTool();
			}
		}
	}

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		this.dispatcher = new Dispatcher(args.atbackendHost, args.atbackendPort, (message: string) => {
			this.sendEvent(new OutputEvent(message));
		}, (message: string) => {
			this.debug(message);
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
				let breakpointsService = new BreakpointsService(dispatcher);
				let streamService = new StreamService(dispatcher);

				this.services = new Map<string, IService>();
				this.services["Tool"] = toolService;
				this.services["Device"] = deviceService;
				this.services["Processes"] = processService;
				this.services["Memory"] = memoryService;
				this.services["Registers"] = registersService;
				this.services["RunControl"] = runControlService;
				this.services["StackTrace"] = stackTraceService;
				this.services["Expressions"] = expressionsService;
				this.services["LineNumbers"] = lineNumbersService;
				this.services["Breakpoints"] = breakpointsService;
				this.services["Streams"] = streamService;

				streamService.setLogBits(0xFFFFFFFF);

				toolService.addListener(toolListener);
				deviceService.addListener(new DeviceListener(args.program, processService));
				runControlService.addListener(this);

				processService.addListener(new ProcessListener(this));

				toolService.setupTool(args.tool, "", {});
			});
		});

		this.sendResponse(response);

	}

    protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments): void {
		this.log("[NOT IMPLEMENTED] attachRequest");
		super.attachRequest(response, args);
	}

	// 09 04 39 824: msg recv(c8):C 207 Breakpoints add {"ContextIds":["Proc_2"],"AccessMode":4,"ID":"9264_bp_00000005","Enabled":true,"IgnoreCount":1,"IgnoreType":"always","File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c","Line":29,"Column":0}
	// 09 04 39 831: msg send(c8):R 207
	// 09 04 39 832: msg recv(c8):C 208 Breakpoints getProperties "9264_bp_00000005"
	// 09 04 39 833: msg send(c8):R 208  {"ID":"9264_bp_00000005","Enabled":true,"AccessMode":4,"File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c","Line":29,"Column":0,"Address":"246","HitCount":0}
	// 09 04 39 853: msg recv(c8):C 209 Breakpoints getProperties "9264_bp_00000005"
	// 09 04 39 853: msg send(c8):R 209  {"ID":"9264_bp_00000005","Enabled":true,"AccessMode":4,"File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c","Line":29,"Column":0,"Address":"246","HitCount":0}
	// 09 04 49 130: msg recv(c8):C 210 Breakpoints change {"ContextIds":["Proc_2"],"AccessMode":4,"ID":"9264_bp_00000005","Enabled":true,"IgnoreCount":1,"IgnoreType":"always","File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c","Line":29,"Column":0,"Condition":"x == 5","IsTrue":true}
	// 09 04 49 130: msg send(c8):R 210
	// 09 04 49 135: msg recv(c8):C 211 Breakpoints change {"ContextIds":["Proc_2"],"AccessMode":4,"ID":"9264_bp_00000005","Enabled":true,"IgnoreCount":1,"IgnoreType":"always","File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\main.c","Line":29,"Column":0,"IsTrue":true,"Condition":"x == 5"}
	// 09 04 49 135: msg send(c8):R 211
	private activeBreakpoints = [];
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		let processService = <ProcessesService>this.services["Processes"];
		let breakpointsService = <BreakpointsService>this.services["Breakpoints"];

		response.body = {
			breakpoints: []
		};

		let processContext: IProcessesContext;
		for (let index in processService.contexts) {
			processContext = processService.contexts[index];
		}

		breakpointsService.remove(this.activeBreakpoints);
		this.activeBreakpoints = [];

		let breakpointsToProcess = args.breakpoints.length;

		args.breakpoints.forEach( breakpointArgs => {
			let breakpointId = breakpointsService.getNextBreakpointId();

			let breakpoint = {
				"ContextIds": [ processContext.ID ],
				"AccessMode": AccessMode.Execute,
				"ID": breakpointId,
				"Enabled": true,
				"IgnoreCount": 1,
				"IgnoreType": "always",
				"Line": breakpointArgs.line,
				"Column": breakpointArgs.column | 0
			};

			if (args.source.path) {
				breakpoint["File"] = args.source.path;
			} // else use args.source.sourceReference

			if (breakpointArgs.condition) {
				breakpoint["Condition"] = breakpointArgs.condition;
				breakpoint["Istrue"] = true;
			}

			breakpointsService.add(breakpoint, (errorReport) => {
				breakpointsService.getProperties(breakpointId, (breakpoint) => {
					let bp = new Breakpoint(breakpoint.Enabled, breakpoint.Line, breakpoint.Column);

					response.body.breakpoints.push(bp);
					this.activeBreakpoints.push(breakpointId);

					if (--breakpointsToProcess == 0) {
						this.sendResponse(response);
					}
				});
			});

		});
	}

	// 09 03 23 224: msg recv(c8):C 203 Breakpoints add {"ContextIds":["Proc_2"],"AccessMode":4,"ID":"9264_bp_00000004","Enabled":true,"IgnoreCount":1,"IgnoreType":"always","Condition":"x == 5","IsTrue":true,"Function":"testfunc1","FunctionLine":1,"FunctionColumn":0}
	// 09 03 23 266: msg send(c8):R 203
	// 09 03 23 267: msg recv(c8):C 204 Breakpoints getProperties "9264_bp_00000004"
	// 09 03 23 267: msg send(c8):R 204  {"ID":"9264_bp_00000004","Enabled":true,"AccessMode":4,"File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug/.././main.c","Line":20,"Column":512,"Address":"224","HitCount":0}
	// 09 03 23 281: msg recv(c8):C 205 Breakpoints getProperties "9264_bp_00000004"
	// 09 03 23 281: msg send(c8):R 205  {"ID":"9264_bp_00000004","Enabled":true,"AccessMode":4,"File":"C:\\Users\\Morten\\Documents\\Atmel Studio\\7.0\\GccApplication2\\GccApplication2\\Debug/.././main.c","Line":20,"Column":512,"Address":"224","HitCount":0}
	private activeFunctionBreakpoints = [];
    protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments): void {
		let processService = <ProcessesService>this.services["Processes"];
		let breakpointsService = <BreakpointsService>this.services["Breakpoints"];

		response.body = {
			breakpoints: []
		};

		let processContext: IProcessesContext;
		for (let index in processService.contexts) {
			processContext = processService.contexts[index];
		}

		breakpointsService.remove(this.activeFunctionBreakpoints);
		this.activeFunctionBreakpoints = [];

		let breakpointsToProcess = args.breakpoints.length;

		args.breakpoints.forEach( breakpointArgs => {
			let breakpointId = breakpointsService.getNextBreakpointId();

			let breakpoint = {
				"ContextIds": [ processContext.ID ],
				"AccessMode": AccessMode.Execute,
				"ID": breakpointId,
				"Enabled": true,
				"IgnoreCount": 1,
				"IgnoreType": "always",
				"Function": breakpointArgs.name,
				"FunctionLine": 1,
				"FunctionColumn": 0
			};

			breakpointsService.add(breakpoint, (errorReport) => {
				breakpointsService.getProperties(breakpointId, (breakpoint) => {
					let bp = new Breakpoint(breakpoint.Enabled, breakpoint.Line, /*breakpoint.Column*/ 0);

					response.body.breakpoints.push(bp);
					this.activeFunctionBreakpoints.push(breakpointId);

					if (--breakpointsToProcess == 0) {
						this.sendResponse(response);
					}
				});
			});

		});

		super.setFunctionBreakPointsRequest(response, args);
	}

    protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments): void {
		this.log("[NOT IMPLEMENTED] setExceptionBreakPointsRequest");
		super.setExceptionBreakPointsRequest(response, args);
	}

    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		this.log("[NOT IMPLEMENTED] configurationDoneRequest");
		super.configurationDoneRequest(response, args);
	}

	private resume(mode: ResumeMode, threadID?: number): void {
		let runControlService = <RunControlService>this.services["RunControl"];

		for (let index in runControlService.contexts) {
			let context = <RunControlContext>runControlService.contexts[index];
			if (!threadID || threadID == this.hashString(context.ID)) {
				context.resume(mode);
			}
		}
	}

	private suspend(threadID?: number): void {
		let runControlService = <RunControlService>this.services["RunControl"];

		for (let index in runControlService.contexts) {
			let context = <RunControlContext>runControlService.contexts[index];
			if (threadID == this.hashString(context.ID) || threadID == 0) {
				context.suspend();
			}
		}
	}

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.sendResponse(response);
		this.resume(ResumeMode.Resume, args.threadId);
	}

    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.sendResponse(response);
		this.resume(ResumeMode.StepOverLine, args.threadId);
	}

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		this.sendResponse(response);
		this.resume(ResumeMode.StepIntoLine, args.threadId);
	}

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		this.sendResponse(response);
		this.resume(ResumeMode.StepOut, args.threadId);
	}

    protected stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void {
		this.log("[NOT IMPLEMENTED] stepBackRequest");
		super.stepBackRequest(response, args);
	}

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): void {
		this.sendResponse(response);
		this.suspend(args.threadId);
	}

    protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments): void {
		this.log("[NOT IMPLEMENTED] sourceRequest");
		super.sourceRequest(response, args);
	}

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		let processService = <ProcessesService>this.services["Processes"];

		response.body = {
			threads: []
		};

		for (let index in processService.contexts) {
			let context = <IProcessesContext>processService.contexts[index];
			response.body.threads.push(new Thread(
				this.hashString(context.RunControlId),
				context.Name));
		}

		this.sendResponse(response);
	}

    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		let stackTraceService = <StackTraceService>this.services["StackTrace"];
		let processesService = <ProcessesService>this.services["Processes"];

		response.body = {
			stackFrames: [],
			totalFrames: 0
		}

		let threadId = args.threadId; // TODO; support threads
		for (let index in processesService.contexts) {
			let processContext = <IProcessesContext>processesService.contexts[index];

			stackTraceService.getChildren(processContext.ID, (children) => {
				stackTraceService.getContext(children, (frames) => {
					frames.forEach(frame => {
						let frameArgs: string[] = []
						let sortedArgs = frame.Args.sort((a,b) => {
							return a.Order - b.Order;
						});

						for (let frameArgIndex in sortedArgs) {
							let frameArg = sortedArgs[frameArgIndex];
							frameArgs.push(`${frameArg.Type.trim()} ${frameArg.Name.trim()} = ${frameArg.Value.trim()}`);
						}

						let frameName = `${frame.Func.trim()} (${frameArgs.join(", ")})`
						let source = new Source(path.basename(frame.File.trim()),
												path.normalize(frame.File.trim()),
												this.hashString(frame.File.trim()),
												frame.File,
												frame.File);

						response.body.stackFrames.push(
							new StackFrame(this.hashString(frame.ID), frameName, source, frame.Line));
					});

					this.sendResponse(response);
				});
			});
		}
	}

    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		let stackTraceService = <StackTraceService>this.services["StackTrace"];
		let processesService = <ProcessesService>this.services["Processes"];

		response.body = {
			scopes: []
		}

		for (let index in processesService.contexts) {
			let processContext = <IProcessesContext>processesService.contexts[index];

			stackTraceService.getChildren(processContext.ID, (children) => {
				stackTraceService.getContext(children, (frames) => {
					frames.forEach(frame => {
						if (frame.Level == 0) {
							//response.body.scopes.push(new Scope("Global", this.hashString(frame.ID), false));
						}

						if (args.frameId == this.hashString(frame.ID)) {
							response.body.scopes.push(new Scope("Local", this.hashString(frame.ID), false));
						}
					});

					this.sendResponse(response);
				});
			});
		}
	}

    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		let stackTraceService = <StackTraceService>this.services["StackTrace"];
		let processesService = <ProcessesService>this.services["Processes"];
		let expressionsService = <ExpressionsService>this.services["Expressions"];

		response.body = {
			variables: []
		}

		for (let index in processesService.contexts) {
			let processContext = <IProcessesContext>processesService.contexts[index];

			stackTraceService.getChildren(processContext.ID, (children) => {
				stackTraceService.getContext(children, (frames) => {
					frames.forEach(frame => {
						if (args.variablesReference == this.hashString(frame.ID)) {
							expressionsService.getChildren(frame.ID, (children) => {
								let childrenToEvaluate = children.length;

								if (childrenToEvaluate == 0) {
									this.sendResponse(response);
								}

								children.forEach(expressionId => {
									expressionsService.getContext(expressionId, (expression) => {
										response.body.variables.push(new Variable(expression.Expression, expression.Val.trim()));
										expression.dispose();

										if (--childrenToEvaluate == 0) {
											this.sendResponse(response);
										}
									})
								});
							});
						}
					});
				});
			});
		}
	}

    protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments): void {
		let expressionsService = <ExpressionsService>this.services["Expressions"];
		let processesService = <ProcessesService>this.services["Processes"];
		let stackTraceService = <StackTraceService>this.services["StackTrace"];

		response.body = {
			value: ""
		};

		let currentProcess: IProcessesContext;
		for (let index in processesService.contexts) {
			currentProcess = processesService.contexts[index];
		}

		stackTraceService.getChildren(currentProcess.ID, (children) => {
			stackTraceService.getContext(children, (frames) => {
				let sortedFrames = frames.sort( (a,b) => {
					return a.Level - b.Level;
				})

				let bottom = sortedFrames.shift();
				expressionsService.compute(bottom.ID, "C", args.name, (expression) => {
					expression.assign(args.value);
					expression.dispose();

					expressionsService.compute(bottom.ID, "C", args.name, (expression) => {
						response.body.value = expression.Val.trim();
						this.sendResponse(response);
					});
				});
			});
		});
	}

    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		let expressionsService = <ExpressionsService>this.services["Expressions"];

		response.body = {
			result: "",
            type: "",
            variablesReference: 0,
            namedVariables: 0,
            indexedVariables: 0
		}

		switch(args.context) {
			case "watch":
			case "hover":
			case "repl":
			default:
				expressionsService.compute(this.hashes[args.frameId], "C", args.expression, (expression) => {
					response.body.result = expression.Val.trim();
					response.body.type = expression.Type;

					expression.dispose();

					this.sendResponse(response);
				});
		}
	}

	private hashes: Map<number, string>;

	private hashString(str: string): number {
		if (!this.hashes)
			this.hashes = new Map<number, string>();

		let hash = Math.abs(str.split("").reduce(function (a, b) {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a
		}, 0))

		this.hashes[hash] = str;

		return hash;
	}

	private getStringFromHash(hash: number): string {
		if (hash in this.hashes)
			return this.hashes[hash];
		return "";
	}

	// IRunControlListener
	public contextAdded(contexts: RunControlContext[]): void {

	}

	public contextChanged(contexts: RunControlContext[]): void {

	}

	public contextRemoved(contextIds: string[]): void {

	}

	public contextSuspended(contextId: string, pc: number, reason: string, state: any): void {
		this.sendEvent(new StoppedEvent(reason, this.hashString(contextId), state));
	}

	public contextResumed(contextId: string): void {
		this.sendEvent(new ContinuedEvent(this.hashString(contextId)));
	}

	public contextException(contextId: string, description: string): void {

	}

	public containerSuspended(contextId: string, pc: number, reason: string, state: any, contextIds: string[]): void {

	}

	public containerResumed(contextIds: string[]): void {

	}

	public contextStateChanged(contextIds: string[]): void {

	}

	private log(message: string): void {
		this.sendEvent(new OutputEvent(`${message}\n`));
	}

	private debug(message: string): void {
		if (this.DEBUG) {
			this.sendEvent(new OutputEvent(`${message}\n`));
		}
	}

	public goto(func: string): void {
		let expressionsService = <ExpressionsService>this.services["Expressions"];
		let runControlService = <RunControlService>this.services["RunControl"];
		let stackTraceService = <StackTraceService>this.services["StackTrace"];
		let processesService = <ProcessesService>this.services["Processes"];

		let processContext: IProcessesContext;
		for (let index in processesService.contexts) {
			processContext = <IProcessesContext>processesService.contexts[index];
		}

		let runControlContext: RunControlContext;
		for (let index in runControlService.contexts) {
			runControlContext = (<RunControlContext>runControlService.contexts[index]);
		}

		stackTraceService.getChildren(processContext.ID, (children) => {
			expressionsService.compute(children.shift(), "C", func, (expressionContext) => {
				let address = parseInt(expressionContext.Val.replace("0x", ""), 16);
				expressionContext.dispose();

				runControlContext.resume(ResumeMode.Goto, address)
			});
		});




	}
}

DebugSession.run(AtmelDebugSession);
