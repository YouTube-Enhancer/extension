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

## Retry seam

One in-process module for retry-shaped work: `featurePlayerManager` behind `registry.playerRetry`.

- **Interface:** `playerRetry(key, tasks, taskNames, config)` with budget fields (`interval`, `maxAttempts`, `overallTimeout`, `minIntervalBetweenAttempts`, `pageTypes`, `skipPageGate`) and cancellation (`signal`, lifecycle token).
- **Keys:** feature ids, core features (`featureMenu`), and `"navigation"` for signature retries.
- **Cancellation:** generation supersede per key; optional caller `AbortSignal`; lifecycle token aborted by `cancelRetries` **before** `onDisable`. `onPlayerStateChange` re-queues check the token.
- **Not behind this seam:** `waitForElement` / page readiness waits (candidate 03).

## Placement outcome

What button placement reports after a pass: `deferred | inactive | landed | removed | unchanged`. Owned by `buttonPlacement`; the navigation pipeline consumes outcomes and does not re-encode their meaning.
