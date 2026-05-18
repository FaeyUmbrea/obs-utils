<script lang='ts'>
	import { fade } from 'svelte/transition';

	type RollConfig = {
		preRollEnabled?: boolean;
		postRollEnabled?: boolean;
		preRollDelay?: number;
		preRollStay?: number;
		preRollFadeIn?: number;
		preRollFadeOut?: number;
		rollStay?: number;
		rollFadeIn?: number;
		rollFadeOut?: number;
		postRollStay?: number;
		postRollFadeIn?: number;
		postRollFadeOut?: number;
		preRollImage?: string;
		rollBackground?: string;
		rollForeground?: string;
		postRollImage?: string;
	};

	let { id = $bindable(), rollValue = $bindable(''), config = {} as RollConfig } = $props<{
		id: string;
		rollValue?: string;
		config?: RollConfig;
	}>();

	const pre = $derived(!!config.preRollEnabled);
	const post = $derived(!!config.postRollEnabled);
	const preRollDelay = $derived(config.preRollDelay ?? 0);
	const preRollStay = $derived(config.preRollStay ?? 0);
	const preRollFadeIn = $derived(config.preRollFadeIn ?? 0);
	const preRollFadeOut = $derived(config.preRollFadeOut ?? 0);
	const rollStay = $derived(config.rollStay ?? 5000);
	const rollFadeIn = $derived(config.rollFadeIn ?? 0);
	const rollFadeOut = $derived(config.rollFadeOut ?? 0);
	const postRollStay = $derived(config.postRollStay ?? 0);
	const postRollFadeIn = $derived(config.postRollFadeIn ?? 0);
	const postRollFadeOut = $derived(config.postRollFadeOut ?? 0);
	const preRollImage = $derived(config.preRollImage ?? '');
	const rollBackgroundImage = $derived(config.rollBackground ?? '');
	const rollForegroundImage = $derived(config.rollForeground ?? '');
	const postRollImage = $derived(config.postRollImage ?? '');

	const preRollDuration = $derived(preRollDelay + preRollFadeIn + preRollStay);
	const rollDelay = $derived(preRollDuration + preRollFadeOut);
	const rollDuration = $derived(rollDelay + rollStay + rollFadeIn);
	const postRollDelay = $derived(rollDelay + rollStay + rollFadeIn + rollFadeOut);
	const postRollDuration = $derived(postRollDelay + postRollStay + postRollFadeIn);

	let rollShow = $state(false);
	let preRollShow = $state(false);
	let postRollShow = $state(false);

	let timeouts: number[] = [];

	function clearAll() {
		for (const t of timeouts) {
			clearTimeout(t);
		}
		timeouts = [];
		rollShow = false;
		preRollShow = false;
		postRollShow = false;
	}

	function startSequence() {
		if (rollValue === '') return;

		preRollShow = pre;
		if (pre) {
			timeouts.push(setTimeout(() => {
				preRollShow = false;
			}, preRollDuration) as unknown as number);
		}
		timeouts.push(setTimeout(() => {
			rollShow = true;
		}, rollDelay) as unknown as number);
		timeouts.push(setTimeout(() => {
			rollShow = false;
		}, rollDuration) as unknown as number);
		if (post) {
			timeouts.push(setTimeout(() => {
				postRollShow = true;
			}, postRollDelay) as unknown as number);
			timeouts.push(setTimeout(() => {
				postRollShow = false;
			}, postRollDuration) as unknown as number);
		}
	}

	$effect(() => {
		clearAll();
		startSequence();
	});
</script>

<div class='display-area' id={id}>
	{#if preRollShow}
		<div class='before layer'
			in:fade={{ duration: preRollFadeIn }}
			out:fade={{ duration: preRollFadeOut }}
		>
			<img
				src={preRollImage}
				alt='pre roll'
			/>
		</div>
	{/if}
	{#if rollShow}
		<div class='roll layer'
			in:fade={{ duration: rollFadeIn }}
			out:fade={{ duration: rollFadeOut }}
		>
			{#if rollBackgroundImage}
				<img
					class='background layer'
					src={rollBackgroundImage}
					alt='roll background'
				/>
			{/if}
			<span>{rollValue}</span>
			{#if rollForegroundImage}
				<img
					class='foreground layer'
					src={rollForegroundImage}
					alt='roll foreground'
				/>
			{/if}
		</div>
	{/if}
	{#if postRollShow}
		<div class='after layer'
			in:fade={{ duration: postRollFadeIn }}
			out:fade={{ duration: postRollFadeOut }}
		>
			<img
				src={postRollImage}
				alt='post roll'
			/>
		</div>
	{/if}
</div>
