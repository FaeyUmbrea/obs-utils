<svelte:options accessors={true} />

<script lang='ts'>
	import type { External } from '../applications/styleditor.ts';
	import { ApplicationShell } from '#runtime/svelte/component/application';
	import { localize } from '#runtime/util/i18n';
	import { getContext } from 'svelte';

	export let elementRoot = void 0;

	const application = getContext<External>('#external').application;

	let style = application.style;

	function close() {
		application.style = style;
		application.close();
	}
</script>

<ApplicationShell bind:elementRoot={elementRoot}>
	<input bind:value={style} name='style' type='text' />
	<footer>
		<button on:click={close}
		>{localize('obs-utils.applications.styleEditor.submitButton')}</button
		>
	</footer>
</ApplicationShell>

<style>
  footer {
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    padding: 10px;
  }
</style>
