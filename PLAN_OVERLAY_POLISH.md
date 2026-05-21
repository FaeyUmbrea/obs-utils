# Overlay Editor Polish — Round 2

Live feedback collected while testing the shipped overlay-editor rewrite. This file is the authoritative backlog for those changes; tick items off as they ship and remove the file when the list is exhausted.

The numbered items map 1:1 to the user's report. Sub-bullets are the acceptance criteria the implementation should hit.

---

## A. Composer chrome & navigation

### A1. Template-gallery empty-state UI is malformed
The "no overlays — pick a template" splash needs a visual remake. The concept (API-registered templates show up alongside built-ins) is keeping; the layout isn't.
- Treat as a fresh design pass. Cards with icon + label + 1-line description, wrapped grid.
- Built-in cards and starter-registered cards render identically.

### A2. Two-set tab confusion — collapse into one tab strip
Currently the editor has two tab strips: Layout / Animation / Preview on the outside, and Overlay / Component / Style on the inside. Streamline.
- Tabs are flat: **Settings**, **Layout**, **Animation**, **Preview**.
- New **Settings** tab carries overlay-level fields the user shouldn't be editing constantly: overlay type (Inline vs Canvas), name, tileBy mode, custom CSS, and for Canvas overlays the reference width/height.
- Layout tab loses the overlay-level controls; it's just the canvas + per-component property inspector now.
- Component-tab content (the per-component data editors) folds into the Layout tab as the right-hand inspector.
- Style-tab content (custom CSS per component) folds into the same inspector under a collapsible "CSS" section.

### A3. "Full Preview" button + application — remove
The Preview tab now does what the standalone Full Preview window did. Delete the button in the Layout toolbar and the `OverlayPreviewUI` ApplicationV2.

### A4. Rename "Simple Overlay" → "Inline", "WYSIWYG Overlay" → "Canvas"
Both the localized labels and any user-facing identifiers. The internal `type` strings (`sl` / `wysiwyg`) stay — backward-compat for persisted data.
- `lang/en.json`: every key with the old names.
- Template gallery labels.
- Layers-panel tooltips.
- Type dropdown in the new Settings tab.

---

## B. Template gallery cleanup

### B1. HP Bar and Name plate shouldn't be Canvas templates
Single-element overlays are better expressed as Inline overlays. Move both to `sl` in the template registry.

### B2. "Custom Canvas" vs "Blank" — keep Custom, drop the Blank section
The LayersPanel `+` dropdown has two sections ("Blank" + "From template"). The Blank section duplicates Custom Canvas / Custom Inline. Drop the Blank section; Custom Canvas + Custom Inline already live in From template.

### B3. Custom Canvas / Custom Inline ordering
Move the two "Custom" entries to the **first** position in the template list (alphabetically natural for "blank starts here"). Or to the very end; pick one and apply consistently. **Decision: pin to the top of the list.**

### B4. "Roll reveal" template button does nothing
The Roll Reveal starter (from `defaultOverlays.ts`) is in the template gallery but clicking it doesn't insert an overlay. Wire the template-create callback or fix the registered starter's `create()` function.

---

## C. Inline overlay rendering

### C1. Inline preview is vertical; live is horizontal
The in-editor preview for `sl` overlays stacks components top-to-bottom; the actual `/stream` render lays them out left-to-right. Match the preview to the live behavior. (Probably a `flex-direction: column` on the preview wrapper that should be `row`.)

---

## D. Animation workspace — track model rework

This is the biggest single change. Splitting into D-prefixed sub-items so each can ship independently.

### D1. Per-property tracks, nested under component headers
Blender / After Effects-style hierarchy. The timeline has one header row per component for navigation; the actual keyframe data is per-property.

- Each component renders as an **expandable group header row** on the timeline.
- The header row shows aggregated keyframe markers — one dot per timestamp where any of the component's properties has a keyframe.
- Inside the group, only the properties the user has explicitly opted into render as their own rows (`opacity`, `x`, `y`, `rotation`, `scaleX`, `scaleY`).
- Selecting the component header (no specific property) shows the component's full property panel in the inspector — the animation view doubles as a "select a component to see what it does" surface.
- Selecting a specific property row shows just that property's value/easing in the inspector.

**Per-property keyframe chevron in the inspector.** Each animatable property field in the component inspector carries a small chevron / diamond toggle beside it. This is the canonical entry point — there's no separate "+ Animate property" menu.
- **Chevron states:** outline = not animated (no row exists yet); filled = animated and the playhead is sitting between keyframes; bright/glowing = animated and the playhead is on a keyframe.
- **Click semantics:** if the property has no track yet, clicking the chevron creates the property row and inserts a keyframe at the current playhead with the current displayed value. If a track exists but the playhead isn't on a keyframe, clicking inserts one at the playhead. If the playhead is on a keyframe, clicking removes that keyframe.
- The chevron eats the same space as the field's label so it's visible without crowding.

**Aggregated drag on the header row.** Dragging a marker on the component header moves **every keyframe at that timestamp across all the component's property rows by the same delta**. This is the Blender shortcut — "delay everything that happens at t=500 ms together" without selecting them all manually. Dragging on a specific property row still moves only that single keyframe.

Existing per-component lanes migrate by splitting their mixed keyframes into per-property rows; the component header is rendered from the new aggregate.

### D2. Don't allow duplicate keyframes
A keyframe at the same `(track, time)` as an existing one is rejected (or replaces). Today nothing prevents two keyframes at the exact same time on the same lane.

### D3. Editing a value off a keyframe creates a new keyframe at the playhead
Currently, if the playhead isn't on a keyframe and the user changes opacity / x / etc. in the inspector, the change either silently does nothing or alters the previous keyframe. New behavior: synthesize a keyframe at the current playhead position with the edited value.

### D4. Scrub-to-show-values
Moving the playhead must update the inspector's number boxes in real time to the interpolated value at that time. Today the inspector only updates when a keyframe is explicitly selected.

### D5. Static tracks render simplified
A track whose behavior is `static` doesn't need a playhead or playback controls. Render a compact card with just the component list + value snapshot.
- Pinned as a follow-up; not strictly blocking the rest of D.

### D6. Keyframe-level easing — Blender-style picker
Each keyframe needs an easing setting; we want the UX as close to Blender's f-curve editor as we can get without porting an entire graph editor.

**Data model: two-axis picker, equation × direction.**
- **Interpolation mode** (high-level):
  - `constant` — hold previous value until the next keyframe (step)
  - `linear` — straight line
  - `bezier` (default) — smooth curve. Combined with the equation/direction below.
- **Easing equation** (only meaningful when interpolation = `bezier`):
  `sinusoidal`, `quadratic`, `cubic`, `quartic`, `quintic`, `exponential`, `circular`, `back`, `bounce`, `elastic`
- **Easing direction** (only meaningful when interpolation = `bezier`):
  `in`, `out`, `inout`, `auto`

The flat `EasingKind` enum we have today maps onto this: `'linear'` is just interpolation=linear; `'easeInOutCircle'` is interpolation=bezier + equation=circular + direction=inout. Migration is mechanical.

**Marker icons reflect interpolation mode.**
- `constant` → square outline
- `linear` → triangle / wedge
- `bezier` → diamond / circle (current dot)

So at a glance the timeline reads like Blender's dope sheet.

**Inspector layout for the selected keyframe:**

```
┌─ Keyframe ──────────────────────────────────────────┐
│ Time: [____] ms                                     │
│                                                     │
│ Interpolation:  ◯ Constant  ◯ Linear  ● Bezier      │
│                                                     │
│ Equation:  [Sinusoidal ▾]                           │
│ Direction: ( In | Out | In/Out | Auto )             │
│                                                     │
│ Value: [____]                                       │
└─────────────────────────────────────────────────────┘
```

- Interpolation as 3 radio chips at the top.
- Equation + direction collapse when interpolation isn't `bezier`.
- Direction is a 4-segment segmented control (icon for in / out / in-out / auto).

**Optional graph-editor preview (stretch goal):**
Render a small inline SVG sparkline showing the easing curve from this keyframe to the next, updating live as the user changes equation/direction. Keeps the "what does this look like" feedback Blender's curve editor gives, without the cost of a real graph editor.

**Right-click keyframe → context menu** mirrors Blender's: Interpolation submenu, Easing submenu (equations), Easing Type submenu (directions). Same actions as the inspector chips, faster to reach when working in the timeline directly.

### D7. Preview broken / opacity does nothing
At least one of: the preview pane isn't running the animation engine, or opacity values aren't applied to the rendered DOM, or the value resolution falls back wrong. Diagnose via the existing render tree pipeline (`computeTrackFrame` → `frameStyle` in `WYSIWYGOverlay.svelte` / equivalent for `sl`).

### D8. Static fallback for empty playhead positions
If a property has no keyframes (or the playhead is before the first one), the rendered value comes from the **static component's base style**, not from "0" or "undefined". E.g. an opacity track with no keyframes should display `opacity: 1` because that's the base style.

---

## E. Number-box ergonomics (animation editor)

### E1. Stepped cycling with held-modifier acceleration
The number inputs in the keyframe inspector should:
- Increment / decrement by a sensible step on arrow keys / scroll.
- Hold Ctrl to cycle faster (10× step).
- Step size is property-dependent: opacity 0.01, x/y 1, rotation 1°, scaleX/scaleY 0.01.

This applies to **all** timeline editors with number boxes (camera preset and overlay animation).

---

## Cross-references

- The camera preset editor ([AnimationPresetEditor.svelte](src/svelte/components/director/AnimationPresetEditor.svelte)) and the overlay animation workspace ([AnimationWorkspace.svelte](src/svelte/composer/AnimationWorkspace.svelte)) share several patterns (keyframe markers, drag/lasso, scrub). Keep the patterns in sync — when one editor gains a feature (D2, D3, D4, E1), the other should follow.

---

## Suggested implementation order

1. **C1** (inline preview direction) — five-minute CSS fix
2. **A3** (drop Full Preview) — pure deletion
3. **B2** + **B3** (template list cleanup) — touches one file
4. **B4** (Roll Reveal works) — likely a wiring bug in template create
5. **A4** (rename Simple→Inline / WYSIWYG→Canvas)
6. **B1** (HP/Name as inline)
7. **A2** (tab structure rework — biggest UI change in this layer)
8. **A1** (empty-state splash redesign)
9. **D-series** in order — D7 (preview broken) first, then D1, D2, D3, D4, D6, D8
10. **E1** (number-box stepping)
11. **D5** (static-track simplified view) — last, polish
