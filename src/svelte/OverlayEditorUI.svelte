<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import type { SvelteApplication } from '../applications/mixin.svelte.ts';
	import { preventUndefinedNullInArray } from '../utils/helpers.ts';
	import { settings } from '../utils/settings.ts';
	import { OverlayData } from '../utils/types.ts';
	import OverlayEditorTab from './components/OverlayEditorTab.svelte';
	import InformationOverlay from './streamoverlays/PerActorOverlay.svelte';

	const overlays = settings.getStore('streamOverlays');
	const actorIDs = settings.getReadableStore('overlayActors');

	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();

	let activeIndex = $state(0);

	let previewActorID = $state<string | null>(null);

	const previewActors = $derived(
		($actorIDs ?? []).map((id: string) => ({
			id,
			name: (game as ReadyGame).actors?.get(id)?.name ?? id,
		}))
	);

	$effect(() => {
		if (previewActorID && !($actorIDs ?? []).includes(previewActorID)) {
			previewActorID = null;
		}
	});

	const previewIds = $derived(
		previewActorID ? [previewActorID] : ($actorIDs ?? [])
	);

	function refresh() {
		$overlays = $overlays;
	}

	function handleRemove(index: number) {
		$overlays.splice(index, 1);
		$overlays = preventUndefinedNullInArray($overlays);
		if (activeIndex === index) {
			activeIndex = Math.max(0, index - 1);
		}
	}

	function handleAdd() {
		$overlays.push(new OverlayData());
		$overlays = preventUndefinedNullInArray($overlays);
	}

	function changeTab(tab: number) {
		activeIndex = tab;
	}

	async function close() {
		await foundryApp.close();
	}

	async function setOverlayData(index: number, value: OverlayData) {
		if (index === null || index === undefined || value === null || value === undefined) {
			return;
		}
		$overlays[index] = value;
	}

</script>

<div class='grid'>
	<div class='preview'>
		<div class='preview-actor-select'>
			<select
				bind:value={previewActorID}
				aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.previewActorLabel')}
			>
				<option value={null}>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewActorLabel')} (All)</option>
				{#each previewActors as actor}
					<option value={actor.id}>{actor.name}</option>
				{/each}
			</select>
		</div>
		<InformationOverlay actorIDs={previewIds} overlays={$overlays} />
	</div>

	<div class='editor'>
		<div class='nav-with-add-button'>
			<button
				class='add'
				aria-label='add'
				onclick={() => handleAdd()}
				title={game.i18n?.localize(
					'obs-utils.applications.overlayEditor.addOverlayButton',
				)}
				type='button'><i class='fas fa-plus'></i></button
			>
			<nav class='tabs' data-group='primary-tabs'>
				{#each $overlays as overlay, index ($overlays.indexOf(overlay))}
					<!-- svelte-ignore a11y_missing_attribute -->
					<a
						role='tab'
						tabindex={index === activeIndex ? 0 : -1}
						aria-selected={index === activeIndex}
						class="item {index === activeIndex ? 'active' : ''}"
						data-tab={index}
						onclick={() => changeTab(index)}
						onkeydown={(e) => {
							if (e.key === 'ArrowRight') { changeTab(Math.min(index + 1, $overlays.length - 1)); e.preventDefault(); }
							if (e.key === 'ArrowLeft') { changeTab(Math.max(index - 1, 0)); e.preventDefault(); }
						}}
					>{index}</a
					>
				{/each}
			</nav>
		</div>
		<hr />
		<section class='content'>
			{#each $overlays as overlay, index ($overlays.indexOf(overlay))}
				{#if overlay !== null && overlay !== undefined}
					<div
						class="tab {index === activeIndex ? 'active' : ''}"
						data-tab={index}
						data-group='primary-tabs'
					>
						<OverlayEditorTab
							bind:overlay={() => $overlays[index], v => setOverlayData(index, v)}
							removeFn={handleRemove}
							componentindex={index}
							refreshFn={refresh}
						/>
					</div>
				{/if}
			{/each}
		</section>
	</div>
</div>
<hr />
<footer>
	<button
		onclick={async () => {
			const { openOverlayPreview } = await import('../utils/ui.ts');
			await openOverlayPreview();
		}}
		title={game.i18n?.localize('obs-utils.applications.overlayEditor.showFullPreview')}
		type='button'
	>
		<i class='fas fa-expand'></i>
		{game.i18n?.localize('obs-utils.applications.overlayEditor.showFullPreview')}
	</button>
	<button onclick={close}
	>{game.i18n?.localize('obs-utils.applications.overlayEditor.closeButton')}</button
	>
</footer>

<style lang='stylus'>

    footer {
        position: absolute;
        width: calc(100% - 20px);
        bottom: 0;
        left: 10px;
        padding: 10px;
        display: flex;
      button {
        width 100%
        height 35px
      }
    }

    .add {
        width: 35px;
        height 35px
        align-self: flex-end;
    }

    .grid {
        display: grid;
        grid-template-columns: 40% 60%;
        grid-template-rows: 100%;
        height: calc(100% - 50px);
        min-height: calc(100% - 50px);
        max-height: calc(100% - 50px);
    }

    .preview {
        background-color: black;
        border-radius: 4px;
        padding-right: 5px;
        overflow: scroll
    }

    .preview-actor-select {
        padding: 4px;
        select {
            width: 100%;
        }
    }

    .editor {
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        padding-left: 5px;

        .content {
            height: calc(100% - 70px);
            max-height: calc(100% - 70px);
            overflow: hidden;
            position: relative;

          .tab {
            height 100%
            max-height 100%
          }
        }

        .nav-with-add-button {
            display: grid;
            grid-template-columns: 35px calc(100% - 35px);

            .tabs {
                justify-content: left;
                overflow-x: scroll;
                height: 35px
                gap: 0;

                .item {
                    padding-inline: 10px;
                    align-self: center;
                    font-size: 20px;
                    padding-top: 9px;
                }
            }

            .add {
                align-self: center;
            }
        }
    }
</style>
