# Overlay animations

> **Documentation status:** draft — finalize after the 5.1 update ships.
> Every `> SCREENSHOT:` line marks a still that needs to be (re)taken on
> the shipped build before this page goes onto the wiki.

Overlay animations are per-component opacity and transform changes driven
by tracks. A track is a timeline of keyframes; an overlay can have several
tracks and switch between them when a trigger fires. The animation system
is what turns a static HP-bar overlay into a roll banner that flies in
when a player rolls, then fades out again.

The animation editor lives on the **Animation** tab of the overlay
composer. Each overlay carries its own animation independently of other
overlays.

> SCREENSHOT: the Animation tab opened on a roll-banner overlay. Show the
> tracks pane (left), timeline with two lanes (centre), and live preview
> (right).

## Tracks

A track is a named keyframe sequence with a duration and an
end-of-track behavior. Add tracks with the **+** button in the tracks
pane on the left.

Three behaviors:

- **Static** — duration is meaningless. The track holds its t=0 snapshot
  forever; the playback engine never advances the playhead. Useful as an
  idle state (overlay invisible until a trigger flips to a different
  track).
- **Looping** — the playhead wraps from `duration` back to 0. Ambient
  animations (pulsing HP bar, slow drift) live here.
- **Transition on end** — when the playhead reaches `duration`, the
  overlay jumps to another track at a specified time. Used to chain "play
  the entrance, then return to idle" without authoring the return path
  twice.

The flag icon next to a track marks it as the **initial** track — what
the overlay enters when first mounted. The first track of a new animation
is the initial track by default; click the flag on another track to swap.

Removing the last track wipes `layer.animation` entirely. The overlay
returns to ambient rendering. A confirm dialog warns you before the wipe.

> SCREENSHOT: tracks pane with an Idle (static, flagged initial) and Show
> (transition-on-end) row. Show the trash button on each row.

## The timeline

The centre pane shows the selected track's timeline. The left column
lists one row per component on the overlay; clicking the chevron expands
that row into per-property sub-rows (opacity, x, y, rotation, scaleX,
scaleY).

The header row above the component name is the **aggregate** strip — it
shows one marker per unique timestamp across all the component's
property keyframes, so you can see the "shape" of a component's animation
without expanding it. Dragging an aggregate marker moves every keyframe
at that timestamp together.

Each marker is shape-coded by interpolation:

- **Square** — constant (hold the previous value until this keyframe).
- **Triangle** — linear interpolation.
- **Diamond** — bezier easing.

Bezier markers are also colour-coded by easing equation. The smooth
polynomial family (sinusoidal / quadratic / cubic / quartic / quintic /
circular / exponential) shares the default warm orange. **Back**,
**bounce**, and **elastic** each get their own hue because they have
shapes that the eye should recognise at a glance.

> SCREENSHOT: a track with mixed markers visible — one square, one
> triangle, and three diamonds in three different colours.

### Authoring keyframes

Three ways to add a keyframe:

- The **chevron** button next to each property in the inspector on the
  right. Click once to add a keyframe at the current playhead with the
  current value. Click again to remove it.
- The **+** button on the component header row in the timeline. Adds a
  keyframe to every property at the playhead.
- Drag any existing marker to move it. Use Backspace to delete the
  selected one.

The chevron's three states:

- **Empty (white)** — no property track exists yet.
- **Blue** — a track exists but no keyframe sits on the playhead.
- **Gold** — a keyframe is on the playhead.

> SCREENSHOT: the property inspector with three rows showing all three
> chevron states.

### Box-select & multi-edit

Ctrl/Meta+drag on the timeline draws a lasso. Every marker the rectangle
intersects becomes selected. Selected markers get a blue outline.

- Drag any selected marker to move the whole batch by the same delta.
- Backspace deletes everything in the selection.
- Click any marker without modifiers to clear the lasso selection and
  pick that single one.

The lasso is a true 2D rectangle — you can constrain to a single lane by
keeping the drag inside its row. The lasso visual is detached from the
timeline pane so you can drag it past the edges.

> SCREENSHOT: a lasso mid-drag covering two rows of the timeline, with the
> covered markers outlined in blue.

### Scrubbing

Move the playhead by dragging it directly, clicking the timeline strip,
stepping with the nav buttons in the toolbar (1 ms per click), or
jumping between keyframes. **Ctrl/Meta+click** on the prev/next-keyframe
button jumps to the very first / very last keyframe respectively.

The arrow keys nudge the selected keyframe by 1 ms. Hold **Ctrl** for
10 ms; hold **Shift** for 100 ms.

### Easing per keyframe

A keyframe carries the easing applied to the segment leading INTO it.
The inspector shows three rows when a single keyframe is expanded:

1. **Interpolation** chips — constant, linear, bezier.
2. **Equation** select (bezier only) — the curve family.
3. **Direction** chips (bezier only) — in, out, in/out, auto.

Constant and linear ignore the equation/direction selectors entirely.

### The inspector

The panel on the right always shows the selected component's properties
(opacity, x, y, rotation, scaleX, scaleY). Opacity is shown as 0–100 %.

When a keyframe is selected on a property's row, the row expands inline
to show its time, interpolation, and easing controls. Click off the
keyframe (or click the timeline strip away from a marker) to collapse the
expansion while keeping the property list visible.

## Transitions

Transitions are how triggers move an overlay from one track to another.
Open the **Transitions** drawer from the toolbar above the timeline; it
slides over the workspace.

Inside the drawer:

- A **trigger card** per registered trigger that fires on this track.
  The trigger select picks which event (`core.onPlayerRoll`,
  `core.onChatMessage`, or any module-registered trigger).
- One or more **condition rows** per card. Each row says: "if the
  playhead is between X and Y when this trigger fires, jump to track Z
  at time T." For static idle tracks the playhead is always 0, so a
  condition `[0, 1)` matches every fire.
- A **Test fire** button per trigger that emits the event with an empty
  payload so you can watch the transition in the live preview without
  rolling dice.

A second mode lives in the drawer for tracks whose behavior is
**transition on end**: a single "When track ends" card lets you pick the
fallthrough target and time without authoring a trigger.

> SCREENSHOT: the Transitions drawer with one trigger card (Player Roll)
> expanded showing one condition row, and the "When track ends" card
> above it for a transition-on-end track.

## Triggers and payloads

Triggers come from a registry. The two built-ins:

- `core.onPlayerRoll` — fires on any public chat message that contains a
  roll. Payload: `{ actor, user, roll, total, formula, isCritical, isFumble }`.
- `core.onChatMessage` — fires on any public chat message. Payload:
  `{ message, actor, user, content, speakerAlias }`.

Third-party modules register their own triggers via the API; their
payload fields show up in the data picker automatically.

### `trigger.X` paths in components

Any component data field that accepts an actor path also accepts a
`trigger.X` path. `trigger.total` resolves to `payload.total`,
`trigger.actor.name` to `payload.actor.name`, and so on. The renderer
picks the payload using:

1. The trigger that most recently transitioned this tile (if any).
2. Otherwise, the latest payload of any trigger the overlay has a
   transition for.
3. Otherwise, the latest payload of any registered trigger.

Filtering by tile context (see below) gates which payloads are visible
to which tile — but on the Preview tab in the composer that filter is
disabled, so every tile shows every payload.

## Tile modes

A `tileBy` setting on the overlay decides how the renderer expands it
across contexts. Picked on the **Settings** tab.

- **Actors** (default) — one tile per overlay actor. Ambient overlays
  like HP bars. Payloads filter by `payload.actor.id` matching the tile's
  actor.
- **Players** — one tile per non-GM user. The overlay only renders for
  players, not the GM. Payloads filter by `payload.user.id` matching the
  tile's user.
- **Users** — one tile per user including GMs. Identical to Players for
  payload routing.
- **Once** — singleton, regardless of actors/users. No payload filtering.

Different overlays always stack vertically on `/stream`. Within a single
overlay:

- **Inline** (`sl` type) overlays tile vertically — multiple tiles stack
  below each other.
- **Canvas** (`wysiwyg` type) overlays tile horizontally with wrap based
  on the canvas width.

Each row gets a 20 px left margin so it clears Foundry's chat sidebar.

## Live preview & test fires

The right side of the Animation tab shows a scaled-down preview of the
overlay at the current playhead. Drag the playhead in the timeline; the
preview updates frame-by-frame in real time. This is purely local —
nothing leaves the editor.

The composer's separate **Preview** tab opens a larger preview pane that
mounts every overlay × every tile and disables payload filtering. The
left rail has a **Test fire** button per registered trigger; clicking one
synthesises a realistic payload (first overlay actor, current user, a
random 1d20 for rolls) and fires it. Animations driven by that trigger
play. Useful for verifying a transition without rolling dice or waiting
for the real event.

> SCREENSHOT: the Preview tab with a Roll Banner showing the test
> payload's resolved total, and the test-fire panel on the left.

## Coming from a 4.x roll overlay

The 4.x standalone Roll Overlay is gone. The closest 5.1 equivalent is
an `sl` overlay set to `tileBy: 'players'` with two tracks (static idle +
transition-on-end "show") and a `core.onPlayerRoll` transition driving
the swap. The data picker exposes `trigger.total`, `trigger.actor.name`,
and the other payload fields for use in component data paths.

There is no automatic migration. A manual rebuild snippet for users
porting old roll overlays lives below.

### Rebuild snippet

```js
// Paste into the GM's browser console on a freshly-loaded world.
// Replace the styles/labels to taste before running.
(async () => {
  const fid = () => foundry.utils.randomID();
  const overlays = game.settings.get('obs-utils', 'streamOverlays') ?? [];
  const idle = fid(), show = fid(), nameC = fid(), totalC = fid();
  overlays.push({
    id: fid(),
    name: 'Roll Banner (5.1 rebuild)',
    type: 'sl',
    tileBy: 'players',
    enabled: true,
    style: '',
    config: {},
    components: [
      { id: nameC,  type: 'pt', data: 'trigger.actor.name', style: 'font-weight: bold;' },
      { id: totalC, type: 'pt', data: 'trigger.total',      style: 'font-size: 24px;' },
    ],
    animation: {
      initialTrackId: idle,
      tracks: [
        { id: idle, name: 'Idle', durationMs: 0, behavior: { type: 'static' },
          lanes: [
            { componentId: nameC,  keyframes: [], propertyKeyframes: { opacity: [{ t: 0, v: 0 }] } },
            { componentId: totalC, keyframes: [], propertyKeyframes: { opacity: [{ t: 0, v: 0 }] } },
          ],
        },
        { id: show, name: 'Show', durationMs: 2500,
          behavior: { type: 'transition-on-end', toTrackId: idle, toTime: 0 },
          lanes: [
            { componentId: nameC,  keyframes: [], propertyKeyframes: {
              opacity: [{ t: 0, v: 0 }, { t: 300, v: 1 }, { t: 2000, v: 1 }, { t: 2500, v: 0 }],
            } },
            { componentId: totalC, keyframes: [], propertyKeyframes: {
              opacity: [{ t: 0, v: 0 }, { t: 500, v: 1 }, { t: 2000, v: 1 }, { t: 2500, v: 0 }],
            } },
          ],
        },
      ],
      transitions: [
        { triggerKey: 'core.onPlayerRoll', fromTrackId: idle,
          zones: [{ startT: 0, endT: 1, destination: { type: 'goto', toTrackId: show, toTime: 0 } }],
        },
      ],
    },
  });
  await game.settings.set('obs-utils', 'streamOverlays', overlays);
})();
```

The snippet adds a fresh overlay; it doesn't delete any existing roll
overlays. Inspect the Layers panel after running, hide or delete the old
one, and tweak the new one in the composer.
