<svelte:options runes={true} />
<script lang='ts'>
	import type { StateMachineController } from '../../utils/componentAnimationRuntime.ts';
	import type { ComponentAnimationConfig } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { createComponentStateMachine } from '../../utils/componentAnimationRuntime.ts';

	const { animation, children }: { animation: ComponentAnimationConfig; children: any } = $props();

	let wrapperEl: HTMLDivElement;
	let machine: StateMachineController | null = null;

	onMount(() => {
		machine = createComponentStateMachine(wrapperEl, animation);
	});

	onDestroy(() => {
		machine?.dispose();
		machine = null;
	});

	/** Called by WYSIWYGOverlay when the overlay-level trigger fires. */
	export function fireTrigger(eventKey: string): boolean {
		return machine?.fireTrigger(eventKey) ?? false;
	}

	/** Called by WYSIWYGOverlay when the overlay-level trigger auto-hide timer ends. */
	export function returnToDefault(): void {
		machine?.returnToDefault();
	}
</script>

<div bind:this={wrapperEl}>
	{@render children()}
</div>
