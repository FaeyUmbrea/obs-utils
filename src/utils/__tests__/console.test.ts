import { describe, expect, it, vi } from 'vitest';
import { log } from '../console';

/* eslint-disable no-console */

describe('console.ts', () => {
	describe('log', () => {
		it('should call console.log with the correct prefix', () => {
			// Mock console.log
			const originalConsoleLog = console.log;
			console.log = vi.fn();

			// Call the log function with various arguments
			log('test message');
			log('multiple', 'arguments');
			log({ object: 'value' });
			log(123);
			log(null);
			log(undefined);

			// Verify console.log was called with the correct arguments
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ', 'test message');
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ', 'multiple', 'arguments');
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ', { object: 'value' });
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ', 123);
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ', null);
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ', undefined);

			// Restore original console.log
			console.log = originalConsoleLog;
		});

		it('should work with no arguments', () => {
			// Mock console.log
			const originalConsoleLog = console.log;
			console.log = vi.fn();

			// Call the log function with no arguments
			log();

			// Verify console.log was called with just the prefix
			expect(console.log).toHaveBeenCalledWith('OBS Utils | ');

			// Restore original console.log
			console.log = originalConsoleLog;
		});
	});
});
