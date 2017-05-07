'use strict';

export enum ResumeMode {
	Resume = 0,
	StepOver = 1,
	StepInto = 2,
	StepOverLine = 3,
	StepIntoLine = 4,
	StepOut = 5,
	ReverseResume = 6,
	ReverseStepOver = 7,
	ReverseStepInto = 8,
	ReverseStepOverLine = 9,
	ReversStepIntoLine = 10,
	ReverseStepOut = 11,
	StepOverRange = 12,
	StepIntoRange = 13,
	ReverseStepOverRange = 14,
	ReverseStepIntoRange = 15,
	UntilActive = 16,
	Goto = 17
}