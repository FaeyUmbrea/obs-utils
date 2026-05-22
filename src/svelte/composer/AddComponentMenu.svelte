<svelte:options runes={true} />
<script lang='ts'>
	const { types, onPick } = $props<{
		types: Array<{ key: string; label: string }>;
		onPick: (key: string) => void;
	}>();

	let menuOpen = $state(false);
	let btnEl: HTMLButtonElement | null = $state(null);
	let menuStyle = $state('');

	// Portal: relocates the node to document.body so position:fixed isn't
	// affected by transformed ancestors (Foundry ApplicationV2 uses transforms).
	function portalToBody(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			},
		};
	}

	function openMenu() {
		if (!btnEl) {
			menuOpen = true;
			return;
		}
		const rect = btnEl.getBoundingClientRect();
		menuStyle = `position: fixed; top: ${Math.round(rect.bottom + 4)}px; left: ${Math.round(rect.left)}px; width: ${Math.round(rect.width)}px;`;
		menuOpen = true;
	}
	function closeMenu() {
		menuOpen = false;
	}
	function onWindowClick(e: MouseEvent) {
		if (!menuOpen) return;
		const t = e.target as HTMLElement | null;
		if (!t) return;
		if (btnEl && btnEl.contains(t)) return;
		if (t.closest('[data-add-component-menu]')) return;
		closeMenu();
	}
	function onBtnClick(e: MouseEvent) {
		e.stopPropagation();
		if (menuOpen) closeMenu();
		else openMenu();
	}

	function pick(key: string) {
		closeMenu();
		onPick(key);
	}
</script>

<button
	type='button'
	class='add-toggle'
	bind:this={btnEl}
	onclick={onBtnClick}
	aria-expanded={menuOpen}
>
	<i class='fas fa-plus'></i>
	<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.addComponent')}</span>
	<i class='fas fa-caret-down'></i>
</button>

<svelte:window onclick={onWindowClick} />

{#if menuOpen}
	<div use:portalToBody class='add-menu' role='menu' data-add-component-menu style={menuStyle}>
		{#each types as opt (opt.key)}
			<button type='button' role='menuitem' onclick={() => pick(opt.key)}>
				<span class='menu-key'>{opt.key}</span>
				<span class='menu-name'>{opt.label}</span>
			</button>
		{/each}
	</div>
{/if}

<style lang='stylus'>
	.add-toggle
		width 100%
		height 30px
		display flex
		align-items center
		justify-content center
		gap 8px
		background rgba(255, 144, 0, 0.12)
		border 1px solid rgba(255, 144, 0, 0.4)
		border-radius 4px
		font-size 12px
		cursor pointer

		&:hover
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.7)

		i.fa-caret-down
			margin-left auto

	:global(.add-menu[data-add-component-menu])
		background #2a2a2a
		border 1px solid rgba(255, 255, 255, 0.2)
		border-radius 4px
		z-index 10000
		display flex
		flex-direction column
		padding 4px
		gap 2px
		max-height 320px
		overflow-y auto
		box-shadow 0 6px 24px rgba(0, 0, 0, 0.5)

		button
			display flex
			align-items center
			gap 8px
			text-align left
			background transparent
			border none
			padding 6px 10px
			font-size 12px
			cursor pointer
			color inherit

			&:hover
				background rgba(255, 255, 255, 0.08)

			.menu-key
				font-family monospace
				font-size 10px
				opacity 0.5
				min-width 36px

			.menu-name
				flex 1 1 auto
</style>
