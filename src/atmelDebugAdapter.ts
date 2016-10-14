
'use strict';

const path = require('path');

import {
	DebugSession,
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
import { RegistersService, IRegistersContext } from './services/registersService';
import { ExpressionsService, ExpressionContext } from './services/expressionsService';
import { LineNumbersService, LineNumbersContext } from './services/lineNumbersService';
import { StackTraceService, StackTraceContext } from './services/stackTraceService';
import { StreamService } from './services/streamService';
import { BreakpointsService, BreakpointContext, AccessMode } from './services/breakpointsService';
import { RunControlService, RunControlContext, IRunControlListener, ResumeMode } from './services/runControlService';
import { IService } from './services/iservice';

import { LaunchRequestArguments } from './launchRequestArguments';
import { GoToMain } from './gotoMain';
import { ProcessLauncher } from './processLauncher';

export class AtmelDebugSession extends DebugSession implements IRunControlListener {

	/* Set to true to output debug log */
	private DEBUG: boolean = true;

	private dispatcher: Dispatcher;
	private services: Map<string, IService>;

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body.supportsConfigurationDoneRequest = false;
		response.body.supportsCompletionsRequest = false;

		response.body.supportsEvaluateForHovers = true;
		response.body.supportsSetVariable = true;

		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsConditionalBreakpoints = false;  		// TODO: why doesn't this break?
		response.body.supportsHitConditionalBreakpoints = false; 	// TODO: implement

		response.body.supportsRestartFrame = false;
		response.body.supportsStepBack = false;

		response.body.supportsStepInTargetsRequest = false;
		response.body.supportsGotoTargetsRequest = true;

		this.sendResponse(response);
	}

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		/* Terminate the processes */
		if ("Processes" in this.services) {
			let processService = <ProcessesService>this.services["Processes"];
			for (let index in processService.contexts) {
				let context = <IProcessesContext>processService.contexts[index];
				context.terminate();
			}
		}

		/* Tear down the tools */
		if ("Tools" in this.services) {
			let toolService = <ToolService>this.services["Tools"];
			for (let index in toolService.contexts) {
				let context = <IToolContext>toolService.contexts[index];
				context.tearDownTool();
			}
		}
	}

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		let self = this;

		/* Create the dispatcher */
		self.dispatcher = new Dispatcher(args.atbackendHost, args.atbackendPort,
										(message: string) => {
											self.sendEvent(new OutputEvent(message));
										},
										(message: string) => {
											self.debug(message);
										});

		self.dispatcher.connect((dispatcher: Dispatcher) => {
			let locator = new LocatorService(dispatcher);

			locator.hello(() => {

				/* Need to wait for hello before we can start the show */
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

				self.services = new Map<string, IService>();
				self.services["Tool"] = toolService;
				self.services["Device"] = deviceService;
				self.services["Processes"] = processService;
				self.services["Memory"] = memoryService;
				self.services["Registers"] = registersService;
				self.services["RunControl"] = runControlService;
				self.services["StackTrace"] = stackTraceService;
				self.services["Expressions"] = expressionsService;
				self.services["LineNumbers"] = lineNumbersService;
				self.services["Breakpoints"] = breakpointsService;
				self.services["Streams"] = streamService;

				/* Crank up the atbackend logging if we run in debug */
				if (self.DEBUG) {
					streamService.setLogBits(0xFFFFFFFF);
				}

				/* Let the session be the runcontroller, since it handles most of the debug events anyway */
				runControlService.addListener(self);

				/*
					Once the process is running, we need to get into a start place

					Normally, launching involves resetting the device being debugged, so
					as the process is made we're at whatever the device resets to.

					Use this listener to run to main.

				*/
				processService.addListener(new GoToMain(self));

				/* Once a device has been instantiated, we need to actually launch with a module */
				deviceService.addListener(new ProcessLauncher(args.program, processService, args));

				/* Ignition! TODO: need more properties for USB/IP tools */
				toolService.setupTool(args.tool, "", {}).then( (tool: IToolContext) => {
					tool.setProperties({
								"DeviceName": args.device,
								"PackPath": args.packPath
							}).catch( (reason: Error) => {
								throw reason;
							});
				}).catch( (reason: Error) => {

				});
			});
		});

		this.sendResponse(response);

	}

	/*
		Not all Atmel devices can be attached to, and most devices needs to be set up to allow this

		For ATmega and ATtiny, this involves setting the OCDEN fuse to keep the OCD on.
		For XMEGA
		For AVR32 UC3, attach is not supported
		For SAM, attach is supported without prior setup

	*/
    protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments): void {
		this.log("[NOT IMPLEMENTED] attachRequest");
		super.attachRequest(response, args);
	}

	private activeBreakpoints = [];

	/* TODO: this is called once PER SOURCE FILE. Need to extend acitveBreakpoints etc */
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		let processService = <ProcessesService>this.services["Processes"];
		let breakpointsService = <BreakpointsService>this.services["Breakpoints"];

		response.body = {
			breakpoints: []
		};

		/* Fetch the running process */
		let processContext: IProcessesContext;
		for (let index in processService.contexts) {
			processContext = processService.contexts[index];
		}

		/* Remove all active breakpoints */
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

			breakpointsService.add(breakpoint).then( (report) => {
				breakpointsService.getProperties(breakpointId).then( (breakpoint) => {
					let bp = new Breakpoint(breakpoint.Enabled, breakpoint.Line, breakpoint.Column);

					response.body.breakpoints.push(bp);
					this.activeBreakpoints.push(breakpointId);

					/* Since we need to bind all the requested breakpoints before responding, wait until the last is bound */
					if (--breakpointsToProcess == 0) {
						this.sendResponse(response);
					}
				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		});
	}

	private activeFunctionBreakpoints = [];

	/* TODO: this is called once PER SOURCE FILE. Need to extend acitveBreakpoints etc */
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

			breakpointsService.add(breakpoint).then( (report) => {
				breakpointsService.getProperties(breakpointId).then( (breakpoint) => {
					let bp = new Breakpoint(breakpoint.Enabled, breakpoint.Line, /*breakpoint.Column*/ 0);

					response.body.breakpoints.push(bp);
					this.activeFunctionBreakpoints.push(breakpointId);

					if (--breakpointsToProcess == 0) {
						this.sendResponse(response);
					}
				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		});

		super.setFunctionBreakPointsRequest(response, args);
	}

	/*
		Need to find the registered interrupt handlers here

		This varies between
			AVR (ISR macro from avr-libc => __vector_N functions)
			AVR32 UC3
			SAM (vector of functions with weak binding to default handler)

	*/
    protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments): void {
		this.log("[NOT IMPLEMENTED] setExceptionBreakPointsRequest");
		super.setExceptionBreakPointsRequest(response, args);
	}

	/* TODO: should this be supported? */
    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		this.log("[NOT IMPLEMENTED] configurationDoneRequest");
		super.configurationDoneRequest(response, args);
	}

	/* Resume is any form of resume */
	private resume(mode: ResumeMode, threadID?: number): void {
		let runControlService = <RunControlService>this.services["RunControl"];

		for (let index in runControlService.contexts) {
			let context = <RunControlContext>runControlService.contexts[index];
			if (!threadID || threadID == this.hashString(context.ID)) {
				context.resume(mode).catch( (error: Error) => this.log(error.message) );
			}
		}
	}

	private suspend(threadID?: number): void {
		let runControlService = <RunControlService>this.services["RunControl"];

		for (let index in runControlService.contexts) {
			let context = <RunControlContext>runControlService.contexts[index];
			if (threadID == this.hashString(context.ID) || threadID == 0) {
				context.suspend().catch( (error: Error) => this.log(error.message) );
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

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): void {
		this.sendResponse(response);
		this.suspend(args.threadId);
	}

	/* Goto is a resume with type goto and count = address of target */
	protected gotoRequest(response: DebugProtocol.GotoResponse, args: DebugProtocol.GotoArguments): void {
		this.log("[NOT IMPLEMENTED] gotoRequest");
	}

	protected gotoTargetsRequest(response: DebugProtocol.GotoTargetsResponse, args: DebugProtocol.GotoTargetsArguments): void {
		this.log("[NOT IMPLEMENTED] gotoTargetsRequest");
	}

	/* TODO: May do this through the fileSystem TCF service and the disassembly service (for locations without source) */
    protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments): void {
		this.log("[NOT IMPLEMENTED] sourceRequest");
		super.sourceRequest(response, args);
	}

	/*
		TODO: For now, let's pretend that thread = process (usually holds for micro controllers)

		The thread ID is based on the runcontroller of a process
	*/
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

	/* Stack frames are organized as children of a process (violates our thread assumptions) */
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		let stackTraceService = <StackTraceService>this.services["StackTrace"];
		let processesService = <ProcessesService>this.services["Processes"];

		response.body = {
			stackFrames: [],
			totalFrames: 0
		}

		for (let index in processesService.contexts) {
			let processContext = <IProcessesContext>processesService.contexts[index];

			/* Support threads (in theory at least) */
			if (this.hashString(processContext.RunControlId) == args.threadId) {

				stackTraceService.getChildren(processContext.ID).then( (children) => {
					stackTraceService.getContext(children).then( (frames) => {
						frames.forEach(frame => {
							let frameArgs: string[] = []

							/* Sort frames based on the Order (depth in the stack) */
							let sortedArgs = frame.Args.sort((a,b) => {
								return a.Order - b.Order;
							});

							/* Create list of all arguments to the function frame */
							for (let frameArgIndex in sortedArgs) {
								let frameArg = sortedArgs[frameArgIndex];
								frameArgs.push(
									`${frameArg.Type.trim()} ${frameArg.Name.trim()} = ${frameArg.Value.trim()}`
								);
							}

							/* Create frame name based on function and arguments */
							let frameName = `${frame.Func.trim()} (${frameArgs.join(", ")})`

							/* Create the source */
							let source = new Source(path.basename(frame.File.trim()),
													path.normalize(frame.File.trim()),
													this.hashString(frame.File.trim()),
													frame.File,
													frame.File);

							/* Push the frame */
							response.body.stackFrames.push(
								new StackFrame(this.hashString(frame.ID), frameName, source, frame.Line));
						});

						this.sendResponse(response);
					}).catch( (error: Error) => this.log(error.message) );
				}).catch( (error: Error) => this.log(error.message) );
			}
		}
	}

	/* Scopes describes a collection of variables */
	/* TODO: is registers a scope? Global scope? */
    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		let stackTraceService = <StackTraceService>this.services["StackTrace"];
		let processesService = <ProcessesService>this.services["Processes"];

		response.body = {
			scopes: []
		}

		for (let index in processesService.contexts) {
			let processContext = <IProcessesContext>processesService.contexts[index];

			stackTraceService.getChildren(processContext.ID).then( (children) => {
				stackTraceService.getContext(children).then( (frames) => {
					frames.forEach(frame => {
						if (frame.Level == 0) {
							//response.body.scopes.push(new Scope("Global", this.hashString(frame.ID), false));
						}

						/* Create local scope if we are asked for a frame that we found */
						if (args.frameId == this.hashString(frame.ID)) {
							response.body.scopes.push(new Scope("Local", this.hashString(frame.ID), false));
						}
					});

					/* Push the registers scope */
					response.body.scopes.push(new Scope("Registers", this.hashString("Registers"), false));

					this.sendResponse(response);

				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		}
	}

	/* Variables belong to a scope (which is created above) */
    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		let self = this;

		response.body = {
			variables: []
		}

		if (args.variablesReference == this.hashString("Registers")) {
			let registersService = <RegistersService>this.services["Registers"];

			let values 	= new Array<Promise<string>>();
			let names 	= new Array<string>();
			for (let index in registersService.contexts) {
				let registersContext = <IRegistersContext>registersService.contexts[index];
				values.push(registersService.get(registersContext.ID));
				names.push(registersContext.Name);
			}

			Promise.all(values).then( (values: string[]) => {
				values.forEach( (value: string, index: number) => {
					let byteArrayString = <string>base64.decode(JSON.parse(value));
					let buffer = new Buffer(byteArrayString);

					/* NB: Little endian, so reverse the buffer... (?) */
					for (var i = 0, j = buffer.length - 1; i < j; ++i, --j) {
						let t = buffer[j]

						buffer[j] = buffer[i]
						buffer[i] = t
					}

					let valueString = `0x${buffer.toString('hex')}`;

					response.body.variables.push(
						new Variable(names[index], valueString)
					);
				});
				this.sendResponse(response);
			});
		}
		else {
			/* Assume that we are fetching variables from a stack frame */
			let stackTraceService = <StackTraceService>this.services["StackTrace"];
			let processesService = <ProcessesService>this.services["Processes"];
			let expressionsService = <ExpressionsService>this.services["Expressions"];

			for (let index in processesService.contexts) {
				let processContext = <IProcessesContext>processesService.contexts[index];

				stackTraceService.getChildren(processContext.ID).then( (children) => {
					stackTraceService.getContext(children).then( (frames) => {
						frames.forEach(frame => {

							/* Only evaluate if we are asked for this frame (local variables) */
							if (args.variablesReference == this.hashString(frame.ID)) {

								/* Get expressions for the frame */
								expressionsService.getChildren(frame.ID).then( (children) => {
									let childrenToEvaluate = children.length;

									if (childrenToEvaluate == 0) {
										this.sendResponse(response);
									}

									children.forEach(expressionId => {
										expressionsService.getContext(expressionId).then( (expression) => {

											/* Build the variable from the expression*/
											response.body.variables.push(
												new Variable(expression.Expression, expression.Val.trim())
											);
											expression.dispose();

											if (--childrenToEvaluate == 0) {
												this.sendResponse(response);
											}
										}).catch( (error: Error) => this.log(error.message) );
									});
								}).catch( (error: Error) => this.log(error.message) );
							}
						});
					}).catch( (error: Error) => this.log(error.message) );
				}).catch( (error: Error) => this.log(error.message) );
			}
		}
	}

	/* Set a variable to a value */
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

		stackTraceService.getChildren(currentProcess.ID).then( (children) => {
			stackTraceService.getContext(children).then( (frames) => {
				let sortedFrames = frames.sort( (a,b) => {
					return a.Level - b.Level;
				})

				/* TODO: is this assumption correct? (evaluate the expression based on the lowest frame) */
				let bottom = sortedFrames.shift();
				expressionsService.compute(bottom.ID, "C", args.name).then( (expression) => {
					/* Assign value */
					expression.assign(args.value);
					expression.dispose();

					/* Read back */
					expressionsService.compute(bottom.ID, "C", args.name).then( (expression) => {
						response.body.value = expression.Val.trim();
						this.sendResponse(response);
					}).catch( (error: Error) => this.log(error.message) );
				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		}).catch( (error: Error) => this.log(error.message) );
	}

	/* Evaluate using the expression evaluator */
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
				expressionsService.compute(this.hashes[args.frameId], "C", args.expression).then( (expression) => {
					response.body.result = expression.Val.trim();
					response.body.type = expression.Type;

					expression.dispose();

					this.sendResponse(response);
				}).catch( (error: Error) => this.log(error.message) );;
		}
	}

	private hashes: Map<number, string>;

	private hashString(str: string): number {
		if (!this.hashes)
			this.hashes = new Map<number, string>();

		/* Java odd-shift object hash (more or less at least) */
		/* TODO: change for something common? Need only to translate strings to numbers wihtout colliding */
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

	/* IRunControlListener */
	public contextSuspended(contextId: string, pc: number, reason: string, state: any): void {
		this.sendEvent(new StoppedEvent(reason, this.hashString(contextId), ""));
	}

	public contextResumed(contextId: string): void {
		this.sendEvent(new ContinuedEvent(this.hashString(contextId)));
	}

	public contextAdded(contexts: RunControlContext[]): void {	}
	public contextChanged(contexts: RunControlContext[]): void { }
	public contextRemoved(contextIds: string[]): void {	}
	public contextException(contextId: string, description: string): void {	}
	public containerSuspended(contextId: string, pc: number, reason: string, state: any, contextIds: string[]): void { }
	public containerResumed(contextIds: string[]): void { }
	public contextStateChanged(contextIds: string[]): void { }

	/* Log and debug helpers */
	private log(message: string): void {
		this.sendEvent(new OutputEvent(`${message}\n`));
	}

	private debug(message: string): void {
		if (this.DEBUG) {
			this.sendEvent(new OutputEvent(`${message}\n`));
		}
	}

	/* Goto helper */
	/* TODO, doesn't really belong here... */
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

		stackTraceService.getChildren(processContext.ID).then( (children) => {
			/* Find address of function identifier */
			expressionsService.compute(children.shift(), "C", func).then( (expressionContext) => {
				/* Convert address to number */
				let address = parseInt(expressionContext.Val.replace("0x", ""), 16);
				expressionContext.dispose();

				/* Goto address */
				runControlContext.resume(ResumeMode.Goto, address)
			}).catch( (error: Error) => this.log(error.message) );;
		}).catch( (error: Error) => this.log(error.message) );;
	}
}

DebugSession.run(AtmelDebugSession);
