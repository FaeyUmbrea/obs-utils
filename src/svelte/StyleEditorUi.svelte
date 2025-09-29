<svelte:options runes={true} />

<script lang='ts'>
	// Style Editor with dual-mode (Simple/Advanced) that edits a single CSS string
	const { foundryApp } = $props();

	// The raw style string that gets saved back
	let style = $state(foundryApp.style ?? '');

	type StrMap = Record<string, string>;

	// Known properties we expose in Simple mode (css-name -> key in fields)
	const KNOWN_PROPS: Record<string, keyof typeof fields> = {
		'font-family': 'fontFamily',
		'font-size': 'fontSize',
		'font-weight': 'fontWeight',
		'color': 'color',
		'background-color': 'backgroundColor',
		'width': 'width',
		'height': 'height',
		'padding': 'padding',
		'margin': 'margin',
		'text-align': 'textAlign',
		'line-height': 'lineHeight',
		'letter-spacing': 'letterSpacing',
		'border': 'border',
		'border-radius': 'borderRadius',
	};

	// Simple mode fields
	let fields = $state({
		fontFamily: '',
		fontSize: '',
		fontWeight: '',
		color: '',
		backgroundColor: '',
		width: '',
		height: '',
		padding: '',
		margin: '',
		textAlign: '',
		lineHeight: '',
		letterSpacing: '',
		border: '',
		borderRadius: '',
	});

	// Extra/unknown declarations preserved across modes
	let extras = $state<StrMap>({});

	// UI mode
	let mode = $state<'simple' | 'advanced'>('simple');

	function normalizePropName(name: string) {
		return name.trim().toLowerCase();
	}

	function parseStyleString(input: string) {
		// Build fresh objects to avoid reading from current reactive state (prevents dependency cycles)
		const newFields: typeof fields = {
			fontFamily: '',
			fontSize: '',
			fontWeight: '',
			color: '',
			backgroundColor: '',
			width: '',
			height: '',
			padding: '',
			margin: '',
			textAlign: '',
			lineHeight: '',
			letterSpacing: '',
			border: '',
			borderRadius: '',
		};
		const newExtras: StrMap = {};

		(input || '')
			.split(';')
			.map(s => s.trim())
			.filter(Boolean)
			.forEach((decl) => {
				const idx = decl.indexOf(':');
				if (idx === -1) return;
				const rawName = decl.slice(0, idx);
				const rawValue = decl.slice(idx + 1);
				const name = normalizePropName(rawName);
				const value = rawValue.trim();
				const knownKey = KNOWN_PROPS[name];
				if (knownKey) {
					(newFields as any)[knownKey] = value;
				} else if (name.length) {
					newExtras[name] = value;
				}
			});

		fields = newFields;
		extras = newExtras;
	}

	function serializeStyleString(): string {
		const parts: string[] = [];
		// known fields first
		for (const [cssName, fieldKey] of Object.entries(KNOWN_PROPS)) {
			const val = (fields as any)[fieldKey];
			if (val && String(val).trim().length) parts.push(`${cssName}: ${String(val).trim()}`);
		}
		// then extras not shadowed by knowns
		for (const [name, val] of Object.entries(extras)) {
			if (!KNOWN_PROPS[name] && val && val.trim().length) parts.push(`${name}: ${val.trim()}`);
		}
		return parts.join('; ') + (parts.length ? ';' : '');
	}

	// Keep Simple fields in sync when Advanced text changes
	$effect(() => {
		parseStyleString(style);
	});

	// When Simple changes, update the raw style string
	function onFieldsChanged() {
		style = serializeStyleString();
	}

	function setField<K extends keyof typeof fields>(key: K, value: string) {
		fields[key] = value;
		onFieldsChanged();
	}

	function clearAll() {
		fields = {
			fontFamily: '',
			fontSize: '',
			fontWeight: '',
			color: '',
			backgroundColor: '',
			width: '',
			height: '',
			padding: '',
			margin: '',
			textAlign: '',
			lineHeight: '',
			letterSpacing: '',
			border: '',
			borderRadius: '',
		};
		extras = {};
		onFieldsChanged();
	}

	function close() {
		foundryApp.style = style ?? '';
		foundryApp.close();
	}

	function t(key: string, fallback: string) {
		return game.i18n?.localize(key) || fallback;
	}
</script>

<div class='style-editor'>
	<nav class='mode-tabs'>
		<button class={mode === 'simple' ? 'active' : ''} onclick={() => (mode = 'simple')} type='button'>{t('obs-utils.applications.styleEditor.mode.simple', 'Simple')}</button>
		<button class={mode === 'advanced' ? 'active' : ''} onclick={() => (mode = 'advanced')} type='button'>{t('obs-utils.applications.styleEditor.mode.advanced', 'Advanced')}</button>
	</nav>

	{#if mode === 'simple'}
		<section class='simple-grid'>
			<label>
				<span>{t('obs-utils.applications.styleEditor.fontFamily', 'Font family')}</span>
				<input bind:value={() => fields.fontFamily, v => setField('fontFamily', v)} placeholder="e.g. 'Inter', Arial, sans-serif" />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.fontSize', 'Font size')}</span>
				<input bind:value={() => fields.fontSize, v => setField('fontSize', v)} placeholder='e.g. 16px' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.fontWeight', 'Font weight')}</span>
				<select bind:value={() => fields.fontWeight, v => setField('fontWeight', v)}>
					<option value=''></option>
					<option value='300'>Light</option>
					<option value='400'>Normal</option>
					<option value='500'>Medium</option>
					<option value='600'>Semi-bold</option>
					<option value='700'>Bold</option>
					<option value='800'>Extra-bold</option>
				</select>
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.color', 'Text color')}</span>
				<input bind:value={() => fields.color, v => setField('color', v)} placeholder='#ffffff or red' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.backgroundColor', 'Background color')}</span>
				<input bind:value={() => fields.backgroundColor, v => setField('backgroundColor', v)} placeholder='#000000 or transparent' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.width', 'Width')}</span>
				<input bind:value={() => fields.width, v => setField('width', v)} placeholder='e.g. 100%, 320px' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.height', 'Height')}</span>
				<input bind:value={() => fields.height, v => setField('height', v)} placeholder='e.g. auto, 200px' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.padding', 'Padding')}</span>
				<input bind:value={() => fields.padding, v => setField('padding', v)} placeholder='e.g. 4px 8px' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.margin', 'Margin')}</span>
				<input bind:value={() => fields.margin, v => setField('margin', v)} placeholder='e.g. 0 auto' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.textAlign', 'Text align')}</span>
				<select bind:value={() => fields.textAlign, v => setField('textAlign', v)}>
					<option value=''></option>
					<option value='left'>left</option>
					<option value='center'>center</option>
					<option value='right'>right</option>
					<option value='justify'>justify</option>
				</select>
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.lineHeight', 'Line height')}</span>
				<input bind:value={() => fields.lineHeight, v => setField('lineHeight', v)} placeholder='e.g. 1.5 or 24px' />
			</label>
			<label>
				<span>{t('obs-utils.applications.styleEditor.letterSpacing', 'Letter spacing')}</span>
				<input bind:value={() => fields.letterSpacing, v => setField('letterSpacing', v)} placeholder='e.g. 0.5px' />
			</label>
			<label class='span-2'>
				<span>{t('obs-utils.applications.styleEditor.border', 'Border')}</span>
				<input bind:value={() => fields.border, v => setField('border', v)} placeholder='e.g. 1px solid #ffffff' />
			</label>
			<label class='span-2'>
				<span>{t('obs-utils.applications.styleEditor.borderRadius', 'Border radius')}</span>
				<input bind:value={() => fields.borderRadius, v => setField('borderRadius', v)} placeholder='e.g. 8px' />
			</label>

			{#if Object.keys(extras).length}
				<div class='extras span-2'>
					<strong>{t('obs-utils.applications.styleEditor.preservedExtras', 'Additional preserved rules')}</strong>
					<ul>
						{#each Object.entries(extras) as [k, v]}
							<li><code>{k}: {v};</code></li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	{:else}
		<section class='advanced'>
			<textarea bind:value={style} spellcheck='false' placeholder='e.g. color: #fff; font-size: 18px;'></textarea>
		</section>
	{/if}

	<footer>
		<div class='left'>
			<button class='secondary' type='button' onclick={clearAll}>{t('obs-utils.applications.styleEditor.clear', 'Clear')}</button>
		</div>
		<div class='right'>
			<button class='primary' onclick={close} type='button'>{t('obs-utils.applications.styleEditor.submitButton', 'Apply & Close')}</button>
		</div>
	</footer>
</div>

<style>
	.style-editor {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100%;
	}
	.mode-tabs {
		display: flex;
		gap: 6px;
		padding: 8px 8px 0 8px;
	}
	.mode-tabs button {
		flex: 1;
		height: 32px;
	}
	.mode-tabs .active {
		background: var(--color-border-highlight, var(--color-text-light-highlight));
	}
	.simple-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding: 8px;
		overflow: auto;
	}
	.simple-grid label {
		display: grid;
		grid-template-rows: auto auto;
		gap: 4px;
	}
	.simple-grid .span-2 {
		grid-column: 1 / span 2;
	}
	.simple-grid input, .simple-grid select {
		height: 30px;
		padding: 2px 6px;
	}
	.advanced {
		height: 100%;
		padding: 8px;
	}
	.advanced textarea {
		height: 100%;
		width: 100%;
		resize: none;
	}
	footer {
		width: 100%;
		padding: 0 8px 0 8px;
		display: flex;
		justify-content: space-between;
		box-sizing: border-box;
	}
	footer .primary {
		width: 180px;
		height: 36px;
	}
	footer .secondary {
		height: 36px;
	}
</style>
