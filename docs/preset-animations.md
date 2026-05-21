# Preset animations

> **Documentation status:** draft — finalize after the update ships.
> Every `> SCREENSHOT:` line marks a still that needs to be (re)taken on the
> shipped build before this page goes onto the wiki.

Preset animations are scene-bound camera moves that play on the OBS client,
not the GM's. The DM authors a sequence of camera keyframes, hits play, and
the OBS browser-source pans smoothly through the path while the GM's own
viewport stays put. This is the difference between the new preset system and
"just panning your camera around" — your view doesn't have to fight the
broadcast.

> SCREENSHOT: the Director Presets tab with two preset rows — one static
> (camera icon) and one animation (film icon), labelled. Show the row action
> buttons (play / edit / delete) for both kinds.

## Preset kinds

Two kinds live in the same list.

- **Static preset** — a single waypoint (x, y, scale). Clicking **Pan to**
  smoothly tweens the OBS camera to that waypoint using the configured
  smoothing duration and easing.
- **Animation preset** — a keyframe sequence with its own composition
  duration, optional loop mode, and per-keyframe easing. Plays from start to
  finish on the OBS client.

Add either via the two buttons at the top of the Presets tab. A new static
preset captures the current viewport; a new animation preset seeds with one
keyframe at t=0 and opens the keyframe editor.

> SCREENSHOT: the Presets tab header showing the "Add static" / "Add
> animation" / red "Stop" button row.

## Behavior when you press play

Clicking play on a preset row does four things in order on the **GM** client:

1. Both `In Combat` and `Out of Combat` tracking modes switch to **Clone the
   DM's Viewport** — a preset is an explicit "follow me" gesture and you
   shouldn't have to redo the choice when combat starts.
2. The active-GM handle is claimed (`activeGMUserId = you`) so this DM owns
   the broadcast viewport going forward.
3. **Pause Camera Tracking** is turned on so your own subsequent panning
   doesn't fight the preset.
4. The preset is broadcast to every OBS client; each runs `playSequence`
   locally and tweens through the path.

None of these are restored automatically. After a preset, the OBS will keep
following you (because tracking mode + active GM are sticky and pause is on).
Flip pause back off when you want live tracking again.

The **Stop** button in the Presets tab broadcasts a stop event that kills
any running preset on every OBS client. Use it for looping presets, or to
cut off a long animation early.

## Authoring an animation preset

Edit a row by clicking the **pen** icon. This opens a separate, fixed-size
window with the animation editor.

> SCREENSHOT: AnimationPresetEditor with the toolbar, timeline, and the
> keyframe list + selected-keyframe inspector visible. Multiple keyframes on
> the timeline, one selected.

### The toolbar

Left to right:

- **Playback nav** — prev/next keyframe, prev/next frame (1 ms steps),
  play. Ctrl+click on the prev/next keyframe buttons jumps to the very
  first / very last keyframe respectively.
- **Record** — see "Recording a path" below.
- **Time readout** — current playhead / total duration.
- **Loop selector** — three icon radios: off, restart, ping-pong. Ping-pong
  bounces between t=0 and the composition duration (not just the last
  keyframe) so trailing pauses behave predictably.
- **Duration** — composition length in ms. The trailing lock toggle
  controls what happens to keyframes recorded past the limit (see "Duration
  lock"). The duration text greys out when locked.
- **Smoothing** — the rolling-window size applied to recorded samples.
  Higher = smoother but more rounded paths. Default 3.
- **Zoom** — fits more or less of the timeline horizontally.

> SCREENSHOT: close-up of the toolbar with the loop radio and the
> duration field+lock side by side. Show both lock states in one image if
> possible.

### Authoring keyframes

- Add at playhead via the **+** button in the keyframe-list header.
- Click a marker dot to select. Ctrl+click on a list row toggles
  multi-select; the selection highlight follows.
- Drag a marker horizontally to retime it. Dragging while multiple are
  selected moves the whole batch by the same delta.
- Ctrl+click on a marker pulls the playhead to that keyframe's time
  (handy when you want to "go here, then play").
- Ctrl+drag on the empty strip background draws a lasso — keyframes whose
  time falls in the range get selected on release.

> SCREENSHOT: the lasso rectangle mid-drag with the highlighted keyframes
> inside it.

- Backspace removes every selected keyframe (Delete is owned by Foundry).
- The inspector on the right shows the time, position, scale, and easing
  of whichever keyframe is the primary selection.

### Scrub-to-viewport

Moving the playhead in any way — dragging the playhead handle, clicking the
strip, stepping with the nav buttons — snaps the **editor user's local
canvas viewport** to the interpolated camera position at that time. This
lets you preview what the animation would look like, frame by frame.

This is local-only. It does not move the OBS camera, and it does not
broadcast.

### Play from playhead

Pressing play kicks the GSAP timeline off from the current playhead
position (and broadcasts to the OBS at the same offset). Ctrl/Meta+click
on the play button forces "play from the start" instead.

While playing, the play button turns into a stop button, the playhead
advances at real-time, and the editor user's viewport tracks the
interpolated position.

### Composition duration vs. last keyframe

Earlier versions ended playback at the last keyframe's time. The current
behavior is to play through the composition duration, holding the camera
at the last keyframe's values during any trailing window. This matters
mostly for loop modes:

- **Restart loop** with a 5 s duration and a final keyframe at 3 s pauses
  on the last frame for 2 s before restarting.
- **Ping-pong** bounces between 0 and the **duration**, not between 0 and
  the last keyframe.

Reducing the duration past existing keyframes is treated as a destructive
edit — a confirm dialog warns you before truncation.

> SCREENSHOT: the confirm dialog when shrinking duration past existing
> keyframes.

### Recording a path

Click the red dot to record. A countdown plays (3 → 2 → 1 → GO), then
sampling begins.

During recording:

- The playhead advances at real-time.
- A red fill grows behind the playhead showing the recorded span.
- Camera pans on your machine are sampled at ~30 Hz and stored locally.

On stop, the raw samples go through:

1. **Moving-average smoothing** — the smoothing window from the toolbar.
2. **Dedup pass** — drops adjacent samples that barely moved within 50 ms.
3. **Ramer-Douglas-Peucker simplification** — keeps only the points needed
   to reproduce the recorded shape within a 4 px perpendicular tolerance.
   Straight runs collapse to their endpoints; corners are preserved.

The simplified keyframes replace **any existing keyframes inside the
recorded time window**. Keyframes outside the window are untouched.

> SCREENSHOT: timeline during recording with the red progress fill and the
> playhead advancing through it. Try to capture a moment where the fill
> covers ~70% of the timeline.

> SCREENSHOT: after stopping a record — the simplified keyframes scattered
> along the timeline (5–10 dots is the typical count for a 4-second
> recording).

### Duration lock

The lock icon inside the duration input controls what recording does past
the end of the composition.

- **Locked** (default) — recording auto-stops when the playhead reaches
  the composition end. Keyframes past the end are dropped.
- **Unlocked** — recording is free to extend; on stop, the composition
  duration grows to fit the new keyframes plus a small padding.

> SCREENSHOT: side-by-side of the locked and unlocked duration field
> states, ideally showing the colour difference (greyed text + gold lock
> vs. white text + grey unlock).

## Director Controls — tracking + smoothing

The Controls tab now exposes two things that used to live in Foundry's
settings UI:

- **Tracking mode** (Direct / Smooth / On Release) — picks how the GM's
  viewport pushes to the OBS while live tracking is on. Smooth is the
  default; On Release only pushes once the GM stops dragging.
- **Easing** (Direct / Linear / Ease Out / Cinematic / Ease Out Cosine /
  Ease In/Out Cosine) — the curve applied to the receiver's tween between
  viewport samples. Direct disables the tween entirely (samples are
  applied at ~30 Hz with a 33 ms bridge tween for visual continuity).

Both rows are 32×20 icon-button radios sitting under the Camera Smoothing
heading. The In Combat / Out of Combat mode pickers above stay at the
larger 40×40 size because they're the bigger sticky controls.

> SCREENSHOT: the Director Controls panel with the IC/OOC rows, then the
> Tracking Mode row, then the Easing row, then the Duration slider. All
> labels visible.

## API surface (for module authors)

The module exposes two entry points on `game.modules.get('obs-utils').api`:

- `playPreset(preset)` — the orchestrated path. Performs all the
  GM-side state changes described in "Behavior when you press play" and
  broadcasts the preset.
- `previewPreset(preset)` — local-only playback returning a
  `SequenceController` (pause/resume/scrub/stop). Use this for in-editor
  previews; no state changes, no broadcast.

The active-controller state on the OBS side is internal. A new
`playPreset` broadcast cancels any in-flight preset before starting the
new one.
