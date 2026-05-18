<svelte:options runes={true} />
<script lang='ts'>
	let { value = $bindable(), showImage = false } = $props<{
		value: string;
		showImage?: boolean;
	}>();

	// A CSS string is split into two kinds of top-level blocks: declarations
	// (`prop: value;`) and rule blocks (`selector { ... }`). Declarations whose
	// prop is in KNOWN_PROPS map to UI fields; everything else (unknown decls,
	// nested rules, pseudo-element blocks) is preserved verbatim through the
	// `preserved` array so switching between Simple and Advanced never drops it.
	type Block = { kind: 'decl'; prop: string; value: string } | { kind: 'rule'; raw: string };

	const KNOWN_PROPS: readonly string[] = [
		// Typography
		'font-family',
		'font-size',
		'font-weight',
		'text-align',
		'line-height',
		'letter-spacing',
		// Color
		'color',
		'background-color',
		// Layout & spacing
		'width',
		'height',
		'display',
		'padding',
		'margin',
		'align-items',
		'justify-content',
		// Border
		'border',
		'border-radius',
		// Image
		'object-fit',
		'object-position',
	] as const;

	let fields = $state<Record<string, string>>({});
	let preserved = $state<Block[]>([]);
	let lastSerialized = '';

	$effect(() => {
		const v = value ?? '';
		if (v === lastSerialized) return;
		const { fields: nextFields, preserved: nextPreserved } = parseAndSplit(v);
		fields = nextFields;
		preserved = nextPreserved;
		lastSerialized = v;
	});

	function parseCSS(input: string): Block[] {
		const out: Block[] = [];
		const src = input ?? '';
		let i = 0;
		const n = src.length;
		while (i < n) {
			while (i < n && /\s/.test(src[i])) i++;
			if (i >= n) break;
			const start = i;
			while (i < n && src[i] !== ';' && src[i] !== '{' && src[i] !== '}') i++;
			if (i >= n) {
				const tail = src.slice(start).trim();
				if (tail) tryDecl(tail, out);
				break;
			}
			if (src[i] === ';') {
				const decl = src.slice(start, i).trim();
				if (decl) tryDecl(decl, out);
				i++;
			} else if (src[i] === '}') {
				i++;
			} else if (src[i] === '{') {
				let depth = 1;
				i++;
				while (i < n && depth > 0) {
					if (src[i] === '{') depth++;
					else if (src[i] === '}') depth--;
					i++;
				}
				out.push({ kind: 'rule', raw: src.slice(start, i).trim() });
			}
		}
		return out;
	}

	function tryDecl(s: string, into: Block[]) {
		const colon = s.indexOf(':');
		if (colon === -1) return;
		const prop = s.slice(0, colon).trim().toLowerCase();
		const val = s.slice(colon + 1).trim();
		if (!prop) return;
		into.push({ kind: 'decl', prop, value: val });
	}

	function parseAndSplit(input: string): { fields: Record<string, string>; preserved: Block[] } {
		const blocks = parseCSS(input);
		const nextFields: Record<string, string> = {};
		const pres: Block[] = [];
		for (const b of blocks) {
			if (b.kind === 'decl' && KNOWN_PROPS.includes(b.prop)) {
				nextFields[b.prop] = b.value;
			} else {
				pres.push(b);
			}
		}
		return { fields: nextFields, preserved: pres };
	}

	function serialize(): string {
		const parts: string[] = [];
		for (const prop of KNOWN_PROPS) {
			const v = fields[prop];
			if (v && v.trim()) parts.push(`${prop}: ${v.trim()};`);
		}
		for (const b of preserved) {
			if (b.kind === 'decl') parts.push(`${b.prop}: ${b.value};`);
			else parts.push(b.raw);
		}
		return parts.join('\n');
	}

	function set(prop: string, v: string) {
		if (v && v.trim()) fields[prop] = v;
		else delete fields[prop];
		lastSerialized = serialize();
		value = lastSerialized;
	}

	function setVerticalAlign(v: string) {
		if (!v) {
			delete fields['align-items'];
		} else {
			fields.display = fields.display || 'flex';
			fields['align-items'] = v === 'top' ? 'flex-start' : v === 'bottom' ? 'flex-end' : 'center';
			if (fields['text-align'] === 'center') fields['justify-content'] = 'center';
			else if (fields['text-align'] === 'right') fields['justify-content'] = 'flex-end';
			else if (fields['text-align'] === 'left') fields['justify-content'] = 'flex-start';
		}
		lastSerialized = serialize();
		value = lastSerialized;
	}

	const verticalAlignFromFields = $derived.by(() => {
		const ai = fields['align-items'];
		if (ai === 'flex-start') return 'top';
		if (ai === 'flex-end') return 'bottom';
		if (ai === 'center' && fields.display === 'flex') return 'middle';
		return '';
	});

	function clearAll() {
		fields = {};
		preserved = [];
		lastSerialized = '';
		value = '';
	}

	const t = (key: string) => game.i18n?.localize(`obs-utils.applications.styleEditor.${key}`);
</script>

<div class='easy-fields'>
	<section class='group'>
		<h5>{t('groupTypography')}</h5>
		<div class='grid'>
			<label>
				<span>{t('fontFamily')}</span>
				<input type='text' value={fields['font-family'] ?? ''} oninput={e => set('font-family', (e.currentTarget as HTMLInputElement).value)} placeholder='Arial, sans-serif' />
			</label>
			<label>
				<span>{t('fontSize')}</span>
				<input type='text' value={fields['font-size'] ?? ''} oninput={e => set('font-size', (e.currentTarget as HTMLInputElement).value)} placeholder='16px' />
			</label>
			<label>
				<span>{t('fontWeight')}</span>
				<select value={fields['font-weight'] ?? ''} onchange={e => set('font-weight', (e.currentTarget as HTMLSelectElement).value)}>
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
				<span>{t('textAlign')}</span>
				<select value={fields['text-align'] ?? ''} onchange={e => set('text-align', (e.currentTarget as HTMLSelectElement).value)}>
					<option value=''></option>
					<option value='left'>left</option>
					<option value='center'>center</option>
					<option value='right'>right</option>
					<option value='justify'>justify</option>
				</select>
			</label>
			<label>
				<span>{t('verticalAlign')}</span>
				<select value={verticalAlignFromFields} onchange={e => setVerticalAlign((e.currentTarget as HTMLSelectElement).value)}>
					<option value=''></option>
					<option value='top'>top</option>
					<option value='middle'>middle</option>
					<option value='bottom'>bottom</option>
				</select>
			</label>
			<label>
				<span>{t('lineHeight')}</span>
				<input type='text' value={fields['line-height'] ?? ''} oninput={e => set('line-height', (e.currentTarget as HTMLInputElement).value)} placeholder='1.2' />
			</label>
			<label>
				<span>{t('letterSpacing')}</span>
				<input type='text' value={fields['letter-spacing'] ?? ''} oninput={e => set('letter-spacing', (e.currentTarget as HTMLInputElement).value)} placeholder='0.5px' />
			</label>
		</div>
	</section>

	<section class='group'>
		<h5>{t('groupColor')}</h5>
		<div class='grid'>
			<label>
				<span>{t('color')}</span>
				<input type='text' value={fields.color ?? ''} oninput={e => set('color', (e.currentTarget as HTMLInputElement).value)} placeholder='#fff' />
			</label>
			<label>
				<span>{t('backgroundColor')}</span>
				<input type='text' value={fields['background-color'] ?? ''} oninput={e => set('background-color', (e.currentTarget as HTMLInputElement).value)} placeholder='transparent' />
			</label>
		</div>
	</section>

	<section class='group'>
		<h5>{t('groupLayout')}</h5>
		<div class='grid'>
			<label>
				<span>{t('width')}</span>
				<input type='text' value={fields.width ?? ''} oninput={e => set('width', (e.currentTarget as HTMLInputElement).value)} placeholder='auto' />
			</label>
			<label>
				<span>{t('height')}</span>
				<input type='text' value={fields.height ?? ''} oninput={e => set('height', (e.currentTarget as HTMLInputElement).value)} placeholder='auto' />
			</label>
			<label>
				<span>{t('display')}</span>
				<select value={fields.display ?? ''} onchange={e => set('display', (e.currentTarget as HTMLSelectElement).value)}>
					<option value=''></option>
					<option value='block'>block</option>
					<option value='inline-block'>inline-block</option>
					<option value='flex'>flex</option>
					<option value='grid'>grid</option>
					<option value='none'>none</option>
				</select>
			</label>
			<label class='span-2'>
				<span>{t('padding')}</span>
				<input type='text' value={fields.padding ?? ''} oninput={e => set('padding', (e.currentTarget as HTMLInputElement).value)} placeholder='4px 8px' />
			</label>
			<label class='span-2'>
				<span>{t('margin')}</span>
				<input type='text' value={fields.margin ?? ''} oninput={e => set('margin', (e.currentTarget as HTMLInputElement).value)} placeholder='0' />
			</label>
		</div>
	</section>

	<section class='group'>
		<h5>{t('groupBorder')}</h5>
		<div class='grid'>
			<label class='span-2'>
				<span>{t('border')}</span>
				<input type='text' value={fields.border ?? ''} oninput={e => set('border', (e.currentTarget as HTMLInputElement).value)} placeholder='1px solid #fff' />
			</label>
			<label class='span-2'>
				<span>{t('borderRadius')}</span>
				<input type='text' value={fields['border-radius'] ?? ''} oninput={e => set('border-radius', (e.currentTarget as HTMLInputElement).value)} placeholder='8px' />
			</label>
		</div>
	</section>

	{#if showImage}
		<section class='group'>
			<h5>{t('groupImage')}</h5>
			<div class='grid'>
				<label>
					<span>{t('objectFit')}</span>
					<select value={fields['object-fit'] ?? ''} onchange={e => set('object-fit', (e.currentTarget as HTMLSelectElement).value)}>
						<option value=''></option>
						<option value='cover'>cover</option>
						<option value='contain'>contain</option>
						<option value='fill'>fill</option>
						<option value='none'>none</option>
						<option value='scale-down'>scale-down</option>
					</select>
				</label>
				<label>
					<span>{t('objectPosition')}</span>
					<input type='text' value={fields['object-position'] ?? ''} oninput={e => set('object-position', (e.currentTarget as HTMLInputElement).value)} placeholder='center' />
				</label>
			</div>
		</section>
	{/if}

	{#if preserved.length}
		<section class='preserved'>
			<h5>{t('preservedHeader')}</h5>
			<p class='preserved-hint'>{t('preservedHint')}</p>
			<pre><code>{preserved.map(b => b.kind === 'decl' ? `${b.prop}: ${b.value};` : b.raw).join('\n')}</code></pre>
		</section>
	{/if}

	<button type='button' class='clear' onclick={clearAll}>
		{t('clear')}
	</button>
</div>

<style lang='stylus'>
	.easy-fields
		display flex
		flex-direction column
		gap 12px
		padding 4px 0

	.group
		display flex
		flex-direction column
		gap 6px

		h5
			margin 0
			font-size 10px
			text-transform uppercase
			letter-spacing 0.6px
			opacity 0.55
			border-bottom 1px solid rgba(255, 255, 255, 0.08)
			padding-bottom 4px

	.grid
		display grid
		grid-template-columns 1fr 1fr
		gap 6px

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

	.preserved
		background rgba(255, 255, 255, 0.04)
		border-radius 3px
		padding 8px 10px
		display flex
		flex-direction column
		gap 4px

		h5
			margin 0
			font-size 10px
			text-transform uppercase
			letter-spacing 0.6px
			opacity 0.65

		.preserved-hint
			margin 0
			font-size 10px
			opacity 0.55
			font-style italic

		pre
			margin 0
			font-family ui-monospace, SFMono-Regular, Menlo, monospace
			font-size 10px
			line-height 1.3
			color rgba(255, 255, 255, 0.75)
			max-height 100px
			overflow-y auto
			white-space pre-wrap
			word-break break-word

	.clear
		height 26px
		font-size 11px
		opacity 0.7
		background transparent
		border 1px solid rgba(255, 255, 255, 0.15)
		align-self flex-end
		padding 0 12px

		&:hover
			opacity 1
</style>
