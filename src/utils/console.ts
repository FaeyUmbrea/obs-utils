/* eslint-disable no-console */

export function log(...args: any[]) {
	console.log(`OBS Utils | `, ...args);
}

export function proxyLog(...args: any[]) {
	console.log(...args);
}
export function proxyWarn(...args: any[]) {
	console.warn(...args);
}
export function proxyError(...args: any[]) {
	console.error(...args);
}
