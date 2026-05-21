# Testing Plan (deferred until after optimization phase)

This is the test-harness plan we agreed on. It is deferred until after the architectural optimization work (trigger registry, render tree, `tileBy`, director preset editor UX) lands. Do not act on this file until that phase is complete.

## Goals
- Minimize the E2E surface. Playwright tests only cover things that genuinely need a running Foundry: actor data resolution through a rendered component, camera behavior, settings integration, director driving.
- Move pure UI logic (Select, AnimationEditor logic, picker behavior, keyframe math, anything that doesn't touch Foundry) to Vitest component tests.
- The unified trigger substrate (post-optimization) means components no longer call `Hooks.*` directly. Mocking the registry replaces mocking Foundry's hook bus.

## Layer 1 — Vitest component tests
- Add `happy-dom` + `@testing-library/svelte` as devDeps.
- `vitest.config.ts` gets `environment: 'happy-dom'` and the Svelte vite plugin.
- `tests/setup/foundryShim.ts` provides minimal stubs for `globalThis.game.i18n.localize`, `Hooks.on/off/call/once`, `CONFIG.Actor`, `foundry.applications.api`, `getApi()` returning a fake API. Loaded via vitest `setupFiles`.
- Components import the registry from a local module that vitest can `vi.mock` cleanly.

### First component to prove the harness
`src/svelte/components/select/__tests__/Select.test.ts` — mount, search, click an item, multi-mode chip toggle, create-on-the-fly. Proves the harness end-to-end on a real Svelte 5 component with `$bindable`.

### Second component (post-optimization)
`AnimationEditor.test.ts` — once the registry refactor lands and AnimationEditor consumes pure props instead of `getApi()` / `game.i18n`, write a test that clicks the header to expand, clicks `+ Define entrance`, drags a keyframe, asserts callbacks fire with expected payloads.

## Layer 2 — Playwright observation tests
- `tests/ui.spec.ts` sits alongside `tests/overlay.spec.ts`.
- Same hand-prepared world fixture. **Zero world mutation.**
- Flows: open editor → select WYSIWYG layer → component selection works → animation editor expands → trigger config visible → preset row opens with timeline.
- Loose assertions: existence and basic state, not pixel-perfect snapshots.

## Selector strategy (Playwright)
- Add `data-testid` only where Playwright tests anchor.
- Pattern: `data-testid="layer-row-{overlayId}"`, `ae-header`, `ae-tab-{stateKey}`, `ouselect-trigger`, etc.
- Classes stay for styling; `data-testid` is the only test contract.

## Motion control
- Honor `prefers-reduced-motion: reduce` in CSS (transitions go to 0).
- Playwright sets the media on the test context.
- Anything JS-timed (preset playhead RAF) reads `matchMedia('(prefers-reduced-motion: reduce)').matches` and short-circuits.

## What stays Foundry-only
- Camera behavior tests.
- Actor data resolution end-to-end through a rendered component.
- Settings persistence.
- Director driving from Foundry.
- Anything that needs a real Foundry document model.

## Trigger registry hooks into testing
Post-optimization, the registry is the single mock point for reactive behavior. Tests can:
- Create a registry with no Foundry bridges (`new TriggerRegistry()`, register triggers without `bridges`).
- Fire payloads directly: `registry.fire('core.actorData', { actor: fakeActor })`.
- Assert downstream renders update accordingly.

No `Hooks` mocking needed for any test that touches the trigger substrate.

## Migration order (when this phase starts)
1. Add devDeps + vitest config + Svelte plugin.
2. Write `tests/setup/foundryShim.ts` with just enough surface to mount a Select.
3. `Select.test.ts` — prove the harness.
4. Pick one component that consumes the registry — write its test.
5. Add `data-testid` to the elements the first Playwright observation flow needs.
6. Write `tests/ui.spec.ts` with that one flow.
7. Expand both layers opportunistically as components are touched.

---

## Preset animations test additions

The preset-animation feature ([AnimationPresetEditor.svelte](src/svelte/components/director/AnimationPresetEditor.svelte), [cameraSequencePlayer.ts](src/utils/cameraSequencePlayer.ts), broadcast path in [socket.ts](src/utils/socket.ts)) crystallized a lot of behavior that genuinely needs coverage. These slot into the two layers above.

### Layer 1 — Vitest unit tests (pure logic, no Foundry needed)

**`src/utils/__tests__/cameraSequencePlayer.test.ts`** (extend existing file)
- Trailing hold tween — given `preset.durationMs > maxKeyframeTime`, asserting `controller.duration() === durationMs` after construction. Today the player extends with an `ease: 'none'` final segment; verify both that the segment exists and that `clampAndApplyExternal` is called within it.
- Ping-pong cycle math — fake GSAP timeline mock, scrub to `t = durationMs * 1.5`, assert proxy values equal what the forward leg would produce at `t = durationMs * 0.5`.

**`src/svelte/components/director/__tests__/recordingDecimation.test.ts`** (new)
- Extract `simplifyKeyframes` / `rdpSimplify` / `perpDistance` into a sibling `src/utils/keyframeDecimation.ts` first (currently inlined in the Svelte component). Then exercise:
  - Dedup pass: dense samples that barely move within `minDtMs` collapse to first+last.
  - RDP pass: a straight diagonal of 50 samples reduces to exactly 2 (endpoints) at any epsilon ≥ 1px.
  - L-shape: 20 forward, sharp turn, 20 sideways → reduces to 3 (corner is preserved).
  - End sample is always retained even when collinear.

**`src/utils/__tests__/cameraPresets.test.ts`** (new)
- `CameraPreset.durationMs` round-trips through `readPresets`/`writePresets` on a mocked scene flag.
- Legacy presets without `durationMs` open without error; player falls back to `maxKeyframeTime`.

**`src/svelte/components/director/__tests__/animationPresetEditor.test.ts`** (post-Layer-1-harness)
- Multi-select via list-row Ctrl+click toggles `selectedIndices` correctly (add, remove, sorted order).
- `Backspace` on the window with focus on the root removes every selected keyframe and clears selection.
- Reducing `totalMs` below the latest keyframe shows the confirm dialog stub; on confirm, keyframes past the new bound disappear and playhead clamps.
- Ctrl-drag on the strip sets the lasso `DragKind`, the mouseup finalizes selection to keyframes whose `time ∈ [lo, hi]`.
- Multi-drag from a selected dot shifts every selected keyframe by the same delta and recovers `selectedIndices` from the post-sort permutation.

### Layer 2 — Playwright observation (`tests/ui-presets.spec.ts`, new)

Same hand-prepared fixture world. The animated preset (`Preset 1`) is already in the test world.

- Director → Presets tab → click "Edit keyframes" on the animated preset → asserts that the `AnimationPresetEditor` window mounts and the timeline tick labels (`0.00s`, the last label, etc.) are visible.
- Click play → assert that after `min(presetDurationMs, 1000)`ms the OBS page's `[data-overlay-id]` or the canvas pan position has moved (this is the only path that genuinely needs Foundry).
- Click the stop button in PresetsTab → assert no stack trace + no pending preset on OBS side (observe-only via a status flag on the API surface).
- Backspace with one keyframe selected → keyframe count decrements by 1.

### Selectors to add
Anchor the Playwright tests on these `data-testid`s (none added yet):
- `data-testid="ape-root"` on `.ape`
- `data-testid="ape-play"` / `ape-stop` on the play/stop toolbar buttons
- `data-testid="ape-record"` on the record button (whichever state is showing)
- `data-testid="ape-kf-{idx}"` on each list row
- `data-testid="ape-dot-{idx}"` on each timeline marker
- `data-testid="ape-lasso"` on the lasso rectangle
- `data-testid="preset-row-{presetId}"` on each row in PresetsTab
- `data-testid="presets-stop"` on the stop-all button
- `data-testid="preset-edit-{presetId}"` / `preset-play-{presetId}` on the row actions

### Test-world fixture additions
The current Playwright fixture has `Preset 1` (animation) and `Preset 2` (static). For preset-animation coverage we want also:
- A keyframe-heavy preset (≥15 keyframes) for decimation/multi-drag observation
- A pingpong preset (`loop: 'pingpong'`, `durationMs` greater than max keyframe time) so the bounce trailing-hold is exercised through Playwright

These are world-prep additions, not programmatic seeding (per the no-test-mutation rule).
