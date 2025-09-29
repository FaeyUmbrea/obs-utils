<script lang='ts'>
	import { fade } from 'svelte/transition';
	import { getPlayerRollStores } from '../../../utils/settings.ts';

	const {
		pre,
		post,
		preRollDelay,
		preRollStay,
		preRollFadeIn,
		preRollFadeOut,
		rollStay,
		rollFadeIn,
		rollFadeOut,
		postRollStay,
		postRollFadeIn,
		postRollFadeOut,
		preRollImage,
		rollBackgroundImage,
		rollForegroundImage,
		postRollImage,
	} = getPlayerRollStores();

	const preRollDuration = $derived($preRollDelay + $preRollFadeIn + $preRollStay);
	const rollDelay = $derived(preRollDuration + $preRollFadeOut);
	const rollDuration = $derived(rollDelay + $rollStay + $rollFadeIn);
	const postRollDelay = $derived(rollDelay + $rollStay + $rollFadeIn + $rollFadeOut);
	const postRollDuration = $derived(postRollDelay + $postRollStay + $postRollFadeIn);

	let { id = $bindable(), rollValue = $bindable('') } = $props();

	let rollShow = $state(false);
	let preRollShow = $state(false);
	let postRollShow = $state(false);

	// Track running timers so we can cancel and restart on rollValue changes
	let timeouts: number[] = [];

	function clearAll() {
		// Cancel any pending timeouts
		for (const t of timeouts) {
			clearTimeout(t);
		}
		timeouts = [];
		// Reset visibility flags to skip transitions
		rollShow = false;
		preRollShow = false;
		postRollShow = false;
	}

	function startSequence() {
		// Start fresh sequence using current settings
		if (rollValue === '') return;

		preRollShow = $pre;
		if ($pre) {
			timeouts.push(
				setTimeout(() => {
					preRollShow = false;
				}, preRollDuration) as unknown as number,
			);
		}
		timeouts.push(
			setTimeout(() => {
				rollShow = true;
			}, rollDelay) as unknown as number,
		);
		timeouts.push(
			setTimeout(() => {
				rollShow = false;
			}, rollDuration) as unknown as number,
		);
		if ($post) {
			timeouts.push(
				setTimeout(() => {
					postRollShow = true;
				}, postRollDelay) as unknown as number,
			);
			timeouts.push(
				setTimeout(() => {
					postRollShow = false;
				}, postRollDuration) as unknown as number,
			);
		}
	}

	$effect(() => {
		// On any change to rollValue, restart animation sequence
    // Skip transitions by immediately hiding everything, then restart timers
		clearAll();
		startSequence();
	});
</script>

<div class='display-area' id={id}>
	{#if preRollShow}
		<div class='before layer'
			in:fade={{ duration: $preRollFadeIn }}
			out:fade={{ duration: $preRollFadeOut }}
		>
			<img
				src={$preRollImage}
				alt='pre roll'
			/>
		</div>
	{/if}
	{#if rollShow}
		<div class='roll layer'
			in:fade={{ duration: $rollFadeIn }}
			out:fade={{ duration: $rollFadeOut }}
		>
			{#if $rollBackgroundImage}
				<img
					class='background layer'
					src={$rollBackgroundImage}
					alt='roll background'
				/>
			{/if}
			<span>{rollValue}</span>
			{#if $rollForegroundImage}
				<img
					class='foreground layer'
					src={$rollForegroundImage}
					alt='roll foreground'
				/>
			{/if}
		</div>
	{/if}
	{#if postRollShow}
		<div class='after layer'
			in:fade={{ duration: $postRollFadeIn }}
			out:fade={{ duration: $postRollFadeOut }}
		>
			<img
				src={$postRollImage}
				alt='post roll'
			/>
		</div>
	{/if}

</div>
