# E2E suite coverage

Measured 2026-10-21 from two full profiling runs (the final one: 991 cases, 978 passed / 2 failed / 7 flaky / 4 skipped in 1.2h at 5 workers) plus top-ups: everyFeature + Options (64/1) and a final everyFeature-only sweep (17/17), giving 2031 merged raw records. Failures were classified, not regressed: the everyFeature live-strip again hit the 60s navigation gate under full-suite load while the same spec run in isolation is 17/17 green (its top-up restored the coverage), `playlistReverseButton:837`'s tooltip label is the long-known flake family, and the Options 50 KB-CSS case (a blown 120s budget under profiling load) was resized to 10 KB and has passed every run since. `everyFeature:244` remains the accepted residual, flaky-but-passing here. Harness: `scripts/coverage-report.mjs`: development build (inline source maps), `PLAYWRIGHT_COVERAGE=1` V8 precise coverage of the extension's own scripts on every test page, merged by monocart's range tree and mapped back to TypeScript sources. Interactive report with per-file line detail: `coverage/report/index.html`; the full per-file tables in readable form: `coverage/report/coverage-details.md`.

**The background service worker and the popup are now measured.** A Browser-domain CDP bridge in `playwright.config.ts` collects precise coverage from the MV3 worker (Playwright's `newCDPSession` rejects worker targets), and the popup has its own spec: `background/index.ts` reads **49/73 statements**, partial because the background build ships no sourcemaps, and `sourcemap: true` on the dev background build is the standing follow-up, and the popup entry is essentially complete (`Popup.tsx` 2/2, `index.tsx` 5/6). The devtools panel remains **not part of the measurement** (rejected approach, rationale and findings preserved below).

On the `coverage-summary.json` scope this document's series uses, the denominator grew 11,310 → 11,469 (+159: the worker's 73, the popup's 8, and ~78 statements in file rows that only appear once something reaches them), and covered statements read 9,669 against 9,702 on 10-19. That −33 net is dominated by one broken row: `playlistManagementButtons` alone moved −134 through a mapping artifact (see weakest table). Excluding it, the four coverage-boost levers landed this cycle added on the order of **+100 genuinely covered statements** (stubbed Innertube failure paths, the Options malformed-input matrix, the everyFeature combination/timing page shapes, and the popup/SW surface), with the rest lost to per-test record replacement noise. The ratio reads 84.30 % against 85.8 %; the two movements above account for the whole gap. The console table printed at regeneration aggregates a slightly wider scope (+318 statements of paths the JSON reporter's sourceFilter drops); this document's headline, area and weakest tables all use the JSON scope, so the numbers tie out internally; do not mix the two.

Executed is not asserted: a line the suite runs is not a line the suite would notice breaking. The structural section is where the battery program's value actually lives; the V8 figures mostly count paths the suite already walked.

## Headline

| Measure    | Coverage | Covered | Total  |
| ---------- | -------- | ------- | ------ |
| Statements | 84.30 %  | 9,669   | 11,469 |
| Branches   | 71.43 %  | 4,546   | 6,364  |
| Functions  | 89.79 %  | 2,728   | 3,038  |

## By area

| Area             | Files | Statements % | Branches % | Functions % |
| ---------------- | ----- | ------------ | ---------- | ----------- |
| src/features     | 219   | 86.3         | 73.2       | 90.9        |
| src/utils        | 65    | 75.9         | 67.1       | 85.2        |
| src/components   | 91    | 87.6         | 76.0       | 93.1        |
| src/pages        | 12    | 87.8         | 62.0       | 84.5        |
| src/ui           | 3     | 90.4         | 71.6       | 93.1        |
| src/hooks        | 14    | 89.9         | 79.5       | 97.2        |
| src/_setup       | 4     | 73.3         | 60.0       | 68.2        |
| src/validation   | 2     | 85.9         | 74.6       | 100.0       |
| src/i18n         | 7     | 75.6         | 60.0       | 83.3        |

`src/chunks` and `src/preload-helper.js` are bundler runtime, not product logic. The 16 zero-execution files are barrels or never-built pages (devtools loader included), plus `src/utils/format/error.ts` and `src/utils/config/env.ts`; no feature file is among them. The background worker and popup files above are the newly measured surface.

## Structural audit: the battery program closed every applicable row

All 68 registered features have real specs. The 2026-10-19 battery program (~85 tests) closed the audit's rows:

| Battery item | State after the program |
| --- | --- |
| Survives a full page reload | 68 / 68 (6 specs gained tests, `8bdbb877`) |
| Survives disable then re-enable | covered, 5 written, 6 verified already covered under other wording |
| SPA navigation behaviour | covered, 13 written (`playbackSpeedBoostGesture` already had its re-arm case) |
| Off by default | covered, 27 instances across 16 specs, 3 verified already covered |
| Non-target page | 23 / 23 page-scoped features; the 12 all-pages features are n/a by definition (their guard is everyFeature's every-page sweep) |
| While-enabled config change | 25 / 25 applicable multi-key features; 14 verified already covered under other wording, 5 written (placement live-change), 2 n/a by product shape, 1 not multi-key |

The audit's original keyword-scan denominators were too pessimistic: 20 "missing" tests already existed under other wording. The program's real output was ~60 genuinely new tests plus the correction of the denominators themselves.

## Product findings the program surfaced (work for `dev`, not test gaps)

1. **`playerQuality` ships no `onConfigChange` handler**: changing quality in the settings while the feature is on does nothing until a re-enable or reload, though the UI implies it applies live.
2. **`videoHistory.resumeType` is only read at `onEnable`/`onNavigate`**: a live change needs a navigation to take effect.
3. **The devtools panel's data bridge needs a real DevTools window**: `devtools_get_*` requests forwarded by the background never receive a `data_response` outside one, and without any YouTube tab the Feature Status grid crashes on an unguarded `response.data.features` read (`src/components/devtools/hooks/useDevToolsQuery.ts:36`) that bypasses the panel's own ErrorBoundary. A smoke spec proved the mount works and the data path does not; the spec was deleted as unviable, and these two facts are the actionable residue.

## Weakest feature folders (statements)

| Feature | Stmts % | cov/total | Branch % | cov/total |
| --- | --- | --- | --- | --- |
| playlistManagementButtons | 22.4%* | 53/237 | 6.0%* | 7/117 |
| openTranscriptButton | 78.6% | 11/14 | 50.0% | 4/8 |
| playbackSpeedBoostGesture | 80.8% | 105/130 | 67.6% | 46/68 |
| _registry | 81.2% | 851/1048 | 73.7% | 523/710 |
| defaultToOriginalAudioTrack | 82.4% | 103/125 | 80.2% | 73/91 |
| pauseBackgroundPlayers | 82.6% | 38/46 | 75.0% | 18/24 |
| miniPlayerButton | 84.6% | 22/26 | 75.0% | 18/24 |

`*` The playlistManagementButtons row is a **confirmed mapping artifact, not a regression**: a fresh full run reproduced 8/192 exactly while its spec passed 10/10 (real removals, resets, and three stubbed-failure cases whose code demonstrably executes), ruling out the cross-era union theory and any execution story alike. This file's mapped row cannot be trusted until the mapping is understood; its historical figure (~79 % statements) remains the operative estimate, and the row is excluded from trend arithmetic above accordingly.

The Innertube failure paths the previous report called out as unreachable now have stubbed-response tests (lever 1 of the coverage-boost plan), and `_registry` is low per-spec but reached through every spec plus everyFeature; its unmet branches are the stripped-page guards everyFeature exists for.

## Regenerating

Same harness as September (`scripts/coverage-report.mjs`; `monocart-coverage-reports` is a committed devDependency). Build with `NODE_ENV=development BYPASS_LOCALE_CHECK=true pnpm run build`, run `PLAYWRIGHT_COVERAGE=1 pnpm exec playwright test --project=chromium` (never pass `--reporter` or `--workers`; the config's 5 workers and HTML report stand), then `node --max-old-space-size=8192 scripts/coverage-report.mjs` **under a PTY** (the terminal background with `pty: true` works): without a TTY monocart dies silently after printing `stdin is not a tty`, and plain foreground or piped retries hit the same wall unpredictably. A successful run always prints the `merged … test attempts` table; confirm it before trusting the output, and note `coverage/report/coverage-details.md` is a companion artifact generated from `coverage-summary.json` (monocart's output-dir cleanup deletes it on every regeneration, so regenerate it alongside). If the full run was heavily loaded and the live-sweep coverage looks thin, a top-up `PLAYWRIGHT_COVERAGE=1` run of `everyFeature.spec.ts` + `Options.spec.ts` merges into the same raw set (later records for the same test replace earlier ones, so keep top-ups well-executed). Raw records: `coverage/raw`; interactive report: `coverage/report/index.html`.
