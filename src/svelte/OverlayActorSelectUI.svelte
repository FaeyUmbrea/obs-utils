<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import type { SvelteApplication } from '../applications/mixin.svelte.ts';
	import VirtualList from 'svelte-tiny-virtual-list';
	import { setSetting, settings } from '../utils/settings.ts';

	// props via rune
	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();

	// runes
	const selectedActors = settings.getStore('overlayActors');
	const actorCSS = settings.getStore('actorOverlayCSS');
	let searchTerm = $state('');
	let cssActorID = $state<string | null>(null);
	let cssDraft = $state('');

	const actors = $derived((game as ReadyGame).actors);
	const filteredActors = $derived(
		actors.filter((item: any) => item.name?.indexOf(searchTerm) !== -1),
	);
	const userTokenActors = $derived(
		(game as ReadyGame).users?.filter((u: User) => !u.isGM && !!(u as any).character).map((u: User) => (u as any).character as Actor).filter(Boolean) ?? [],
	);

	async function submit() {
		await foundryApp.close();
	}

	async function change(id: string) {
		let list = $state.snapshot($selectedActors);
		if (list.includes(id)) {
			list = list.filter((e: string) => e !== id);
		} else {
			list = [...list, id];
		}
		selectedActors.set(list);
		await setSetting('overlayActorsModified', true);
	}

	function getIndex(id: string) {
		return $state.snapshot($selectedActors).indexOf(id) + 1;
	}

	function openCSS(id: string) {
		cssActorID = id;
		cssDraft = ($actorCSS as Record<string, string>)?.[id] ?? '';
	}

	function saveCSS() {
		if (!cssActorID) return;
		const map = { ...($actorCSS as Record<string, string> ?? {}) };
		if (cssDraft.trim()) map[cssActorID] = cssDraft;
		else delete map[cssActorID];
		$actorCSS = map;
		cssActorID = null;
	}

	function cancelCSS() {
		cssActorID = null;
	}

	const cssActorName = $derived(
		cssActorID ? ((game as ReadyGame).actors?.get(cssActorID)?.name ?? cssActorID) : '',
	);
</script>

<main>
	<input
		bind:value={searchTerm}
		name='search'
		type='text'
		placeholder={game.i18n?.localize(
			'obs-utils.applications.actorSelect.searchPlaceholder',
		)}
	/>
	{#if userTokenActors.length > 0}
		<div class='user-tokens'>
			<span class='user-tokens-header'>{game.i18n?.localize('obs-utils.applications.actorSelect.userTokensHeader')}</span>
			<div class='user-tokens-list'>
				{#each userTokenActors as actor (actor.id)}
					<button
						type='button'
						role='checkbox'
						aria-checked={$selectedActors.includes(actor.id)}
						class="user-token-chip {$selectedActors.includes(actor.id) ? 'selected' : ''}"
						onclick={() => change(actor.id)}
						tabindex='0'
					>
						<img src={actor.img} alt={actor.name} />
						<span>{actor.name}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
	<VirtualList itemCount={filteredActors.length} itemSize={50} height={350}>
		<div slot='item' let:index let:style {style}>
			<input
				checked={filteredActors[index].id ? $selectedActors.includes(filteredActors[index].id) : false}
				id={filteredActors[index].id}
				name={filteredActors[index].id}
				onchange={() => change(filteredActors[index].id)}
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
			<button
				type='button'
				class='actor-css-btn'
				title={game.i18n?.localize('obs-utils.applications.actorSelect.editCSS') ?? 'Edit per-actor CSS'}
				aria-label={game.i18n?.localize('obs-utils.applications.actorSelect.editCSS') ?? 'Edit per-actor CSS'}
				class:has-css={!!(($actorCSS as Record<string, string>) ?? {})[filteredActors[index].id]}
				onclick={() => openCSS(filteredActors[index].id)}
			>
				<i class='fab fa-css3-alt'></i>
			</button>
		</div>
	</VirtualList>

	{#if cssActorID}
		<div class='css-modal' role='dialog' aria-modal='true'>
			<header>
				<span><i class='fab fa-css3-alt'></i> CSS for <strong>{cssActorName}</strong></span>
				<button type='button' class='close-btn' onclick={cancelCSS} aria-label='Close'>
					<i class='fas fa-times'></i>
				</button>
			</header>
			<textarea
				bind:value={cssDraft}
				spellcheck='false'
				placeholder={'/* Rules are auto-scoped to this actor\'s container */\n.single-line-overlay {\n  font-size: 24px;\n}'}
			></textarea>
			<footer>
				<button type='button' class='secondary' onclick={() => (cssDraft = '')}>Clear</button>
				<button type='button' onclick={cancelCSS}>Cancel</button>
				<button type='button' class='primary' onclick={saveCSS}>Save</button>
			</footer>
		</div>
	{/if}
	<footer>
		<button onclick={submit}
		>{game.i18n?.localize('obs-utils.applications.actorSelect.closeButton')}</button
		>
	</footer>
</main>

<style lang='stylus'>
  main {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 35px auto 1fr 40px;
    height 100%
    position relative

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
      padding-right: 38px;
    }

    .actor-css-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 30px;
      height: 30px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid rgba(128, 128, 128, 0.3);
      border-radius: 4px;
      opacity: 0.55;
      cursor: pointer;
    }
    .actor-css-btn:hover {
      opacity: 1;
      background: rgba(255, 144, 0, 0.1);
      border-color: rgba(255, 144, 0, 0.5);
    }
    .actor-css-btn.has-css {
      opacity: 0.95;
      border-color: rgba(255, 144, 0, 0.5);
      color: #ff9000;
    }

    .css-modal {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 8px;
      z-index: 20;
    }
    .css-modal header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .css-modal header .close-btn {
      margin-left: auto;
      width: 28px;
      height: 28px;
      padding: 0;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
    }
    .css-modal textarea {
      flex: 1 1 auto;
      width: 100%;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #d4e1f5;
      resize: none;
      white-space: pre;
    }
    .css-modal footer {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    .css-modal footer button {
      height: 30px;
      padding: 0 14px;
    }
    .css-modal footer .primary {
      background: rgba(255, 144, 0, 0.25);
      border-color: rgba(255, 144, 0, 0.6);
    }
    .css-modal footer .secondary {
      margin-right: auto;
      background: transparent;
      opacity: 0.7;
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

.user-tokens
  padding 4px 0 6px 0

  .user-tokens-header
    font-size 12px
    font-weight bold
    display block
    margin-bottom 4px

  .user-tokens-list
    display flex
    flex-wrap wrap
    gap 4px

.user-token-chip
  display inline-flex
  align-items center
  gap 4px
  height 32px
  padding 0 8px 0 2px
  border 2px solid #444
  border-radius 4px
  background transparent
  cursor pointer

  img
    height 28px
    width 28px
    object-fit cover

  &.selected
    background-color rgba(0 0 0 20%)
    border-color rgba(0 0 0 37.8%)

  &:focus-visible
    outline 2px solid #888
</style>
