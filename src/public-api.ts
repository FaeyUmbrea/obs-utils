/** Public compile-time contract for modules integrating with OBS Utils. */
export type {
	DirectorTabRegistration,
	DirectorTabSvelte5Registration,
	ImageSlotHandlers,
	OBSRemoteConditionField,
	OBSRemoteEventTypeRegistration,
	ObsUtilsApi,
	OverlayTriggerRegistration,
	OverlayType,
} from './utils/api.js';
export type { CameraKeyframe, CameraPreset, EasingKind, LoopMode } from './utils/cameraPresets.js';
export type { SequenceController } from './utils/cameraSequencePlayer.js';
export type { LegacyRollOverlayConfig } from './utils/defaultOverlays.js';
export type { DirectorState } from './utils/directorState.js';
export type { ActorValue, ActorValueGroup, ActorValues } from './utils/helpers.js';
export type {
	CustomEventInstance,
	OverlayComponentData,
	OverlayData,
	OverlayTileMode,
	TriggerPayloadField,
} from './utils/types.js';
