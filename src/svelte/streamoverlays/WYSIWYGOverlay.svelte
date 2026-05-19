<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy, setContext } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { getApi } from '../../utils/helpers.ts';
	import Animator from '../utilities/Animator.svelte';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	let { overlayData = $bindable(), actorID = $bindable(), overlayIndex = $bindable() } = $props();

	const overlayComponents = getApi().overlayTypes.get('wysiwyg').overlayComponents;

	const w = $derived(overlayData.config?.w ?? 300);
	const h = $derived(overlayData.config?.h ?? 300);

	// Trigger gating. Unset trigger = always-on (legacy). Set trigger = hidden until
	// a matching event fires, then auto-hides after duration (-1 = sticky).
	const initialTriggerKey = overlayData.trigger?.eventKey as string | undefined;
	let visible = $state(!initialTriggerKey);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	// Reactive payload bag exposed to descendant components via Svelte context.
	// Components opt in with getContext('obs-utils.triggerPayload').
	const triggerCtx = $state<{ current: Record<string, any> | undefined }>({ current: undefined });
	setContext('obs-utils.triggerPayload', triggerCtx);

	// Animator component refs keyed by component index. Only populated for components
	// with an animation config; other slots remain null/undefined.
	const animatorRefs: Array<{ fireTrigger: (k: string) => boolean; returnToDefault: () => void } | null> = [];

	function conditionMatches(payload: Record<string, any>): boolean {
		const conditions = overlayData.trigger?.conditions as Record<string, any> | undefined;
		if (!conditions) return true;
		for (const [key, expected] of Object.entries(conditions)) {
			if (expected === '' || expected === null || expected === undefined) continue;
			if (payload[key] !== expected) return false;
		}
		return true;
	}

	const triggerHook = initialTriggerKey
		? Hooks.on('obs-utils.overlayTrigger' as any, (key: string, payload: Record<string, any>) => {
			if (key !== initialTriggerKey) return;
			if (!conditionMatches(payload)) return;
			triggerCtx.current = payload;
			visible = true;
			if (hideTimer) clearTimeout(hideTimer);
			const dur = overlayData.trigger?.duration ?? 3000;
			if (dur > 0) {
				hideTimer = setTimeout(() => {
					visible = false;
					for (const a of animatorRefs) a?.returnToDefault();
				}, dur);
			}
			// Forward the trigger to each component's state machine.
			for (const a of animatorRefs) a?.fireTrigger(key);
		})
		: undefined;

	onDestroy(() => {
		if (triggerHook !== undefined) Hooks.off('obs-utils.overlayTrigger' as any, triggerHook);
		if (hideTimer) clearTimeout(hideTimer);
	});

	function getComponentClass(type: string) {
		if (!type) return EmptyComponent;
		return overlayComponents.get(type) ?? EmptyComponent;
	}

	// Single transition entry point that branches on trigger.transition at fire time.
	// Svelte transition directives only accept identifier references, so this wrapper
	// dispatches to the underlying transition with the configured params.
	function configuredTransition(node: Element, _params: Record<string, never> = {}) {
		const trig = overlayData.trigger;
		const showMs = trig?.showMs ?? 200;
		switch (trig?.transition) {
			case 'slide-up': return fly(node, { y: 20, duration: showMs });
			case 'slide-down': return fly(node, { y: -20, duration: showMs });
			case 'scale': return scale(node, { duration: showMs });
			case 'flash': return fade(node, { duration: 0 });
			case 'fade':
			default: return fade(node, { duration: showMs });
		}
	}
</script>

{#if visible}
	<div
		class='wysiwyg-overlay'
		id={`overlay${overlayIndex.toString()}`}
		data-overlay-id={overlayData.id ?? ''}
		style={`position: relative; width: ${w}px; height: ${h}px; overflow: hidden; ${overlayData.style ?? ''}`}
		in:configuredTransition
		out:configuredTransition
	>
		{#each overlayData.components as component, index (overlayData.components.indexOf(component))}
			{#if component !== null && component !== undefined}
				{@const Component = getComponentClass(component.type)}
				{#if component.animation}
					<Animator
						bind:this={animatorRefs[index]}
						animation={component.animation}
					>
						<div
							id={`wysiwyg-component-${overlayIndex}-${index}`}
							data-component-id={component.id ?? ''}
							style={`position: absolute; left: ${component.x ?? 0}px; top: ${component.y ?? 0}px; width: ${component.w ?? 100}px; height: ${component.h ?? 30}px; transform: rotate(${component.rotation ?? 0}deg);`}
						>
							<Component
								data={component.data}
								componentIndex={index}
								actorID={actorID}
								style={component.style}
							/>
						</div>
					</Animator>
				{:else}
					<div
						id={`wysiwyg-component-${overlayIndex}-${index}`}
						data-component-id={component.id ?? ''}
						style={`position: absolute; left: ${component.x ?? 0}px; top: ${component.y ?? 0}px; width: ${component.w ?? 100}px; height: ${component.h ?? 30}px; transform: rotate(${component.rotation ?? 0}deg);`}
					>
						<Component
							data={component.data}
							componentIndex={index}
							actorID={actorID}
							style={component.style}
						/>
					</div>
				{/if}
			{/if}
		{/each}
	</div>
{/if}

<style lang='stylus'>
.wysiwyg-overlay
	box-sizing border-box
</style>
