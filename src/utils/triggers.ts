import type { Readable } from 'svelte/store';
import { derived, writable } from 'svelte/store';

/**
 * Per-field metadata for a configurable trigger's payload. Used by the editor
 * to render condition inputs and by the runtime to type-check filters.
 */
export interface PayloadField {
	key: string;
	type: 'string' | 'number' | 'boolean' | 'Actor' | 'Roll' | 'ChatMessage' | string;
	label: string;
	display?: boolean;
	filter?: boolean;
	default?: unknown;
}

/**
 * A Foundry-side hook this trigger should bridge from. Registry installs one
 * `Hooks.on(hook, ...)` per bridge at register-time and unwires on unregister.
 * `map` normalizes the raw hook arguments into the trigger's payload shape.
 */
export interface TriggerBridge<P = unknown> {
	hook: string;
	map: (...args: unknown[]) => P | undefined;
}

export interface TriggerRegistration<P = unknown> {
	key: string;
	/** Localizable name. Required for user-facing (non-internal) triggers. */
	name?: string;
	icon?: string;
	payloadSchema?: PayloadField[];
	/** Hidden from picker UIs; auto-wired internal triggers like actor refresh. */
	internal?: boolean;
	/** Foundry hooks this trigger reads from. Optional — triggers can also be fired purely programmatically. */
	bridges?: TriggerBridge<P>[];
	/**
	 * Pre-populate the current-payload cache at registration time. Useful for
	 * implicit triggers whose "current value" exists before any fire (e.g. the
	 * actor catalog at startup).
	 */
	bootstrap?: () => Iterable<P>;
}

export interface SubscribeOptions<P = unknown> {
	/** Drop payloads that don't match. */
	filter?: (payload: P) => boolean;
	/** If a cached payload exists, dispatch it synchronously on subscribe. */
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

/**
 * Central reactive substrate for obs-utils. Components do not call
 * `Hooks.on(...)` directly anymore — they subscribe here. The registry owns
 * exactly one Foundry-side subscription per bridged hook, regardless of how
 * many internal subscribers downstream.
 *
 * Lifecycle: one registry per host root component (the `/stream` mount and
 * the editor canvas each spawn their own). Call `destroy()` on root unmount.
 */
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

		// Wire Foundry-side bridges. One subscription per bridge, regardless of
		// how many module-side subscribers consume the trigger.
		for (const bridge of reg.bridges ?? []) {
			const id = Hooks.on(bridge.hook, (...args: unknown[]) => {
				const payload = bridge.map(...args);
				if (payload === undefined) return;
				this.fire(reg.key, payload);
			});
			this.foundryHooks.push({ hook: bridge.hook, id });
		}

		// Bootstrap pre-populates the payload cache. The store stays at
		// `undefined` (a single-slot reactive value); subscribers that want
		// multi-payload state should use `subscribe`/`current` directly.
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
		// Note: we don't remove Foundry hooks per-key here. `destroy()` is the
		// teardown path; partial unregistration during a session is rare.
	}

	/**
	 * Plain-callback subscription. Returns an unsubscribe function. Filters
	 * (when provided) are evaluated in the registry, so unmatched payloads
	 * never wake the consumer.
	 */
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

	/**
	 * Reactive store flavor. Filter (if given) creates a derived view that
	 * only updates on matching payloads. Returns a `Readable` shaped as the
	 * trigger's payload type, or undefined when no payload has been seen.
	 */
	store<P>(key: string, filter?: (payload: P) => boolean): Readable<P | undefined> {
		const base = this.stores.get(key);
		if (!base) throw new Error(`Trigger '${key}' is not registered`);
		if (!filter) return base as Readable<P | undefined>;
		// Derived store that gates on the filter. Initial value flows through
		// the same gate so subscribers don't see stale unmatched payloads.
		return derived(base as Readable<P | undefined>, (p) => {
			if (p === undefined) return undefined;
			return filter(p) ? p : undefined;
		});
	}

	/** Dispatch a payload to all subscribers. Also broadcasts as an outgoing Foundry hook for non-internal triggers. */
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
			// Outgoing public broadcast so external modules can observe.
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
