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
