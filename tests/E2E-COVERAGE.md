# E2E suite coverage

Measured 2026-10-19 from the post-battery full profiling run (970 cases, 958 passed / 1 failed / 8 flaky / 3 skipped in 1.1h at 5 workers) merged with a solo top-up run of `everyFeature.spec.ts` + `Options.spec.ts` (50 passed / 1 flaky). The full run under-executed the live sweeps under load — the top-up restored them, and the harness unions every raw record (994 in total), which is the sound way to combine runs. Harness: `scripts/coverage-report.mjs` — development build (inline source maps), `PLAYWRIGHT_COVERAGE=1` V8 precise coverage of the extension's own scripts on every test page, merged by monocart's range tree and mapped back to TypeScript sources. Interactive report with per-file line detail: `coverage/report/index.html`; the full per-file tables in readable form: `coverage/report/coverage-details.md`.

The devtools panel is **not part of the measurement**: its smoke spec executed `panel.html` for one interim run, proved the data pipeline dead outside a real DevTools window, and was deleted. Its components therefore sit outside these denominators, exactly as in the 2026-10-18 report — the figures below are directly comparable to it.

Executed is not asserted: a line the suite runs is not a line the suite would notice breaking. The structural section is where the battery program's value actually lives; the V8 figures mostly count paths the suite already walked.

## Headline

| Measure    | Coverage | Covered | Total  |
| ---------- | -------- | ------- | ------ |
| Statements | 85.8 %   | 9,702   | 11,310 |
| Branches   | 72.9 %   | 4,577   | 6,278  |
| Functions  | 91.0 %   | 2,733   | 3,003  |

Identical denominators to the 2026-10-18 report (85.6 / 72.7 / 90.9), so the comparison is direct: the battery program added **+24 newly covered statements, +13 branches, +2 functions** — small, and the expected shape of an assertion-layer program. The genuinely new execution is the error and edge paths the new tests opened: videoHistory's reload-startup prompt rebuild, the gesture feature's floor and ceiling clamps, placement relocation through the orchestrator, the two-page reload pause path. Everything else the ~60 new tests assert had already been executed by some older test; what they closed was the regression classes (page gates, lifecycle idempotence, live config delivery, startup re-application) that an execution metric never measured in the first place.

An interim run earlier the same day read 82.2 % statements with 627 extra devtools statements in the denominator — that artifact is documented in git history and is not a regression; the one-run measurement of the devtools components (12.9 % / 4.4 %) belongs to the rejected approach, and the two findings it surfaced are recorded under product findings below.

## By area

| Area             | Files | Statements % | Branches % | Functions % |
| ---------------- | ----- | ------------ | ---------- | ----------- |
| src/components   | 91    | 87.6         | 75.5       | 92.2        |
| src/_setup       | 4     | 73.3         | 60.0       | 68.2        |
| src/i18n         | 7     | 75.6         | 60.0       | 83.3        |
| src/utils        | 65    | 76.9         | 68.2       | 86.4        |
| src/validation   | 2     | 85.9         | 74.6       | 100.0       |
| src/features     | 219   | 88.1         | 75.0       | 92.2        |
| src/hooks        | 14    | 89.0         | 72.7       | 97.2        |
| src/ui           | 3     | 90.4         | 71.6       | 93.1        |
| src/pages        | 12    | 92.2         | 68.8       | 94.0        |

`src/chunks` and `src/preload-helper.js` are bundler runtime, not product logic. The 16 zero-execution files are barrels or never-built pages (devtools loader included), plus `src/utils/format/error.ts` and `src/utils/config/env.ts`; no feature file is among them.

## Structural audit: the battery program closed every applicable row

All 68 registered features have real specs. The 2026-10-19 battery program (~85 tests) closed the audit's rows:

| Battery item | State after the program |
| --- | --- |
| Survives a full page reload | 68 / 68 (6 specs gained tests, `8bdbb877`) |
| Survives disable then re-enable | covered — 5 written, 6 verified already covered under other wording |
| SPA navigation behaviour | covered — 13 written (`playbackSpeedBoostGesture` already had its re-arm case) |
| Off by default | covered — 27 instances across 16 specs, 3 verified already covered |
| Non-target page | 23 / 23 page-scoped features; the 12 all-pages features are n/a by definition (their guard is everyFeature's every-page sweep) |
| While-enabled config change | 25 / 25 applicable multi-key features; 14 verified already covered under other wording, 5 written (placement live-change), 2 n/a by product shape, 1 not multi-key |

The audit's original keyword-scan denominators were too pessimistic: 20 "missing" tests already existed under other wording. The program's real output was ~60 genuinely new tests plus the correction of the denominators themselves.

## Product findings the program surfaced (work for `dev`, not test gaps)

1. **`playerQuality` ships no `onConfigChange` handler** — changing quality in the settings while the feature is on does nothing until a re-enable or reload, though the UI implies it applies live.
2. **`videoHistory.resumeType` is only read at `onEnable`/`onNavigate`** — a live change needs a navigation to take effect.
3. **The devtools panel's data bridge needs a real DevTools window** — `devtools_get_*` requests forwarded by the background never receive a `data_response` outside one, and without any YouTube tab the Feature Status grid crashes on an unguarded `response.data.features` read (`src/components/devtools/hooks/useDevToolsQuery.ts:36`) that bypasses the panel's own ErrorBoundary. A smoke spec proved the mount works and the data path does not; the spec was deleted as unviable, and these two facts are the actionable residue.

## Weakest feature folders (statements)

| Feature | Stmts % | cov/total | Branch % | cov/total |
| --- | --- | --- | --- | --- |
| openTranscriptButton | 78.6% | 11/14 | 50.0% | 4/8 |
| playlistManagementButtons | 78.9% | 187/237 | 61.5% | 72/117 |
| _registry | 81.0% | 849/1048 | 73.8% | 525/710 |
| defaultToOriginalAudioTrack | 82.4% | 103/125 | 80.2% | 73/91 |
| pauseBackgroundPlayers | 82.6% | 38/46 | 75.0% | 18/24 |
| saveToWatchLaterButton | 84.2% | 171/203 | 69.0% | 80/116 |

`playlistManagementButtons` remains the largest untested surface: its unexercised branches are the Innertube failure paths (request rejected, row absent, history lagging), which no live test can reach deterministically — those want stubbed-response tests. `_registry` is low per-spec but reached through every spec plus everyFeature; its unmet branches are the stripped-page guards that everyFeature exists for.

## Regenerating

Same harness as September (`scripts/coverage-report.mjs`; `monocart-coverage-reports` is a committed devDependency). Build with `NODE_ENV=development BYPASS_LOCALE_CHECK=true pnpm run build`, run `PLAYWRIGHT_COVERAGE=1 pnpm exec playwright test --project=chromium` (never pass `--reporter` — it clobbers the config's HTML report), then `node --max-old-space-size=8192 scripts/coverage-report.mjs` (the default heap OOMs on a full run's raw records). If the full run was heavily loaded and the live-sweep coverage looks thin, a solo `PLAYWRIGHT_COVERAGE=1` run of `everyFeature.spec.ts` + `Options.spec.ts` merges cleanly into the same raw set. Raw records: `coverage/raw`; interactive report: `coverage/report/index.html`.
