import type { Readable } from 'svelte/store';
import { derived, writable } from 'svelte/store';

export interface PayloadField {
	key: string;
	type: 'string' | 'number' | 'boolean' | 'Actor' | 'Roll' | 'ChatMessage' | string;
	label: string;
	display?: boolean;
	filter?: boolean;
	default?: unknown;
}

export interface TriggerBridge<P = unknown> {
	hook: string;
	map: (...args: unknown[]) => P | undefined;
}

export interface TriggerRegistration<P = unknown> {
	key: string;
	name?: string;
	icon?: string;
	payloadSchema?: PayloadField[];
	internal?: boolean;
	bridges?: TriggerBridge<P>[];
	bootstrap?: () => Iterable<P>;
}

export interface SubscribeOptions<P = unknown> {
	filter?: (payload: P) => boolean;
	immediate?: boolean;
}

export interface TriggerInfo {
	key: string;
	name?: string;
	icon?: string;
	internal: boolean;
	subscriberCount: number;
}

interface Subscriber<P> {
	handler: (payload: P) => void;
	filter?: (payload: P) => boolean;
}

// One registry per host. Components subscribe here instead of calling Hooks.on directly,
// so each bridged hook only fires one Foundry-side subscription.
export class TriggerRegistry {
	private readonly registrations = new Map<string, TriggerRegistration<unknown>>();
	private readonly currentPayloads = new Map<string, unknown>();
	private readonly subscribers = new Map<string, Set<Subscriber<unknown>>>();
	private readonly stores = new Map<string, ReturnType<typeof writable<unknown>>>();
	private readonly foundryHooks: Array<{ hook: string; id: number }> = [];

	register<P>(reg: TriggerRegistration<P>): void {
		if (this.registrations.has(reg.key)) {
			throw new Error(`Trigger '${reg.key}' is already registered`);
		}
		this.registrations.set(reg.key, reg as TriggerRegistration<unknown>);
		this.stores.set(reg.key, writable<unknown>(undefined));
		this.subscribers.set(reg.key, new Set());

		for (const bridge of reg.bridges ?? []) {
			const id = Hooks.on(bridge.hook, (...args: unknown[]) => {
				const payload = bridge.map(...args);
				if (payload === undefined) return;
				this.fire(reg.key, payload);
			});
			this.foundryHooks.push({ hook: bridge.hook, id });
		}

		if (reg.bootstrap) {
			for (const payload of reg.bootstrap()) {
				this.currentPayloads.set(reg.key, payload);
				this.stores.get(reg.key)!.set(payload);
			}
		}
	}

	unregister(key: string): void {
		if (!this.registrations.has(key)) return;
		this.registrations.delete(key);
		this.currentPayloads.delete(key);
		this.subscribers.delete(key);
		this.stores.delete(key);
	}

	subscribe<P>(key: string, handler: (payload: P) => void, opts: SubscribeOptions<P> = {}): () => void {
		const list = this.subscribers.get(key);
		if (!list) throw new Error(`Trigger '${key}' is not registered`);
		const entry = { handler, filter: opts.filter } as Subscriber<unknown>;
		list.add(entry);
		if (opts.immediate) {
			const current = this.currentPayloads.get(key) as P | undefined;
			if (current !== undefined && (!opts.filter || opts.filter(current))) handler(current);
		}
		return () => list.delete(entry);
	}

	store<P>(key: string, filter?: (payload: P) => boolean): Readable<P | undefined> {
		const base = this.stores.get(key);
		if (!base) throw new Error(`Trigger '${key}' is not registered`);
		if (!filter) return base as Readable<P | undefined>;
		return derived(base as Readable<P | undefined>, (p) => {
			if (p === undefined) return undefined;
			return filter(p) ? p : undefined;
		});
	}

	fire<P>(key: string, payload: P): void {
		const reg = this.registrations.get(key);
		if (!reg) throw new Error(`Trigger '${key}' is not registered`);
		this.currentPayloads.set(key, payload);
		this.stores.get(key)!.set(payload);
		const list = this.subscribers.get(key);
		if (list) {
			for (const sub of list) {
				if (sub.filter && !sub.filter(payload)) continue;
				sub.handler(payload);
			}
		}
		if (!reg.internal) {
			(Hooks.callAll as (hook: string, ...args: unknown[]) => boolean)(`obs-utils.trigger.${key}`, payload);
		}
	}

	current<P>(key: string): P | undefined {
		return this.currentPayloads.get(key) as P | undefined;
	}

	list(): TriggerInfo[] {
		const out: TriggerInfo[] = [];
		for (const reg of this.registrations.values()) {
			out.push({
				key: reg.key,
				name: reg.name,
				icon: reg.icon,
				internal: !!reg.internal,
				subscriberCount: this.subscribers.get(reg.key)?.size ?? 0,
			});
		}
		return out;
	}

	destroy(): void {
		for (const { hook, id } of this.foundryHooks) Hooks.off(hook, id);
		this.foundryHooks.length = 0;
		this.registrations.clear();
		this.currentPayloads.clear();
		this.subscribers.clear();
		this.stores.clear();
	}
}
