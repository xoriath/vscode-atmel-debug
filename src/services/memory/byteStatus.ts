'use strict';

export enum ByteStatus {
	ByteValid = 0x00,
	ByteUnknown = 0x01,
	ByteInvalid = 0x02,
	ByteCannotRead = 0x04,
	ByteCannotWrite = 0x08
}