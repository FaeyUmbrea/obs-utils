<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { tick } from 'svelte';
	import { getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable(';;;') } = $props<{ data: string }>();

	let valuePath = $state(data?.split(';')[0] ?? '');
	let filledImg = $state(data?.split(';')[1] ?? '');
	let maxPath = $state(data?.split(';')[2] ?? '');
	let emptyImg = $state(data?.split(';')[3] ?? '');

	const groups = getActorValueGroups();

	function emit() {
		data = `${valuePath ?? ''};${filledImg ?? ''};${maxPath ?? ''};${emptyImg ?? ''}`;
	}

	let filledOptions = $state<{ value: string; label: string }[]>(filledImg ? [{ value: filledImg, label: filledImg }] : []);
	let emptyOptions = $state<{ value: string; label: string }[]>(emptyImg ? [{ value: emptyImg, label: emptyImg }] : []);

	async function setFilled(path: string) {
		if (!filledOptions.some(v => v.value === path)) {
			filledOptions = [...filledOptions, { value: path, label: path }];
			await tick();
		}
		filledImg = path;
		emit();
	}
	async function setEmpty(path: string) {
		if (!emptyOptions.some(v => v.value === path)) {
			emptyOptions = [...emptyOptions, { value: path, label: path }];
			await tick();
		}
		emptyImg = path;
		emit();
	}

	let pickerApp: foundry.applications.apps.FilePicker | undefined;
	async function pickImage(target: 'filled' | 'empty') {
		if (pickerApp && pickerApp.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			pickerApp.bringToFront();
			return;
		}
		const current = target === 'filled' ? filledImg : emptyImg;
		pickerApp = new foundry.applications.apps.FilePicker({
			type: 'image',
			current: typeof current === 'string' && current.length > 0 ? current : undefined,
			callback: (path: string) => {
				pickerApp = undefined;
				if (target === 'filled') setFilled(path);
				else setEmpty(path);
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
			bind:value={() => valuePath, v => { valuePath = (v as string) ?? ''; emit(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.maxPath')}</span>
		<Select
			options={groups}
			bind:value={() => maxPath, v => { maxPath = (v as string) ?? ''; emit(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.filledImage')}</span>
		<div class='picker'>
			<Select
				options={filledOptions}
				bind:value={() => filledImg, v => { filledImg = (v as string) ?? ''; emit(); }}
				creatable={true}
			/>
			<button
				type='button'
				class='browse'
				onclick={() => pickImage('filled')}
				title={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
				aria-label={game.i18n.localize('obs-utils.applications.overlayEditor.backgroundImage')}
			><i class='fa-solid fa-folder-open'></i></button>
		</div>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.emptyImage')}</span>
		<div class='picker'>
			<Select
				options={emptyOptions}
				bind:value={() => emptyImg, v => { emptyImg = (v as string) ?? ''; emit(); }}
				creatable={true}
			/>
			<button
				type='button'
				class='browse'
				onclick={() => pickImage('empty')}
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
