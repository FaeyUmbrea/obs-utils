import { afterEach, expect, it, vi } from 'vitest';
import { TriggerRegistry } from '../triggers.ts';

afterEach(() => vi.unstubAllGlobals());

it('unregisters only the event’s hook bridges and does not duplicate them when registered again', () => {
	let nextId = 0;
	const callbacks = new Map<number, (...args: unknown[]) => void>();
	const hooks = {
		on: vi.fn((_name: string, callback: (...args: unknown[]) => void) => {
			callbacks.set(++nextId, callback);
			return nextId;
		}),
		off: vi.fn((_name: string, id: number) => callbacks.delete(id)),
	};
	vi.stubGlobal('Hooks', hooks);
	const registry = new TriggerRegistry();
	const registration = { key: 'changed', internal: true, bridges: [{ hook: 'updateActor', map: (value: unknown) => value }] };
	registry.register(registration);
	registry.register({ key: 'other', internal: true, bridges: [{ hook: 'updateActor', map: (value: unknown) => value }] });
	registry.unregister('changed');
	expect(registry.list().some(event => event.key === 'changed')).toBe(false);
	expect(registry.list().some(event => event.key === 'other')).toBe(true);
	expect(callbacks.size).toBe(1);
	expect(hooks.off).toHaveBeenCalledWith('updateActor', 1);
	registry.register(registration);
	const received = vi.fn();
	registry.subscribe('changed', received);
	for (const callback of callbacks.values()) callback({ hp: 5 });
	expect(received).toHaveBeenCalledExactlyOnceWith({ hp: 5 });
	registry.destroy();
	expect(callbacks.size).toBe(0);
	expect(hooks.off).toHaveBeenCalledTimes(3);
});
