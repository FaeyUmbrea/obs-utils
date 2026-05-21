# Overlay Editor UX Redesign

The authoritative design for the editor rewrite. Update this file when the design changes; do not let implementation drift from it.

## Composer workspaces

The composer center+right pane is mode-driven. Breadcrumb at the top:

```
Overlay Editor ▸ [Overlay name] ▸ Layout | Animation | Preview
```

- **Overview** — the home. Overlay list, "+ Create" with a **template gallery** (HP bar / Name plate / Status icons / Roll banner / Damage flash / Custom inline / Custom canvas). Sidebar holds Manage Actors, Global CSS, Import/Export.
- **Layout** — position components on the canvas; configure per-component data. Layers pane on the left, canvas in the center, component properties on the right. No trigger surface here. No animation editor crammed in.
- **Animation** — per overlay. Tracks list + transition graph + timeline editor for the selected track. Triggers are configured *here* and nowhere else. Focused live preview of the overlay playing.
- **Preview** — full OBS-resolution render of all overlays against all bound actors/players, with a test-fire panel for any event trigger.

No separate "Trigger" workspace. Triggers exist only as a tool to transition between tracks; they live where tracks live.

## Trigger taxonomy (data model)

Two categories of trigger, both registered on the overlay:

1. **Data triggers** (implicit, auto-wired).
   - One per component data path. The overlay auto-registers an actor-data filter for every data-driven component field.
   - Update component values (text, icon class, image src, etc). **Snap; no animation.**
   - User never sees the word "trigger" in this context.

2. **Event triggers** (explicit, user-configured).
   - Things like `core.onPlayerRoll`. Visible in the Animation editor's trigger picker.
   - Drive **transitions between tracks**. No transitions ⇒ no event triggers needed.

## Layout editor

- Position components on the canvas (drag, resize, arrow-nudge, gizmos).
- Per-component data fields use a **static vs data-driven checkbox** where the field can be either.
- **Static**: a plain input. Type the value.
- **Data-driven**: the Select picker. Accepts:
  - Actor data paths (auto-wires the implicit data trigger filter).
  - **Trigger payload paths** (`trigger.<eventKey>.<field>`) from event triggers either already configured on the overlay or available in the registry.
  - If the user picks a trigger-payload path for an event the overlay doesn't yet have, show an inline warning + a quick "Activate this trigger in the Animation editor" link.
- Component type names: drop the "AV" jargon.

| Internal type | UI name | Static option |
|---|---|---|
| `pt` | Text | ✓ |
| `fai` | Icon | ✓ |
| `img` | Image | ✓ |
| `bav` | Conditional Icon | — (always dynamic) |
| `bavimg` | Conditional Image | — (always dynamic) |
| `micoav` | Icon Counter | — (always dynamic) |
| `mimgav` | Image Counter | — (always dynamic) |
| `pb` | Progress Bar | — (always dynamic) |

## Animation editor

### Tracks

An overlay has **1+ tracks**. Each track is a timeline of *opacity* + *transform* (position / rotation / scale) per component, over a finite duration.

Per-track behavior:

- **Static** — no playback; components held at their authored state. Free performance shortcut for tracks that don't animate (a roll banner's "Idle" track where everything is hidden).
- **Looping** — restart at t=0 when the playhead reaches end.
- **Transition-on-end** — when the playhead reaches end, auto-transition to a specified track at a specified timecode.

### Triggers

Triggers transition between tracks. The Animation editor's Triggers panel is only meaningful when the overlay has **2+ tracks** — with one track there's nothing to transition to.

For each trigger registered on the overlay, the user configures transitions per (source track, trigger) pair.

### Transition zones

On each source track, the user marks **zones** with start/end timestamps. When a trigger fires while the playhead is in a zone, the zone's configured destination applies.

Per-zone destination is one of:
- **Go to track X at t=Y** (any track, any timecode).
- **Ignore** (do nothing, eat the fire).

Tracks default to one full-length zone with a sensible default destination so the user doesn't have to author zones unless they want different behavior in different phases.

### Mapped to the roll overlay use case

- Track 1 "Idle" — `behavior: static`, all components opacity 0.
- Track 2 "Roll" — `behavior: transition-on-end → Track 1 @ t=0`. Timeline: fade in, dice tumble, result reveal, fade out.
- Event trigger: `core.onPlayerRoll`.
  - From Track 1: full-length zone → Track 2 @ t=0.
  - From Track 2:
    - Zone `0..reveal_t`: ignore (don't re-fire while the dice are tumbling).
    - Zone `reveal_t..end`: → Track 2 @ t=reveal_t (restart from reveal so a new roll updates the displayed value).

### Editor surface

- Tracks list on the left (rename, reorder, set behavior, delete).
- Selected track's timeline in the center — one row per component, opacity + transform keyframes drawn as segments.
- Right pane: track behavior + (when 2+ tracks) the Triggers + Transitions panel for the *selected source track*.
- Top bar: focused preview of the overlay playing, Test fire dropdown (only event triggers registered on this overlay), Play / Stop, scrubbable playhead.

## No data migration

The only released schema is 5.0. The earlier in-flight 5.1 iteration (dual-trigger, per-component state machines, overlay-level trigger config) was speculative work that never shipped — its types and migration code are removed outright. 5.0 data is preserved as-is:

- 5.0 Simple Overlays (`type: 'sl'`) keep working — they had no animation or trigger fields, no `animation` field on the new `OverlayData` is needed, the renderer treats them as ambient.
- 5.0 `rollOverlay*` flat settings keep driving the legacy Roll Overlay path that 5.0 shipped. We do not convert them. Users who want the new tracks-model behavior author a fresh overlay; the legacy Roll Overlay remains alongside until the user replaces it manually.
- 5.0 had no `tileBy`; default `'actors'` (set by `undefined`) preserves the existing per-actor behavior.

## Order of implementation

1. Data model: new `OverlayAnimationData` (tracks + transitions + zones). New `OverlayComponentData` removes `animation` field; per-component motion lives on tracks instead.
2. Render tree extension: current-track resolution, per-frame opacity + transform computation per component, applied as inline CSS at the leaf wrapper.
3. Track playback engine: advance playhead, handle behaviors (static/looping/transition-on-end), trigger transitions on event fires.
4. Workspace shell: composer breadcrumb + mode switching.
5. Layout editor refit: data-driven checkbox, picker with trigger paths, component name cleanup.
6. Animation editor: tracks list + per-track timeline + transitions panel + focused preview.
7. Preview workspace: full render + test-fire panel.
8. Overview workspace: list + template gallery + create flow.
9. Data migration from old shapes.
10. Drop legacy `triggeredStates` / re-entry policy / overlay-level `OverlayTriggerConfig` shape.

## What's deleted

- `ComponentAnimationConfig.triggeredStates`
- `AnimReEntryPolicy` enum
- Overlay-level `trigger` config (`OverlayTriggerConfig`) — replaced by tracks + transitions.
- Per-component animation state machines.
- The "+ Add state" UX, the re-entry policy dropdown, the trigger checkbox.

## What's preserved

- Component leaf renderers (pure, prop-driven).
- The trigger registry as the event substrate.
- The render tree pipeline.
- `tileBy` modes.
- Existing keyframe authoring affordances (offset, easing, properties).
