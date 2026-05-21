import type { DeepPartial } from 'fvtt-types/utils';
import AnimationPresetApp from '../svelte/AnimationPresetApp.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

interface AnimationPresetOptions {
	presetId: string;
	sceneId: string;
}

/**
 * Dedicated window for editing an animation preset's keyframe sequence. Opened
 * from the director's Presets tab when the user clicks the edit button on an
 * animated preset row. The Svelte root is purpose-built for this window — see
 * `AnimationPresetEditor.svelte`.
 */
export default class AnimationPresetApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = AnimationPresetApp;

	constructor(
		options: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>,
		private readonly presetOptions: AnimationPresetOptions,
	) {
		super(options);
	}

	static override DEFAULT_OPTIONS = {
		classes: ['obsutils', 'obs-animation-preset', 'themed'],
		id: 'obs-utils-animation-preset',
		position: {
			width: 880,
			height: 520,
		},
		title: 'obs-utils.applications.director.keyframeEditor.expandLabel',
		positionOrtho: false,
		transformOrigin: null,
		// Fixed size — non-resizable lets the layout be tuned to one shape.
		window: {
			resizable: false,
			minimizable: true,
		},
	};

	protected override async _prepareContext() {
		return {
			state: { presetId: this.presetOptions.presetId, sceneId: this.presetOptions.sceneId },
		};
	}
}
