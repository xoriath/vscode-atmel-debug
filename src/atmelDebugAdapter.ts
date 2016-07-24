
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

import atbackendAdapter from "./atbackendAdapter";

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

		this.sendEvent(new InitializedEvent());

		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsSetVariable = true;

		this.sendResponse(response);

	}

	private atbackend: atbackendAdapter;

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		this.atbackend = new atbackendAdapter(args.atbackendHost, args.atbackendPort);
		this.atbackend.connect();

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
