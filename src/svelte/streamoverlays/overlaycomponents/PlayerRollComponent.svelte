<script>
	import { fade } from 'svelte/transition';
	import { rollOverlaySettings } from '../../../utils/settings.ts';

	export let id;

	const pre = rollOverlaySettings.getStore('rollOverlayPostRollEnabled');
	const post = rollOverlaySettings.getStore('rollOverlayPreRollEnabled');

	const preRollDelay = rollOverlaySettings.getStore('rollOverlayPreRollDelay');
	const preRollStay = rollOverlaySettings.getStore('rollOverlayPreRollStay');
	const preRollFadeIn = rollOverlaySettings.getStore('rollOverlayPreRollFadeIn');
	const preRollFadeOut = rollOverlaySettings.getStore(
		'rollOverlayPreRollFadeOut',
	);
	let rollDelay = $pre
		? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
		: 0;
	const rollStay = rollOverlaySettings.getStore('rollOverlayRollStay');
	const rollFadeIn = rollOverlaySettings.getStore('rollOverlayRollFadeIn');
	const rollFadeOut = rollOverlaySettings.getStore('rollOverlayRollFadeOut');
	let postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
	const postRollStay = rollOverlaySettings.getStore('rollOverlayPostRollStay');
	const postRollFadeIn = rollOverlaySettings.getStore(
		'rollOverlayPostRollFadeIn',
	);
	const postRollFadeOut = rollOverlaySettings.getStore(
		'rollOverlayPostRollFadeOut',
	);

	function recalculateRollDelay() {
		rollDelay = $pre
			? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
			: 0;
	}

	preRollDelay.subscribe(recalculateRollDelay);
	preRollFadeIn.subscribe(recalculateRollDelay);
	preRollStay.subscribe(recalculateRollDelay);
	preRollFadeOut.subscribe(recalculateRollDelay);
	pre.subscribe(recalculateRollDelay);

	function recalculatePostRollDelay() {
		postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
	}

	rollFadeIn.subscribe(recalculatePostRollDelay);
	rollStay.subscribe(recalculatePostRollDelay);
	rollFadeOut.subscribe(recalculatePostRollDelay);

	const preRollImage = rollOverlaySettings.getStore('rollOverlayPreRollImage');
	const rollBackgroundImage = rollOverlaySettings.getStore(
		'rollOverlayRollBackground',
	);
	const rollForegroundImage = rollOverlaySettings.getStore(
		'rollOverlayRollForeground',
	);
	const postRollImage = rollOverlaySettings.getStore('rollOverlayPostRollImage');

	export let rollValue = '0';
	export let preRollShow = false;
	export let rollShow = false;
	export let postRollShow = false;
</script>

<div class='display-area' id={id}>
	{#if preRollShow}
		{#if $pre}
			<img
				class='before layer'
				in:fade={{ delay: $preRollDelay, duration: $preRollFadeIn }}
				out:fade={{ delay: $preRollStay, duration: $preRollFadeOut }}
				src={$preRollImage}
				alt='pre roll'
				on:introend={() => (preRollShow = false)}
			/>
		{/if}
	{/if}
	{#if rollShow}
		{#if $rollBackgroundImage}
			<img
				class='background layer'
				in:fade={{ delay: rollDelay, duration: $rollFadeIn }}
				out:fade={{ delay: $rollStay, duration: $rollFadeOut }}
				src={$rollBackgroundImage}
				alt='roll background'
			/>
		{/if}
		<span
			class='roll layer'
			in:fade={{ delay: rollDelay, duration: $rollFadeIn }}
			out:fade={{ delay: $rollStay, duration: $rollFadeOut }}
			on:introend={() => (rollShow = false)}>{rollValue}</span
		>
		{#if $rollForegroundImage}
			<img
				class='foreground layer'
				in:fade={{ delay: rollDelay, duration: $rollFadeIn }}
				out:fade={{ delay: $rollStay, duration: $rollFadeOut }}
				src={$rollForegroundImage}
				alt='roll foreground'
			/>
		{/if}
	{/if}
	{#if postRollShow}
		{#if $post && $postRollImage}
			<img
				class='after layer'
				in:fade={{ delay: postRollDelay, duration: $postRollFadeIn }}
				out:fade={{ delay: $postRollStay, duration: $postRollFadeOut }}
				src={$postRollImage}
				on:introend={() => (postRollShow = false)}
				alt='post roll'
			/>
		{/if}
	{/if}
</div>
