<svelte:options runes={true} />
<script lang='ts'>
	import type { AnimationState, AnimKeyframe, ComponentAnimationConfig, KeyframeAnimation } from '../../utils/componentAnimation.ts';
	import type { OverlayComponentData } from '../../utils/types.ts';
	import {
		addTriggeredState,
		customPropertiesOf,
		insertAnimKeyframe,
		makeAnimationConfig,
		makeKeyframeAnimation,
		removeAnimKeyframe,
		removeTriggeredState,
		setReEntryPolicy,
		sortKeyframesByOffset,
		updateAnimKeyframeAt,
	} from '../../utils/animationConfigOps.ts';
	import { debounce, getApi } from '../../utils/helpers.ts';

	const {
		component,
		componentLabel,
		commit,
	} = $props<{
		component: OverlayComponentData | null;
		componentLabel: string;
		commit: () => void;
	}>();

	const LOC = (key: string) =>
		game.i18n?.localize(`obs-utils.applications.overlayEditor.animationEditor.${key}`) ?? key;

	// ─── panel open/close ─────────────────────────────────────────────────────

	let expanded = $state(false);

	let prevComponentId: string | undefined;
	$effect(() => {
		const id = component?.id;
		if (id !== prevComponentId) {
			expanded = false;
			prevComponentId = id;
		}
	});

	// ─── active state tab ─────────────────────────────────────────────────────

	let activeStateKey = $state<string>('__default__');

	$effect(() => {
		// Void-reference component id to trigger the effect when the selection changes
		void component?.id;
		activeStateKey = '__default__';
	});

	// ─── add-state popover ────────────────────────────────────────────────────

	let addStateOpen = $state(false);
	let addStateBtnEl = $state<HTMLButtonElement | null>(null);
	let addStateStyle = $state('');

	function openAddState() {
		if (!addStateBtnEl) {
			addStateOpen = true;
			return;
		}
		const rect = addStateBtnEl.getBoundingClientRect();
		addStateStyle = `position:fixed;top:${Math.round(rect.bottom + 4)}px;left:${Math.round(rect.left)}px;min-width:${Math.round(rect.width)}px;`;
		addStateOpen = true;
	}

	function closeAddState() {
		addStateOpen = false;
	}

	function onWindowClick(e: MouseEvent) {
		if (!addStateOpen) return;
		const t = e.target as HTMLElement | null;
		if (!t) return;
		if (addStateBtnEl && addStateBtnEl.contains(t)) return;
		if (t.closest('[data-add-state-menu]')) return;
		closeAddState();
	}

	// Relocate portalled node to document.body so Foundry transforms don't break fixed positioning
	function portalToBody(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			},
		};
	}

	// ─── add-property popover per keyframe ───────────────────────────────────

	let addPropOpen = $state(false);
	let addPropPhase = $state<'entrance' | 'steady' | 'exit' | null>(null);
	let addPropKfIndex = $state<number | null>(null);
	let addPropName = $state('');
	let addPropValue = $state('');
	let addPropBtnEl = $state<HTMLButtonElement | null>(null);
	let addPropStyle = $state('');

	function openAddProp(phase: 'entrance' | 'steady' | 'exit', kfIndex: number, btnEl: HTMLButtonElement) {
		addPropPhase = phase;
		addPropKfIndex = kfIndex;
		addPropName = '';
		addPropValue = '';
		addPropBtnEl = btnEl;
		const rect = btnEl.getBoundingClientRect();
		addPropStyle = `position:fixed;top:${Math.round(rect.bottom + 4)}px;left:${Math.round(rect.left)}px;min-width:200px;`;
		addPropOpen = true;
	}

	function closeAddProp() {
		addPropOpen = false;
	}

	function onWindowClickProp(e: MouseEvent) {
		if (!addPropOpen) return;
		const t = e.target as HTMLElement | null;
		if (!t) return;
		if (addPropBtnEl && addPropBtnEl.contains(t)) return;
		if (t.closest('[data-add-prop-popup]')) return;
		closeAddProp();
	}

	// ─── selected keyframe per phase ──────────────────────────────────────────

	let selectedKfIndexEntrance = $state<number | null>(null);
	let selectedKfIndexSteady = $state<number | null>(null);
	let selectedKfIndexExit = $state<number | null>(null);
	let playheadEntrance = $state(0.5);
	let playheadSteady = $state(0.5);
	let playheadExit = $state(0.5);

	// ─── section open/close ───────────────────────────────────────────────────

	let entranceOpen = $state(false);
	let steadyOpen = $state(false);
	let exitOpen = $state(false);

	$effect(() => {
		// Void-reference activeStateKey to reset phase UI on tab change
		void activeStateKey;
		entranceOpen = false;
		steadyOpen = false;
		exitOpen = false;
		selectedKfIndexEntrance = null;
		selectedKfIndexSteady = null;
		selectedKfIndexExit = null;
	});

	// ─── derived helpers ──────────────────────────────────────────────────────

	const anim = $derived(component?.animation ?? null);

	const availableTriggerKeys = $derived.by(() => {
		if (!anim) return [] as string[];
		const all = Array.from(getApi().overlayTriggers.keys());
		return all.filter(k => !(k in anim.triggeredStates));
	});

	const currentState = $derived.by((): AnimationState | null => {
		if (!anim) return null;
		if (activeStateKey === '__default__') return anim.defaultState;
		return anim.triggeredStates[activeStateKey] ?? null;
	});

	// ─── mutations ────────────────────────────────────────────────────────────

	function initAnimation() {
		if (!component) return;
		component.animation = makeAnimationConfig();
		commit();
	}

	function getState(stateKey: string): AnimationState | undefined {
		if (!component?.animation) return undefined;
		return stateKey === '__default__'
			? component.animation.defaultState
			: component.animation.triggeredStates[stateKey];
	}

	function writeState(stateKey: string, nextState: AnimationState) {
		if (!component?.animation) return;
		if (stateKey === '__default__') {
			component.animation = { ...component.animation, defaultState: nextState };
		} else {
			component.animation = {
				...component.animation,
				triggeredStates: { ...component.animation.triggeredStates, [stateKey]: nextState },
			};
		}
	}

	// Debounce for drag-updated keyframe offsets
	const debouncedCommit = debounce(commit, 200);

	function patchPhase(
		stateKey: string,
		phase: 'entrance' | 'steady' | 'exit',
		updated: KeyframeAnimation,
		immediate = true,
	) {
		const state = getState(stateKey);
		if (state === undefined) return;
		writeState(stateKey, { ...state, [phase]: updated });
		if (immediate) commit();
		else debouncedCommit();
	}

	function patchKeyframes(
		stateKey: string,
		phase: 'entrance' | 'steady' | 'exit',
		keyframes: AnimKeyframe[],
		immediate = true,
	) {
		const state = getState(stateKey);
		if (!state) return;
		const phaseAnim = state[phase];
		if (!phaseAnim) return;
		patchPhase(stateKey, phase, { ...phaseAnim, keyframes }, immediate);
	}

	function setPhaseOpen(phase: 'entrance' | 'steady' | 'exit', open: boolean) {
		if (phase === 'entrance') entranceOpen = open;
		else if (phase === 'steady') steadyOpen = open;
		else exitOpen = open;
	}

	function clearSelIdx(phase: 'entrance' | 'steady' | 'exit') {
		if (phase === 'entrance') selectedKfIndexEntrance = null;
		else if (phase === 'steady') selectedKfIndexSteady = null;
		else selectedKfIndexExit = null;
	}

	function setSelIdx(phase: 'entrance' | 'steady' | 'exit', idx: number | null) {
		if (phase === 'entrance') selectedKfIndexEntrance = idx;
		else if (phase === 'steady') selectedKfIndexSteady = idx;
		else selectedKfIndexExit = idx;
	}

	function definePhase(stateKey: string, phase: 'entrance' | 'steady' | 'exit') {
		const state = getState(stateKey);
		if (state === undefined) return;
		writeState(stateKey, { ...state, [phase]: makeKeyframeAnimation() });
		commit();
		setPhaseOpen(phase, true);
		clearSelIdx(phase);
	}

	function onAddState(key: string) {
		if (!component?.animation) return;
		component.animation = addTriggeredState(component.animation, key);
		commit();
		activeStateKey = key;
		closeAddState();
	}

	function onRemoveState(key: string) {
		if (!component?.animation) return;
		component.animation = removeTriggeredState(component.animation, key);
		commit();
		if (activeStateKey === key) activeStateKey = '__default__';
	}

	function onReEntryChange(e: Event) {
		if (!component?.animation) return;
		const policy = (e.currentTarget as HTMLSelectElement).value as ComponentAnimationConfig['reEntry'];
		component.animation = setReEntryPolicy(component.animation, policy);
		commit();
	}

	// ─── keyframe timeline ────────────────────────────────────────────────────

	let timelineElEntrance = $state<SVGSVGElement | null>(null);
	let timelineElSteady = $state<SVGSVGElement | null>(null);
	let timelineElExit = $state<SVGSVGElement | null>(null);

	function timelineWidth(el: SVGSVGElement | null): number {
		return el?.clientWidth ?? 300;
	}

	function offsetToX(offset: number, el: SVGSVGElement | null): number {
		return offset * timelineWidth(el);
	}

	function xToOffset(x: number, el: SVGSVGElement | null): number {
		return Math.max(0, Math.min(1, x / timelineWidth(el)));
	}

	let draggingPhase = $state<'entrance' | 'steady' | 'exit' | null>(null);
	let draggingKfIndex = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartOffset = 0;

	function getPhaseEl(phase: 'entrance' | 'steady' | 'exit'): SVGSVGElement | null {
		if (phase === 'entrance') return timelineElEntrance;
		if (phase === 'steady') return timelineElSteady;
		return timelineElExit;
	}

	function startDrag(e: MouseEvent, phase: 'entrance' | 'steady' | 'exit', idx: number, offset: number) {
		e.preventDefault();
		e.stopPropagation();
		draggingPhase = phase;
		draggingKfIndex = idx;
		dragStartX = e.clientX;
		dragStartOffset = offset;
		setSelIdx(phase, idx);
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (draggingPhase === null || draggingKfIndex === null || !component?.animation) return;
		const el = getPhaseEl(draggingPhase);
		const dx = e.clientX - dragStartX;
		const dOffset = dx / timelineWidth(el);
		const newOffset = Math.max(0, Math.min(1, dragStartOffset + dOffset));

		const state = getState(activeStateKey);
		if (!state) return;
		const phaseAnim = state[draggingPhase];
		if (!phaseAnim) return;

		const sorted = sortKeyframesByOffset(phaseAnim.keyframes);
		const moved = sorted[draggingKfIndex];
		if (!moved) return;
		const updated = updateAnimKeyframeAt(sorted, draggingKfIndex, { ...moved, offset: newOffset });
		const newIdx = updated.findIndex(k => k === moved || k.offset === newOffset);
		draggingKfIndex = newIdx >= 0 ? newIdx : draggingKfIndex;
		setSelIdx(draggingPhase, draggingKfIndex);

		patchKeyframes(activeStateKey, draggingPhase, updated, false);
	}

	function onWindowMouseUp() {
		draggingPhase = null;
		draggingKfIndex = null;
	}

	function handleTimelineClick(
		e: MouseEvent,
		phase: 'entrance' | 'steady' | 'exit',
		el: SVGSVGElement | null,
	) {
		if (!el) return;
		const x = e.clientX - el.getBoundingClientRect().left;
		const offset = xToOffset(x, el);
		if (phase === 'entrance') playheadEntrance = offset;
		else if (phase === 'steady') playheadSteady = offset;
		else playheadExit = offset;
	}

	function addKeyframeAtPlayhead(stateKey: string, phase: 'entrance' | 'steady' | 'exit') {
		const state = getState(stateKey);
		if (!state) return;
		const phaseAnim = state[phase];
		if (!phaseAnim) return;
		const ph = phase === 'entrance' ? playheadEntrance : phase === 'steady' ? playheadSteady : playheadExit;
		const newKf: AnimKeyframe = { offset: ph, transform: '', opacity: 1, filter: '' };
		const next = insertAnimKeyframe(phaseAnim.keyframes, newKf);
		const newIdx = next.findIndex(k => k.offset === ph);
		setSelIdx(phase, newIdx);
		patchKeyframes(stateKey, phase, next);
	}

	function deleteKeyframe(stateKey: string, phase: 'entrance' | 'steady' | 'exit') {
		const selIdx = getSelIdx(phase);
		if (selIdx === null) return;

		const state = getState(stateKey);
		if (!state) return;
		const phaseAnim = state[phase];
		if (!phaseAnim) return;

		const sorted = sortKeyframesByOffset(phaseAnim.keyframes);
		const { next, refused } = removeAnimKeyframe(sorted, selIdx);
		if (refused) return;

		clearSelIdx(phase);
		patchKeyframes(stateKey, phase, next);
	}

	function getSelIdx(phase: 'entrance' | 'steady' | 'exit'): number | null {
		if (phase === 'entrance') return selectedKfIndexEntrance;
		if (phase === 'steady') return selectedKfIndexSteady;
		return selectedKfIndexExit;
	}

	function updateKfField(
		stateKey: string,
		phase: 'entrance' | 'steady' | 'exit',
		idx: number,
		field: string,
		value: any,
	) {
		const state = getState(stateKey);
		if (!state) return;
		const phaseAnim = state[phase];
		if (!phaseAnim) return;
		const sorted = sortKeyframesByOffset(phaseAnim.keyframes);
		const kf = sorted[idx];
		if (!kf) return;
		const updated = updateAnimKeyframeAt(sorted, idx, { ...kf, [field]: value });
		const newIdx = updated.findIndex(k => k === kf || (k.offset === kf.offset && k[field] === value));
		setSelIdx(phase, newIdx >= 0 ? newIdx : idx);
		patchKeyframes(stateKey, phase, updated);
	}

	function addCustomProp() {
		if (!addPropPhase || addPropKfIndex === null || !addPropName.trim()) return;
		updateKfField(activeStateKey, addPropPhase, addPropKfIndex, addPropName.trim(), addPropValue);
		closeAddProp();
	}

	function removeCustomProp(stateKey: string, phase: 'entrance' | 'steady' | 'exit', idx: number, propKey: string) {
		const state = getState(stateKey);
		if (!state) return;
		const phaseAnim = state[phase];
		if (!phaseAnim) return;
		const sorted = sortKeyframesByOffset(phaseAnim.keyframes);
		const kf = { ...sorted[idx] };
		delete kf[propKey];
		patchKeyframes(stateKey, phase, updateAnimKeyframeAt(sorted, idx, kf));
	}

	function testState() {
		if (activeStateKey === '__default__' || !component?.animation) return;
		getApi().fireOverlayTrigger(activeStateKey, {});
	}

	function toggleExpanded() {
		expanded = !expanded;
	}

	function onHeaderKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleExpanded();
		}
	}

	function onPhaseHeaderClick(phase: 'entrance' | 'steady' | 'exit', defined: boolean) {
		if (!defined) {
			definePhase(activeStateKey, phase);
			return;
		}
		if (phase === 'entrance') entranceOpen = !entranceOpen;
		else if (phase === 'steady') steadyOpen = !steadyOpen;
		else exitOpen = !exitOpen;
	}

	function onPhaseHeaderKeydown(e: KeyboardEvent, phase: 'entrance' | 'steady' | 'exit', defined: boolean) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onPhaseHeaderClick(phase, defined);
		}
	}

	function onDurationChange(e: Event, stateKey: string, phase: 'entrance' | 'steady' | 'exit') {
		const state = getState(stateKey);
		if (!state?.[phase]) return;
		patchPhase(stateKey, phase, { ...state[phase]!, duration: Number((e.currentTarget as HTMLInputElement).value) || 500 });
	}

	function onLoopChange(e: Event, stateKey: string, phase: 'entrance' | 'steady' | 'exit') {
		const state = getState(stateKey);
		if (!state?.[phase]) return;
		patchPhase(stateKey, phase, { ...state[phase]!, loop: (e.currentTarget as HTMLSelectElement).value as KeyframeAnimation['loop'] });
	}

	function onEaseChange(e: Event, stateKey: string, phase: 'entrance' | 'steady' | 'exit') {
		const state = getState(stateKey);
		if (!state?.[phase]) return;
		patchPhase(stateKey, phase, { ...state[phase]!, ease: (e.currentTarget as HTMLInputElement).value });
	}

	function onOffsetChange(e: Event, stateKey: string, phase: 'entrance' | 'steady' | 'exit', idx: number) {
		updateKfField(stateKey, phase, idx, 'offset', Number.parseFloat((e.currentTarget as HTMLInputElement).value) || 0);
	}

	function onOpacityChange(e: Event, stateKey: string, phase: 'entrance' | 'steady' | 'exit', idx: number) {
		updateKfField(stateKey, phase, idx, 'opacity', Number.parseFloat((e.currentTarget as HTMLInputElement).value));
	}

	function onTextFieldChange(e: Event, stateKey: string, phase: 'entrance' | 'steady' | 'exit', idx: number, field: string) {
		updateKfField(stateKey, phase, idx, field, (e.currentTarget as HTMLInputElement).value);
	}

	function isPhaseOpen(phase: 'entrance' | 'steady' | 'exit'): boolean {
		if (phase === 'entrance') return entranceOpen;
		if (phase === 'steady') return steadyOpen;
		return exitOpen;
	}

	function getPlayhead(phase: 'entrance' | 'steady' | 'exit'): number {
		if (phase === 'entrance') return playheadEntrance;
		if (phase === 'steady') return playheadSteady;
		return playheadExit;
	}

	function defineLocKey(phase: 'entrance' | 'steady' | 'exit'): string {
		if (phase === 'entrance') return 'defineEntrance';
		if (phase === 'steady') return 'defineSteady';
		return 'defineExit';
	}

	function isDeleteDisabled(phase: 'entrance' | 'steady' | 'exit', sortedKfs: AnimKeyframe[]): boolean {
		const idx = getSelIdx(phase);
		if (idx === null) return true;
		const kf = sortedKfs[idx];
		return !kf || kf.offset === 0 || kf.offset === 1;
	}

	function onAddStateBtnClick(e: MouseEvent) {
		e.stopPropagation();
		if (addStateOpen) closeAddState();
		else openAddState();
	}

	function onTabRemoveClick(e: MouseEvent, key: string) {
		e.stopPropagation();
		onRemoveState(key);
	}

	function onAddPropBtnClick(e: MouseEvent, phase: 'entrance' | 'steady' | 'exit', selIdx: number) {
		openAddProp(phase, selIdx, e.currentTarget as HTMLButtonElement);
	}

	function onPropKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') addCustomProp();
	}

	function onMarkerMousedown(e: MouseEvent, phase: 'entrance' | 'steady' | 'exit', idx: number, offset: number) {
		startDrag(e, phase, idx, offset);
	}

	function onWindowClickAll(e: MouseEvent) {
		onWindowClick(e);
		onWindowClickProp(e);
	}
</script>

<svelte:window
	onmousemove={onWindowMouseMove}
	onmouseup={onWindowMouseUp}
	onclick={onWindowClickAll}
/>

{#if component !== null}
	<div class='ae'>
		<!-- ── header ──────────────────────────────────────────────────────────── -->
		<div
			class='ae-header'
			role='button'
			tabindex='0'
			onclick={toggleExpanded}
			onkeydown={onHeaderKeydown}
			aria-expanded={expanded}
		>
			<i class='fas fa-film ae-icon'></i>
			<span class='ae-title'>{LOC('header')} — {componentLabel}</span>
			<i class={expanded ? 'fas fa-caret-up ae-caret' : 'fas fa-caret-down ae-caret'}></i>
		</div>

		{#if expanded}
			<div class='ae-body'>
				{#if !anim}
					<!-- ── no config yet ────────────────────────────────────────── -->
					<button type='button' class='ae-add-animation' onclick={initAnimation}>
						<i class='fas fa-plus'></i>
						<span>{LOC('addAnimation')}</span>
					</button>
				{:else}
					<!-- ── re-entry policy ────────────────────────────────────────── -->
					<label class='ae-row ae-reentry'>
						<span class='ae-label'>{LOC('reEntryLabel')}</span>
						<select class='ae-select' value={anim.reEntry} onchange={onReEntryChange}>
							<option value='restart'>{LOC('reEntry.restart')}</option>
							<option value='replace'>{LOC('reEntry.replace')}</option>
							<option value='queue'>{LOC('reEntry.queue')}</option>
							<option value='ignore'>{LOC('reEntry.ignore')}</option>
							<option value='extend'>{LOC('reEntry.extend')}</option>
						</select>
					</label>

					<!-- ── state tabs ─────────────────────────────────────────────── -->
					<div class='ae-tabs' role='tablist'>
						<button
							type='button'
							role='tab'
							class='ae-tab'
							class:ae-tab--active={activeStateKey === '__default__'}
							onclick={() => (activeStateKey = '__default__')}
						>
							{LOC('stateDefault')}
						</button>
						{#each Object.keys(anim.triggeredStates) as key (key)}
							<span class='ae-tab-wrap'>
								<button
									type='button'
									role='tab'
									class='ae-tab'
									class:ae-tab--active={activeStateKey === key}
									onclick={() => (activeStateKey = key)}
								>
									{key}
								</button>
								<button
									type='button'
									class='ae-tab-remove'
									onclick={e => onTabRemoveClick(e, key)}
									title={LOC('removeState')}
									aria-label={LOC('removeState')}
								><i class='fas fa-times'></i></button>
							</span>
						{/each}

						<button
							type='button'
							class='ae-add-state-btn'
							bind:this={addStateBtnEl}
							onclick={onAddStateBtnClick}
							aria-expanded={addStateOpen}
							title={LOC('addState')}
						>
							<i class='fas fa-plus'></i>
							<span>{LOC('addState')}</span>
						</button>
					</div>

					<!-- ── selected state body ────────────────────────────────────── -->
					{#if currentState !== null}
						{#key activeStateKey}
							<div class='ae-state-body'>
								{@render phaseSection('entrance')}
								{@render phaseSection('steady')}
								{@render phaseSection('exit')}
							</div>

							{#if activeStateKey !== '__default__'}
								<button type='button' class='ae-test-btn' onclick={testState}>
									<i class='fas fa-play'></i>
									<span>{LOC('testState')}</span>
								</button>
							{/if}
						{/key}
					{/if}
				{/if}
			</div>
		{/if}
	</div>
{/if}

{#snippet phaseSection(phase: 'entrance' | 'steady' | 'exit')}
	{@const phaseAnim = currentState?.[phase]}
	{@const open = isPhaseOpen(phase)}
	{@const selIdx = getSelIdx(phase)}
	{@const sortedKfs = phaseAnim ? sortKeyframesByOffset(phaseAnim.keyframes) : []}
	{@const playhead = getPlayhead(phase)}

	<div class='ae-phase'>
		<div
			class='ae-phase-header'
			class:ae-phase-header--defined={!!phaseAnim}
			role='button'
			tabindex='0'
			onclick={() => onPhaseHeaderClick(phase, !!phaseAnim)}
			onkeydown={e => onPhaseHeaderKeydown(e, phase, !!phaseAnim)}
		>
			<span class='ae-phase-name'>{LOC(phase)}</span>
			{#if phaseAnim}
				<i class='fas fa-check ae-phase-check'></i>
				<i class={open ? 'fas fa-caret-up ae-phase-caret' : 'fas fa-caret-down ae-phase-caret'}></i>
			{:else}
				<span class='ae-phase-define'>{LOC(defineLocKey(phase))}</span>
			{/if}
		</div>

		{#if phaseAnim && open}
			<div class='ae-phase-body'>
				<!-- duration / loop / ease -->
				<div class='ae-phase-controls'>
					<label class='ae-field'>
						<span>{LOC('duration')}</span>
						<input
							type='number'
							class='ae-input'
							min='1'
							value={phaseAnim.duration}
							onchange={e => onDurationChange(e, activeStateKey, phase)}
						/>
					</label>
					<label class='ae-field'>
						<span>{LOC('loop')}</span>
						<select
							class='ae-select'
							value={phaseAnim.loop ?? 'none'}
							onchange={e => onLoopChange(e, activeStateKey, phase)}
						>
							<option value='none'>{LOC('loopNone')}</option>
							<option value='restart'>{LOC('loopRestart')}</option>
							<option value='pingpong'>{LOC('loopPingPong')}</option>
							<option value='infinite'>{LOC('loopInfinite')}</option>
						</select>
					</label>
					<label class='ae-field'>
						<span>{LOC('ease')}</span>
						<input
							type='text'
							class='ae-input'
							value={phaseAnim.ease ?? 'linear'}
							onchange={e => onEaseChange(e, activeStateKey, phase)}
						/>
					</label>
				</div>

				<!-- keyframe timeline -->
				<div class='ae-timeline-wrap'>
					{#if phase === 'entrance'}
						<svg
							bind:this={timelineElEntrance}
							class='ae-timeline'
							onclick={e => handleTimelineClick(e, phase, timelineElEntrance)}
							role='presentation'
						>
							<rect x='0' y='16' width='100%' height='8' rx='3' class='ae-track' />
							{#each sortedKfs as kf, idx (`${kf.offset}-${idx}`)}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<circle
									cx={offsetToX(kf.offset, timelineElEntrance)}
									cy='20'
									r='6'
									class='ae-marker'
									class:ae-marker--selected={selIdx === idx}
									onmousedown={e => onMarkerMousedown(e, phase, idx, kf.offset)}
								/>
							{/each}
							<line
								x1={offsetToX(playhead, timelineElEntrance)}
								y1='0'
								x2={offsetToX(playhead, timelineElEntrance)}
								y2='44'
								class='ae-playhead'
							/>
						</svg>
					{:else if phase === 'steady'}
						<svg
							bind:this={timelineElSteady}
							class='ae-timeline'
							onclick={e => handleTimelineClick(e, phase, timelineElSteady)}
							role='presentation'
						>
							<rect x='0' y='16' width='100%' height='8' rx='3' class='ae-track' />
							{#each sortedKfs as kf, idx (`${kf.offset}-${idx}`)}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<circle
									cx={offsetToX(kf.offset, timelineElSteady)}
									cy='20'
									r='6'
									class='ae-marker'
									class:ae-marker--selected={selIdx === idx}
									onmousedown={e => onMarkerMousedown(e, phase, idx, kf.offset)}
								/>
							{/each}
							<line
								x1={offsetToX(playhead, timelineElSteady)}
								y1='0'
								x2={offsetToX(playhead, timelineElSteady)}
								y2='44'
								class='ae-playhead'
							/>
						</svg>
					{:else}
						<svg
							bind:this={timelineElExit}
							class='ae-timeline'
							onclick={e => handleTimelineClick(e, phase, timelineElExit)}
							role='presentation'
						>
							<rect x='0' y='16' width='100%' height='8' rx='3' class='ae-track' />
							{#each sortedKfs as kf, idx (`${kf.offset}-${idx}`)}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<circle
									cx={offsetToX(kf.offset, timelineElExit)}
									cy='20'
									r='6'
									class='ae-marker'
									class:ae-marker--selected={selIdx === idx}
									onmousedown={e => onMarkerMousedown(e, phase, idx, kf.offset)}
								/>
							{/each}
							<line
								x1={offsetToX(playhead, timelineElExit)}
								y1='0'
								x2={offsetToX(playhead, timelineElExit)}
								y2='44'
								class='ae-playhead'
							/>
						</svg>
					{/if}

					<div class='ae-timeline-labels'>
						<span>0</span>
						<span>0.5</span>
						<span>1</span>
					</div>
				</div>

				<!-- add / delete keyframe -->
				<div class='ae-kf-actions'>
					<button type='button' class='ae-kf-add' onclick={() => addKeyframeAtPlayhead(activeStateKey, phase)}>
						<i class='fas fa-plus'></i>
						<span>{LOC('addKeyframe')}</span>
					</button>
					<button
						type='button'
						class='ae-kf-delete'
						disabled={isDeleteDisabled(phase, sortedKfs)}
						onclick={() => deleteKeyframe(activeStateKey, phase)}
					>
						<i class='fas fa-trash'></i>
						<span>{LOC('deleteKeyframe')}</span>
					</button>
				</div>

				<!-- selected keyframe detail -->
				{#if selIdx !== null && sortedKfs[selIdx]}
					{@const selKf = sortedKfs[selIdx]}
					{@const customKeys = customPropertiesOf(selKf)}
					<div class='ae-kf-detail'>
						<div class='ae-kf-detail-header'>
							<i class='fas fa-circle ae-kf-dot'></i>
							<span>{LOC('keyframeAt')} {selKf.offset.toFixed(3)}</span>
						</div>

						<label class='ae-kf-field'>
							<span>{LOC('offset')}</span>
							<input
								type='number'
								class='ae-input'
								min='0'
								max='1'
								step='0.01'
								value={selKf.offset}
								onchange={e => onOffsetChange(e, activeStateKey, phase, selIdx)}
							/>
						</label>

						<label class='ae-kf-field'>
							<span>{LOC('transform')}</span>
							<input
								type='text'
								class='ae-input'
								value={selKf.transform ?? ''}
								onchange={e => onTextFieldChange(e, activeStateKey, phase, selIdx, 'transform')}
							/>
						</label>

						<label class='ae-kf-field'>
							<span>{LOC('opacity')}</span>
							<input
								type='number'
								class='ae-input'
								min='0'
								max='1'
								step='0.01'
								value={selKf.opacity ?? 1}
								onchange={e => onOpacityChange(e, activeStateKey, phase, selIdx)}
							/>
						</label>

						<label class='ae-kf-field'>
							<span>{LOC('filter')}</span>
							<input
								type='text'
								class='ae-input'
								value={selKf.filter ?? ''}
								onchange={e => onTextFieldChange(e, activeStateKey, phase, selIdx, 'filter')}
							/>
						</label>

						{#each customKeys as propKey (propKey)}
							<div class='ae-kf-field ae-kf-custom-field'>
								<label class='ae-kf-custom-label'>
									<span class='ae-kf-custom-name'>{propKey}</span>
									<input
										type='text'
										class='ae-input'
										value={selKf[propKey] ?? ''}
										onchange={e => onTextFieldChange(e, activeStateKey, phase, selIdx, propKey)}
									/>
								</label>
								<button
									type='button'
									class='ae-kf-remove-prop'
									onclick={() => removeCustomProp(activeStateKey, phase, selIdx, propKey)}
									aria-label='Remove property'
								><i class='fas fa-times'></i></button>
							</div>
						{/each}

						<button
							type='button'
							class='ae-add-prop-btn'
							onclick={e => onAddPropBtnClick(e, phase, selIdx)}
						>
							<i class='fas fa-plus'></i>
							<span>{LOC('addProperty')}</span>
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

<!-- ── add-state menu (portalled) ─────────────────────────────────────────── -->
{#if addStateOpen && component}
	<div use:portalToBody class='ae-menu' role='menu' data-add-state-menu style={addStateStyle}>
		{#if availableTriggerKeys.length === 0}
			<span class='ae-menu-empty'>—</span>
		{:else}
			{#each availableTriggerKeys as key (key)}
				<button type='button' role='menuitem' class='ae-menu-item' onclick={() => onAddState(key)}>
					{key}
				</button>
			{/each}
		{/if}
	</div>
{/if}

<!-- ── add-custom-property popup (portalled) ────────────────────────────────── -->
{#if addPropOpen}
	<div use:portalToBody class='ae-prop-popup' data-add-prop-popup style={addPropStyle}>
		<label class='ae-prop-row'>
			<span>{LOC('propertyName')}</span>
			<input
				type='text'
				class='ae-input'
				bind:value={addPropName}
				placeholder='font-size'
				onkeydown={onPropKeydown}
			/>
		</label>
		<label class='ae-prop-row'>
			<span>{LOC('propertyValue')}</span>
			<input
				type='text'
				class='ae-input'
				bind:value={addPropValue}
				placeholder='12px'
				onkeydown={onPropKeydown}
			/>
		</label>
		<button type='button' class='ae-prop-submit' onclick={addCustomProp}>
			<i class='fas fa-check'></i>
			<span>{LOC('addProperty')}</span>
		</button>
	</div>
{/if}

<style lang='stylus'>
	.ae
		flex 0 0 auto
		display flex
		flex-direction column
		border-top 1px solid rgba(255, 255, 255, 0.06)

	.ae-header
		display flex
		align-items center
		gap 6px
		padding 6px 10px
		cursor pointer
		user-select none
		font-size 11px
		font-weight 600
		text-transform uppercase
		letter-spacing 0.5px
		opacity 0.7

		&:hover
			opacity 1

		&[aria-expanded='true']
			opacity 1
			background rgba(255, 144, 0, 0.06)

	.ae-icon
		font-size 10px
		opacity 0.8

	.ae-title
		flex 1 1 auto

	.ae-caret
		font-size 10px
		margin-left auto

	.ae-body
		padding 8px 10px
		display flex
		flex-direction column
		gap 8px

	.ae-add-animation
		display flex
		align-items center
		justify-content center
		gap 6px
		height 28px
		padding 0 12px
		font-size 12px
		background rgba(255, 144, 0, 0.12)
		border 1px solid rgba(255, 144, 0, 0.4)
		border-radius 4px
		cursor pointer
		width 100%

		&:hover
			background rgba(255, 144, 0, 0.22)
			border-color rgba(255, 144, 0, 0.7)

	.ae-row
		display flex
		align-items center
		gap 8px

	.ae-reentry
		font-size 11px

	.ae-label
		opacity 0.7
		white-space nowrap

	.ae-select
		height 22px
		padding 0 4px
		font-size 11px
		background rgba(0, 0, 0, 0.3)
		border 1px solid rgba(255, 255, 255, 0.13)
		border-radius 3px
		color inherit
		cursor pointer
		flex 1 1 auto
		min-width 0

	.ae-input
		height 22px
		padding 0 5px
		font-size 11px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		color inherit
		width 100%

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

	// ── tabs ──────────────────────────────────────────────────────────────────

	.ae-tabs
		display flex
		flex-wrap wrap
		gap 3px
		align-items center

	.ae-tab
		height 24px
		padding 0 8px
		font-size 11px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		cursor pointer
		color inherit
		opacity 0.7

		&:hover
			opacity 1
			background rgba(255, 255, 255, 0.05)

		&--active
			opacity 1
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)
			font-weight 600

	.ae-tab-wrap
		display inline-flex
		align-items center

	.ae-tab-wrap > .ae-tab
		border-radius 3px 0 0 3px

	.ae-tab-remove
		width 18px
		height 24px
		padding 0
		display flex
		align-items center
		justify-content center
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-left none
		border-radius 0 3px 3px 0
		cursor pointer
		font-size 9px
		opacity 0.5

		&:hover
			opacity 1
			background rgba(220, 60, 60, 0.15)
			border-color rgba(220, 60, 60, 0.4)

	.ae-add-state-btn
		height 24px
		padding 0 8px
		display inline-flex
		align-items center
		gap 4px
		font-size 11px
		background rgba(255, 144, 0, 0.1)
		border 1px dashed rgba(255, 144, 0, 0.4)
		border-radius 3px
		cursor pointer
		color inherit

		&:hover
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.7)

	// ── state body ────────────────────────────────────────────────────────────

	.ae-state-body
		display flex
		flex-direction column
		gap 4px

	.ae-test-btn
		width 100%
		height 28px
		display flex
		align-items center
		justify-content center
		gap 6px
		background rgba(80, 160, 80, 0.12)
		border 1px solid rgba(80, 160, 80, 0.4)
		border-radius 4px
		font-size 12px
		cursor pointer
		margin-top 2px

		&:hover
			background rgba(80, 160, 80, 0.22)
			border-color rgba(80, 160, 80, 0.7)

	// ── phase sections ────────────────────────────────────────────────────────

	.ae-phase
		border 1px solid rgba(255, 255, 255, 0.06)
		border-radius 4px
		overflow hidden

	.ae-phase-header
		display flex
		align-items center
		gap 6px
		padding 5px 8px
		cursor pointer
		user-select none
		font-size 11px
		font-weight 600
		text-transform uppercase
		letter-spacing 0.4px
		opacity 0.6
		background rgba(255, 255, 255, 0.02)

		&:hover
			opacity 0.9

		&--defined
			opacity 0.85

	.ae-phase-name
		flex 1 1 auto

	.ae-phase-check
		font-size 9px
		color rgba(100, 200, 100, 0.8)

	.ae-phase-caret
		font-size 10px

	.ae-phase-define
		font-size 10px
		opacity 0.6
		font-weight 400
		text-transform none
		letter-spacing normal

	.ae-phase-body
		display flex
		flex-direction column
		gap 6px
		padding 8px

	.ae-phase-controls
		display grid
		grid-template-columns 1fr 1fr 1fr
		gap 6px

	.ae-field
		display flex
		flex-direction column
		gap 2px
		font-size 11px
		flex 1 1 auto
		min-width 0

		span
			opacity 0.65

	// ── timeline ──────────────────────────────────────────────────────────────

	.ae-timeline-wrap
		display flex
		flex-direction column
		gap 2px
		user-select none

	.ae-timeline
		width 100%
		height 44px
		cursor crosshair
		overflow visible

	.ae-track
		fill rgba(255, 255, 255, 0.06)
		stroke rgba(255, 255, 255, 0.1)
		stroke-width 1

	.ae-marker
		fill rgba(255, 144, 0, 0.7)
		stroke rgba(255, 200, 80, 0.9)
		stroke-width 1.5
		cursor grab

		&:active
			cursor grabbing

		&--selected
			fill rgba(255, 200, 30, 0.95)
			stroke white
			stroke-width 2

	.ae-playhead
		stroke rgba(255, 255, 255, 0.7)
		stroke-width 1.5
		stroke-dasharray 3 2
		pointer-events none

	.ae-timeline-labels
		display flex
		justify-content space-between
		font-size 10px
		opacity 0.45
		padding 0 2px

	// ── keyframe action buttons ───────────────────────────────────────────────

	.ae-kf-actions
		display flex
		gap 6px

	.ae-kf-add,
	.ae-kf-delete
		display inline-flex
		align-items center
		gap 5px
		height 24px
		padding 0 8px
		font-size 11px
		background rgba(255, 255, 255, 0.05)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		cursor pointer

		&:hover:not(:disabled)
			background rgba(255, 255, 255, 0.1)

		&:disabled
			opacity 0.35
			cursor not-allowed

	.ae-kf-add
		background rgba(255, 144, 0, 0.1)
		border-color rgba(255, 144, 0, 0.35)

		&:hover
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.6)

	.ae-kf-delete:hover:not(:disabled)
		background rgba(220, 60, 60, 0.15)
		border-color rgba(220, 60, 60, 0.4)

	// ── keyframe detail ───────────────────────────────────────────────────────

	.ae-kf-detail
		display flex
		flex-direction column
		gap 5px
		padding 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.07)
		border-radius 4px

	.ae-kf-detail-header
		display flex
		align-items center
		gap 6px
		font-size 11px
		font-weight 600

	.ae-kf-dot
		font-size 8px
		color rgba(255, 200, 30, 0.9)

	.ae-kf-field
		display flex
		flex-direction column
		gap 2px
		font-size 11px

		span
			opacity 0.65

	.ae-kf-custom-field
		flex-direction row
		align-items flex-end
		gap 6px

	.ae-kf-custom-label
		display flex
		flex-direction column
		gap 2px
		flex 1 1 auto
		min-width 0

		.ae-kf-custom-name
			opacity 0.65
			font-family monospace
			font-size 10px

	.ae-kf-remove-prop
		width 22px
		height 22px
		flex 0 0 auto
		padding 0
		display flex
		align-items center
		justify-content center
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		font-size 10px
		opacity 0.5
		cursor pointer

		&:hover
			opacity 1
			background rgba(220, 60, 60, 0.15)
			border-color rgba(220, 60, 60, 0.4)

	.ae-add-prop-btn
		align-self flex-start
		display inline-flex
		align-items center
		gap 4px
		height 22px
		padding 0 8px
		font-size 11px
		background rgba(255, 255, 255, 0.04)
		border 1px dashed rgba(255, 255, 255, 0.15)
		border-radius 3px
		cursor pointer
		margin-top 2px

		&:hover
			background rgba(255, 255, 255, 0.09)

	// ── portalled menus ───────────────────────────────────────────────────────

	:global(.ae-menu)
		background #2a2a2a
		border 1px solid rgba(255, 255, 255, 0.18)
		border-radius 4px
		z-index 10000
		display flex
		flex-direction column
		padding 4px
		gap 2px
		max-height 280px
		overflow-y auto
		box-shadow 0 6px 24px rgba(0, 0, 0, 0.5)

	:global(.ae-menu-item)
		display flex
		align-items center
		text-align left
		background transparent
		border none
		padding 5px 10px
		font-size 11px
		font-family monospace
		cursor pointer
		color inherit
		border-radius 2px

		&:hover
			background rgba(255, 255, 255, 0.08)

	:global(.ae-menu-empty)
		padding 6px 10px
		font-size 11px
		opacity 0.45

	:global(.ae-prop-popup)
		background #2a2a2a
		border 1px solid rgba(255, 255, 255, 0.18)
		border-radius 4px
		z-index 10001
		display flex
		flex-direction column
		padding 8px
		gap 6px
		box-shadow 0 6px 24px rgba(0, 0, 0, 0.5)

	:global(.ae-prop-row)
		display flex
		flex-direction column
		gap 3px
		font-size 11px

		span
			opacity 0.65

	:global(.ae-prop-submit)
		display inline-flex
		align-items center
		justify-content center
		gap 5px
		height 24px
		padding 0 10px
		font-size 11px
		background rgba(255, 144, 0, 0.15)
		border 1px solid rgba(255, 144, 0, 0.4)
		border-radius 3px
		cursor pointer
		align-self flex-start

		&:hover
			background rgba(255, 144, 0, 0.25)
</style>
