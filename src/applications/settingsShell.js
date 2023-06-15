export function SettingsShell(Application) {
  return class Shell extends FormApplication {
    static #mceSettingsApp;

    static showSettings() {
      this.#mceSettingsApp = this.#mceSettingsApp
        ? this.#mceSettingsApp
        : new Application();
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

    render() {
      this.close();
    }
  };
}
