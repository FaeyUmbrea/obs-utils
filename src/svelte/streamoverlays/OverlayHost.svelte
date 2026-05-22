<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayFrame, RenderedOverlay, RenderState } from '../../utils/render.ts';
	import type { OverlayData } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { PlaybackEngine } from '../../utils/playback.ts';
	import { buildRenderTree } from '../../utils/render.ts';
	import { TriggerRegistry } from '../../utils/triggers.ts';

	const { overlays, actorIDs, previewMode = false }: {
		overlays: OverlayData[];
		actorIDs: string[];
		previewMode?: boolean;
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
	// Bumped whenever foreign-object Map entries (actors/users) mutate in-place;
	// the entries themselves aren't reactive (they're raw Foundry docs), so we
	// signal updates via this counter that the render derived reads.
	let dataTick = $state(0);

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
		dataTick = dataTick + 1;

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
			if (actor?.id) {
				actors.set(actor.id, actor);
				dataTick = dataTick + 1;
			}
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
			if (user?.id) {
				users.set(user.id, user);
				dataTick = dataTick + 1;
			}
		});

		// Legacy public trigger relay. `api.fireOverlayTrigger(key, payload)`
		// still emits this hook for back-compat; bridge it into the registry
		// so subscribers downstream see one source.
		const legacyHookId = Hooks.on('obs-utils.overlayTrigger' as never, (key: string, payload: Record<string, unknown>) => {
			ensureTriggerRegistered(key);
			triggerPayloads.set(key, payload);
			dataTick = dataTick + 1;
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
		for (const ov of overlays ?? []) {
			if (!ov?.animation) continue;
			const ids = ov.tileBy === 'players'
				? userIDs
				: ov.tileBy === 'users'
					? allUserIDs
					: ov.tileBy === 'once'
						? ['singleton']
						: actorIDs;
			for (const id of ids) {
				const tileKey = ov.tileBy === 'players' || ov.tileBy === 'users'
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

	// Default user-tile set for `tileBy: 'players'`. All non-GM users.
	const userIDs = $derived.by(() => {
		void dataTick;
		const list = (game as { users?: { contents?: Array<{ id: string; isGM?: boolean }> } }).users?.contents ?? [];
		return list.filter(u => !u.isGM).map(u => u.id);
	});
	// All users including GMs. Used by `tileBy: 'users'`.
	const allUserIDs = $derived.by(() => {
		void dataTick;
		const list = (game as { users?: { contents?: Array<{ id: string }> } }).users?.contents ?? [];
		return list.map(u => u.id);
	});

	const tree = $derived.by(() => {
		void frameTick;
		void dataTick;
		// $state Maps need an explicit read to register the derived as a
		// dependent. `.size` access goes through the proxy and bumps the
		// version on any structural change (set/delete/clear).
		void actors.size;
		void users.size;
		void triggerPayloads.size;
		void frames.size;
		return buildRenderTree(
			overlays ?? [],
			{ actors, users, triggerPayloads, frames, previewMode } satisfies RenderState,
			{ actorIds: actorIDs ?? [], userIds: userIDs, allUserIds: allUserIDs },
		);
	});

	// Group rendered tiles by their source overlay so each overlay layer renders
	// as its own row. Within a row, tile layout depends on the overlay's type
	// ('sl' inline → column, others → row with wrap).
	const tilesByOverlay = $derived.by(() => {
		const out = new Map<string, RenderedOverlay[]>();
		for (const o of tree.overlays) {
			if (!out.has(o.overlayId)) out.set(o.overlayId, []);
			out.get(o.overlayId)!.push(o);
		}
		return out;
	});

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
	{#each overlays ?? [] as overlay (overlay.id)}
		{@const tiles = tilesByOverlay.get(overlay.id ?? '') ?? []}
		{#if tiles.length > 0}
			<div
				class='overlay-row'
				class:inline-row={overlay.type === 'sl'}
				class:canvas-row={overlay.type !== 'sl'}
				data-overlay-id={overlay.id}
				data-overlay-type={overlay.type}
			>
				{#each tiles as rendered, index (rendered.id)}
					{@const Component = getOverlayTypeComponent(rendered.type)}
					{#if Component}
						{@const ctxActorId = rendered.context.actor?.id}
						{@const ctxUserId = rendered.context.user?.id}
						{@const tileLabel = ctxUserId ? userName(ctxUserId) : ctxActorId ? actorName(ctxActorId) : ''}
						<div
							class='overlay-tile'
							class:actor-layer={!!ctxActorId && !ctxUserId}
							class:roll-instance={!!ctxUserId}
							class:singleton-layer={!ctxActorId && !ctxUserId}
							data-actor-name={ctxActorId && !ctxUserId ? tileLabel : undefined}
							data-player-name={ctxUserId ? tileLabel : undefined}
						>
							<Component overlay={rendered} overlayIndex={index} />
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/each}
</div>
