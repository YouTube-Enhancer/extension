# E2E suite coverage

Measured 2026-10-18 from a full profiling run of the suite (895 cases, 889 passed / 0 failed / 3 flaky / 3 skipped in 58.6 min at 5 workers, 910 V8 coverage records) with the harness in `scripts/coverage-report.mjs`: a development build (inline source maps), `PLAYWRIGHT_COVERAGE=1` recording V8 precise coverage of the extension's own scripts on every test page, merged by monocart's range tree and mapped back to TypeScript sources. Interactive report: `coverage/report/index.html`.

Executed is not asserted: a line the suite runs is not a line the suite would notice breaking. The per-feature section below pairs the measured figures with the structural analysis of each spec, which is where the actionable gaps are.

## Headline vs the September baseline

| Measure    | 2026-09-07 | 2026-10-18 | Code total then → now |
| ---------- | ---------- | ---------- | --------------------- |
| Statements | 89.9 %     | 85.6 %     | 9,990 → 11,310        |
| Branches   | 74.8 %     | 72.7 %     | 5,114 → 6,278         |
| Functions  | 95.2 %     | 90.9 %     | 2,465 → 3,003         |

The percentages fell, but the suite executes more code than it ever has: covered statements grew 8,978 → 9,678, covered branches 3,826 → 4,564, covered functions 2,347 → 2,731. The codebase grew roughly 13–23 % in six weeks (playbackSpeedBoostGesture, keywordBlocklist, the mutation-bus and playlist work, among others) and the ratios fell because production grew faster than tests. Nothing regressed; the debt is "new features landed without proportional new coverage".

Not measured, because page coverage cannot see it: the background service worker (`src/pages/background`), the popup (`src/pages/popup`), and the developer-tools pages (built only in development builds; their components read 0 % below). Also excluded by the harness: tests, the build pipeline, and the registry's performance tracker.

## By area

| Area             | Statements % | Branches % | Zero-execution files |
| ---------------- | ------------ | ---------- | -------------------- |
| src/features     | 87.9         | 74.6       | 0                    |
| src/components   | 87.4         | 75.5       | 12                   |
| src/pages        | 92.2         | 68.2       | 1                    |
| src/ui           | 90.4         | 71.6       | 0                    |
| src/hooks        | 89.9         | 79.5       | 1                    |
| src/validation   | 85.9         | 74.6       | 0                    |
| src/utils        | 76.8         | 68.2       | 2                    |
| src/i18n         | 75.6         | 60.0       | 0                    |
| src/_setup       | 73.3         | 60.0       | 0                    |
| src/chunks       | 43.2         | 40.3       | 0                    |

`src/chunks` and `src/preload-helper.js` are bundler runtime helpers (rolldown), not product logic; the low numbers there are instrumentation artifacts of generated code. The real soft spots are `src/_setup` (the embedded bootstrap's defensive paths, only reachable on broken pages — the everyFeature stripped-page cases are what reach most of it), `src/i18n` (locale-migration branches no test drives), and `src/utils` (two files below).

The 16 zero-execution files are all barrels or never-built pages: the `Inputs/*/index.tsx` re-export barrels, `hooks/index.ts`, `Settings/sections/index.tsx`, the devtools loader and its translation hook, and `pages/devtools/index.ts`. Two are real gaps rather than barrels: `src/utils/format/error.ts` (error-formatting helpers no test calls) and `src/utils/config/env.ts` (build-time constants, effectively dead at runtime in the tested build). No feature file is among them.

## Structural audit of the feature specs

All 68 registered features have a real spec (no empty generated placeholders remain); the feature specs contribute 637 tests on top of the options, everyFeature, buttonController and infrastructure specs. Scanning each spec for the standard battery documented in `tests/README.md`:

| Battery item                    | Features covered |
| ------------------------------- | ---------------- |
| Survives a full page reload     | 62 / 68          |
| Survives disable then re-enable | 57 / 68          |
| SPA navigation behaviour       | 54 / 68          |
| Off by default                  | 49 / 68          |
| Non-target page                 | 33 / 68          |
| While-enabled config change     | ~10 / 68         |

Caveat: these are keyword scans, so a spec that derives its page list from metadata reads as missing a literal page name; the lists below were hand-checked against that.

- **No reload test** (6): `defaultToOriginalAudioTrack`, `pauseBackgroundPlayers`, `remainingTime`, `restoreFullscreenScrolling`, `screenshotButton`, `videoHistory`.
- **No non-target test** (35): half the suite never proves its feature stays off where it should. Page-gate regressions are a live class — the shallow-mutation-bus round produced exactly this failure shape in removeRedirect before it got its test.
- **`onConfigChange` or `onNavigate` never exercised in-spec** (17): `automaticallyDisableAutoPlay`, `customFontFamily`, `globalVolume`, `hideLiveStreamChat`, `hideShorts`, `keywordBlocklist`, `loopButton`, `miniPlayer`, `playbackSpeedBoostGesture`, `playlistManagementButtons`, `remainingTime`, `restoreFullscreenScrolling`, `scrollWheelSpeedControl`, `scrollWheelVolumeControl`, `shortsAutoScroll`, `timestampPeek`, `videosPerRow`. Single-key features where the hook only sees on/off are low risk; the multi-key ones (`globalVolume`, `scrollWheel*`, `videosPerRow`, `customFontFamily`, `keywordBlocklist`) are the real gaps.
- The three "config keys no spec writes" (`maximizePlayerButton.isProgrammaticClick`, `miniPlayer.manualOverride`, `videoHistory.storage`) are internal state keys, not user settings — not gaps.

## Weakest feature folders (statements / branches)

| Feature                       | Statements % | Branches % | Size |
| ----------------------------- | ------------ | ---------- | ---- |
| playlistManagementButtons     | 78.1         | 62.4       | 237  |
| openTranscriptButton          | 78.6         | 50.0       | 14   |
| _registry                     | 80.4         | 72.8       | 1048 |
| defaultToOriginalAudioTrack   | 81.6         | 79.1       | 125  |
| pauseBackgroundPlayers        | 82.6         | 75.0       | 46   |
| saveToWatchLaterButton        | 84.7         | 69.8       | 203  |
| customCSS                     | 85.2         | 62.5       | 27   |
| videoHistory                  | 85.3         | 73.3       | 217  |
| playerQuality                 | 85.5         | 70.9       | 207  |

`playlistManagementButtons` is the standout: the largest untested surface, the weakest branches, and its `:347` test is the suite's most fragile (Innertube history round-trips on a live account). The unexercised branches are mostly the failure paths — request rejected, row absent, history lagging — which no live test can reach deterministically; those want stubbed-response tests rather than more live assertions. `_registry` is low per-spec but reached through every spec plus everyFeature; its unmet branches are the stripped-page guards the everyFeature suite exists for.

## What to do about it, in order of value

1. **Non-target tests for the multi-page features.** 35 features lack one; every shallow-observer or page-gate regression shows up as "feature leaked onto a page it should not touch". The metadata-derived `resolveNonTargetPage` pattern makes these cheap (~10 lines each).
2. **The six missing reload tests.** The storage → startup → apply pipeline is where regressions hide; each test is ~10 lines with the standard skeleton.
3. **Live config-change tests for the multi-key features** (`globalVolume`, `scrollWheelSpeedControl`, `scrollWheelVolumeControl`, `videosPerRow`, `customFontFamily`, `keywordBlocklist`): set the secondary key while enabled, assert the behaviour updates without a reload. This is the `onConfigChange` path nobody covers.
4. **playlistManagementButtons failure paths via stubs.** The one place where a live E2E cannot reach the interesting branches at all.
5. **`openTranscriptButton`** — 14 statements at 50 % branches; cheap to close by asserting its error path (transcript unavailable).

## Provenance

Same harness as September (`scripts/coverage-report.mjs`, now with `monocart-coverage-reports` committed as a devDependency — it had been a local-only install, which is why the script used to fail on a fresh clone). Baseline comparison figures: the 2026-09-07 entry of this file in git history. Raw records for this run: `coverage/raw` (910 files); the interactive report at `coverage/report/index.html` browses per-file line detail.
