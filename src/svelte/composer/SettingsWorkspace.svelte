<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData, OverlayTileMode } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';

	let {
		layer,
		layerIndex,
		renameLayer,
		changeLayerType,
		commit,
	} = $props<{
		layer: OverlayData;
		layerIndex: number;
		renameLayer: (index: number, name: string) => void;
		changeLayerType: (index: number, type: string) => void;
		commit: () => void;
	}>();

	const overlayTypeOptions = $derived.by(() => {
		const types = getApi().overlayTypes;
		if (!types) return [] as Array<{ key: string; label: string }>;
		return Array.from(types.keys())
			.filter(k => k === 'sl' || k === 'wysiwyg')
			.map((k) => {
				const nameKey = getApi().overlayTypeNames?.get(k);
				return { key: k, label: nameKey ? game.i18n.localize(nameKey) : k };
			});
	});

	const tileByOptions: Array<{ value: OverlayTileMode; labelKey: string }> = [
		{ value: 'actors', labelKey: 'obs-utils.applications.overlayEditor.tileByActors' },
		{ value: 'players', labelKey: 'obs-utils.applications.overlayEditor.tileByPlayers' },
		{ value: 'once', labelKey: 'obs-utils.applications.overlayEditor.tileByOnce' },
	];

	function onRename(e: Event) {
		renameLayer(layerIndex, (e.currentTarget as HTMLInputElement).value);
	}

	async function onTypeChange(e: Event) {
		const newType = (e.currentTarget as HTMLSelectElement).value;
		if (newType === layer.type) return;
		const hasComponents = (layer.components?.length ?? 0) > 0;
		if (hasComponents) {
			const proceed = await foundry.applications.api.DialogV2.confirm({
				content: game.i18n.localize('obs-utils.applications.overlayEditor.confirmTypeChange'),
			});
			if (!proceed) {
				(e.currentTarget as HTMLSelectElement).value = layer.type;
				return;
			}
		}
		changeLayerType(layerIndex, newType);
	}

	function onTileByChange(e: Event) {
		layer.tileBy = (e.currentTarget as HTMLSelectElement).value as OverlayTileMode;
		commit();
	}

	function onCanvasWidth(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value) || 0;
		layer.config = { ...(layer.config ?? {}), w: Math.max(1, v) };
		commit();
	}

	function onCanvasHeight(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value) || 0;
		layer.config = { ...(layer.config ?? {}), h: Math.max(1, v) };
		commit();
	}

	function onCustomCSS(e: Event) {
		layer.customCSS = (e.currentTarget as HTMLTextAreaElement).value;
		commit();
	}
</script>

<div class='settings-workspace'>
	<section class='field-row'>
		<label class='field'>
			<span class='label'>{game.i18n?.localize('obs-utils.applications.overlayEditor.layerName') ?? 'Name'}</span>
			<input
				type='text'
				value={layer.name ?? ''}
				placeholder={`#${layerIndex} ${layer.type}`}
				onchange={onRename}
			/>
		</label>
		<label class='field'>
			<span class='label'>{game.i18n?.localize('obs-utils.applications.overlayEditor.layerType') ?? 'Type'}</span>
			<select value={layer.type} onchange={onTypeChange}>
				{#each overlayTypeOptions as opt (opt.key)}
					<option value={opt.key}>{opt.label}</option>
				{/each}
			</select>
		</label>
	</section>

	<section class='field-row'>
		<label class='field'>
			<span class='label'>{game.i18n?.localize('obs-utils.applications.overlayEditor.tileByLabel') ?? 'Tile By'}</span>
			<select value={layer.tileBy ?? 'actors'} onchange={onTileByChange}>
				{#each tileByOptions as opt (opt.value)}
					<option value={opt.value}>{game.i18n?.localize(opt.labelKey) ?? opt.value}</option>
				{/each}
			</select>
		</label>
	</section>

	{#if layer.type === 'wysiwyg'}
		<section class='field-row'>
			<label class='field'>
				<span class='label'>{game.i18n?.localize('obs-utils.applications.overlayEditor.canvasWidth') ?? 'Canvas width (px)'}</span>
				<input
					type='number'
					min='1'
					step='1'
					value={layer.config?.w ?? 1920}
					onchange={onCanvasWidth}
				/>
			</label>
			<label class='field'>
				<span class='label'>{game.i18n?.localize('obs-utils.applications.overlayEditor.canvasHeight') ?? 'Canvas height (px)'}</span>
				<input
					type='number'
					min='1'
					step='1'
					value={layer.config?.h ?? 1080}
					onchange={onCanvasHeight}
				/>
			</label>
		</section>
	{/if}

	<section class='field-row stack'>
		<label class='field'>
			<span class='label'>{game.i18n?.localize('obs-utils.applications.overlayEditor.customCSS') ?? 'Custom CSS for this overlay'}</span>
			<textarea
				rows='10'
				value={layer.customCSS ?? ''}
				oninput={onCustomCSS}
				spellcheck='false'
			></textarea>
		</label>
	</section>
</div>

<style lang='stylus'>
	.settings-workspace
		display flex
		flex-direction column
		gap 14px
		padding 18px
		overflow-y auto
		min-height 0
		flex 1 1 auto

	.field-row
		display grid
		grid-template-columns 1fr 1fr
		gap 12px

		&.stack
			grid-template-columns 1fr

	.field
		display flex
		flex-direction column
		gap 4px
		min-width 0

		.label
			font-size 11px
			text-transform uppercase
			letter-spacing 0.4px
			opacity 0.7
			font-weight 500

		input, select, textarea
			width 100%
			min-width 0
			height 30px
			padding 0 8px
			background rgba(0, 0, 0, 0.3)
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			color inherit
			font-size 12px

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

		textarea
			height auto
			padding 8px
			font-family monospace
			resize vertical
</style>
