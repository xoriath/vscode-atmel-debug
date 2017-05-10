'use strict';

// From http://git.eclipse.org/c/tcf/org.eclipse.tcf.git/plain/docs/TCF%20Specification.html#LocatorPeer
export interface IPeer {
	ID: string;
	ServiceManagerID?: string;
	AgentID?: string;
	Name?: string;
	OSName?: string;
	TransportName?: string;
	Host?: string;
	Aliases?: string;
	Addresses?: string;
	Port?: string;
}
