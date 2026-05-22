// Lightweight CSS splitter used by EasyStyleFields. Known declarations are
// surfaced as form fields; everything else (unknown decls, nested rules) flows
// through `preserved` so round-tripping never drops content.

export type Block
	= | { kind: 'decl'; prop: string; value: string }
		| { kind: 'rule'; raw: string };

export const KNOWN_PROPS: readonly string[] = [
	'font-family',
	'font-size',
	'font-weight',
	'text-align',
	'line-height',
	'letter-spacing',
	'color',
	'background-color',
	'width',
	'height',
	'display',
	'padding',
	'margin',
	'align-items',
	'justify-content',
	'border',
	'border-radius',
	'object-fit',
	'object-position',
] as const;

export function parseCSS(input: string): Block[] {
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

export function tryDecl(s: string, into: Block[]) {
	const colon = s.indexOf(':');
	if (colon === -1) return;
	const prop = s.slice(0, colon).trim().toLowerCase();
	const val = s.slice(colon + 1).trim();
	if (!prop) return;
	into.push({ kind: 'decl', prop, value: val });
}

export function parseAndSplit(input: string): { fields: Record<string, string>; preserved: Block[] } {
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

export function serialize(fields: Record<string, string>, preserved: Block[]): string {
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
