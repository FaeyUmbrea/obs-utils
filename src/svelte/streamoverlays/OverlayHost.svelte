<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayFrame, RenderedOverlay, RenderState } from '../../utils/render.ts';
	import type { OverlayData } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { PlaybackEngine } from '../../utils/playback.ts';
	import { buildRenderTree } from '../../utils/render.ts';
	import { TriggerRegistry } from '../../utils/triggers.ts';

	const { overlays, actorIDs }: {
		overlays: OverlayData[];
		actorIDs: string[];
	} = $props();

	// One registry per host instance. `/stream` and the editor canvas each
	// instantiate their own. `destroy()` removes every Foundry-side
	// subscription this host installed.
	const registry = new TriggerRegistry();

	// Reactive state the renderer consumes. Populated in response to registry
	// fires; the tree is a `$derived` from these.
	const actors = $state(new Map<string, unknown>());
	const users = $state(new Map<string, unknown>());
	const triggerPayloads = $state(new Map<string, Record<string, unknown> | undefined>());
	const frames = $state(new Map<string, OverlayFrame>());
	let frameTick = $state(0);

	const playback = new PlaybackEngine(registry, frames, () => {
		// Bump a tick to invalidate the `$derived` tree; using a counter rather
		// than mutating `frames` directly so Svelte reliably picks up the change.
		frameTick = frameTick + 1;
	});

	const legacyHookIds: number[] = [];

	onMount(() => {
		const actorList = (game as { actors?: { values?: () => Iterable<unknown> } }).actors;
		if (actorList?.values) {
			for (const a of actorList.values()) {
				const actor = a as { id?: string };
				if (actor.id) actors.set(actor.id, a);
			}
		}

		const userList = (game as { users?: { values?: () => Iterable<unknown> } }).users;
		if (userList?.values) {
			for (const u of userList.values()) {
				const user = u as { id?: string };
				if (user.id) users.set(user.id, u);
			}
		}

		// Internal trigger: actor data refresh. One Foundry hook subscription
		// regardless of how many AV components are mounted.
		registry.register({
			key: 'core.actorData',
			internal: true,
			bridges: [{
				hook: 'updateActor',
				map: (actor: unknown) => ({ actor }),
			}],
		});
		registry.subscribe<{ actor: { id?: string } }>('core.actorData', ({ actor }) => {
			if (actor?.id) actors.set(actor.id, actor);
		});

		// Internal trigger: user activity. Drives player-tiling overlay membership.
		registry.register({
			key: 'core.userActivity',
			internal: true,
			bridges: [{
				hook: 'userConnected',
				map: (user: unknown) => ({ user }),
			}],
		});
		registry.subscribe<{ user: { id?: string } }>('core.userActivity', ({ user }) => {
			if (user?.id) users.set(user.id, user);
		});

		// Legacy public trigger relay. `api.fireOverlayTrigger(key, payload)`
		// still emits this hook for back-compat; bridge it into the registry
		// so subscribers downstream see one source.
		const legacyHookId = Hooks.on('obs-utils.overlayTrigger' as never, (key: string, payload: Record<string, unknown>) => {
			ensureTriggerRegistered(key);
			triggerPayloads.set(key, payload);
			registry.fire(key, payload);
		});
		legacyHookIds.push(legacyHookId);

		playback.start();
	});

	function ensureTriggerRegistered(key: string) {
		try {
			registry.register({ key });
		} catch {
			// Already registered.
		}
	}

	onDestroy(() => {
		for (const id of legacyHookIds) Hooks.off('obs-utils.overlayTrigger' as never, id);
		playback.stop();
		registry.destroy();
	});

	// Mount tiles in the playback engine for each (overlay × context) pair that
	// the tree currently produces. The engine's tile lifecycle mirrors the tree.
	$effect(() => {
		// Read frameTick to keep the effect linked to playback updates; the tree
		// already depends on the underlying state maps.
		void frameTick;
		const wanted = new Set<string>();
		for (const ov of overlays) {
			if (!ov.animation) continue;
			const ids = ov.tileBy === 'players'
				? userIDs
				: ov.tileBy === 'once'
					? ['singleton']
					: actorIDs;
			for (const id of ids) {
				const tileKey = ov.tileBy === 'players'
					? `user:${id}`
					: ov.tileBy === 'once'
						? 'singleton'
						: `actor:${id}`;
				wanted.add(`${ov.id ?? ''}:${tileKey}`);
				playback.mountTile(ov, tileKey);
			}
		}
		// Drop tiles the engine still tracks but the tree no longer produces.
		for (const key of [...frames.keys()]) {
			if (!wanted.has(key)) {
				const [overlayId, ...rest] = key.split(':');
				playback.unmountTile(overlayId, rest.join(':'));
			}
		}
	});

	// Default user-tile set for `tileBy: 'players'`. Active non-GM users only.
	const userIDs = $derived.by(() => {
		const list = (game as { users?: { contents?: Array<{ id: string; active?: boolean; isGM?: boolean }> } }).users?.contents ?? [];
		return list.filter(u => u.active && !u.isGM).map(u => u.id);
	});

	const tree = $derived.by(() => {
		void frameTick;
		return buildRenderTree(
			overlays,
			{ actors, users, triggerPayloads, frames } satisfies RenderState,
			{ actorIds: actorIDs, userIds: userIDs },
		);
	});

	// Partition rendered overlays by tile context.
	const actorTiles = $derived.by(() => {
		const out = new Map<string, RenderedOverlay[]>();
		for (const o of tree.overlays) {
			if (!o.context.actor?.id || o.context.user) continue;
			const id = o.context.actor.id;
			if (!out.has(id)) out.set(id, []);
			out.get(id)!.push(o);
		}
		return out;
	});
	const playerTiles = $derived.by(() => {
		const out = new Map<string, RenderedOverlay[]>();
		for (const o of tree.overlays) {
			if (!o.context.user?.id) continue;
			const id = o.context.user.id;
			if (!out.has(id)) out.set(id, []);
			out.get(id)!.push(o);
		}
		return out;
	});
	const singletonTiles = $derived(tree.overlays.filter(o => !o.context.actor && !o.context.user));

	function getOverlayTypeComponent(type: string) {
		const entry = getApi().overlayTypes.get(type);
		if (!entry || !entry.perActor) return null;
		return entry.overlayClass;
	}

	function actorName(id: string): string {
		const a = actors.get(id) as { name?: string } | undefined;
		return a?.name ?? id;
	}

	function userName(id: string): string {
		const u = users.get(id) as { name?: string } | undefined;
		return u?.name ?? id;
	}
</script>

<div class='obs-utils overlay'>
	{#each actorIDs as actorID (actorID)}
		{@const name = actorName(actorID)}
		<div class='actor' id={`actor${actorID}`} data-actor-name={name}>
			{#each actorTiles.get(actorID) ?? [] as rendered, index (rendered.id)}
				{@const Component = getOverlayTypeComponent(rendered.type)}
				{#if Component}
					<div class='actor-layer' data-actor-name={name}>
						<Component overlay={rendered} overlayIndex={index} />
					</div>
				{/if}
			{/each}
		</div>
	{/each}
	{#each userIDs as userID (userID)}
		{@const name = userName(userID)}
		{@const tiles = playerTiles.get(userID) ?? []}
		{#if tiles.length > 0}
			<div class='player' id={`player${userID}`} data-player-name={name}>
				{#each tiles as rendered, index (rendered.id)}
					{@const Component = getOverlayTypeComponent(rendered.type)}
					{#if Component}
						<div class='player-layer roll-instance' data-player-name={name}>
							<Component overlay={rendered} overlayIndex={index} />
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/each}
	{#if singletonTiles.length > 0}
		<div class='singleton'>
			{#each singletonTiles as rendered, index (rendered.id)}
				{@const Component = getOverlayTypeComponent(rendered.type)}
				{#if Component}
					<div class='singleton-layer'>
						<Component overlay={rendered} overlayIndex={index} />
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
