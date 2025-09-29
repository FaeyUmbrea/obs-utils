<svelte:options runes={true} />

<script lang='ts'>

	const { foundryApp } = $props();

	let style = $state(foundryApp.style);

	function close() {
		foundryApp.style = style;
		foundryApp.close();
	}
</script>

<input bind:value={style} name='style' type='text' />
<footer>
	<button onclick={close}
	>{game.i18n.localize('obs-utils.applications.styleEditor.submitButton')}</button
	>
</footer>

<style>
  footer {
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    padding: 10px;
  }
</style>
