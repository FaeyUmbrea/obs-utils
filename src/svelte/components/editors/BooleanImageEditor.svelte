<svelte:options runes={true} />
<script lang='ts'>
	import { tick } from 'svelte';
	import { getDataPickerGroups } from '../../../utils/helpers';
	import Select from '../select/Select.svelte';

	let { data = $bindable(';;') } = $props<{ data: string }>();

	let av1 = $state(data?.split(';')[0] ?? '');
	let img1 = $state(data?.split(';')[1] ?? '');
	let img2 = $state(data?.split(';')[2] ?? '');

	const groups = getDataPickerGroups();

	function emit() {
		data = `${av1 ?? ''};${img1 ?? ''};${img2 ?? ''}`;
	}

	// Two parallel image picker states — one per image slot.
	let img1Options = $state<{ value: string; label: string }[]>(img1 ? [{ value: img1, label: img1 }] : []);
	let img2Options = $state<{ value: string; label: string }[]>(img2 ? [{ value: img2, label: img2 }] : []);

	async function setImg1(path: string) {
		if (!img1Options.some(v => v.value === path)) {
			img1Options = [...img1Options, { value: path, label: path }];
			await tick();
		}
		img1 = path;
		emit();
	}
	async function setImg2(path: string) {
		if (!img2Options.some(v => v.value === path)) {
			img2Options = [...img2Options, { value: path, label: path }];
			await tick();
		}
		img2 = path;
		emit();
	}

	let pickerApp: foundry.applications.apps.FilePicker | undefined;
	async function pickImage(target: 'true' | 'false') {
		if (pickerApp && pickerApp.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			pickerApp.bringToFront();
			return;
		}
		const current = target === 'true' ? img1 : img2;
		pickerApp = new foundry.applications.apps.FilePicker({
			type: 'image',
			current: typeof current === 'string' && current.length > 0 ? current : undefined,
			callback: (path: string) => {
				pickerApp = undefined;
				if (target === 'true') setImg1(path);
				else setImg2(path);
			},
			window: { title: game.i18n.localize('obs-utils.applications.overlayEditor.componentData') },
		});
		await pickerApp.render();
	}
</script>

<div class='editor'>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.valuePath')}</span>
		<Select
			options={groups}
			bind:value={() => av1, (v) => { av1 = (v as string) ?? ''; emit(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.imageWhenTrue')}</span>
		<div class='picker'>
			<Select
				options={img1Options}
				bind:value={() => img1, (v) => { img1 = (v as string) ?? ''; emit(); }}
				creatable={true}
			/>
			<button
				type='button'
				class='browse'
				onclick={() => pickImage('true')}
				title={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
				aria-label={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
			><i class='fa-solid fa-folder-open'></i></button>
		</div>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.imageWhenFalse')}</span>
		<div class='picker'>
			<Select
				options={img2Options}
				bind:value={() => img2, (v) => { img2 = (v as string) ?? ''; emit(); }}
				creatable={true}
			/>
			<button
				type='button'
				class='browse'
				onclick={() => pickImage('false')}
				title={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
				aria-label={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
			><i class='fa-solid fa-folder-open'></i></button>
		</div>
	</label>
</div>

<style lang='stylus'>
	.editor
		display flex
		flex-direction column
		gap 8px

	.row
		display flex
		flex-direction column
		gap 4px

	.lbl
		font-size 11px
		opacity 0.7
		letter-spacing 0.3px

	.picker
		display flex
		gap 4px
		align-items stretch

		:global(.ouselect)
			flex 1 1 auto
			min-width 0

	.browse
		flex 0 0 auto
		width 34px
		min-height 32px
		padding 0
		display flex
		align-items center
		justify-content center
</style>
