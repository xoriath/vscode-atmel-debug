
'use strict';

const path 		= require('path');
const base64 	= require('base-64');

import { IDispatcher } from './idispatcher';
import { WebsocketDispatcher } from './websocketDispatcher';

import { DebugProtocol } from 'vscode-debugprotocol';
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
	LocatorService,
	ToolService,
	DeviceService,
	ProcessService,
	MemoryService,
	RegisterService,
	ExpressionService,
	LineNumberService,
	StackTraceService,
	StreamService,
	BreakpointsService,
	RunControlService
} from './services/services';

import {
	IToolContext,
	IProcessContext,
	IRegisterContext,
	IRunControlContext,

} from './services/contexts';

import { AccessMode } from './services/breakpoint/accessMode';
import { ResumeMode } from './services/runcontrol/resumeMode';
import { IRunControlListener } from './services/runcontrol/irunControlListener';
import { IService } from './services/iservice';

import { LaunchRequestArguments } from './launchRequestArguments';
import { GotoMain } from './gotoMain';
import { ProcessLauncher } from './processLauncher';
import { NumericalHashCode } from './numericalHashCode';

export class AtmelDebugSession extends DebugSession implements IRunControlListener {

	/* Set to true to output debug log */
	private DEBUG: boolean = true;

	private dispatcher: IDispatcher;
	private services = new Map<string, IService>();
	private hasher = new NumericalHashCode();

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

		/** The debug adapter supports a 'format' attribute on the stackTraceRequest, variablesRequest, and evaluateRequest. */
		response.body.supportsValueFormattingOptions = false;

		response.body.supportsModulesRequest = false;

		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsConditionalBreakpoints = false;  		// TODO: why doesn't this break?
		response.body.supportsHitConditionalBreakpoints = false; 	// TODO: implement

		response.body.supportsRestartFrame = false;
		response.body.supportsStepBack = false;

		response.body.supportsStepInTargetsRequest = false;
		response.body.supportsGotoTargetsRequest = true;

		response.body.supportsExceptionOptions = false;
		response.body.supportsExceptionInfoRequest = false;
		response.body.exceptionBreakpointFilters = null;
		response.body.additionalModuleColumns = null;
		response.body.supportedChecksumAlgorithms = null;

        /** The debug adapter supports the RestartRequest. In this case a client should not implement 'restart' by terminating and relaunching the adapter but by calling the RestartRequest. */
		response.body.supportsRestartRequest = false;

        /** The debug adapter supports the 'terminateDebuggee' attribute on the 'disconnect' request. */
		response.body.supportTerminateDebuggee = false;

		this.sendResponse(response);
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		/* Terminate the processes */
		if ('Processes' in this.services) {
			let processService = <ProcessService>this.services['Processes'];
			processService.contexts.forEach(context => {
				context.terminate();
			});
		}

		/* Tear down the tools */
		if ('Tools' in this.services) {
			let toolService = <ToolService>this.services['Tools'];
			toolService.contexts.forEach(context => {
				context.tearDownTool();
			});
		}
	}

	private remapSourcePathFrom: string;
	private remapSourcePathTo: string;
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		let self = this;

		self.remapSourcePathFrom = args.remapSourcePathFrom;
		self.remapSourcePathTo = args.remapSourcePathTo;

		/* Create the dispatcher */
		self.dispatcher = new WebsocketDispatcher(args.atbackendHost, args.atbackendPort,
										(message: string) => {
											self.sendEvent(new OutputEvent(message));
										},
										(message: string) => {
											self.debug(message);
										});

		self.dispatcher.connect((dispatcher: IDispatcher) => {
			let locator = new LocatorService(dispatcher);

			locator.hello(() => {

				/* Need to wait for hello before we can start the show */
				let toolService = new ToolService(dispatcher);
				let deviceService = new DeviceService(dispatcher);
				let processService = new ProcessService(dispatcher);
				let memoryService = new MemoryService(dispatcher);
				let registerService = new RegisterService(dispatcher);
				let runControlService = new RunControlService(dispatcher);
				let stackTraceService = new StackTraceService(dispatcher);
				let expressionService = new ExpressionService(dispatcher);
				let lineNumberService = new LineNumberService(dispatcher);
				let breakpointService = new BreakpointsService(dispatcher);
				let streamService = new StreamService(dispatcher);

				self.services['Tool'] = toolService;
				self.services['Device'] = deviceService;
				self.services['Processes'] = processService;
				self.services['Memory'] = memoryService;
				self.services['Registers'] = registerService;
				self.services['RunControl'] = runControlService;
				self.services['StackTrace'] = stackTraceService;
				self.services['Expressions'] = expressionService;
				self.services['LineNumbers'] = lineNumberService;
				self.services['Breakpoints'] = breakpointService;
				self.services['Streams'] = streamService;

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
				processService.addListener(new GotoMain(self));

				/* Once a device has been instantiated, we need to actually launch with a module */
				deviceService.addListener(new ProcessLauncher(args.program, processService, args));

				/* Ignition! TODO: need more properties for USB/IP tools */
				toolService.setupTool(args.tool, args.toolConnection, args.connectionProperties).then( (tool: IToolContext) => {
					tool.setProperties({
						'DeviceName': args.device,
						'PackPath': args.packPath,
						'InterfaceName': args.interface,
						'InterfaceProperties': args.interfaceProperties
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
		this.log('[NOT IMPLEMENTED] attachRequest');
		super.attachRequest(response, args);
	}

	private activeBreakpointIds = new Array<string>();

	/* TODO: this is called once PER SOURCE FILE. Need to extend acitveBreakpoints etc */
	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		let processService = <ProcessService>this.services['Processes'];
		let breakpointsService = <BreakpointsService>this.services['Breakpoints'];

		response.body = {
			breakpoints: []
		};

		/* Fetch the running process */
		let processContext: IProcessContext;
		for (let index in processService.contexts) {
			processContext = processService.contexts[index];
		}

		/* Remove all active breakpoints */
		breakpointsService.remove(this.activeBreakpointIds);
		this.activeBreakpointIds = [];

		let breakpointsToProcess = args.breakpoints.length;

		args.breakpoints.forEach( breakpointArgs => {
			let breakpointId = breakpointsService.getNextBreakpointId();

			let breakpoint = {
				'ContextIds': [ processContext.ID ],
				'AccessMode': AccessMode.Execute,
				'ID': breakpointId,
				'Enabled': true,
				'IgnoreCount': 1,
				'IgnoreType': 'always',
				'Line': breakpointArgs.line,
				'Column': breakpointArgs.column | 0
			};

			if (args.source.path) {
				breakpoint['File'] = args.source.path;
			} // else use args.source.sourceReference

			if (breakpointArgs.condition) {
				breakpoint['Condition'] = breakpointArgs.condition;
				breakpoint['Istrue'] = true;
			}

			breakpointsService.add(breakpoint).then( (report) => {
				breakpointsService.getProperties(breakpointId).then( (breakpoint) => {
					let bp = new Breakpoint(breakpoint.Enabled, breakpoint.Line, breakpoint.Column);

					response.body.breakpoints.push(bp);
					this.activeBreakpointIds.push(breakpointId);

					/* Since we need to bind all the requested breakpoints before responding, wait until the last is bound */
					if (--breakpointsToProcess === 0) {
						this.sendResponse(response);
					}
				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		});
	}

	private activeFunctionBreakpointIds = new Array<string>();

	/* TODO: this is called once PER SOURCE FILE. Need to extend acitveBreakpoints etc */
	protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments): void {
		let processService = <ProcessService>this.services['Processes'];
		let breakpointsService = <BreakpointsService>this.services['Breakpoints'];

		response.body = {
			breakpoints: []
		};

		let processContext: IProcessContext;
		for (let index in processService.contexts) {
			processContext = processService.contexts[index];
		}

		breakpointsService.remove(this.activeFunctionBreakpointIds);
		this.activeFunctionBreakpointIds = [];

		let breakpointsToProcess = args.breakpoints.length;

		args.breakpoints.forEach( breakpointArgs => {
			let breakpointId = breakpointsService.getNextBreakpointId();

			let breakpoint = {
				'ContextIds': [ processContext.ID ],
				'AccessMode': AccessMode.Execute,
				'ID': breakpointId,
				'Enabled': true,
				'IgnoreCount': 1,
				'IgnoreType': 'always',
				'Function': breakpointArgs.name,
				'FunctionLine': 1,
				'FunctionColumn': 0
			};

			breakpointsService.add(breakpoint).then( (report) => {
				breakpointsService.getProperties(breakpointId).then( (breakpoint) => {
					let bp = new Breakpoint(breakpoint.Enabled, breakpoint.Line, /*breakpoint.Column*/ 0);

					response.body.breakpoints.push(bp);
					this.activeFunctionBreakpointIds.push(breakpointId);

					if (--breakpointsToProcess === 0) {
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
		this.log('[NOT IMPLEMENTED] setExceptionBreakPointsRequest');
		super.setExceptionBreakPointsRequest(response, args);
	}

	/* TODO: should this be supported? */
	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		this.log('[NOT IMPLEMENTED] configurationDoneRequest');
		super.configurationDoneRequest(response, args);
	}

	/* Resume is any form of resume */
	private resume(mode: ResumeMode, threadID?: number): void {
		let runControlService = <RunControlService>this.services['RunControl'];

		runControlService.contexts.forEach(context => {
			if (!threadID || threadID === this.hasher.hash(context.ID)) {
				context.resume(mode).catch( (error: Error) => this.log(error.message) );
			}
		});
	}

	private suspend(threadID?: number): void {
		let runControlService = <RunControlService>this.services['RunControl'];

		runControlService.contexts.forEach(context => {
			if (threadID === this.hasher.hash(context.ID) || threadID === 0) {
				context.suspend().catch( (error: Error) => this.log(error.message) );
			}
		});
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
		this.log('[NOT IMPLEMENTED] gotoRequest');
		super.gotoRequest(response, args);
	}

	protected stepInTargetsRequest(response: DebugProtocol.StepInTargetsResponse, args: DebugProtocol.StepInTargetsArguments): void {
		this.log('[NOT IMPLEMENTED] stepInTargetsRequest');
		super.stepInTargetsRequest(response, args);
	}

	protected gotoTargetsRequest(response: DebugProtocol.GotoTargetsResponse, args: DebugProtocol.GotoTargetsArguments): void {
		this.log('[NOT IMPLEMENTED] gotoTargetsRequest');
	}

	/* TODO: May do this through the fileSystem TCF service and the disassembly service (for locations without source) */
	protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments): void {
		this.log(`[NOT IMPLEMENTED] sourceRequest: ${args.sourceReference}`);
		super.sourceRequest(response, args);
	}

	/*
		TODO: For now, let's pretend that thread = process (usually holds for micro controllers)

		The thread ID is based on the runcontroller of a process
	*/
	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		let processService = <ProcessService>this.services['Processes'];

		response.body = {
			threads: []
		};

		processService.contexts.forEach(context => {
			response.body.threads.push(
				new Thread(this.hasher.hash(context.RunControlId), context.Name));
		});

		this.sendResponse(response);
	}

	/* Stack frames are organized as children of a process (violates our thread assumptions) */
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		let stackTraceService = <StackTraceService>this.services['StackTrace'];
		let ProcessService = <ProcessService>this.services['Processes'];

		response.body = {
			stackFrames: [],
			totalFrames: 0
		};

		ProcessService.contexts.forEach(context => {

			/* Support threads (in theory at least) */
			if (this.hasher.hash(context.RunControlId) === args.threadId) {

				stackTraceService.getChildren(context.ID).then( (children) => {
					stackTraceService.getContexts(children).then( (frames) => {
						frames.forEach(frame => {
							let frameArgs: string[] = [];

							/* Sort frames based on the Order (depth in the stack) */
							let sortedArgs = frame.Args.sort( (a, b) => {
								return a.Order - b.Order;
							});

							/* Create list of all arguments to the function frame */
							sortedArgs.forEach(frameArg => {
								frameArgs.push(
									`${frameArg.Type.trim()} ${frameArg.Name.trim()} = ${frameArg.Value.trim()}`
								);
							});

							/* Create frame name based on function and arguments */
							let frameName = `${frame.Func.trim()} (${frameArgs.join(', ')})`;

							/* Create the source */
							let remappedFile = path.normalize(frame.File.replace(this.remapSourcePathFrom, this.remapSourcePathTo).trim());
							this.log(`[SRC] ${frame.File} => ${remappedFile}`);

							let source = new Source(path.basename(remappedFile),
													this.convertDebuggerPathToClient(remappedFile),
													0 /* 0 == Do not use source request to get content */
													// this.hashString(frame.File.trim()),
													// this.convertDebuggerPathToClient(remappedFile),
													// this.convertDebuggerPathToClient(remappedFile)
													);
							this.log(`[SOURCE] ${source.path} => ${source.name}`);

							/* Push the frame */
							response.body.stackFrames.push(
								new StackFrame(this.hasher.hash(frame.ID), frameName, source, frame.Line));
						});

						this.sendResponse(response);
					}).catch( (error: Error) => this.log(error.message) );
				}).catch( (error: Error) => this.log(error.message) );
			}
		});
	}

	/* Scopes describes a collection of variables */
	/* TODO: is registers a scope? Global scope? */
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		let stackTraceService = <StackTraceService>this.services['StackTrace'];
		let ProcessService = <ProcessService>this.services['Processes'];

		response.body = {
			scopes: []
		};

		ProcessService.contexts.forEach(context => {

			stackTraceService.getChildren(context.ID).then( (children) => {
				stackTraceService.getContexts(children).then( (frames) => {
					frames.forEach(frame => {
						if (frame.Level === 0) {
							// response.body.scopes.push(new Scope("Global", this.hashString(frame.ID), false));
						}

						/* Create local scope if we are asked for a frame that we found */
						if (args.frameId === this.hasher.hash(frame.ID)) {
							response.body.scopes.push(new Scope('Local', this.hasher.hash(frame.ID), false));
						}
					});

					/* Push the registers scope */
					response.body.scopes.push(new Scope('Registers', this.hasher.hash('Registers'), false));

					this.sendResponse(response);

				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		});
	}

	/* Variables belong to a scope (which is created above) */
	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {

		response.body = {
			variables: []
		};

		if (args.variablesReference === this.hasher.hash('Registers')) {
			let registerService = <RegisterService>this.services['Registers'];

			let values 	= new Array<Promise<string>>();
			let registers 	= new Array<IRegisterContext>();

			registerService.contexts.forEach(context => {
				values.push(registerService.get(context.ID));
				registers.push(context);
			});

			Promise.all(values).then( (values: string[]) => {
				values.forEach( (value: string, index: number) => {
					let byteArrayString = <string>base64.decode(JSON.parse(value));
					let buffer = new Buffer(byteArrayString);

					let valueString = `0x${buffer.readUIntBE(0, registers[index].Size).toString(16)}`;
					if (registers[index].Name === 'CYCLE_COUNTER') {
						valueString = `${buffer.readUIntBE(0, registers[index].Size)}`;
					}

					response.body.variables.push(
						new Variable(registers[index].Name, valueString)
					);
				});
				this.sendResponse(response);
			});
		}
		else {
			/* Assume that we are fetching variables from a stack frame */
			let stackTraceService = <StackTraceService>this.services['StackTrace'];
			let processService = <ProcessService>this.services['Processes'];
			let expressionService = <ExpressionService>this.services['Expressions'];

			processService.contexts.forEach(context => {
				stackTraceService.getChildren(context.ID).then( (children) => {
					stackTraceService.getContexts(children).then( (frames) => {
						frames.forEach(frame => {

							/* Only evaluate if we are asked for this frame (local variables) */
							if (args.variablesReference === this.hasher.hash(frame.ID)) {

								/* Get expressions for the frame */
								expressionService.getChildren(frame.ID).then( (children) => {
									let childrenToEvaluate = children.length;

									if (childrenToEvaluate === 0) {
										this.sendResponse(response);
									}

									children.forEach(expression => {
										expressionService.getContext(expression.ID).then( (expression) => {

											/* Build the variable from the expression*/
											response.body.variables.push(
												new Variable(expression.Expression, expression.Val.trim())
											);
											expression.dispose();

											if (--childrenToEvaluate === 0) {
												this.sendResponse(response);
											}
										}).catch( (error: Error) => this.log(error.message) );
									});
								}).catch( (error: Error) => this.log(error.message) );
							}
						});
					}).catch( (error: Error) => this.log(error.message) );
				}).catch( (error: Error) => this.log(error.message) );
			});
		}
	}

	/* Set a variable to a value */
	protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments): void {
		let expressionsService = <ExpressionService>this.services['Expressions'];
		let ProcessService = <ProcessService>this.services['Processes'];
		let stackTraceService = <StackTraceService>this.services['StackTrace'];

		response.body = {
			value: ''
		};

		let currentProcess: IProcessContext;
		for (let index in ProcessService.contexts) {
			currentProcess = ProcessService.contexts[index];
		}

		stackTraceService.getChildren(currentProcess.ID).then( (children) => {
			stackTraceService.getContexts(children).then( (frames) => {
				let sortedFrames = frames.sort( (a, b) => {
					return a.Level - b.Level;
				});

				/* TODO: is this assumption correct? (evaluate the expression based on the lowest frame) */
				let bottom = sortedFrames.shift();
				expressionsService.compute(bottom, 'C', args.name).then( (expression) => {
					/* Assign value */
					expression.assign(args.value);
					expression.dispose();

					/* Read back */
					expressionsService.compute(bottom, 'C', args.name).then( (expression) => {
						response.body.value = expression.Val.trim();
						this.sendResponse(response);
					}).catch( (error: Error) => this.log(error.message) );
				}).catch( (error: Error) => this.log(error.message) );
			}).catch( (error: Error) => this.log(error.message) );
		}).catch( (error: Error) => this.log(error.message) );
	}

	/* Evaluate using the expression evaluator */
	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		let expressionsService = <ExpressionService>this.services['Expressions'];
		let stackTraceService = <StackTraceService>this.services['StackTrace'];

		let stackTraceContextId = this.hasher.retrieve(args.frameId);

		response.body = {
			result: '',
			type: '',
			variablesReference: 0,
			namedVariables: 0,
			indexedVariables: 0
		};

		switch (args.context) {
			case 'watch':
			case 'hover':
			case 'repl':
			default:
				stackTraceService.getContext(stackTraceContextId).then(context => {
					expressionsService.compute(context, 'C' /* language */, args.expression).then( (expression) => {
					response.body.result = expression.Val.trim();
					response.body.type = expression.Type;

					expression.dispose();

					this.sendResponse(response);
				}).catch( (error: Error) => {
					this.log(error.message);
					response.body.result = error.message;
					response.body.type = 'Error';

					this.sendResponse(response);
				});
			});
		}
	}

	/* IRunControlListener */
	public contextSuspended(contextId: string, pc: number, reason: string, state: any): void {
		this.sendEvent(new StoppedEvent(reason, this.hasher.hash(contextId), ''));
	}

	public contextResumed(contextId: string): void {
		this.sendEvent(new ContinuedEvent(this.hasher.hash(contextId)));
	}

	public contextAdded(contexts: IRunControlContext[]): void {	}
	public contextChanged(contexts: IRunControlContext[]): void { }
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
		let expressionsService = <ExpressionService>this.services['Expressions'];
		let runControlService = <RunControlService>this.services['RunControl'];
		let stackTraceService = <StackTraceService>this.services['StackTrace'];
		let processService = <ProcessService>this.services['Processes'];

		let processContext: IProcessContext;
		for (let index in processService.contexts) {
			processContext = <IProcessContext>processService.contexts[index];
		}

		let runControlContext: IRunControlContext;
		for (let index in runControlService.contexts) {
			runControlContext = (<IRunControlContext>runControlService.contexts[index]);
		}

		stackTraceService.getChildren(processContext.ID).then( (children) => {
			/* Find address of function identifier */
			expressionsService.compute(children.shift(), 'C', `${func}`).then( (expressionContext) => {
				/* Convert address to number */
				let address = parseInt(expressionContext.Val.replace('0x', ''), 16);
				expressionContext.dispose();

				/* Goto address */
				runControlContext.resume(ResumeMode.Goto, address);
			}).catch( (error: Error) => this.log(error.message) );
		}).catch( (error: Error) => this.log(error.message) );
	}
}

DebugSession.run(AtmelDebugSession);
