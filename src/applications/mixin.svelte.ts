import type { DeepPartial } from 'fvtt-types/utils';
import * as svelte from 'svelte';

interface SvelteApplicationRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
  /** State data tracked by the root component: objects herein must be plain object. */
  state: object;
  /** This application instance */
  foundryApp?: SvelteApplication;
}

type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

function SvelteApplicationMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2.Any> & {
    DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>;
  },
>(Base: TBase) {
  abstract class SvelteApplication extends Base {
    static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
      classes: ['obsutils'],
    };

    protected abstract root: svelte.Component<any>;

    /** State data tracked by the root component */
    protected $state: object = $state({});

    /** The mounted root component, saved to be unmounted on application close */
    #mount: object = {};

    protected abstract override _prepareContext(
      options: foundry.applications.api.ApplicationV2.RenderOptions,
    ): Promise<SvelteApplicationRenderContext>;

    protected override async _renderHTML(
      context: SvelteApplicationRenderContext,
    ): Promise<SvelteApplicationRenderContext> {
      return context;
    }

    protected override _replaceHTML(
      result: SvelteApplicationRenderContext,
      content: HTMLElement,
      options: foundry.applications.api.ApplicationV2.RenderOptions,
    ): void {
      Object.assign(this.$state, result.state);
      if (options.isFirstRender) {
        this.#mount = svelte.mount(this.root, { target: content, props: { ...result, state: this.$state, foundryApp: this } });
      }
    }

    protected override _onClose(options: foundry.applications.api.ApplicationV2.ClosingOptions): void {
      super._onClose(options);
      svelte.unmount(this.#mount);
    }
  }

  return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { type SvelteApplication, SvelteApplicationMixin, type SvelteApplicationRenderContext };
