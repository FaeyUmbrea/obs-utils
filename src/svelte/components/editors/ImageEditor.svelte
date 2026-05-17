<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { getActorValues } from '../../../utils/helpers';

	let { data = $bindable('') } = $props<{ data: string }>();

	// Same value source as the regular AVEditor — typeahead for actor value paths.
	// Users can also paste a literal path/URL since Svelecte is `creatable`.
	const values = getActorValues();
	if (data !== null && !values.some(v => v.value === data)) {
		values.push({ value: data, label: data, $created: true });
	}

	let filePickerApp: foundry.applications.apps.FilePicker | undefined;

	async function openFilePicker() {
		if (filePickerApp && filePickerApp.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerApp.bringToFront();
			return;
		}
		filePickerApp = new foundry.applications.apps.FilePicker({
			type: 'image',
			current: typeof data === 'string' ? data : undefined,
			callback: (path: string) => {
				// Foundry's FilePicker hands back a path string; route it through
				// the same typeahead value store so it shows up as a chosen option.
				if (!values.some(v => v.value === path)) {
					values.push({ value: path, label: path, $created: true });
				}
				data = path;
				filePickerApp = undefined;
			},
			window: { title: game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage') },
		});
		await filePickerApp.render();
	}
</script>

<div class='image-editor'>
	<div class='picker'>
		<Svelecte
			--sv-bg='var(--sidebar-background)'
			--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
			--sv-min-height='35px'
			floatingConfig={{ strategy: 'fixed' }}
			options={values}
			bind:value={data}
			labelField='label'
			valueField='value'
			creatable={true}
			creatablePrefix=""
			placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
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
</div>

<style lang='stylus'>
	.image-editor
		width 100%

	.picker
		display flex
		gap 4px
		align-items stretch

		:global(.svelecte)
			flex 1 1 auto
			min-width 0

	.browse
		flex 0 0 auto
		width 34px
		min-height 35px
		padding 0
		display flex
		align-items center
		justify-content center
</style>
