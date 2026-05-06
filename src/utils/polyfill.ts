// Apply polyfills immediately when this module is imported.
// This module is dynamically imported from src/index.ts only when the host
// browser is missing one or more of the features below — see the gating block
// at the top of index.ts. Each polyfill function still feature-detects on its
// own so the module is safe to import unconditionally if needed.
applyPolyfills();

/**
 * Apply polyfills for older Chromium versions (e.g., Chromium 127 in OBS).
 * Error-resilient: failures in individual polyfills do not break the module.
 */
function applyPolyfills() {
	try {
		// Polyfill for RegExp.escape (available in Chrome 128+)
		polyfillRegExpEscape();

		// Polyfill for Error.isError (available in Chrome 128+)
		polyfillErrorIsError();

		// Polyfill for Intl.DurationFormat (available in Chrome 129+)
		polyfillIntlDurationFormat();
	} catch (error) {
		console.error('[obs-utils] Polyfill application failed:', error);
	}
}

/**
 * Polyfill for RegExp.escape (ES2025)
 * Escapes all special regex characters in a string
 * https://tc39.es/proposal-regexp-escape/
 */
function polyfillRegExpEscape() {
	try {
		if (typeof (RegExp as any).escape === 'function') return;

		(RegExp as any).escape = function (str: string): string {
			try {
				const s = String(str);
				return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			} catch (error) {
				console.error('[obs-utils] RegExp.escape failed:', error);
				return str;
			}
		};
	} catch (error) {
		console.warn('[obs-utils] RegExp.escape polyfill failed:', error);
	}
}

/**
 * Polyfill for Error.isError (ES2025)
 * https://tc39.es/proposal-error-iserror/
 */
function polyfillErrorIsError() {
	try {
		if (typeof (Error as any).isError === 'function') return;

		(Error as any).isError = function (value: any): boolean {
			try {
				return value instanceof Error
					|| (value !== null
						&& typeof value === 'object'
						&& Object.prototype.toString.call(value) === '[object Error]');
			} catch (error) {
				console.error('[obs-utils] Error.isError failed:', error);
				return false;
			}
		};
	} catch (error) {
		console.warn('[obs-utils] Error.isError polyfill failed:', error);
	}
}

/**
 * Polyfill for Intl.DurationFormat
 * https://tc39.es/proposal-intl-duration-format/
 *
 * Implements the Stage 4 spec on top of Intl.NumberFormat (style: "unit") and
 * Intl.ListFormat, which are both available in Chromium 127. Covers:
 *  - long / short / narrow / digital styles
 *  - per-unit style and display overrides
 *  - digital style HH:MM:SS rendering with fractional seconds (fractionalDigits)
 *  - resolvedOptions() and the static supportedLocalesOf()
 */
function polyfillIntlDurationFormat() {
	try {
		if (typeof (Intl as any).DurationFormat === 'function') return;

		type DurationStyle = 'long' | 'short' | 'narrow' | 'digital';
		type UnitStyle = 'long' | 'short' | 'narrow' | 'numeric' | '2-digit';
		type UnitDisplay = 'auto' | 'always';

		interface DurationFormatOptions {
			localeMatcher?: 'best fit' | 'lookup';
			numberingSystem?: string;
			style?: DurationStyle;
			years?: 'long' | 'short' | 'narrow';
			yearsDisplay?: UnitDisplay;
			months?: 'long' | 'short' | 'narrow';
			monthsDisplay?: UnitDisplay;
			weeks?: 'long' | 'short' | 'narrow';
			weeksDisplay?: UnitDisplay;
			days?: 'long' | 'short' | 'narrow';
			daysDisplay?: UnitDisplay;
			hours?: UnitStyle;
			hoursDisplay?: UnitDisplay;
			minutes?: UnitStyle;
			minutesDisplay?: UnitDisplay;
			seconds?: UnitStyle;
			secondsDisplay?: UnitDisplay;
			milliseconds?: 'long' | 'short' | 'narrow' | 'numeric';
			millisecondsDisplay?: UnitDisplay;
			microseconds?: 'long' | 'short' | 'narrow' | 'numeric';
			microsecondsDisplay?: UnitDisplay;
			nanoseconds?: 'long' | 'short' | 'narrow' | 'numeric';
			nanosecondsDisplay?: UnitDisplay;
			fractionalDigits?: number;
		}

		interface DurationInput {
			years?: number;
			months?: number;
			weeks?: number;
			days?: number;
			hours?: number;
			minutes?: number;
			seconds?: number;
			milliseconds?: number;
			microseconds?: number;
			nanoseconds?: number;
		}

		interface DurationPart {
			type: string;
			value: string;
			unit?: string;
		}

		const UNITS = [
			'years',
			'months',
			'weeks',
			'days',
			'hours',
			'minutes',
			'seconds',
			'milliseconds',
			'microseconds',
			'nanoseconds',
		] as const;
		type Unit = typeof UNITS[number];

		const SINGULAR: Record<Unit, string> = {
			years: 'year',
			months: 'month',
			weeks: 'week',
			days: 'day',
			hours: 'hour',
			minutes: 'minute',
			seconds: 'second',
			milliseconds: 'millisecond',
			microseconds: 'microsecond',
			nanoseconds: 'nanosecond',
		};

		const SUB_SECOND = new Set<Unit>(['milliseconds', 'microseconds', 'nanoseconds']);

		function defaultStyleFor(unit: Unit, style: DurationStyle): UnitStyle {
			if (style === 'digital') {
				if (unit === 'hours' || unit === 'minutes' || unit === 'seconds') return 'numeric';
				if (SUB_SECOND.has(unit)) return 'numeric';
				return 'short';
			}
			return style;
		}

		function defaultDisplayFor(unit: Unit, style: DurationStyle): UnitDisplay {
			if (style === 'digital' && (unit === 'hours' || unit === 'minutes' || unit === 'seconds')) {
				return 'always';
			}
			return 'auto';
		}

		function toIntegerOrInfinity(v: unknown): number {
			const n = Number(v);
			if (Number.isNaN(n) || n === 0) return 0;
			if (!Number.isFinite(n)) return n;
			return Math.trunc(n);
		}

		function isValidUnitStyle(unit: Unit, value: unknown): value is UnitStyle {
			if (typeof value !== 'string') return false;
			if (value === 'long' || value === 'short' || value === 'narrow') return true;
			if ((value === 'numeric' || value === '2-digit') && (unit === 'hours' || unit === 'minutes' || unit === 'seconds')) return true;
			if (value === 'numeric' && SUB_SECOND.has(unit)) return true;
			return false;
		}

		class DurationFormat {
			private _locale: string;
			private _numberingSystem?: string;
			private _style: DurationStyle;
			private _fractionalDigits?: number;
			private _unit: Record<Unit, { style: UnitStyle; display: UnitDisplay }>;

			constructor(locales?: string | string[], options?: DurationFormatOptions) {
				const opts: DurationFormatOptions = options ?? {};

				const probe = new Intl.NumberFormat(locales as any, {
					localeMatcher: opts.localeMatcher,
					numberingSystem: opts.numberingSystem as any,
				});
				const resolved = probe.resolvedOptions();
				this._locale = resolved.locale;
				this._numberingSystem = opts.numberingSystem ?? resolved.numberingSystem;

				const style = opts.style ?? 'short';
				if (style !== 'long' && style !== 'short' && style !== 'narrow' && style !== 'digital') {
					throw new RangeError(`Invalid style: ${String(style)}`);
				}
				this._style = style;

				if (opts.fractionalDigits !== undefined) {
					const fd = Number(opts.fractionalDigits);
					if (!Number.isInteger(fd) || fd < 0 || fd > 9) {
						throw new RangeError(`fractionalDigits must be an integer between 0 and 9`);
					}
					this._fractionalDigits = fd;
				}

				const map = {} as Record<Unit, { style: UnitStyle; display: UnitDisplay }>;
				for (const unit of UNITS) {
					const styleKey = unit as keyof DurationFormatOptions;
					const displayKey = `${unit}Display` as keyof DurationFormatOptions;
					const rawStyle = opts[styleKey];
					const rawDisplay = opts[displayKey];

					let unitStyle: UnitStyle;
					if (rawStyle === undefined) {
						unitStyle = defaultStyleFor(unit, this._style);
					} else if (isValidUnitStyle(unit, rawStyle)) {
						unitStyle = rawStyle as UnitStyle;
					} else {
						throw new RangeError(`Invalid ${unit} style: ${String(rawStyle)}`);
					}

					let unitDisplay: UnitDisplay;
					if (rawDisplay === undefined) {
						unitDisplay = defaultDisplayFor(unit, this._style);
					} else if (rawDisplay === 'auto' || rawDisplay === 'always') {
						unitDisplay = rawDisplay;
					} else {
						throw new RangeError(`Invalid ${String(displayKey)}: ${String(rawDisplay)}`);
					}

					map[unit] = { style: unitStyle, display: unitDisplay };
				}
				this._unit = map;
			}

			format(duration: DurationInput): string {
				return this.formatToParts(duration).map(p => p.value).join('');
			}

			formatToParts(duration: DurationInput): DurationPart[] {
				if (duration === null || typeof duration !== 'object') {
					throw new TypeError('Duration must be an object');
				}

				const values = {} as Record<Unit, number>;
				for (const unit of UNITS) {
					const raw = (duration as any)[unit];
					values[unit] = raw === undefined ? 0 : toIntegerOrInfinity(raw);
				}

				// Group adjacent numeric/2-digit hours-minutes-seconds (and trailing
				// numeric sub-second units) into a single colon-separated segment, per
				// the digital substyle rules in the spec.
				const segments: DurationPart[][] = [];
				let i = 0;
				while (i < UNITS.length) {
					const unit = UNITS[i];
					const opts = this._unit[unit];
					const value = values[unit];
					const present = (duration as any)[unit] !== undefined;

					const isNumeric = opts.style === 'numeric' || opts.style === '2-digit';
					const isTimeUnit = unit === 'hours' || unit === 'minutes' || unit === 'seconds';

					if (isNumeric && isTimeUnit) {
						const seg = this._formatNumericTimeRun(values, i);
						if (seg.parts.length > 0) segments.push(seg.parts);
						i = seg.nextIndex;
						continue;
					}

					if (!present && opts.display !== 'always' && value === 0) {
						i++;
						continue;
					}
					if (value === 0 && opts.display === 'auto' && !present) {
						i++;
						continue;
					}

					segments.push(this._formatUnitParts(unit, value, opts.style as 'long' | 'short' | 'narrow' | 'numeric'));
					i++;
				}

				if (segments.length === 0) return [];
				if (segments.length === 1) return segments[0];

				return this._joinWithListFormat(segments);
			}

			resolvedOptions(): Record<string, unknown> {
				const out: Record<string, unknown> = {
					locale: this._locale,
					numberingSystem: this._numberingSystem,
					style: this._style,
				};
				for (const unit of UNITS) {
					out[unit] = this._unit[unit].style;
					out[`${unit}Display`] = this._unit[unit].display;
				}
				if (this._fractionalDigits !== undefined) out.fractionalDigits = this._fractionalDigits;
				return out;
			}

			static supportedLocalesOf(locales?: string | string[], options?: { localeMatcher?: 'best fit' | 'lookup' }): string[] {
				return (Intl.NumberFormat as any).supportedLocalesOf(locales, options);
			}

			private _formatUnitParts(unit: Unit, value: number, style: 'long' | 'short' | 'narrow' | 'numeric'): DurationPart[] {
				const nf = new Intl.NumberFormat(this._locale, {
					style: 'unit',
					unit: SINGULAR[unit],
					unitDisplay: (style === 'numeric' ? 'short' : style),
					...(this._numberingSystem ? { numberingSystem: this._numberingSystem as any } : {}),
				});
				return nf.formatToParts(value).map(p => ({ type: p.type, value: p.value, unit }));
			}

			/**
			 * Format a run starting at index `start` that begins with a numeric/2-digit
			 * time unit (hours/minutes/seconds). Returns the colon-joined parts and the
			 * index after the run.
			 */
			private _formatNumericTimeRun(values: Record<Unit, number>, start: number): { parts: DurationPart[]; nextIndex: number } {
				const ordered: Unit[] = ['hours', 'minutes', 'seconds'];
				const startUnit = UNITS[start] as Unit;
				const startTimeIdx = ordered.indexOf(startUnit);

				const usedTimeUnits: Unit[] = [];
				let consumedThrough = start;
				for (let k = startTimeIdx; k < ordered.length; k++) {
					const u = ordered[k];
					const idx = UNITS.indexOf(u);
					const opts = this._unit[u];
					const isNumeric = opts.style === 'numeric' || opts.style === '2-digit';
					if (!isNumeric) break;
					usedTimeUnits.push(u);
					consumedThrough = idx;
				}

				// Sub-second numeric units only fold in if seconds was part of the run.
				const includeSubSeconds = usedTimeUnits.includes('seconds');
				let fractionDigits = 0;
				let fractionValue = 0;
				if (includeSubSeconds) {
					const subUnits: Array<{ unit: Unit; perSecond: number; digits: number }> = [
						{ unit: 'milliseconds', perSecond: 1e3, digits: 3 },
						{ unit: 'microseconds', perSecond: 1e6, digits: 6 },
						{ unit: 'nanoseconds', perSecond: 1e9, digits: 9 },
					];
					for (const su of subUnits) {
						const idx = UNITS.indexOf(su.unit);
						const opts = this._unit[su.unit];
						if (opts.style !== 'numeric') break;
						const v = values[su.unit];
						if (v !== 0 || (su.unit as string) in (this as any)) {
							fractionValue += v / su.perSecond;
							fractionDigits = su.digits;
						}
						consumedThrough = idx;
					}
				}

				if (this._fractionalDigits !== undefined) fractionDigits = this._fractionalDigits;

				const parts: DurationPart[] = [];
				for (let k = 0; k < usedTimeUnits.length; k++) {
					const u = usedTimeUnits[k];
					const opts = this._unit[u];
					let v = values[u];
					if (u === 'seconds' && fractionDigits > 0) v = v + fractionValue;

					const isLast = k === usedTimeUnits.length - 1;
					const useFraction = isLast && u === 'seconds' && fractionDigits > 0;

					const nf = new Intl.NumberFormat(this._locale, {
						minimumIntegerDigits: opts.style === '2-digit' ? 2 : 1,
						useGrouping: false,
						...(useFraction
							? { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }
							: {}),
						...(this._numberingSystem ? { numberingSystem: this._numberingSystem as any } : {}),
					});
					const sub = nf.formatToParts(v).map(p => ({ type: p.type, value: p.value, unit: u as string }));
					parts.push(...sub);
					if (!isLast) parts.push({ type: 'literal', value: ':' });
				}

				return { parts, nextIndex: consumedThrough + 1 };
			}

			private _joinWithListFormat(segments: DurationPart[][]): DurationPart[] {
				if (typeof Intl.ListFormat !== 'function') {
					const out: DurationPart[] = [];
					for (let i = 0; i < segments.length; i++) {
						if (i > 0) out.push({ type: 'literal', value: ' ' });
						out.push(...segments[i]);
					}
					return out;
				}

				const listStyle: 'long' | 'short' | 'narrow' = this._style === 'long'
					? 'long'
					: this._style === 'narrow' ? 'narrow' : 'short';
				const lf = new Intl.ListFormat(this._locale, { style: listStyle, type: 'unit' });

				const placeholders = segments.map((_, idx) => `${idx}`);
				const lfParts = lf.formatToParts(placeholders);

				const out: DurationPart[] = [];
				for (const p of lfParts) {
					if (p.type === 'element') {
						const m = p.value.match(/(\d+)/);
						if (m) out.push(...segments[Number(m[1])]);
						else out.push({ type: 'literal', value: p.value });
					} else {
						out.push({ type: 'literal', value: p.value });
					}
				}
				return out;
			}
		}

		(Intl as any).DurationFormat = DurationFormat;
	} catch (error) {
		console.warn('[obs-utils] Intl.DurationFormat polyfill failed:', error);
	}
}

// RegExp.escape, Error.isError, and Intl.DurationFormat are already declared by
// TypeScript's standard lib; this module only installs runtime implementations.

export {};
