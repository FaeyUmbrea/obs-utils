<script lang='ts'>
	import { fade } from 'svelte/transition';
	import { settings as rollOverlaySettings } from '../../../utils/settings.ts';

	export let id;

	const pre = rollOverlaySettings.getStore('rollOverlayPostRollEnabled');
	const post = rollOverlaySettings.getStore('rollOverlayPreRollEnabled');

	const preRollDelay = rollOverlaySettings.getStore('rollOverlayPreRollDelay');
	const preRollStay = rollOverlaySettings.getStore('rollOverlayPreRollStay');
	const preRollFadeIn = rollOverlaySettings.getStore('rollOverlayPreRollFadeIn');
	const preRollFadeOut = rollOverlaySettings.getStore(
		'rollOverlayPreRollFadeOut',
	);
	$:rollDelay = $pre
		? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
		: 0;
	const rollStay = rollOverlaySettings.getStore('rollOverlayRollStay');
	const rollFadeIn = rollOverlaySettings.getStore('rollOverlayRollFadeIn');
	const rollFadeOut = rollOverlaySettings.getStore('rollOverlayRollFadeOut');
	$: postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
	const postRollStay = rollOverlaySettings.getStore('rollOverlayPostRollStay');
	const postRollFadeIn = rollOverlaySettings.getStore(
		'rollOverlayPostRollFadeIn',
	);
	const postRollFadeOut = rollOverlaySettings.getStore(
		'rollOverlayPostRollFadeOut',
	);

	const preRollImage = rollOverlaySettings.getStore('rollOverlayPreRollImage');
	const rollBackgroundImage = rollOverlaySettings.getStore(
		'rollOverlayRollBackground',
	);
	const rollForegroundImage = rollOverlaySettings.getStore(
		'rollOverlayRollForeground',
	);
	const postRollImage = rollOverlaySettings.getStore('rollOverlayPostRollImage');

	export let rollValue = '0';
	export let rollRunning = false;
	let rollShow = false;
	let preRollShow = false;
	let postRollShow = false;
	$: if (rollRunning) {
		rollShow = true;
		preRollShow = $pre;
		postRollShow = $post;
	}
</script>

<div class='display-area' id={id}>

	{#if preRollShow}
		<div class='before layer'
			in:fade={{ delay: $preRollDelay, duration: $preRollFadeIn }}
			out:fade={{ delay: $preRollStay, duration: $preRollFadeOut }}
			on:introend={() => (preRollShow = false)}>
			<img
				src={$preRollImage}
				alt='pre roll'
			/>
		</div>
	{/if}
	{#if rollShow}
		<div class='roll layer'
			in:fade={{ delay: rollDelay, duration: $rollFadeIn }}
			out:fade={{ delay: $rollStay, duration: $rollFadeOut }}
			on:introend={() => {
				rollShow = false;
				if (!$post) rollRunning = false;
			}}>
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
			in:fade={{ delay: postRollDelay, duration: $postRollFadeIn }}
			out:fade={{ delay: $postRollStay, duration: $postRollFadeOut }}
			on:introend={() => {
				postRollShow = false;
				rollRunning = false;
			}}>
			<img
				src={$postRollImage}
				alt='post roll'
			/>
		</div>
	{/if}

</div>
