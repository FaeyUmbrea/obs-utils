export type AnimReEntryPolicy = 'restart' | 'replace' | 'queue' | 'ignore' | 'extend';

export interface AnimKeyframe {
	/** Offset within the animation, 0..1. */
	offset: number;
	transform?: string;
	opacity?: number;
	filter?: string;
	[cssProperty: string]: any;
}

export interface KeyframeAnimation {
	/** Total duration in ms. */
	duration: number;
	/** Keyframes ordered by offset (0..1). */
	keyframes: AnimKeyframe[];
	loop?: 'none' | 'restart' | 'pingpong' | 'infinite';
	ease?: string;
}

export interface AnimationState {
	entrance?: KeyframeAnimation;
	steady?: KeyframeAnimation;
	exit?: KeyframeAnimation;
}

export interface ComponentAnimationConfig {
	defaultState: AnimationState;
	triggeredStates: Record<string, AnimationState>;
	reEntry: AnimReEntryPolicy;
}
