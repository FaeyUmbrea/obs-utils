<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData, OverlayTrack } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';

	let { open = $bindable(), layer, selectedTrack, commit }: {
		open: boolean;
		layer: OverlayData;
		selectedTrack: OverlayTrack;
		commit: () => void;
	} = $props();

	const availableTriggers = $derived.by(() => {
		const out: Array<{ key: string; name: string }> = [];
		for (const [key, reg] of getApi().overlayTriggers) {
			const label = reg.name ? (game.i18n?.localize(reg.name) ?? reg.name) : key;
			out.push({ key, name: label });
		}
		return out;
	});

	const transitionsForCurrentTrack = $derived.by(() => {
		if (!layer.animation) return [] as Array<{ transition: typeof layer.animation.transitions[number]; index: number }>;
		const out: Array<{ transition: typeof layer.animation.transitions[number]; index: number }> = [];
		layer.animation.transitions.forEach((tr, i) => {
			if (tr.fromTrackId === selectedTrack.id) out.push({ transition: tr, index: i });
		});
		return out;
	});

	const showNoTriggerHint = $derived(((layer.animation?.tracks.length ?? 0) < 2 || transitionsForCurrentTrack.length === 0) && selectedTrack.behavior.type !== 'transition-on-end');

	function setEndTransitionTarget(toTrackId: string) {
		if (selectedTrack.behavior.type !== 'transition-on-end') return;
		selectedTrack.behavior = { ...selectedTrack.behavior, toTrackId };
		commit();
	}

	function setEndTransitionTime(toTime: number) {
		if (selectedTrack.behavior.type !== 'transition-on-end') return;
		selectedTrack.behavior = { ...selectedTrack.behavior, toTime };
		commit();
	}

	function addTransition() {
		if (!layer.animation) return;
		const firstTriggerKey = availableTriggers[0]?.key ?? 'core.onPlayerRoll';
		const targetTrack = layer.animation.tracks.find(t => t.id !== selectedTrack.id) ?? selectedTrack;
		layer.animation.transitions = [
			...layer.animation.transitions,
			{
				triggerKey: firstTriggerKey,
				fromTrackId: selectedTrack.id,
				zones: [{
					startT: 0,
					endT: selectedTrack.durationMs,
					destination: { type: 'goto', toTrackId: targetTrack.id, toTime: 0 },
				}],
			},
		];
		commit();
	}

	function removeTransition(index: number) {
		if (!layer.animation) return;
		layer.animation.transitions = layer.animation.transitions.filter((_, i) => i !== index);
		commit();
	}

	function patchTransitionTrigger(index: number, triggerKey: string) {
		if (!layer.animation) return;
		const t = layer.animation.transitions[index];
		if (!t) return;
		t.triggerKey = triggerKey;
		commit();
	}

	function addZone(transitionIndex: number) {
		if (!layer.animation) return;
		const t = layer.animation.transitions[transitionIndex];
		if (!t) return;
		const lastEnd = t.zones.length > 0 ? t.zones[t.zones.length - 1].endT : 0;
		const fallback = layer.animation.tracks.find(x => x.id !== t.fromTrackId) ?? layer.animation.tracks[0];
		t.zones = [
			...t.zones,
			{
				startT: lastEnd,
				endT: selectedTrack.durationMs,
				destination: { type: 'goto', toTrackId: fallback.id, toTime: 0 },
			},
		];
		commit();
	}

	function removeZone(transitionIndex: number, zoneIndex: number) {
		if (!layer.animation) return;
		const t = layer.animation.transitions[transitionIndex];
		if (!t) return;
		t.zones = t.zones.filter((_, i) => i !== zoneIndex);
		commit();
	}

	function patchZoneRange(transitionIndex: number, zoneIndex: number, field: 'startT' | 'endT', value: number) {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z) return;
		z[field] = Math.max(0, value);
		commit();
	}

	function patchZoneDestType(transitionIndex: number, zoneIndex: number, type: 'goto' | 'ignore') {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z) return;
		if (type === 'ignore') {
			z.destination = { type: 'ignore' };
		} else {
			const target = layer.animation.tracks[0];
			z.destination = { type: 'goto', toTrackId: target.id, toTime: 0 };
		}
		commit();
	}

	function patchZoneDestTrack(transitionIndex: number, zoneIndex: number, toTrackId: string) {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z || z.destination.type !== 'goto') return;
		z.destination = { ...z.destination, toTrackId };
		commit();
	}

	function patchZoneDestTime(transitionIndex: number, zoneIndex: number, toTime: number) {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z || z.destination.type !== 'goto') return;
		z.destination = { ...z.destination, toTime: Math.max(0, toTime) };
		commit();
	}

	function testFire(triggerKey: string) {
		getApi().fireOverlayTrigger(triggerKey, {});
	}
</script>

{#if open && layer.animation}
	<div class='tx-drawer-backdrop' onclick={() => (open = false)} role='presentation'></div>
	<div class='tx-drawer' role='dialog' aria-modal='true'>
		<header class='tx-drawer-head'>
			<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')} <span class='dim'>· {selectedTrack.name}</span></h3>
			<div class='tx-drawer-actions'>
				<button type='button' class='small-btn' onclick={addTransition} disabled={layer.animation.tracks.length < 2}>
					<i class='fas fa-plus'></i>
					<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTransition')}</span>
				</button>
				<button type='button' class='row-btn' onclick={() => (open = false)} title={game.i18n?.localize('obs-utils.strings.done')}>
					<i class='fas fa-times'></i>
				</button>
			</div>
		</header>

		<div class='tx-drawer-body'>
			{#if selectedTrack.behavior.type === 'transition-on-end'}
				<div class='transition-card end-of-track'>
					<div class='transition-head'>
						<div class='field inline'>
							<span><i class='fas fa-flag-checkered' style:opacity='0.6' style:margin-right='4px'></i>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.endOfTrack') ?? 'On end of track'}</span>
						</div>
					</div>
					<div class='zone-row'>
						<label class='field inline'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</span>
							<select
								value={selectedTrack.behavior.toTrackId}
								onchange={e => setEndTransitionTarget((e.currentTarget as HTMLSelectElement).value)}
							>
								{#each layer.animation.tracks as t (t.id)}
									{#if t.id !== selectedTrack.id}<option value={t.id}>{t.name}</option>{/if}
								{/each}
							</select>
						</label>
						<label class='field inline narrow'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTime')}</span>
							<input
								type='number'
								min='0'
								value={selectedTrack.behavior.toTime ?? 0}
								onchange={e => setEndTransitionTime(Number((e.currentTarget as HTMLInputElement).value) || 0)}
							/>
						</label>
					</div>
				</div>
			{/if}

			{#if showNoTriggerHint}
				<p class='hint'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.noTriggersHint')}</p>
			{/if}

			{#each transitionsForCurrentTrack as { transition, index } (index)}
				<div class='transition-card'>
					<div class='transition-head'>
						<label class='field inline'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.trigger')}</span>
							<select value={transition.triggerKey} onchange={e => patchTransitionTrigger(index, (e.currentTarget as HTMLSelectElement).value)}>
								{#each availableTriggers as trig (trig.key)}
									<option value={trig.key}>{trig.name}</option>
								{/each}
							</select>
						</label>
						<button type='button' class='small-btn' onclick={() => testFire(transition.triggerKey)}>
							<i class='fas fa-play'></i>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.testFire')}</span>
						</button>
						<button type='button' class='row-btn danger' onclick={() => removeTransition(index)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTransition')}>
							<i class='fas fa-trash'></i>
						</button>
					</div>

					{#each transition.zones as zone, zoneIdx (zoneIdx)}
						<div class='zone-row'>
							<label class='field inline narrow'>
								<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneStart')}</span>
								<input type='number' min='0' value={zone.startT} onchange={e => patchZoneRange(index, zoneIdx, 'startT', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
							</label>
							<label class='field inline narrow'>
								<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneEnd')}</span>
								<input type='number' min='0' value={zone.endT} onchange={e => patchZoneRange(index, zoneIdx, 'endT', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
							</label>
							<label class='field inline narrow'>
								<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneDestination')}</span>
								<select value={zone.destination.type} onchange={e => patchZoneDestType(index, zoneIdx, (e.currentTarget as HTMLSelectElement).value as 'goto' | 'ignore')}>
									<option value='goto'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</option>
									<option value='ignore'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneIgnore')}</option>
								</select>
							</label>
							{#if zone.destination.type === 'goto'}
								<label class='field inline narrow'>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</span>
									<select value={zone.destination.toTrackId} onchange={e => patchZoneDestTrack(index, zoneIdx, (e.currentTarget as HTMLSelectElement).value)}>
										{#each layer.animation.tracks as t (t.id)}
											<option value={t.id}>{t.name}</option>
										{/each}
									</select>
								</label>
								<label class='field inline narrow'>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTime')}</span>
									<input type='number' min='0' value={zone.destination.toTime} onchange={e => patchZoneDestTime(index, zoneIdx, Number((e.currentTarget as HTMLInputElement).value) || 0)} />
								</label>
							{/if}
							<button type='button' class='row-btn danger' onclick={() => removeZone(index, zoneIdx)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeZone')}>
								<i class='fas fa-times'></i>
							</button>
						</div>
					{/each}
					<button type='button' class='small-btn' onclick={() => addZone(index)}>
						<i class='fas fa-plus'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addZone')}</span>
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style lang='stylus'>
	.tx-drawer-backdrop
		position absolute
		inset 0
		background rgba(0, 0, 0, 0.5)
		z-index 5

	.tx-drawer
		position absolute
		top 12px
		right 12px
		bottom 12px
		width 540px
		max-width calc(100% - 24px)
		background #1c1c1c
		border 1px solid rgba(255, 255, 255, 0.15)
		border-radius 6px
		box-shadow 0 8px 24px rgba(0, 0, 0, 0.5)
		display flex
		flex-direction column
		z-index 6

	.tx-drawer-head
		display flex
		align-items center
		justify-content space-between
		gap 8px
		padding 8px 10px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		h3
			margin 0
			font-size 13px
			font-weight 600

			.dim
				opacity 0.55
				margin-left 4px

	.tx-drawer-actions
		display inline-flex
		gap 6px

	.tx-drawer-body
		flex 1 1 auto
		padding 10px
		overflow-y auto
		display flex
		flex-direction column
		gap 8px

	.transition-card
		display flex
		flex-direction column
		gap 6px
		padding 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px

	.transition-head
		display flex
		align-items center
		gap 8px

		.field.inline
			flex 1 1 auto
			max-width 240px

	.zone-row
		display flex
		flex-wrap wrap
		align-items center
		gap 6px
		padding 4px 6px
		background rgba(255, 255, 255, 0.02)
		border 1px solid rgba(255, 255, 255, 0.05)
		border-radius 3px

	.field
		display flex
		flex-direction column
		gap 4px
		font-size 11px

		span
			opacity 0.7

		input, select
			height 28px
			padding 0 6px
			font-size 12px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color #e4e4e4

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

		select
			appearance none
			-webkit-appearance none
			padding-right 22px
			background-image url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path fill='%23bbb' d='M6 8L2 4h8z'/></svg>")
			background-repeat no-repeat
			background-position right 6px center

			option
				background #1a1a1a
				color #e4e4e4

	.field.inline.narrow
		flex-direction row
		align-items center
		gap 4px

		input, select
			width 80px

	.hint
		margin 0
		padding 8px
		font-size 11px
		opacity 0.6
		font-style italic
		background rgba(255, 255, 255, 0.02)
		border 1px dashed rgba(255, 255, 255, 0.1)
		border-radius 3px

	.small-btn
		display inline-flex
		align-items center
		gap 4px
		height 24px
		padding 0 8px
		font-size 11px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		cursor pointer
		opacity 0.85

		&:hover:not(:disabled)
			opacity 1
			background rgba(255, 255, 255, 0.06)

		&:disabled
			opacity 0.4
			cursor not-allowed

	.row-btn
		width 26px
		height 22px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		cursor pointer
		opacity 0.65

		&:hover
			opacity 1

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)
</style>
