<svelte:options accessors={true} />

<script>
	import { ApplicationShell } from '#runtime/svelte/component/application';
	import { localize } from '#runtime/util/i18n';
	import { getContext } from 'svelte';
	import VirtualList from 'svelte-tiny-virtual-list';
	import { settings } from '../utils/settings.ts';

	const selectedActors = settings.getStore('overlayActors');

	const actors = game.actors;
	export let elementRoot = void 0;

	let searchTerm = '';

	$: filteredActors = actors.filter(
		item => item.name?.indexOf(searchTerm) !== -1,
	);
	const context = getContext('#external');

	async function submit() {
		await context.application.close();
	}

	function change(id) {
		let actors = $selectedActors;
		if (actors.includes(id)) {
			actors = actors.filter(e => e !== id);
		} else {
			actors.push(id);
		}
		$selectedActors = actors;
	}

	function getIndex(id) {
		return $selectedActors.indexOf(id) + 1;
	}
</script>

<ApplicationShell bind:elementRoot={elementRoot}>
	<main>
		<input
			bind:value={searchTerm}
			name='search'
			type='text'
			placeholder={localize(
				'obs-utils.applications.actorSelect.searchPlaceholder',
			)}
		/>
		<VirtualList itemCount={filteredActors.length} itemSize={50} height={350}>
			<div slot='item' let:index let:style {style}>
				<input
					checked={filteredActors[index].id ? $selectedActors.includes(filteredActors[index].id) : false}
					id={filteredActors[index].id}
					name={filteredActors[index].id}
					on:change={() => change(filteredActors[index].id)}
					type='checkbox'
					value={filteredActors[index].id}
				/>
				<label for={filteredActors[index].id}
				><img alt={filteredActors[index].name} src={filteredActors[index].img} />
					<span>{filteredActors[index].name}</span>
					{#key $selectedActors}
						{#if getIndex(filteredActors[index].id) > 0}
							<div class='selectionCountWrapper'>
								<span class='selectionCount'>{getIndex(filteredActors[index].id)}</span></div>
						{/if}
					{/key}
				</label>
			</div>
		</VirtualList>
		<footer>
			<button on:click={submit}
			>{localize('obs-utils.applications.actorSelect.closeButton')}</button
			>
		</footer>
	</main>
</ApplicationShell>

<style lang='stylus'>
  main {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 35px auto 40px;
    height 100%

    input[type='checkbox'] {
      opacity: 0;
      position: fixed;
      width: 0;
    }

    label {
      width: 100%;
      height: 50px;
      display: inline-flex;
      border: 2px solid #444;
      align-items: center;
      border-radius: 4px;
      position: relative;
    }

    img {
      height: inherit;
    }

    label:hover {
      background-color: rgba(0 0 0 10%);
    }

    input[type='checkbox']:checked + label {
      background-color: rgba(0 0 0 20%);
      border-color: rgba(0 0 0 37.8%);
    }

    footer {
      position: absolute;
      width: 100%;
      bottom: 0;
      left: 0;
      padding: 10px;

      button {
        width: 100%;
        height: 35px;
      }
    }

    .selectionCountWrapper {
      position: absolute;
      top: -2px;
      left: -1px;
    }

    .selectionCount {
      background-color: #ff8c00dd;
      border-radius: 0.8em;
      -moz-border-radius: 0.8em;
      -webkit-border-radius: 0.8em;
      color: #ffffff;
      display: inline-block;
      font-weight: bold;
      line-height: 1.6em;
      margin-right: 5px;
      text-align: center;
      width: 1.6em;
      font-size: 16px;
    }
  }
</style>
