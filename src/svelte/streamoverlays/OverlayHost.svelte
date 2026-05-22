<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayFrame, RenderedOverlay, RenderState } from '../../utils/render.ts';
	import type { OverlayData } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { getApi } from '../../utils/helpers.ts';
	import { PlaybackEngine } from '../../utils/playback.ts';
	import { buildRenderTree } from '../../utils/render.ts';
	import { TriggerRegistry } from '../../utils/triggers.ts';

	const { overlays, actorIDs, previewMode = false }: {
		overlays: OverlayData[];
		actorIDs: string[];
		previewMode?: boolean;
	} = $props();

	const registry = new TriggerRegistry();

	const actors = $state(new Map<string, unknown>());
	const users = $state(new Map<string, unknown>());
	const triggerPayloads = $state(new Map<string, Record<string, unknown> | undefined>());
	const frames = $state(new Map<string, OverlayFrame>());
	let frameTick = $state(0);
	// Foundry docs aren't reactive — bump this when actors/users mutate.
	let dataTick = $state(0);

	const playback = new PlaybackEngine(registry, frames, () => {
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

		// Bridge the legacy public hook into the registry.
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
		} catch { /* already registered */ }
	}

	onDestroy(() => {
		for (const id of legacyHookIds) Hooks.off('obs-utils.overlayTrigger' as never, id);
		playback.stop();
		registry.destroy();
	});

	const userIDs = $derived.by(() => {
		void dataTick;
		const list = (game as { users?: { contents?: Array<{ id: string; isGM?: boolean }> } }).users?.contents ?? [];
		return list.filter(u => !u.isGM).map(u => u.id);
	});
	const allUserIDs = $derived.by(() => {
		void dataTick;
		const list = (game as { users?: { contents?: Array<{ id: string }> } }).users?.contents ?? [];
		return list.map(u => u.id);
	});

	$effect(() => {
		void frameTick;
		const wanted = new SvelteSet<string>();
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
		for (const key of [...frames.keys()]) {
			if (!wanted.has(key)) {
				const [overlayId, ...rest] = key.split(':');
				playback.unmountTile(overlayId, rest.join(':'));
			}
		}
	});

	const tree = $derived.by(() => {
		void frameTick;
		void dataTick;
		// `.size` reads through the $state proxy so the derived tracks structural changes.
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

	const tilesByOverlay = $derived.by(() => {
		const out = new SvelteMap<string, RenderedOverlay[]>();
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

</script>

<div class='obs-utils overlay'>
	{#each overlays ?? [] as overlay, overlayIdx (overlay.id)}
		{@const tiles = tilesByOverlay.get(overlay.id ?? '') ?? []}
		{#if tiles.length > 0}
			<div
				class='overlay-row'
				class:inline-row={overlay.type === 'sl'}
				class:canvas-row={overlay.type !== 'sl'}
				data-overlay-row-id={overlay.id}
				data-overlay-type={overlay.type}
			>
				{#each tiles as rendered (rendered.id)}
					{@const Component = getOverlayTypeComponent(rendered.type)}
					{#if Component}
						{@const ctxActor = rendered.context.actor}
						{@const ctxUser = rendered.context.user}
						<div
							class='overlay-tile'
							class:actor={!!ctxActor?.id && !ctxUser?.id}
							class:actor-layer={!!ctxActor?.id && !ctxUser?.id}
							class:player={!!ctxUser?.id}
							class:roll-instance={!!ctxUser?.id}
							class:singleton-layer={!ctxActor?.id && !ctxUser?.id}
							id={ctxUser?.id ? `player${ctxUser.id}` : ctxActor?.id ? `actor${ctxActor.id}` : undefined}
							data-actor-name={ctxActor?.id && !ctxUser?.id ? (ctxActor.name ?? ctxActor.id) : undefined}
							data-player-name={ctxUser?.id ? (ctxUser.name ?? ctxUser.id) : undefined}
						>
							<Component overlay={rendered} overlayIndex={overlayIdx} />
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/each}
</div>
