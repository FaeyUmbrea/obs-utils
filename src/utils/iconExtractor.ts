let cachedIcons: string[] | null = null;

export function getFontAwesomeIcons(): string[] {
	if (cachedIcons) return cachedIcons;

	const icons = new Set<string>();

	for (let i = 0; i < document.styleSheets.length; i++) {
		const sheet = document.styleSheets[i];
		try {
			if (sheet.href && sheet.href.includes('fontawesome')) {
				for (let j = 0; j < sheet.cssRules.length; j++) {
					const rule = sheet.cssRules[j] as CSSStyleRule;
					if (rule.selectorText && rule.selectorText.includes('::before')) {
						const selectors = rule.selectorText.split(',');
						for (const selector of selectors) {
							const match = selector.match(/\.(fa-[a-zA-Z0-9\-]+)::before/);
							if (match) {
								icons.add(match[1]);
							}
						}
					}
				}
			}
		} catch {
			// Cross-origin stylesheets might throw when accessing cssRules
		}
	}

	cachedIcons = Array.from(icons).sort();
	return cachedIcons;
}
