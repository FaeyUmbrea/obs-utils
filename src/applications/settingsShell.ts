export function SettingsShell(WrappedApplication: new () => Application) {
	return class Shell extends FormApplication {
		static #mceSettingsApp: Application;

		static showSettings() {
			this.#mceSettingsApp = this.#mceSettingsApp
				? this.#mceSettingsApp
				: new WrappedApplication();
			this.#mceSettingsApp.render(true, { focus: true });

			return this.#mceSettingsApp;
		}

		/**
		 * @inheritDoc
		 */
		constructor(options = {}) {
			super({}, options);
			Shell.showSettings();
		}

		async _updateObject() {}

		// @ts-expect-error mixins dont work
		render() {
			this.close();
		}
	};
}
