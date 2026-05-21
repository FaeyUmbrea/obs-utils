<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { getActorValues } from '../../../utils/helpers';

	let { data = $bindable('') } = $props<{ data: string }>();

	function looksLikePath(v: string): boolean {
		if (!v) return false;
		if (v.startsWith('trigger.')) return true;
		return v.includes('.') && /^[\w.]+$/.test(v) && !v.includes('/');
	}

	let dataDriven = $state(looksLikePath(data ?? ''));

	let options = $state<{ value: string; label: string }[]>(
		(() => {
			const base = getActorValues().slice();
			if (data && !base.some(v => v.value === data)) {
				base.push({ value: data, label: data });
			}
			return base;
		})(),
	);

	function setValue(path: string) {
		if (!options.some(v => v.value === path)) {
			options = [...options, { value: path, label: path }];
		}
		data = path;
	}

	let filePickerApp: foundry.applications.apps.FilePicker | undefined;

	async function openFilePicker() {
		if (filePickerApp && filePickerApp.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerApp.bringToFront();
			return;
		}
		filePickerApp = new foundry.applications.apps.FilePicker({
			type: 'image',
			current: typeof data === 'string' && data.length > 0 ? data : undefined,
			callback: (path: string) => {
				filePickerApp = undefined;
				setValue(path);
			},
			window: { title: game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage') },
		});
		await filePickerApp.render();
	}
</script>

<div class='image-editor'>
	<label class='mode-toggle'>
		<input type='checkbox' bind:checked={dataDriven} />
		<span>{game.i18n?.localize('obs-utils.applications.componentEditors.dataDriven') ?? 'Data-driven'}</span>
	</label>
	{#if dataDriven}
		<div class='picker'>
			<Select
				options={options}
				bind:value={data}
				creatable={true}
				placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
			/>
		</div>
	{:else}
		<div class='picker'>
			<input
				type='text'
				class='static-input'
				bind:value={data}
				placeholder={game.i18n?.localize('obs-utils.applications.componentEditors.staticImagePlaceholder') ?? 'Image URL or path'}
			/>
			<button
				type='button'
				class='browse'
				onclick={openFilePicker}
				title={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
				aria-label={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
			>
				<i class='fa-solid fa-folder-open'></i>
			</button>
		</div>
	{/if}
</div>

<style lang='stylus'>
	.image-editor
		width 100%
		display flex
		flex-direction column
		gap 6px

	.mode-toggle
		display inline-flex
		align-items center
		gap 6px
		font-size 11px
		opacity 0.85

		input
			margin 0

	.picker
		display flex
		gap 4px
		align-items stretch

		:global(.ouselect)
			flex 1 1 auto
			min-width 0

	.static-input
		flex 1 1 auto
		height 35px
		padding 0 8px
		font-size 13px
		background var(--sidebar-background, transparent)
		border 1px solid rgba(255, 255, 255, 0.15)
		border-radius 3px
		color inherit
		min-width 0

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.6)

	.browse
		flex 0 0 auto
		width 34px
		min-height 35px
		padding 0
		display flex
		align-items center
		justify-content center
</style>
