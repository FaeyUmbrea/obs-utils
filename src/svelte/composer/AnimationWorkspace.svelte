<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData, OverlayData, OverlayTrack, TrackBehavior, TrackComponentLane, TrackKeyframe } from '../../utils/types.ts';
	import { ensureComponentId, generateId } from '../../utils/types.ts';
	import {
		ensureLane,
		insertKeyframeOnLane,
		makeEmptyAnimation,
		makeEmptyTrack,
		removeKeyframeOnLane,
		updateKeyframeOnLane,
	} from '../../utils/overlayAnimation.ts';
	import { getApi } from '../../utils/helpers.ts';
	import { settings } from '../../utils/settings.ts';
	import OverlayHost from '../streamoverlays/OverlayHost.svelte';

	const { layer, commit }: {
		layer: OverlayData;
		commit: () => void;
	} = $props();

	function ensureAnimation(): void {
		if (layer.animation) return;
		const initialId = generateId();
		layer.animation = makeEmptyAnimation(initialId);
		commit();
	}

	let selectedTrackId = $state<string | null>(layer.animation?.initialTrackId ?? null);
	const selectedTrack = $derived(
		selectedTrackId
			? layer.animation?.tracks.find(t => t.id === selectedTrackId) ?? null
			: null,
	);

	function addTrack() {
		ensureAnimation();
		const id = generateId();
		const track = makeEmptyTrack(id, defaultTrackName(layer.animation!.tracks.length + 1));
		track.behavior = { type: 'looping' };
		track.durationMs = 2000;
		layer.animation!.tracks = [...layer.animation!.tracks, track];
		selectedTrackId = id;
		commit();
	}

	function defaultTrackName(n: number): string {
		return `Track ${n}`;
	}

	function removeTrack(id: string) {
		if (!layer.animation) return;
		if (layer.animation.tracks.length <= 1) return;
		layer.animation.tracks = layer.animation.tracks.filter(t => t.id !== id);
		// Repoint references that touched the removed track.
		if (layer.animation.initialTrackId === id) {
			layer.animation.initialTrackId = layer.animation.tracks[0].id;
		}
		layer.animation.transitions = layer.animation.transitions
			.filter(tr => tr.fromTrackId !== id)
			.map(tr => ({
				...tr,
				zones: tr.zones.map(z =>
					z.destination.type === 'goto' && z.destination.toTrackId === id
						? { ...z, destination: { type: 'ignore' as const } }
						: z,
				),
			}));
		if (selectedTrackId === id) {
			selectedTrackId = layer.animation.tracks[0]?.id ?? null;
		}
		commit();
	}

	function renameTrack(track: OverlayTrack, name: string) {
		track.name = name;
		commit();
	}

	function setBehavior(track: OverlayTrack, type: TrackBehavior['type']) {
		if (type === 'static') track.behavior = { type: 'static' };
		else if (type === 'looping') track.behavior = { type: 'looping' };
		else {
			const fallbackId = layer.animation?.tracks.find(t => t.id !== track.id)?.id ?? track.id;
			track.behavior = { type: 'transition-on-end', toTrackId: fallbackId, toTime: 0 };
		}
		commit();
	}

	function setEndTransitionTarget(track: OverlayTrack, toTrackId: string) {
		if (track.behavior.type !== 'transition-on-end') return;
		track.behavior = { ...track.behavior, toTrackId };
		commit();
	}

	function setEndTransitionTime(track: OverlayTrack, toTime: number) {
		if (track.behavior.type !== 'transition-on-end') return;
		track.behavior = { ...track.behavior, toTime };
		commit();
	}

	function setDuration(track: OverlayTrack, ms: number) {
		track.durationMs = Math.max(0, ms);
		commit();
	}

	function setInitialTrack(id: string) {
		if (!layer.animation) return;
		layer.animation.initialTrackId = id;
		commit();
	}

	// ─── timeline / keyframe state ───────────────────────────────────────────

	let playheadT = $state(0);
	let selectedKf = $state<{ componentId: string; index: number } | null>(null);
	let timelineEl = $state<HTMLDivElement | null>(null);

	/**
	 * Resolve the selected keyframe to its mutable reference. Recomputed when
	 * selection or the underlying track changes; null when out of sync.
	 */
	const selectedKfRef = $derived.by(() => {
		if (!selectedKf || !selectedTrack) return null;
		const lane = selectedTrack.lanes.find(l => l.componentId === selectedKf!.componentId);
		const kf = lane?.keyframes[selectedKf.index];
		return kf ? { lane: lane!, kf, index: selectedKf.index } : null;
	});

	function componentLabel(c: OverlayComponentData): string {
		const entry = getApi().overlayTypes.get(layer.type);
		const nameKey = entry?.overlayComponentNames?.get(c.type);
		const typeLabel = nameKey ? (game.i18n?.localize(nameKey) ?? c.type) : c.type;
		return `${typeLabel} #${(layer.components ?? []).indexOf(c) + 1}`;
	}

	function timelineWidth(): number {
		return timelineEl?.clientWidth ?? 600;
	}

	function tToX(t: number, durationMs: number): number {
		if (durationMs <= 0) return 0;
		return (t / durationMs) * timelineWidth();
	}

	function xToT(x: number, durationMs: number): number {
		if (durationMs <= 0) return 0;
		return Math.max(0, Math.min(durationMs, (x / timelineWidth()) * durationMs));
	}

	function clampPlayhead() {
		if (!selectedTrack) return;
		if (playheadT > selectedTrack.durationMs) playheadT = selectedTrack.durationMs;
		if (playheadT < 0) playheadT = 0;
	}

	function onTimelineMouseDown(e: MouseEvent) {
		if (!timelineEl || !selectedTrack) return;
		const target = e.target as HTMLElement;
		// Keyframe markers handle their own drag; everything else turns this
		// press into a playhead scrub that follows the cursor until release.
		if (target.closest('.kf-marker')) return;
		const r = timelineEl.getBoundingClientRect();
		const newT = Math.round(xToT(e.clientX - r.left, selectedTrack.durationMs));
		playheadT = newT;
		scrubbing = true;
		scrubStartX = e.clientX;
		scrubStartT = newT;
		e.preventDefault();
	}

	let scrubbing = $state(false);
	let scrubStartX = 0;
	let scrubStartT = 0;

	// ─── timeline navigation ─────────────────────────────────────────────────
	// Track times are stored as integer ms; a step is one ms (the smallest
	// resolvable unit). Jump-to-keyframe handles larger movements.
	const STEP_MS = 1;

	function stepFrame(direction: 1 | -1) {
		if (!selectedTrack) return;
		playheadT = Math.max(0, Math.min(selectedTrack.durationMs, Math.round(playheadT + direction * STEP_MS)));
	}

	/**
	 * Collect unique keyframe times across all component lanes on the current
	 * track. Multi-lane tracks can have keyframes at the same time on
	 * different lanes; dedup so navigation stops are predictable.
	 */
	const uniqueKfTimes = $derived.by(() => {
		if (!selectedTrack) return [] as number[];
		const set = new Set<number>();
		for (const lane of selectedTrack.lanes) for (const kf of lane.keyframes) set.add(kf.t);
		return [...set].sort((a, b) => a - b);
	});

	function jumpKeyframe(direction: 1 | -1) {
		if (!selectedTrack) return;
		if (uniqueKfTimes.length === 0) {
			playheadT = direction > 0 ? selectedTrack.durationMs : 0;
			return;
		}
		if (direction > 0) {
			const next = uniqueKfTimes.find(t => t > playheadT + 1);
			playheadT = next ?? selectedTrack.durationMs;
		} else {
			let prev: number | undefined;
			for (const t of uniqueKfTimes) {
				if (t < playheadT - 1) prev = t;
				else break;
			}
			playheadT = prev ?? 0;
		}
	}

	function addKeyframeAtPlayhead(c: OverlayComponentData) {
		if (!selectedTrack) return;
		const componentId = ensureComponentId(c);
		const lane = ensureLane(selectedTrack, componentId);
		const kf: TrackKeyframe = { t: Math.round(playheadT), opacity: 1, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
		const idx = insertKeyframeOnLane(lane, kf);
		selectedKf = { componentId, index: idx };
		commit();
	}

	function selectKeyframe(componentId: string, index: number) {
		selectedKf = { componentId, index };
	}

	function deleteSelectedKeyframe() {
		if (!selectedKfRef) return;
		removeKeyframeOnLane(selectedKfRef.lane, selectedKfRef.index);
		selectedKf = null;
		commit();
	}

	function patchSelectedKeyframe(patch: Partial<TrackKeyframe>) {
		if (!selectedKfRef || !selectedKf) return;
		const newIdx = updateKeyframeOnLane(selectedKfRef.lane, selectedKfRef.index, patch);
		if (newIdx >= 0) selectedKf = { componentId: selectedKf.componentId, index: newIdx };
		commit();
	}

	function onPatchField(field: keyof TrackKeyframe, value: number) {
		patchSelectedKeyframe({ [field]: value });
	}

	// ─── transitions ─────────────────────────────────────────────────────────

	const availableTriggers = $derived.by(() => {
		const out: Array<{ key: string; name: string }> = [];
		for (const [key, reg] of getApi().overlayTriggers) {
			const label = reg.name ? (game.i18n?.localize(reg.name) ?? reg.name) : key;
			out.push({ key, name: label });
		}
		return out;
	});

	function addTransition() {
		if (!layer.animation || !selectedTrack) return;
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
		if (!layer.animation || !selectedTrack) return;
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
		// Public hook — host(s) bridge it into their registries.
		getApi().fireOverlayTrigger(triggerKey, {});
	}

	const transitionsForCurrentTrack = $derived.by(() => {
		if (!layer.animation || !selectedTrack) return [] as Array<{ transition: typeof layer.animation.transitions[number]; index: number }>;
		const out: Array<{ transition: typeof layer.animation.transitions[number]; index: number }> = [];
		layer.animation.transitions.forEach((tr, i) => {
			if (tr.fromTrackId === selectedTrack.id) out.push({ transition: tr, index: i });
		});
		return out;
	});

	// ─── keyframe drag ───────────────────────────────────────────────────────

	let dragging = $state<{ componentId: string; index: number; startX: number; startT: number } | null>(null);

	function startKfDrag(e: MouseEvent, componentId: string, index: number) {
		if (!selectedTrack) return;
		e.preventDefault();
		e.stopPropagation();
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		const kf = lane?.keyframes[index];
		if (!kf) return;
		selectedKf = { componentId, index };
		dragging = { componentId, index, startX: e.clientX, startT: kf.t };
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (scrubbing && selectedTrack) {
			const dx = e.clientX - scrubStartX;
			const dMs = (dx / timelineWidth()) * selectedTrack.durationMs;
			playheadT = Math.max(0, Math.min(selectedTrack.durationMs, Math.round(scrubStartT + dMs)));
			return;
		}
		if (!dragging || !selectedTrack) return;
		const lane = selectedTrack.lanes.find(l => l.componentId === dragging.componentId);
		if (!lane) return;
		const dx = e.clientX - dragging.startX;
		const dMs = (dx / timelineWidth()) * selectedTrack.durationMs;
		const newT = Math.max(0, Math.min(selectedTrack.durationMs, Math.round(dragging.startT + dMs)));
		const newIdx = updateKeyframeOnLane(lane, dragging.index, { t: newT });
		dragging.index = newIdx;
		selectedKf = { componentId: dragging.componentId, index: newIdx };
		commit();
	}

	function onWindowMouseUp() {
		dragging = null;
		scrubbing = false;
	}

	$effect(() => {
		void selectedTrackId;
		// Reset the playhead when switching tracks so we don't sit past the new track's end.
		playheadT = 0;
		selectedKf = null;
	});

	$effect(() => {
		clampPlayhead();
	});

	// ─── focused live preview ───────────────────────────────────────────────

	const actorIDsStore = settings.getReadableStore('overlayActors');
	const previewActorIDs = $derived(($actorIDsStore ?? []).slice(0, 1));
	const previewOverlays = $derived([layer]);
	const PREVIEW_FRAME_W = 300;
	const PREVIEW_FRAME_H = 180;
	const previewScale = $derived.by(() => {
		const w = layer.config?.w ?? 300;
		const h = layer.config?.h ?? 300;
		if (w <= 0 || h <= 0) return 1;
		return Math.min(PREVIEW_FRAME_W / w, PREVIEW_FRAME_H / h, 1);
	});

	// Transitions live in a dismissible drawer — out of the main edit flow.
	let transitionsOpen = $state(false);
</script>

<svelte:window onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} />

<div class='anim-workspace'>
	{#if !layer.animation}
		<div class='no-anim'>
			<i class='fas fa-film'></i>
			<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.intro')}</p>
			<button type='button' class='primary-btn' onclick={ensureAnimation}>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.start')}
			</button>
		</div>
	{:else}
		<aside class='tracks-pane'>
			<header class='pane-head'>
				<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}</h3>
				<button type='button' class='add-btn' onclick={addTrack} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTrack')}>
					<i class='fas fa-plus'></i>
				</button>
			</header>
			<ul class='track-list'>
				{#each layer.animation.tracks as track (track.id)}
					<li
						class='track-row'
						class:selected={selectedTrackId === track.id}
					>
						<button
							type='button'
							class='track-pick'
							onclick={() => (selectedTrackId = track.id)}
						>
							{#if layer.animation.initialTrackId === track.id}
								<i class='fas fa-flag initial-flag' title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialTrack')}></i>
							{/if}
							<span class='track-name'>{track.name}</span>
							<span class='track-behavior'>{track.behavior.type}</span>
						</button>
						{#if layer.animation.tracks.length > 1}
							<button
								type='button'
								class='row-btn danger'
								title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTrack')}
								onclick={() => removeTrack(track.id)}
							>
								<i class='fas fa-trash'></i>
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</aside>

		<section class='center-col'>
			{#if selectedTrack}
				<!-- Compact track config bar (one row, behavior/duration/initial/transitions trigger) -->
				<header class='track-bar'>
					<input
						type='text'
						class='track-name-input'
						value={selectedTrack.name}
						onchange={e => renameTrack(selectedTrack, (e.currentTarget as HTMLInputElement).value)}
						placeholder={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}
					/>
					<label class='inline-field'>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behavior')}</span>
						<select
							value={selectedTrack.behavior.type}
							onchange={e => setBehavior(selectedTrack, (e.currentTarget as HTMLSelectElement).value as TrackBehavior['type'])}
						>
							<option value='static'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behaviorStatic')}</option>
							<option value='looping'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behaviorLooping')}</option>
							<option value='transition-on-end'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behaviorTransitionOnEnd')}</option>
						</select>
					</label>
					{#if selectedTrack.behavior.type !== 'static'}
						<label class='inline-field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.duration')}</span>
							<input
								type='number'
								class='narrow'
								min='0'
								value={selectedTrack.durationMs}
								onchange={e => setDuration(selectedTrack, Number((e.currentTarget as HTMLInputElement).value) || 0)}
							/>
						</label>
					{/if}
					{#if selectedTrack.behavior.type === 'transition-on-end'}
						<label class='inline-field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.endTarget')}</span>
							<select
								value={selectedTrack.behavior.toTrackId}
								onchange={e => setEndTransitionTarget(selectedTrack, (e.currentTarget as HTMLSelectElement).value)}
							>
								{#each layer.animation.tracks as t (t.id)}
									<option value={t.id}>{t.name}</option>
								{/each}
							</select>
						</label>
					{/if}
					<button
						type='button'
						class='initial-btn'
						class:active={layer.animation.initialTrackId === selectedTrack.id}
						onclick={() => setInitialTrack(selectedTrack.id)}
						title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.useAsInitial')}
					>
						<i class='fas fa-flag'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialShort')}</span>
					</button>
					<button
						type='button'
						class='tx-btn'
						onclick={() => (transitionsOpen = !transitionsOpen)}
						class:active={transitionsOpen}
						disabled={layer.animation.tracks.length < 2}
						title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')}
					>
						<i class='fas fa-diagram-project'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')}</span>
						{#if transitionsForCurrentTrack.length > 0}
							<span class='tx-count'>{transitionsForCurrentTrack.length}</span>
						{/if}
					</button>
				</header>

				<!-- Nav cluster + playhead readout -->
				<div class='timeline-controls'>
					<div class='nav-buttons'>
						<button type='button' class='small-btn' onclick={() => jumpKeyframe(-1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.prevKeyframe')}>
							<i class='fas fa-backward-step'></i>
						</button>
						<button type='button' class='small-btn' onclick={() => stepFrame(-1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.prevFrame')}>
							<i class='fas fa-caret-left'></i>
						</button>
						<button type='button' class='small-btn' onclick={() => stepFrame(1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.nextFrame')}>
							<i class='fas fa-caret-right'></i>
						</button>
						<button type='button' class='small-btn' onclick={() => jumpKeyframe(1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.nextKeyframe')}>
							<i class='fas fa-forward-step'></i>
						</button>
					</div>
					<label class='inline-field'>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.playhead')}</span>
						<input
							type='number'
							class='narrow'
							min='0'
							max={selectedTrack.durationMs}
							value={Math.round(playheadT)}
							onchange={e => { playheadT = Math.max(0, Math.min(selectedTrack.durationMs, Number((e.currentTarget as HTMLInputElement).value) || 0)); }}
						/>
						<span class='units'>/ {selectedTrack.durationMs} ms</span>
					</label>
				</div>

				<!-- Dominant timeline -->
				<div class='lanes-frame'>
					<div class='lane-heads'>
						{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
							<div class='lane-head'>
								<span class='lane-name'>{componentLabel(comp)}</span>
								<button
									type='button'
									class='lane-add'
									title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addKeyframe')}
									onclick={() => addKeyframeAtPlayhead(comp)}
								><i class='fas fa-plus'></i></button>
							</div>
						{/each}
					</div>
					<div
						class='lane-strips'
						bind:this={timelineEl}
						onmousedown={onTimelineMouseDown}
						role='presentation'
					>
						{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
							{@const componentId = ensureComponentId(comp)}
							{@const lane = selectedTrack.lanes.find(l => l.componentId === componentId)}
							<div class='lane-strip'>
								{#if lane}
									{#each lane.keyframes as kf, idx (idx + '-' + kf.t)}
										<div
											class='kf-marker'
											class:selected={selectedKf?.componentId === componentId && selectedKf?.index === idx}
											style={`left: ${tToX(kf.t, selectedTrack.durationMs)}px;`}
											onmousedown={e => startKfDrag(e, componentId, idx)}
											onclick={e => { e.stopPropagation(); selectKeyframe(componentId, idx); }}
											role='button'
											tabindex='0'
											aria-label='Keyframe at {kf.t}ms'
										></div>
									{/each}
								{/if}
							</div>
						{/each}
						<div
							class='playhead'
							style={`left: ${tToX(playheadT, selectedTrack.durationMs)}px;`}
						></div>
					</div>
				</div>
			{:else}
				<div class='empty-detail'>
					<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.selectTrack')}</p>
				</div>
			{/if}
		</section>

		<!-- Right column: preview pinned, keyframe inspector below -->
		<aside class='right-col'>
			<div class='live-preview'>
				<header class='live-preview-head'>
					<i class='fas fa-eye'></i>
					<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.livePreview')}</span>
				</header>
				<div class='live-preview-frame' style={`width: ${PREVIEW_FRAME_W}px; height: ${PREVIEW_FRAME_H}px;`}>
					<div
						class='live-preview-stage'
						style={`transform: scale(${previewScale}); transform-origin: top left;`}
					>
						<OverlayHost overlays={previewOverlays} actorIDs={previewActorIDs} />
					</div>
				</div>
			</div>

			<div class='kf-inspector'>
				{#if selectedKfRef && selectedTrack}
					<header class='kf-detail-head'>
						<i class='fas fa-circle'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.keyframe')} t={selectedKfRef.kf.t}ms</span>
						<button
							type='button'
							class='row-btn danger'
							title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.deleteKeyframe')}
							onclick={deleteSelectedKeyframe}
						><i class='fas fa-trash'></i></button>
					</header>
					<div class='kf-grid'>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.time')}</span>
							<input type='number' min='0' max={selectedTrack.durationMs} value={selectedKfRef.kf.t} onchange={e => onPatchField('t', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.opacity')}</span>
							<input type='number' min='0' max='1' step='0.05' value={selectedKfRef.kf.opacity ?? 1} onchange={e => onPatchField('opacity', Number((e.currentTarget as HTMLInputElement).value))} />
						</label>
						<label class='field'>
							<span>X</span>
							<input type='number' value={selectedKfRef.kf.x ?? 0} onchange={e => onPatchField('x', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>Y</span>
							<input type='number' value={selectedKfRef.kf.y ?? 0} onchange={e => onPatchField('y', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.rotation')}</span>
							<input type='number' value={selectedKfRef.kf.rotation ?? 0} onchange={e => onPatchField('rotation', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>Scale X</span>
							<input type='number' step='0.05' value={selectedKfRef.kf.scaleX ?? 1} onchange={e => onPatchField('scaleX', Number((e.currentTarget as HTMLInputElement).value) || 1)} />
						</label>
						<label class='field'>
							<span>Scale Y</span>
							<input type='number' step='0.05' value={selectedKfRef.kf.scaleY ?? 1} onchange={e => onPatchField('scaleY', Number((e.currentTarget as HTMLInputElement).value) || 1)} />
						</label>
					</div>
				{:else}
					<div class='kf-empty'>
						<i class='fas fa-mouse-pointer'></i>
						<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.kfSelectHint')}</p>
					</div>
				{/if}
			</div>
		</aside>

		<!-- Transitions drawer (out of the main edit flow) -->
		{#if transitionsOpen && selectedTrack}
			<div
				class='tx-drawer-backdrop'
				onclick={() => (transitionsOpen = false)}
				role='presentation'
			></div>
			<div class='tx-drawer' role='dialog' aria-modal='true'>
				<header class='tx-drawer-head'>
					<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')} <span class='dim'>· {selectedTrack.name}</span></h3>
					<div class='tx-drawer-actions'>
						<button
							type='button'
							class='small-btn'
							onclick={addTransition}
							disabled={layer.animation.tracks.length < 2}
						>
							<i class='fas fa-plus'></i>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTransition')}</span>
						</button>
						<button type='button' class='row-btn' onclick={() => (transitionsOpen = false)} title={game.i18n?.localize('obs-utils.strings.done')}>
							<i class='fas fa-times'></i>
						</button>
					</div>
				</header>

				<div class='tx-drawer-body'>
					{#if layer.animation.tracks.length < 2 || transitionsForCurrentTrack.length === 0}
						<p class='hint'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.noTriggersHint')}</p>
					{/if}

					{#each transitionsForCurrentTrack as { transition, index } (index)}
						<div class='transition-card'>
							<div class='transition-head'>
								<label class='field inline'>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.trigger')}</span>
									<select
										value={transition.triggerKey}
										onchange={e => patchTransitionTrigger(index, (e.currentTarget as HTMLSelectElement).value)}
									>
										{#each availableTriggers as trig (trig.key)}
											<option value={trig.key}>{trig.name}</option>
										{/each}
									</select>
								</label>
								<button type='button' class='small-btn' onclick={() => testFire(transition.triggerKey)}>
									<i class='fas fa-play'></i>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.testFire')}</span>
								</button>
								<button
									type='button'
									class='row-btn danger'
									onclick={() => removeTransition(index)}
									title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTransition')}
								><i class='fas fa-trash'></i></button>
							</div>

							{#each transition.zones as zone, zoneIdx (zoneIdx)}
								<div class='zone-row'>
									<label class='field inline narrow'>
										<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneStart')}</span>
										<input type='number' min='0' value={zone.startT}
											onchange={e => patchZoneRange(index, zoneIdx, 'startT', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
									</label>
									<label class='field inline narrow'>
										<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneEnd')}</span>
										<input type='number' min='0' value={zone.endT}
											onchange={e => patchZoneRange(index, zoneIdx, 'endT', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
									</label>
									<label class='field inline narrow'>
										<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneDestination')}</span>
										<select
											value={zone.destination.type}
											onchange={e => patchZoneDestType(index, zoneIdx, (e.currentTarget as HTMLSelectElement).value as 'goto' | 'ignore')}
										>
											<option value='goto'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</option>
											<option value='ignore'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneIgnore')}</option>
										</select>
									</label>
									{#if zone.destination.type === 'goto'}
										<label class='field inline narrow'>
											<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</span>
											<select
												value={zone.destination.toTrackId}
												onchange={e => patchZoneDestTrack(index, zoneIdx, (e.currentTarget as HTMLSelectElement).value)}
											>
												{#each layer.animation.tracks as t (t.id)}
													<option value={t.id}>{t.name}</option>
												{/each}
											</select>
										</label>
										<label class='field inline narrow'>
											<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTime')}</span>
											<input type='number' min='0' value={zone.destination.toTime}
												onchange={e => patchZoneDestTime(index, zoneIdx, Number((e.currentTarget as HTMLInputElement).value) || 0)} />
										</label>
									{/if}
									<button
										type='button'
										class='row-btn danger'
										onclick={() => removeZone(index, zoneIdx)}
										title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeZone')}
									><i class='fas fa-times'></i></button>
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
	{/if}
</div>

<style lang='stylus'>
	.anim-workspace
		display grid
		grid-template-columns 180px minmax(0, 1fr) 320px
		gap 6px
		flex 1 1 auto
		padding 6px
		min-height 0
		overflow hidden
		position relative

	.no-anim
		grid-column 1 / -1
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 12px
		opacity 0.7

		i
			font-size 36px
			opacity 0.5

		p
			margin 0
			font-size 13px
			max-width 320px
			text-align center
			line-height 1.5

		.primary-btn
			height 32px
			padding 0 16px
			background rgba(255, 144, 0, 0.18)
			border 1px solid rgba(255, 144, 0, 0.5)
			border-radius 4px
			cursor pointer
			font-size 13px

			&:hover
				background rgba(255, 144, 0, 0.28)

	.tracks-pane
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	.pane-head
		display flex
		align-items center
		justify-content space-between
		gap 6px
		padding 6px 8px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		h3
			margin 0
			font-size 12px
			font-weight 600
			letter-spacing 0.4px
			text-transform uppercase
			opacity 0.7

		.add-btn
			width 24px
			height 22px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			cursor pointer
			opacity 0.8

			&:hover
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.4)

	.track-list
		flex 1 1 auto
		list-style none
		margin 0
		padding 4px
		overflow-y auto
		display flex
		flex-direction column
		gap 2px

	.track-row
		display flex
		align-items center
		gap 2px
		border-radius 3px

		&.selected
			background rgba(255, 144, 0, 0.18)

	.track-pick
		flex 1 1 auto
		display flex
		align-items center
		gap 6px
		padding 6px 8px
		background transparent
		border 0
		color inherit
		text-align left
		font-size 12px
		cursor pointer
		min-width 0

		.initial-flag
			font-size 10px
			color #ffce80

		.track-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.track-behavior
			font-size 10px
			padding 1px 5px
			background rgba(255, 255, 255, 0.08)
			border-radius 3px
			opacity 0.65

	.row-btn
		width 26px
		height 22px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		cursor pointer
		opacity 0.65
		margin-right 4px

		&:hover
			opacity 1

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

	.center-col
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px
		gap 8px
		overflow hidden

	.right-col
		display flex
		flex-direction column
		min-height 0
		min-width 0
		gap 6px

	.live-preview
		flex 0 0 auto
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 6px

	.live-preview-head
		display flex
		align-items center
		gap 6px
		font-size 10px
		text-transform uppercase
		letter-spacing 0.4px
		opacity 0.7
		margin-bottom 4px

	.live-preview-frame
		background #1a1a1a
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		overflow hidden
		position relative

	.live-preview-stage
		position absolute
		top 0
		left 0

	.kf-inspector
		flex 1 1 auto
		min-height 0
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px
		overflow-y auto

	.kf-empty
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 8px
		height 100%
		min-height 100px
		opacity 0.5
		font-size 12px

		i
			font-size 20px

	.track-bar
		display flex
		align-items center
		gap 8px
		padding 4px 6px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.06)
		border-radius 4px
		flex 0 0 auto

	.track-name-input
		flex 0 1 220px
		min-width 0
		height 26px
		padding 0 8px
		font-size 13px
		font-weight 600
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		color inherit

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

	.inline-field
		display inline-flex
		align-items center
		gap 4px
		font-size 11px

		span
			opacity 0.7

		input, select
			height 26px
			padding 0 6px
			font-size 11px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color inherit

		input.narrow
			width 80px

	.initial-btn
		display inline-flex
		align-items center
		gap 6px
		height 26px
		padding 0 10px
		font-size 11px
		background rgba(0, 0, 0, 0.2)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		cursor pointer
		color inherit
		white-space nowrap

		i
			font-size 10px
			opacity 0.55

		&.active
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)
			color #ffce80

			i
				opacity 1
				color #ffce80

		&:hover
			background rgba(255, 255, 255, 0.06)

			&.active
				background rgba(255, 144, 0, 0.26)

	.tx-btn
		display inline-flex
		align-items center
		gap 6px
		height 26px
		padding 0 10px
		margin-left auto
		background rgba(255, 255, 255, 0.04)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		font-size 11px
		cursor pointer

		&:hover:not(:disabled)
			background rgba(255, 255, 255, 0.1)

		&.active
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)

		&:disabled
			opacity 0.4
			cursor not-allowed

		.tx-count
			padding 1px 5px
			background rgba(255, 200, 30, 0.25)
			border-radius 8px
			font-size 10px
			font-family monospace

	.timeline-controls
		display flex
		align-items center
		gap 8px
		flex 0 0 auto

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
			color inherit

	// ── timeline / lanes ─────────────────────────────────────────────────────

	.timeline-section
		display flex
		flex-direction column
		gap 8px
		margin-top 8px

	.timeline-head
		display flex
		align-items center
		gap 8px
		flex-wrap wrap

	.nav-buttons
		display inline-flex
		gap 2px

		.field.inline
			flex-direction row
			align-items center
			gap 6px

			input
				width 90px

			.units
				opacity 0.55
				font-size 11px

	.lanes-frame
		display grid
		grid-template-columns 140px minmax(0, 1fr)
		gap 8px
		padding 8px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		user-select none
		min-height 80px

	.lane-heads
		display flex
		flex-direction column
		gap 4px

	.lane-head
		display flex
		align-items center
		gap 6px
		height 20px
		font-size 11px

		.lane-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.lane-add
			width 22px
			height 18px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			cursor pointer
			opacity 0.7
			font-size 10px

			&:hover
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.45)

	.lane-strips
		position relative
		display flex
		flex-direction column
		gap 4px
		cursor crosshair

	.lane-strip
		position relative
		height 20px
		background rgba(255, 255, 255, 0.04)
		border-radius 3px

	.kf-marker
		position absolute
		top 3px
		width 14px
		height 14px
		margin-left -7px
		border-radius 50%
		background rgba(255, 144, 0, 0.7)
		border 1.5px solid rgba(255, 200, 80, 0.9)
		cursor grab

		&:active
			cursor grabbing

		&.selected
			background rgba(255, 200, 30, 0.95)
			border-color white
			border-width 2px

	.playhead
		position absolute
		top 0
		bottom 0
		width 1.5px
		background rgba(255, 255, 255, 0.65)
		pointer-events none
		margin-left -0.75px

	.transitions-section
		margin-top 8px
		display flex
		flex-direction column
		gap 6px

	.section-head
		display flex
		align-items center
		justify-content space-between
		gap 8px

		h4
			margin 0
			font-size 12px
			font-weight 600
			letter-spacing 0.4px
			text-transform uppercase
			opacity 0.7

	.hint
		margin 0
		padding 8px
		font-size 11px
		opacity 0.6
		font-style italic
		background rgba(255, 255, 255, 0.02)
		border 1px dashed rgba(255, 255, 255, 0.1)
		border-radius 3px

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

	.field.inline.narrow
		flex-direction row
		align-items center
		gap 4px

		input, select
			width 80px

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

	.add-btn.small
		width auto
		padding 0 8px

	.kf-detail
		margin-top 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px

	.kf-detail-head
		display flex
		align-items center
		gap 8px
		font-size 12px
		margin-bottom 6px

		i
			font-size 8px
			color rgba(255, 200, 30, 0.9)

		.row-btn
			margin-left auto

	.kf-grid
		display grid
		grid-template-columns repeat(auto-fit, minmax(110px, 1fr))
		gap 6px

	.empty-detail
		padding 24px
		text-align center
		font-size 12px
		opacity 0.6
</style>
