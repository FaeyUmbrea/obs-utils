<svelte:options accessors={true} />

<script lang='ts'>
	import type { SvelteApp } from '#runtime/svelte/application';
	import type { MinimalWritable } from '@typhonjs-fvtt/runtime/svelte/store/util';
	import { ApplicationShell } from '#runtime/svelte/component/application';
	import { localize } from '#runtime/util/i18n';
	import { getContext } from 'svelte';
	import { settings } from '../utils/settings.ts';
	import { OverlayData } from '../utils/types.ts';
	import OverlayEditorTab from './components/OverlayEditorTab.svelte';
	import InformationOverlay from './streamoverlays/PerActorOverlay.svelte';

	const overlays = settings.getStore('streamOverlays') as MinimalWritable<OverlayData[]>;
	const actorIDs = settings.getReadableStore('overlayActors');

	let activeIndex = 0;

	function handleRemove(index) {
		$overlays.splice(index, 1);
		$overlays = $overlays;
		if (activeIndex === index) {
			activeIndex = Math.max(0, index - 1);
		}
	}

	function handleAdd() {
		$overlays.push(new OverlayData());
		$overlays = $overlays;
	}

	function changeTab(tab) {
		activeIndex = tab;
	}

	export let elementRoot = void 0;

	const context = getContext<SvelteApp.Context.External>('#external');

	async function close() {
		await context.application.close();
	}
</script>

<ApplicationShell bind:elementRoot={elementRoot}>
	<div class='grid'>
		<div class='preview'>
			<InformationOverlay actorIDs={$actorIDs} overlays={$overlays} />
		</div>

		<div class='editor'>
			<div class='nav-with-add-button'>
				<button
					class='add'
					on:click={() => handleAdd()}
					title={localize(
						'obs-utils.applications.overlayEditor.addOverlayButton',
					)}
					type='button'><i class='fas fa-plus'></i></button
				>
				<nav class='tabs' data-group='primary-tabs'>
					{#each $overlays as overlay, index ($overlays.indexOf(overlay))}
						<!-- svelte-ignore a11y-missing-attribute -->
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<a
							role='tab'
							tabindex={index}
							class="item {index === activeIndex ? 'active' : ''}"
							data-tab={index}
							on:click={() => changeTab(index)}>{index}</a
						>
					{/each}
				</nav>
			</div>
			<hr />
			<section class='content'>
				{#each $overlays as overlay, index ($overlays.indexOf(overlay))}
					<div
						class="tab {index === activeIndex ? 'active' : ''}"
						data-tab={index}
						data-group='primary-tabs'
					>
						<OverlayEditorTab
							bind:overlay={overlay}
							removeFn={handleRemove}
							componentindex={index}
						/>
					</div>
				{/each}
			</section>
		</div>
	</div>
	<hr />
	<footer>
		<button on:click={close}
		>{localize('obs-utils.applications.overlayEditor.closeButton')}</button
		>
	</footer>
</ApplicationShell>

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
