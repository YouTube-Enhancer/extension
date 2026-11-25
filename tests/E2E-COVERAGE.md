# E2E suite coverage

Measured 2026-10-30 from a full profiling run (1002 cases, 980 passed / 4 failed / 16 flaky / 2 skipped in 1.2h at 5 workers), giving 2056 merged raw records after a deliberate re-baseline. The measuring run carried morning load: its four failures passed a coverage-enabled rerun minutes later (gesture shorts drag flaky-recovers on top of that), all 16 flaky retried green, and `playlistManagementButtons:388` sat out in-suite in its solo lane — its records come from a solo coverage pass afterwards (`YTE_SOLO_LANE=1`). The re-baseline archived the accumulated set at `coverage/raw-pre-20261030` when the i18n port changed `src/i18n/index.ts` between eras: records embed the bundle's source text, so the cross-version union froze that file's covered count at 27 while its total inflated to 42 and fabricated a 66.7 % i18n area. The original 10-22 wipe was deliberate, for the reason below: the accumulated set from 10-21 and earlier held two source versions of `playlistManagementButtons/index.ts` and `playbackSpeedBoostGesture/index.ts` (records embed the bundle's source text, so pre-edit runs' copies of a file survive in every unrelated test's record and cannot be evicted by re-running the file's own spec), which collapsed both rows into cross-version line unions (see the weakest table). The old store is archived read-only at `coverage/raw-pre-20261022` (250 MB); everything below is single-era and self-consistent. This run's 4 failures and 16 flaky cases all cleared on a coverage-enabled rerun or a retry (the load family: gesture shorts drag and OSD paint, playlistReverse tooltip, videoHistory disable, plus the usual captions, hideShorts, saved-state and scrollWheel rotation). The reset-progress propagation flake in `playlistManagementButtons:380` was fixed before this run (see below) and stayed green throughout. Harness: `scripts/coverage-report.mjs`: development build (inline source maps), `PLAYWRIGHT_COVERAGE=1` V8 precise coverage of the extension's own scripts on every test page, merged by monocart's range tree and mapped back to TypeScript sources. Interactive report with per-file line detail: `coverage/report/index.html`; the full per-file tables in readable form: `coverage/report/coverage-details.md`.

**The background service worker and the popup are now measured.** A Browser-domain CDP bridge in `playwright.config.ts` collects precise coverage from the MV3 worker (Playwright's `newCDPSession` rejects worker targets), and the popup has its own spec: `background/index.ts` reads **49/73 statements**, and that gap is genuine execution coverage rather than a mapping problem: the dev build's inline sourcemaps serve monocart fine (the file's 73-statement total is known in full from its first record; only the covered count climbed, from 0 to 18 to 49, as more worker paths ran across runs). The standing follow-up there is tests for the unexercised worker paths, such as the `onInstalled` update branches and specific message and alarm handlers, not a build change. The popup entry is essentially complete (`Popup.tsx` 2/2, `index.tsx` 5/6). The devtools panel remains **not part of the measurement** (rejected approach, rationale and findings preserved below).

On the `coverage-summary.json` scope this document's series uses, the re-baselined store reads **85.81 % statements (9,925 / 11,565), 72.69 % branches, 90.89 % functions**, against the 84.30 % the poisoned store reported on 10-21. The whole movement is the healed `playlistManagementButtons` row plus the removal of its era noise, so this is the new honest baseline rather than a coverage change. On this run the console table printed at regeneration and the JSON scope agree (both 11,565 statements); older documents warned the two scopes differ by +318 statements, which no longer holds for a single-era store, but this document's tables still quote the JSON scope exclusively.

Executed is not asserted: a line the suite runs is not a line the suite would notice breaking. The structural section is where the battery program's value actually lives; the V8 figures mostly count paths the suite already walked.

## Headline

| Measure    | Coverage | Covered | Total  |
| ---------- | -------- | ------- | ------ |
| Statements | 85.81 %  | 9,925   | 11,565 |
| Branches   | 72.69 %  | 4,649   | 6,395  |
| Functions  | 90.89 %  | 2,776   | 3,054  |

## By area

| Area           | Files | Statements % | Branches % | Functions % |
| -------------- | ----- | ------------ | ---------- | ----------- |
| src/features   | 220   | 88.4         | 75.0       | 92.4        |
| src/utils      | 65    | 77.2         | 68.0       | 86.0        |
| src/components | 91    | 87.5         | 75.8       | 92.8        |
| src/pages      | 12    | 87.8         | 61.5       | 84.5        |
| src/ui         | 3     | 90.4         | 71.6       | 93.1        |
| src/hooks      | 14    | 89.9         | 79.5       | 97.2        |
| src/_setup     | 4     | 73.3         | 60.0       | 68.2        |
| src/validation | 2     | 85.9         | 74.6       | 100.0       |
| src/i18n       | 7     | 76.4         | 63.0       | 77.8        |

`src/chunks` and `src/preload-helper.js` are bundler runtime, not product logic. The clean store lists 84 zero-execution files against the multi-run store's 16: the difference is mostly the devtools panel components (the excluded surface, whose earlier nonzero rows came from the since-deleted smoke spec's records), plus re-export-only barrels such as `Inputs/CSSEditor/index.tsx` and `buttonController/index.ts`, never-mounted generic input wrappers, and build-time scripts such as the i18n maintenance utilities. No feature implementation file is among them. The background worker and popup files above are the newly measured surface.

## Structural audit: the battery program closed every applicable row

All 68 registered features have real specs. The 2026-10-19 battery program (~85 tests) closed the audit's rows:

| Battery item                    | State after the program                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Survives a full page reload     | 68 / 68 (6 specs gained tests, `8bdbb877`)                                                                                                                         |
| Survives disable then re-enable | covered, 5 written, 6 verified already covered under other wording                                                                                                 |
| SPA navigation behaviour        | covered, 13 written (`playbackSpeedBoostGesture` already had its re-arm case)                                                                                      |
| Off by default                  | covered, 27 instances across 16 specs, 3 verified already covered                                                                                                  |
| Non-target page                 | 23 / 23 page-scoped features; the 12 all-pages features are n/a by definition (their guard is everyFeature's every-page sweep)                                     |
| While-enabled config change     | 25 / 25 applicable multi-key features; 14 verified already covered under other wording, 5 written (placement live-change), 2 n/a by product shape, 1 not multi-key |

The audit's original keyword-scan denominators were too pessimistic: 20 "missing" tests already existed under other wording. The program's real output was ~60 genuinely new tests plus the correction of the denominators themselves.

## Product findings the program surfaced (work for `dev`, not test gaps)

1. **`playerQuality` ships no `onConfigChange` handler**: changing quality in the settings while the feature is on does nothing until a re-enable or reload, though the UI implies it applies live.
2. **`videoHistory.resumeType` is only read at `onEnable`/`onNavigate`**: a live change needs a navigation to take effect.
3. **The devtools panel's data bridge needs a real DevTools window**: `devtools_get_*` requests forwarded by the background never receive a `data_response` outside one, and without any YouTube tab the Feature Status grid crashes on an unguarded `response.data.features` read (`src/components/devtools/hooks/useDevToolsQuery.ts:36`) that bypasses the panel's own ErrorBoundary. A smoke spec proved the mount works and the data path does not; the spec was deleted as unviable, and these two facts are the actionable residue.

## Weakest feature folders (statements)

| Feature                     | Stmts % | cov/total | Branch % | cov/total |
| --------------------------- | ------- | --------- | -------- | --------- |
| openTranscriptButton        | 78.6%   | 11/14     | 50.0%    | 4/8       |
| playlistManagementButtons   | 80.9%   | 190/235   | 62.6%    | 72/115    |
| _registry                   | 81.2%   | 862/1061  | 74.0%    | 534/722   |
| pauseBackgroundPlayers      | 82.6%   | 38/46     | 75.0%    | 18/24     |
| defaultToOriginalAudioTrack | 83.2%   | 104/125   | 81.3%    | 74/91     |
| miniPlayerButton            | 84.6%   | 22/26     | 75.0%    | 18/24     |
| saveToWatchLaterButton      | 84.7%   | 172/203   | 69.8%    | 81/116    |

The playlistManagementButtons row is resolved: its 8/192 reading was two source versions of the file (the import reformat behind the 23367848 cherry-pick shifted every line after 27, so the cross-version union credited only the 8 statements in the stable head) and the store healed once it was wiped and rebuilt in one era; `index.ts` now reads 145/190 and the folder 80.9 %, in line with its real behaviour. `playbackSpeedBoostGesture` carried the same dual-version condition but line-aligned, and now reads 112/128 on its own. One product-side finding came out of diagnosing this: the reset-progress path in `playlistManagementButtons:380` failed when YouTube's Watch Later browse served the watched bar for over 30s after a processed feedback edit, so the spec's post-reload poll now waits 60s, matching the remove-all check's budget.

The Innertube failure paths the previous report called out as unreachable now have stubbed-response tests (lever 1 of the coverage-boost plan), and `_registry` is low per-spec but reached through every spec plus everyFeature; its unmet branches are the stripped-page guards everyFeature exists for.

## Regenerating

Same harness as September (`scripts/coverage-report.mjs`; `monocart-coverage-reports` is a committed devDependency). Build with `NODE_ENV=development BYPASS_LOCALE_CHECK=true pnpm run build`, run `PLAYWRIGHT_COVERAGE=1 pnpm exec playwright test --project=chromium` (never pass `--reporter` or `--workers`; the config's 5 workers and HTML report stand), then `node --max-old-space-size=8192 scripts/coverage-report.mjs` **under a PTY** (the terminal background with `pty: true` works): without a TTY monocart dies silently after printing `stdin is not a tty`, and plain foreground or piped retries hit the same wall unpredictably. A successful run always prints the `merged … test attempts` table; confirm it before trusting the output, and note `coverage/report/coverage-details.md` is a companion artifact generated from `coverage-summary.json` (monocart's output-dir cleanup deletes it on every regeneration, so regenerate it alongside with `node scripts/coverage-details.mjs`). If the full run was heavily loaded and the live-sweep coverage looks thin, a top-up `PLAYWRIGHT_COVERAGE=1` run of `everyFeature.spec.ts` + `Options.spec.ts` merges into the same raw set (later records for the same test replace earlier ones, so keep top-ups well-executed). One accumulation hazard to remember: raw records embed each bundle's full source list, so editing a bundled `src` file between coverage runs leaves the old version of that file in every earlier record, and monocart unions the two versions into one row, crediting only statements whose line positions coincide (the 10-21 store's `playlistManagementButtons/index.ts` read 8/192 this way). When a file's row reads implausibly low against passing tests, check `coverage-summary.json` for two `id` values under that path, and if so archive `coverage/raw` aside and re-baseline with one clean run rather than trying to top up. Raw records: `coverage/raw`; interactive report: `coverage/report/index.html`.
