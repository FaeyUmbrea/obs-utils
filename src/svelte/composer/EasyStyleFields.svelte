<svelte:options runes={true} />
<script lang='ts'>
	let { value = $bindable() } = $props<{ value: string }>();

	type StrMap = Record<string, string>;

	const KNOWN_PROPS: Record<string, string> = {
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
		'vertical-align': 'verticalAlign',
		'line-height': 'lineHeight',
		'letter-spacing': 'letterSpacing',
		'border': 'border',
		'border-radius': 'borderRadius',
		'display': 'display',
		'align-items': 'alignItems',
		'justify-content': 'justifyContent',
	};

	let fields = $state({
		fontFamily: '', fontSize: '', fontWeight: '', color: '', backgroundColor: '',
		width: '', height: '', padding: '', margin: '', textAlign: '', verticalAlign: '',
		lineHeight: '', letterSpacing: '', border: '', borderRadius: '',
		display: '', alignItems: '', justifyContent: '',
	});
	let extras = $state<StrMap>({});

	let lastSerialized = '';

	$effect(() => {
		const input = value ?? '';
		if (input === lastSerialized) return;
		parseStyleString(input);
	});

	function parseStyleString(input: string) {
		const newFields: typeof fields = {
			fontFamily: '', fontSize: '', fontWeight: '', color: '', backgroundColor: '',
			width: '', height: '', padding: '', margin: '', textAlign: '', verticalAlign: '',
			lineHeight: '', letterSpacing: '', border: '', borderRadius: '',
			display: '', alignItems: '', justifyContent: '',
		};
		const newExtras: StrMap = {};

		(input || '')
			.split(';')
			.map(s => s.trim())
			.filter(Boolean)
			.forEach((decl) => {
				const idx = decl.indexOf(':');
				if (idx === -1) return;
				const name = decl.slice(0, idx).trim().toLowerCase();
				const val = decl.slice(idx + 1).trim();
				const knownKey = KNOWN_PROPS[name];
				if (knownKey) (newFields as any)[knownKey] = val;
				else if (name.length) newExtras[name] = val;
			});

		fields = newFields;
		extras = newExtras;
	}

	function serialize(): string {
		const parts: string[] = [];
		for (const [cssName, fieldKey] of Object.entries(KNOWN_PROPS)) {
			const v = (fields as any)[fieldKey];
			if (v && String(v).trim().length) parts.push(`${cssName}: ${String(v).trim()}`);
		}
		for (const [name, v] of Object.entries(extras)) {
			if (!KNOWN_PROPS[name] && v && v.trim().length) parts.push(`${name}: ${v.trim()}`);
		}
		return parts.join('; ') + (parts.length ? ';' : '');
	}

	function update<K extends keyof typeof fields>(key: K, v: string) {
		fields[key] = v;
		lastSerialized = serialize();
		value = lastSerialized;
	}

	function clearAll() {
		fields = {
			fontFamily: '', fontSize: '', fontWeight: '', color: '', backgroundColor: '',
			width: '', height: '', padding: '', margin: '', textAlign: '', verticalAlign: '',
			lineHeight: '', letterSpacing: '', border: '', borderRadius: '',
			display: '', alignItems: '', justifyContent: '',
		};
		extras = {};
		lastSerialized = '';
		value = '';
	}

	// Vertical-align preset that writes the matching flex declarations so
	// it actually works on a fixed-height block (not just inline content).
	function setVerticalAlign(v: string) {
		if (!v) {
			fields.verticalAlign = '';
			fields.display = '';
			fields.alignItems = '';
		} else {
			fields.verticalAlign = v;
			fields.display = 'flex';
			fields.alignItems = v === 'top' ? 'flex-start' : v === 'bottom' ? 'flex-end' : 'center';
			// If text-align center is set, mirror it into justify-content so flex children center horizontally too.
			if (fields.textAlign === 'center') fields.justifyContent = 'center';
			else if (fields.textAlign === 'right') fields.justifyContent = 'flex-end';
			else if (fields.textAlign === 'left') fields.justifyContent = 'flex-start';
		}
		lastSerialized = serialize();
		value = lastSerialized;
	}

</script>

<div class='easy-fields'>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.color')}</span>
		<input type='text' value={fields.color} oninput={(e) => update('color', (e.currentTarget as HTMLInputElement).value)} placeholder='#fff' />
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.backgroundColor')}</span>
		<input type='text' value={fields.backgroundColor} oninput={(e) => update('backgroundColor', (e.currentTarget as HTMLInputElement).value)} placeholder='transparent' />
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.fontFamily')}</span>
		<input type='text' value={fields.fontFamily} oninput={(e) => update('fontFamily', (e.currentTarget as HTMLInputElement).value)} placeholder='Arial, sans-serif' />
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.fontSize')}</span>
		<input type='text' value={fields.fontSize} oninput={(e) => update('fontSize', (e.currentTarget as HTMLInputElement).value)} placeholder='16px' />
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.fontWeight')}</span>
		<select value={fields.fontWeight} onchange={(e) => update('fontWeight', (e.currentTarget as HTMLSelectElement).value)}>
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
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.textAlign')}</span>
		<select value={fields.textAlign} onchange={(e) => update('textAlign', (e.currentTarget as HTMLSelectElement).value)}>
			<option value=''></option>
			<option value='left'>left</option>
			<option value='center'>center</option>
			<option value='right'>right</option>
			<option value='justify'>justify</option>
		</select>
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.verticalAlign')}</span>
		<select value={fields.verticalAlign} onchange={(e) => setVerticalAlign((e.currentTarget as HTMLSelectElement).value)}>
			<option value=''></option>
			<option value='top'>top</option>
			<option value='middle'>middle</option>
			<option value='bottom'>bottom</option>
		</select>
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.padding')}</span>
		<input type='text' value={fields.padding} oninput={(e) => update('padding', (e.currentTarget as HTMLInputElement).value)} placeholder='4px 8px' />
	</label>
	<label>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.margin')}</span>
		<input type='text' value={fields.margin} oninput={(e) => update('margin', (e.currentTarget as HTMLInputElement).value)} placeholder='0' />
	</label>
	<label class='span-2'>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.border')}</span>
		<input type='text' value={fields.border} oninput={(e) => update('border', (e.currentTarget as HTMLInputElement).value)} placeholder='1px solid #fff' />
	</label>
	<label class='span-2'>
		<span>{game.i18n?.localize('obs-utils.applications.styleEditor.borderRadius')}</span>
		<input type='text' value={fields.borderRadius} oninput={(e) => update('borderRadius', (e.currentTarget as HTMLInputElement).value)} placeholder='8px' />
	</label>

	{#if Object.keys(extras).length}
		<div class='extras span-2'>
			<strong>{game.i18n?.localize('obs-utils.applications.styleEditor.preservedExtras')}</strong>
			<ul>
				{#each Object.entries(extras) as [k, v]}
					<li><code>{k}: {v};</code></li>
				{/each}
			</ul>
		</div>
	{/if}

	<button type='button' class='clear span-2' onclick={clearAll}>
		{game.i18n?.localize('obs-utils.applications.styleEditor.clear')}
	</button>
</div>

<style lang='stylus'>
	.easy-fields
		display grid
		grid-template-columns 1fr 1fr
		gap 6px
		padding 4px 0

	label
		display flex
		flex-direction column
		gap 2px

		span
			font-size 10px
			opacity 0.7

		input, select
			height 24px
			padding 0 6px
			font-size 12px

	.span-2
		grid-column 1 / span 2

	.extras
		font-size 11px
		opacity 0.7
		background rgba(255, 255, 255, 0.04)
		border-radius 3px
		padding 6px

		ul
			margin 4px 0 0 0
			padding-left 16px

		code
			font-family monospace
			font-size 10px

	.clear
		height 26px
		font-size 11px
		opacity 0.7
		background transparent
		border 1px solid rgba(255, 255, 255, 0.15)

		&:hover
			opacity 1
</style>
