# Domain glossary

Terms used by architecture reviews, AGENTS.md, and feature code. Keep this file current when a deepened module names a new concept.

## Config store

The single in-page owner of extension configuration for the content/embedded runtime. Implemented by `src/ui/configProvider.ts`.

- **Sole writer:** bootstrap `seed`, navigation `reseedForNavigation`, storage broadcasts, and orchestrator config changes via `applyFeatureConfig`.
- **Reads:** `featureConfigManager.getLast` / `getLastOr` for per-feature configs; `getDeepDarkCSSConfig`, `getFeatureMenuConfig`, `getOnScreenDisplayConfig` for core slices.
- **Contract:** `getLast` returns `undefined` when unseeded and never throws. Lifecycle callbacks receive `lastConfig ?? feature.defaults`.

## Feature config cache

The per-feature Map of last-applied configs inside the config store (`featureConfigManager`). Read-only from feature modules. Not a second public answer: core slices and the snapshot live on the same store.

## Core config slices

Config groups that are not registry features: `deepDarkCSS`, `featureMenu`, `onScreenDisplay`. Seeded with the snapshot; feature modules may update them through provider setters that write the same store.

## Readiness seam

Player-presence waits live in `src/utils/dom/readiness.ts` behind a single `whenReady(target, options)` interface. No `pageReadiness` module; call sites import readiness directly.

- **Targets:** `pagePlayer`, `pagePlayerReady`, `moviePlayer`, `belowPlayerRoot`, `playerControls`, `playerShell`.
- **Memo:** generation-shared by default for `pagePlayer` / `pagePlayerReady` (navigation + retry seam). Other targets are independent budget waits.
- **Live refine:** `refineLiveFlagFromPlayer` polls the movie player for `isLive` without importing URL classification. `refinePageTypeFromPlayer` in `utils/url` owns the watch gate and page-type cache write.
- **Generic DOM waits** (`waitForElement`, `waitForAllElements`) stay in `src/utils/dom/wait`. Do not wait for the player through them; use `whenReady`.
- **Mutation bus:** detached subscriber `parent`s are observed (refcounted roots). `domMutationBusCapabilities.supportsDetachedSubtrees` is true.

## Retry seam

One in-process module for retry-shaped work: `featurePlayerManager` behind `registry.playerRetry`.

- **Interface:** `playerRetry(key, tasks, taskNames, config)` with budget fields (`interval`, `maxAttempts`, `overallTimeout`, `minIntervalBetweenAttempts`, `pageTypes`, `skipPageGate`) and cancellation (`signal`, lifecycle token).
- **Keys:** feature ids, core features (`featureMenu`), and `"navigation"` for signature retries.
- **Cancellation:** generation supersede per key; optional caller `AbortSignal`; lifecycle token aborted by `cancelRetries` **before** `onDisable`. `onPlayerStateChange` re-queues check the token.
- **Not behind this seam:** `waitForElement` / page readiness waits (candidate 03).

## Enablement entry points

- **Cold load:** `registry.enableRegisteredForCurrentPage()` — page-matching features not yet enabled; priority placement batch then lifecycle.
- **SPA navigation:** `runNavigationPipeline` — reseed config, diff page + config, per-feature work list.
- **No `enableAll`:** deleted; there is no full re-enable sweep entry.
- **Placement recheck:** `placementNeedsRecheck(outcomes)` on buttonPlacement; callers schedule, they do not re-encode outcome meaning.

## Navigation gate

The navigation manager owns the in-flight gate. Events that arrive while a pipeline run is in flight are queued as a single pending event and drained in `processNavigation` finally (after live-refine re-arm). Signature + `VOLATILE_URL_PARAMS` live in `src/utils/url/signature.ts`, not on the manager.

## Embedded instance liveness

Page-wide protocol that prevents stacked embedded scripts and gates content-script storage forwarding.

- **Module:** `src/utils/embedded/instanceLiveness.ts`
- **Slot:** `claimSlot` / `releaseSlot` / `getActiveSlotId` on `window.__yteEmbeddedActiveId` (page world).
- **Ready marker:** `markReady` sets `data-yte-embedded-ready` on `document.documentElement` so the content script (isolated world) can `waitForReady` before forwarding storage.
- **Adapters:** takeover timing is caller config (`timeoutMs`, `onTakeover`) — dev posts dispose + waits 1500ms; prod waits 200ms.
- **pageLoaded:** still sent on the message bus as a faster path; readiness marker is the liveness contract.

## Placement outcome

What button placement reports after a pass: `deferred | inactive | landed | removed | unchanged`. Owned by `buttonPlacement`; the navigation pipeline consumes outcomes and does not re-encode their meaning.

## Placement state

Module-owned maps in buttonPlacementState.ts: tracked feature buttons (name to state) and placement container nodes. Name-based accessors only; no second public map of what landed.

## Button config path

Button settings resolve via feature metadata (button.path = button or buttons) through resolveButtonConfig(config, featureId, buttonName). No dual-shape probe at placement time.
