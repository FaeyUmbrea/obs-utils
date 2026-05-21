# Camera Preset Editor UX Redesign

Companion to `PLAN_OVERLAY_EDITOR.md`. Same task-oriented workspace philosophy applied to the director's camera-preset feature. Defer implementation until the overlay-editor redesign lands.

## Two preset shapes, cleanly separated

Today's UI conflates two things into one "preset" object. Split them:

1. **Static preset** — a single camera position (x / y / scale). Triggering it pans the camera from wherever it currently is to that target position. One ease curve for the pan in.
2. **Animation preset** — a scripted camera move with multiple waypoints, durations, and easing per segment.

These are *different concepts with different editors*. The Presets tab gets two **separate "Add" buttons** ("Add static preset", "Add animation preset") and two distinct **editing windows** opened from those entries. No more shared UI that tries to be both.

### Static preset editor

- A small dialog / inline card with:
  - `x`, `y`, `scale` inputs (or "Capture from viewport" button to fill them).
  - Pan-in transition config: hard teleport / soft pan, ease curve, duration (when soft).
- That's all. One-shot.

### Animation preset editor

A dedicated, larger workspace. Same task-oriented split as the overlay editor:

- **Entry transition config** at the top: hard teleport vs soft pan to the first keyframe, ease curve, duration. This is what happens when the preset is triggered from "wherever the camera is now."
- **Timeline**:
  - Scrubbable playhead with smooth drag, click-to-jump, keyboard step (arrows ±1 frame, shift ±100ms, home/end).
  - Time readout next to the playhead (`2.34s / 5.00s`).
  - Zoom (`ctrl+wheel` + `+/-` buttons) for tight keyframe groups.
  - Stacked-keyframe disambiguation: when markers fall within ~8px, collapse into a stack badge that opens a picker.
  - Total duration input next to the timeline.
- **Per-keyframe panel**: position (x/y/scale), time, ease into this keyframe, "Capture from viewport" button.
- **Loop config**: none / restart / pingpong.
- **Record camera move** (see below).

## Recording

DMs can hit a Record button, move the camera in Foundry by hand for a few seconds, then Stop. The system samples the live viewport, throttled, and produces an animation preset.

- **Sampling**: poll `getLocalViewport()` at ~30 Hz while recording. Drop a sample into a buffer.
- **Threshold-based keyframe drop**: when the sampled position differs from the last kept sample beyond a configurable threshold (px-delta / scale-delta), commit a keyframe. Avoids 1000-keyframe noise from continuous tiny motion.
- **Smoothing on stop**: post-process the buffer through a configurable smoothing pass (moving-average window size + scale-delta tolerance) to remove jitter from hand-moved cameras. UI: a slider for smoothness, a preview of the smoothed path next to the raw path.
- **Append vs replace**: ask the user on stop. Default: append to current timeline.

## Overlap with overlay editor reuse

The keyframe timeline UI here is structurally identical to the per-track timeline in the new overlay animation editor: scrubbable playhead, draggable markers, zoom, time readout. **Reuse the same Svelte component** if practical — a generic `Timeline.svelte` that both editors consume with their own marker / segment data. Worth checking after the overlay editor is in place; don't pre-factor.

## Things to delete after migration

- The unified "preset editor" that handles both static and animated. Replaced by two focused editors.
- The "convert legacy preset" prompt — once the migration runs against existing worlds, every preset is either static or animation and the legacy single-point shape is gone.
