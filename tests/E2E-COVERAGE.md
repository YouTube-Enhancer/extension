# E2E suite coverage

Measured 2026-10-19 from a full profiling run of the suite after the battery program (974 cases, 962 passed / 0 failed / 7 flaky / 5 skipped in 1.1h at 5 workers, 992 V8 coverage records) with the harness in `scripts/coverage-report.mjs`: a development build (inline source maps), `PLAYWRIGHT_COVERAGE=1` recording V8 precise coverage of the extension's own scripts on every test page, merged by monocart's range tree and mapped back to TypeScript sources. Interactive report with per-file line detail: `coverage/report/index.html`; the full per-file tables in readable form: `coverage/report/coverage-details.md`.

Executed is not asserted: a line the suite runs is not a line the suite would notice breaking. The structural section below is where the battery program's value actually lives; the V8 figures mostly count paths the suite already walked.

## Headline

Raw totals from this run:

| Measure    | Coverage | Covered | Total  |
| ---------- | -------- | ------- | ------ |
| Statements | 82.2 %   | 9,804   | 11,933 |
| Branches   | 67.2 %   | 4,617   | 6,866  |
| Functions  | 83.5 %   | 2,756   | 3,300  |

These are **not directly comparable** to the 2026-10-18 figures (85.6 / 72.7 / 90.9). The devtools components (627 statements) entered the measurement for the first time in this run: the then-existing devtools smoke spec loaded `panel.html` for the first time ever, making those sources mappable. On the **identical 10-18 scope** (excluding `src/components/devtools/`), this run reads **86.0 % statements** (was 85.6 %) and **73.1 % branches** (was 72.7 %) — the battery program's movement, modest by design since new tests mostly re-walk executed paths. The devtools components themselves measured 12.9 % / 4.4 %; that spec has since been deleted (the panel's data pipeline cannot complete outside a real DevTools window — see the product findings below), so future runs will not execute `panel.html` and these sources will mostly drop back out of view.

Not measured, because page coverage cannot see it: the background service worker (`src/pages/background`), the popup (`src/pages/popup`). Also excluded by the harness: tests, the build pipeline, and the registry's performance tracker.

## By area

| Area             | Files | Statements % | Branches % | Functions % |
| ---------------- | ----- | ------------ | ---------- | ----------- |
| src/components   | 91    | 57.9         | 40.5       | 53.8        |
| src/_setup       | 4     | 74.3         | 63.3       | 68.2        |
| src/i18n         | 7     | 75.6         | 60.0       | 83.3        |
| src/utils        | 65    | 77.4         | 68.9       | 86.5        |
| src/validation   | 2     | 85.9         | 74.6       | 100.0       |
| src/features     | 219   | 88.2         | 75.0       | 92.2        |
| src/hooks        | 14    | 89.9         | 79.5       | 97.2        |
| src/ui           | 3     | 90.4         | 71.6       | 93.1        |
| src/pages        | 12    | 92.1         | 68.6       | 92.9        |

`src/components` is low almost entirely because of the devtools components (the settings-page components are exercised by the Options spec); `src/chunks` and `src/preload-helper.js` are bundler runtime, not product logic. The zero-execution list this run has 47 entries, nearly all devtools components made individually visible by the one-off panel load — a run-to-run visibility artifact, not a regression.

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

The audit's original keyword-scan denominators were too pessimistic: 20 "missing" tests already existed under other wording (`setOption`-based config changes, differently-titled navigation cases). The program's real output was ~60 genuinely new tests plus the correction of the denominators themselves.

## Product findings the program surfaced (work for `dev`, not test gaps)

1. **`playerQuality` ships no `onConfigChange` handler** — changing quality in the settings while the feature is on does nothing until a re-enable or reload, though the UI implies it applies live. The spec documents this in a comment; an effect test would assert false behaviour.
2. **`videoHistory.resumeType` is only read at `onEnable`/`onNavigate`** — same class: a live change needs a navigation to take effect.
3. **The devtools panel's data bridge needs a real DevTools window** — `devtools_get_*` requests forwarded by the background never receive a `data_response` outside one, and without any YouTube tab the Feature Status grid crashes on an unguarded `response.data.features` read (`src/components/devtools/hooks/useDevToolsQuery.ts:36`) that bypasses the panel's own ErrorBoundary. The devtools smoke spec was written, proved the mount works and the data path does not, and was deleted; these two facts are the actionable residue.

## Weakest feature folders (statements)

| Feature | Stmts % | cov/total | Branch % | cov/total |
| --- | --- | --- | --- | --- |
| openTranscriptButton | 78.6% | 11/14 | 50.0% | 4/8 |
| playlistManagementButtons | 78.9% | 187/237 | 61.5% | 72/117 |
| _registry | 81.0% | 849/1048 | 73.5% | 522/710 |
| pauseBackgroundPlayers | 82.6% | 38/46 | 75.0% | 18/24 |
| defaultToOriginalAudioTrack | 83.2% | 104/125 | 81.3% | 74/91 |
| saveToWatchLaterButton | 84.7% | 172/203 | 69.8% | 81/116 |

`playlistManagementButtons` remains the largest untested surface: its unexercised branches are the Innertube failure paths (request rejected, row absent, history lagging), which no live test can reach deterministically — those want stubbed-response tests. `_registry` is low per-spec but reached through every spec plus everyFeature; its unmet branches are the stripped-page guards that everyFeature exists for.

## Regenerating

Same harness as September (`scripts/coverage-report.mjs`; `monocart-coverage-reports` is now a committed devDependency). Build with `NODE_ENV=development BYPASS_LOCALE_CHECK=true pnpm run build`, run `PLAYWRIGHT_COVERAGE=1 pnpm exec playwright test --project=chromium` (never pass `--reporter` — it clobbers the config's HTML report), then `node scripts/coverage-report.mjs`. Raw records: `coverage/raw`; interactive report: `coverage/report/index.html`.

## Movement vs the 2026-10-18 report (same scope: devtools excluded)

| Measure | 10-18 | 10-19 | Change |
| --- | --- | --- | --- |
| Statements | 85.6% (9,678 / 11,310) | 86.0% (9,723 / 11,306) | +0.4 pp, +45 newly covered |
| Branches | 72.7% (4,564 / 6,278) | 73.1% (4,591 / 6,278) | +0.4 pp, +27 newly covered |
| Functions | 90.9% (2,731 / 3,003) | 91.1% (2,737 / 3,004) | +0.2 pp, +6 newly covered |

Where the newly covered statements landed: `src/features` +24, `src/utils` +14, the preload
helper +6, `src/_setup` +1 — i.e. the genuinely new execution is the error and edge paths the
battery tests opened: videoHistory's reload-startup prompt rebuild, the gesture feature's floor
and ceiling clamps, placement relocation through the orchestrator, the two-page reload pause
path. Everything else the ~60 new tests assert had already been executed by some older test —
which is the expected shape of an assertion-layer program: it barely moves an execution
metric while closing the classes of regression (page gates, lifecycle idempotence, live config
delivery, startup re-application) that an execution metric never measured in the first place.
