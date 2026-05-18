<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { tick } from 'svelte';
	import { getActorValues } from '../../../utils/helpers';

	let { data = $bindable(';;;') } = $props<{ data: string }>();

	let valuePath = $state(data?.split(';')[0] ?? '');
	let filledImg = $state(data?.split(';')[1] ?? '');
	let maxPath = $state(data?.split(';')[2] ?? '');
	let emptyImg = $state(data?.split(';')[3] ?? '');

	const values = getActorValues();
	if (valuePath !== null && !values.some(v => v.value === valuePath)) {
		values.push({ value: valuePath, label: valuePath });
	}
	if (maxPath !== null && !values.some(v => v.value === maxPath)) {
		values.push({ value: maxPath, label: maxPath });
	}

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
		<Svelecte
			--sv-bg='var(--sidebar-background)'
			--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
			--sv-min-height='32px'
			floatingConfig={{ strategy: 'fixed' }}
			creatable={true}
			creatablePrefix=""
			options={values}
			bind:value={valuePath}
			onChange={emit}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.maxPath')}</span>
		<Svelecte
			--sv-bg='var(--sidebar-background)'
			--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
			--sv-min-height='32px'
			floatingConfig={{ strategy: 'fixed' }}
			creatable={true}
			creatablePrefix=""
			options={values}
			bind:value={maxPath}
			onChange={emit}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.filledImage')}</span>
		<div class='picker'>
			<Svelecte
				--sv-bg='var(--sidebar-background)'
				--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
				--sv-min-height='32px'
				floatingConfig={{ strategy: 'fixed' }}
				options={filledOptions}
				bind:value={filledImg}
				labelField='label'
				valueField='value'
				creatable={true}
				creatablePrefix=""
				onChange={emit}
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
			<Svelecte
				--sv-bg='var(--sidebar-background)'
				--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
				--sv-min-height='32px'
				floatingConfig={{ strategy: 'fixed' }}
				options={emptyOptions}
				bind:value={emptyImg}
				labelField='label'
				valueField='value'
				creatable={true}
				creatablePrefix=""
				onChange={emit}
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

		:global(.svelecte)
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
