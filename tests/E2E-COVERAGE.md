# How much of the code the end-to-end suite covers

Measured on 2026-09-07 on the `playwright-testing` working tree (the day's uncommitted work on top of `01df799f`, see the audit's status entries of that day) with the coverage harness described at the end, from a run of the whole suite: 781 generated cases (the nine headed `pauseBackgroundPlayers` cases on one worker, then the rest headless on three workers with one retry, under profiling). Under profiling 776 passed, 1 were flaky, 2 failed and 2 skipped in 95 min; the failures and flakes are listed in the audit's status entry, and their code still counts. The audit (`E2E-TEST-AUDIT.md`) says what each spec asserts; this file says which code the suite executes at all, and which it does not.

The first measurement, on 2026-09-06, was published as 82.9 % of statements and 65.2 % of branches. Its report script had pre-merged the V8 records of one script across documents by adding range counts, and a range V8 leaves out means "the same count as the enclosing block", not zero, so a block executed in one document and not in another read as unexecuted. With the reporter's own merge the same data reads 83.6 % and 66.5 %; the comparisons below are against that corrected baseline.

## Headline

Product code that runs in pages: the content script, the embedded script with every feature, and the options page. Left out, like the developer tools, is the registry's performance tracker, which is switched by `DEV_MODE` and never runs in the tested build.

| Measure | Covered | Total | Coverage |
|---|---|---|---|
| Statements | 8,978 | 9,990 | 89.9 % |
| Branches | 3,826 | 5,114 | 74.8 % |
| Functions | 2,347 | 2,465 | 95.2 % |
| Executable lines | 7,873 | 8,457 | 93.1 % |

Executed is not asserted: a line the suite runs is not a line the suite would notice breaking, so the per-feature table pairs the measured figures with what the spec checks. Functions in the mid nineties means nearly every function the extension ships is entered by some test; the branch figure means one decision in four only ever goes one way under the suite, and the section on the branch floor below says what those decisions are.

Not measured, because page coverage cannot see it: the background service worker (`src/pages/background`, 138 lines: storage, messaging and the Innertube session), and the popup (`src/pages/popup`, 20 lines, which no test opens). Not built into the tested extension: the developer tools (`src/pages/devtools` and `src/components/devtools`, development builds only) and the build pipeline.

## By area

| Area | Files | Executable lines | Lines % | Branches % | Functions % | Files never executed |
|---|---|---|---|---|---|---|
| src/features | 192 | 5843 | 94 | 75 | 96 | 0 |
| src/utils | 52 | 987 | 90 | 73 | 93 | 0 |
| src/components | 92 | 905 | 91 | 75 | 94 | 11 |
| src/pages | 10 | 211 | 95 | 67 | 98 | 1 |
| src/ui | 3 | 136 | 97 | 76 | 94 | 0 |
| src/hooks | 15 | 107 | 90 | 73 | 97 | 1 |
| src/_setup | 4 | 86 | 83 | 64 | 73 | 0 |
| src (root files) | 4 | 61 | 98 | 85 | 96 | 0 |
| src/events | 1 | 48 | 100 | 85 | 100 | 0 |
| src/i18n | 7 | 39 | 92 | 64 | 100 | 0 |
| src/validation | 3 | 26 | 92 | 82 | 100 | 0 |
| src/types | 1 | 8 | 100 | 0 | 100 | 0 |

Files never executed are almost all barrel files of two lines (`index.tsx` re-exports that the bundler resolves away) and the developer-tools components; no feature file is among them.

## By feature

Executable lines and their coverage per feature folder, joined with the structural analysis of its spec: configuration keys the spec never sets, pages in the feature's scope the spec never opens, and lifecycle hooks the spec never asserts on. "Cases" is the number of generated cases in the run. Sorted from least to most covered.

| Feature | Executable lines | Lines % | Branches % | Cases | Keys the spec never sets | Pages in scope never opened | Hook never asserted |
|---|---|---|---|---|---|---|---|
| automaticallyDisableAmbientMode | 65 | 63 | 48 | 6 | - | - | - |
| pauseBackgroundPlayers | 38 | 84 | 75 | 9 | - | - | - |
| _registry | 843 | 85 | 72 | via every spec | - | - | - |
| customCSS | 25 | 88 | 62 | 8 | - | channel_home, channel_posts, channel_streams, channel_videos, live, playlist, shorts, subscriptions | - |
| playlistReverseButton | 278 | 89 | 66 | 16 | - | - | - |
| hideLiveStreamChat | 18 | 89 | 67 | 6 | - | - | - |
| playerSpeed | 215 | 93 | 69 | 13 | - | - | - |
| automaticallyDisableAutoPlay | 108 | 94 | 77 | 6 | - | - | onConfigChange |
| playerQuality | 173 | 94 | 71 | 14 | - | - | - |
| automaticallyDisableClosedCaptions | 35 | 94 | 90 | 7 | - | - | - |
| saveToWatchLaterButton | 176 | 94 | 73 | 19 | - | - | - |
| screenshotButton | 108 | 94 | 66 | 16 | button.fullscreenPlacement | - | - |
| defaultToOriginalAudioTrack | 76 | 95 | 73 | 6 | - | - | - |
| shareShortener | 38 | 95 | 94 | 12 | - | - | - |
| buttonController | 590 | 95 | 76 | 36 | - | - | - |
| playlistManagementButtons | 177 | 95 | 77 | 8 | - | - | - |
| playbackSpeedButtons | 72 | 96 | 77 | 15 | - | - | - |
| miniPlayer | 682 | 96 | 73 | 23 | - | - | - |
| videoHistory | 181 | 96 | 74 | 8 | - | - | - |
| remainingTime | 52 | 96 | 69 | 8 | - | - | - |
| shortsAutoScroll | 33 | 97 | 83 | 7 | - | - | - |
| volumeBoost | 67 | 97 | 85 | 21 | button.fullscreenPlacement | - | - |
| maximizePlayerButton | 172 | 97 | 82 | 23 | button.fullscreenPlacement | - | - |
| scrollWheelController | 207 | 97 | 78 | via the two scroll wheel specs | - | - | - |
| deepDarkCSS | 35 | 97 | 69 | 11 | - | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions | - |
| timestampPeek | 265 | 98 | 78 | 16 | - | - | - |
| hideArtificialIntelligence | 71 | 99 | 73 | 18 | - | - | - |
| playlistLength | 220 | 99 | 86 | 16 | - | - | - |
| automaticTheaterMode | 25 | 100 | 83 | 7 | - | - | - |
| automaticallyEnableClosedCaptions | 30 | 100 | 86 | 12 | - | - | - |
| automaticallyMaximizePlayer | 8 | 100 | 0 | 14 | - | - | - |
| automaticallyShowMoreVideosOnEndScreen | 8 | 100 | 0 | 6 | - | - | - |
| blockNumberKeySeeking | 8 | 100 | 100 | 7 | - | - | - |
| copyTimestampUrlButton | 22 | 100 | 50 | 10 | button.fullscreenPlacement | - | - |
| flipVideoButtons | 23 | 100 | 83 | 14 | - | - | - |
| forwardRewindButtons | 27 | 100 | 78 | 13 | - | - | - |
| globalVolume | 33 | 100 | 91 | 13 | - | - | - |
| hideEndScreenCards | 18 | 100 | 75 | 10 | - | - | onConfigChange |
| hideEndScreenCardsButton | 25 | 100 | 88 | 9 | button.fullscreenPlacement | - | - |
| hideMembersOnlyVideos | 4 | 100 | 0 | 13 | - | channel_posts, channel_streams, live, playlist, shorts, subscriptions | - |
| hideOfficialArtistVideosFromHomePage | 4 | 100 | 0 | 8 | - | - | - |
| hidePaidPromotionBanner | 4 | 100 | 0 | 6 | - | - | - |
| hidePlayables | 4 | 100 | 0 | 7 | - | channel_home, channel_posts, channel_streams, channel_videos, live, playlist, search, shorts, subscriptions | - |
| hidePlaylistRecommendationsFromHomePage | 4 | 100 | 0 | 7 | - | - | - |
| hidePosts | 4 | 100 | 0 | 6 | - | - | - |
| hideScrollBar | 9 | 100 | 50 | 5 | - | channel_home, channel_posts, channel_streams, channel_videos, live, playlist, search, shorts, subscriptions | - |
| hideShorts | 10 | 100 | 100 | 34 | - | - | - |
| hideSidebarRecommendedVideos | 4 | 100 | 0 | 6 | - | - | - |
| hideTranslateComment | 4 | 100 | 0 | 8 | - | - | - |
| keywordBlocklist | 257 | 100 | 89 | 17 | - | channel_home, channel_posts, channel_streams, live, playlist, shorts, subscriptions | - |
| loopButton | 34 | 100 | 86 | 12 | button.fullscreenPlacement | - | - |
| miniPlayerButton | 25 | 100 | 86 | 16 | button.fullscreenPlacement | - | - |
| monoToStereoButton | 47 | 100 | 88 | 10 | - | - | - |
| openTranscriptButton | 15 | 100 | 50 | 8 | button.fullscreenPlacement | - | - |
| openYouTubeSettingsOnHover | 47 | 100 | 76 | 11 | - | - | - |
| rememberVolume | 34 | 100 | 84 | 14 | - | - | - |
| removeRedirect | 34 | 100 | 81 | 8 | - | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions | - |
| restoreFullscreenScrolling | 12 | 100 | 50 | 6 | - | - | onNavigate |
| scrollWheelSpeedControl | 8 | 100 | 100 | 15 | - | - | onNavigate |
| scrollWheelVolumeControl | 8 | 100 | 100 | 24 | - | - | - |
| skipContinueWatching | 17 | 100 | 50 | 5 | - | - | - |
| videosPerRow | 7 | 100 | 0 | 10 | - | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions | - |

Notes on the structural columns:

- **Fullscreen placement.** The column still names `button.fullscreenPlacement` for the eight button features whose own spec never sets it, and that is by design: `buttonController.spec.ts` exercises the key once per declared button, from the metadata (15 buttons across 11 features), so a regression in how any button reads it is caught there rather than in each feature's spec.
- **Features that run on every page** (customCSS, hideMembersOnlyVideos, hidePlayables, hideScrollBar, keywordBlocklist, removeRedirect, videosPerRow, deepDarkCSS) are tested on one to five pages by the audit's design, since they are CSS-only or page-independent; the measured coverage confirms the code paths do not differ by page. `everyFeature.spec.ts` now also switches every feature on across every page type, so each feature's page gate has run everywhere at least once.
- **Hooks.** `restoreFullscreenScrolling` and `scrollWheelSpeedControl` have an `onNavigate` hook their spec never asserts on (the hook still executes, since every case navigates). The `onConfigChange` gaps of `automaticallyDisableAutoPlay` and `hideEndScreenCards` are single-key features whose hook only sees the on/off switch, which the enable and disable cases cover.

## The branch floor of 80 %

The branch figure started the day at 70.9 % (corrected baseline 66.5 %). What moved it, in order of effect:

- **Every feature at once** (`everyFeature.spec.ts`, twelve cases). The per-feature specs prove each feature does its job; these switch every feature and every button on together, on watch, shorts, a playlist, a live stream, across the feed and channel pages, through a reload with theater mode and a related-video navigation, with every button below the player, in the feature menu and in fullscreen, and on pages stripped of their player, their controls and owner row, their video element and sidebar, the shorts player, or the playlist list and header. Each asserts that the extension raises no error on the page. They reach the guards a healthy page never trips one feature at a time, which is where most of the unmet branches were: 591 of the 1,508 at the start were of the form "if the element is missing, return".
- **The options page's every checkbox** switched on and off, which renders every disabled reason, conflict note and child wrapper the settings generator can produce.
- The targeted cases listed in the audit's status entry: the remaining conflict kinds, the read-only speed list, the colour picker, the CSS editor's warning marker, the date formats and channel and chapter placeholders of the screenshot name, the feature menu's hover-to-click switch, the mini player closed from its button, the artist-channel exclusion of the video history, modified clicks on timestamp links, a single-format level in the quality stub, odd value shapes in the legacy import, and hideShorts on the posts and streams tabs after the page-type detector learned them.

This run reads **74.8 % of branches** (3,826 of 5,114; 1,288 unmet). The dead code below holds 154 of the unmet ones; without it the same records read 77.1 %.

What is left, counted from the line data of the report:

- **Branches kept on purpose, most of the 154 once listed as dead code.** The user ruled on that list (audit 3.10): the `/c/` channel forms and `excludePages`, the `buttons` config shape, the slider and text-input branches of the settings generator, the extra class-list overloads, the grid layout and the embedded error reporter stay as extensibility and compatibility; they are a ceiling, not a cleanup list. Of the rest, the icon type checks became a type guard, the metadata validation moved to a build step and out of the page bundle, and the ambient shorts branch and the attribution rendering became reachable and are covered (not re-measured in this report).
- **Guards and fallbacks on a page that is whole.** The bulk of the rest: `if (!element) return`, `?? default`, `catch` blocks. The stripped-page cases reach some of them; each further one needs a page broken in a new way, and a case that breaks the page only proves that the feature gives up quietly.
- **Layout and account variants the profile cannot produce**: the `ytd-watch-grid` layout, a Premium account's format ids in the quality data, a Firefox popup.

So 80 % is not reachable with the product as it is and tests that assert something. The one lever left is more page-breaking cases of the every-feature kind, each of which buys a few branches; the kept branches above are not to be removed.

## What the uncovered code is now

The lines the suite still never reaches, for the files that matter, read from the line data of the report.

- **playerQuality**: the stats-based foreign-quality check (needs a format id the live player does not give this profile), the second guard against a manual request made during the feature's own switch, and the "player holds the current video" check, which only decides for a player that has not started.
- **miniPlayer**: the recovery path when enabling fails, the fallback containers of `restorePlayer`, and the error handlers around the state store.
- **playlistManagementButtons**: the `yt-prepare-page-dispose` listener, the rows without a menu, and the error branch of a failed remove-all.
- **pauseBackgroundPlayers**: the debounced mutation callback (the video element gets no child nodes added, so it never fires) and the rejected-message path.
- **automaticallyDisableAmbientMode**: the grid layout (kept, above); the shorts branch is covered since its rewrite.
- **buttonController**: "element already gone" guards and the new-layout branches; the icon type checks are gone.
- **Registry**: `featureNavigationManager` keeps its `/c/` forms; `featureManagerBase`, `featureRegistryCore` and `featureOrchestrator` keep their error and duplicate-registration paths.
- **Utilities**: `audioEngine` never destroys an engine, because no case swaps the video element under a running boost; `dom/wait` keeps its timeout and abort paths; `config/utils` keeps the `buttons`-map migration.
- **Options page**: `Slider` is unused; `EditorProblems` renders errors and warnings but no hint or info marker; `SettingsFooter` keeps the Firefox popup detour and the "open in new tab" button, which only exist in the popup.

## What cannot be reached

Named here instead of covered, so nobody spends time on them by mistake.

- **The navigation manager's `/c/<name>` forms.** YouTube answers `/c/` URLs with 404 today, and `getCurrentPageType()` never yields a page for them. The `@handle/posts` and `@handle/streams` forms, on the other hand, were reachable all along and simply undetected until the fix of 2026-09-07 (audit 3.10).
- **The restore of ambient mode on shorts.** The feature runs on shorts now, but YouTube's shorts switch turns off on a click and does not turn back on within a page session, so the restore on disable cannot be observed there (audit 3.10).
- **The `Slider` input.** `SettingsGenerator` and `Setting` support a `slider` component, but no feature metadata uses it.
- **The choice between several formats of one quality level in `playerQuality`.** The player only exposes format ids in `getAvailableQualityData()` to a YouTube Premium account; the test profile is not one, so on the live site the selection never runs here and the spec's fps and premium cases skip for want of a candidate. The selection logic itself is covered with stubbed quality data, so a regression in it is still caught; the live behaviour would need a Premium profile.
- **The speed buttons' ceiling of 16.** The buttons read and write the rate through YouTube's player API, which caps at 2, so the clamp and its "can't increase further" title cannot be reached (audit 3.10, open).
- **The remove-all button on a regular playlist page.** It needs a chip bar header, which only Watch Later still renders (audit 3.10, open); the suite covers it there.

## What this says about the suite

- The suite reaches nearly everything the extension does on a page. What is left is mostly error handling, fallbacks for page shapes the fixtures do not produce, and the dead code above.
- The options page is exercised control by control: every input component the settings use runs through a real edit, every checkbox through both states, the import path through every kind of file it distinguishes, and the conflict dialog through every conflict kind.
- The every-feature cases are also the suite's only check that the features do not interfere with one another; they found no error on any page.
- The background service worker is the one runtime component the suite does not observe at all. Its behaviour is exercised indirectly (every config write and Innertube call goes through it), but nothing measures or asserts it directly.

## How the numbers were produced

- `COVERAGE_BUILD=true npm run build` builds the extension without minification and with inline source maps (a switch in `vite.config.ts` and `src/pipeline/steps/buildContentScripts.ts`; the default build is unchanged).
- `PLAYWRIGHT_COVERAGE=1` makes the fixtures in `playwright.config.ts` record V8 precise coverage of the extension's own scripts for every test attempt, into `coverage/raw`: the primary page, and since 2026-09-07 every page a test opens with `context.newPage()` as well (written when the test closes it, or with the context). V8 only reports scripts still alive, so the counters are read and restarted before every `page.goto` and `page.reload`; without that a test contributes only its last document.
- `node scripts/coverage-report.mjs` hands the records to `monocart-coverage-reports` (installed with `npm install --no-save`), one record per script per document, and the reporter merges them with its range tree; it maps them to the TypeScript sources through the source maps, keeps only files that exist under `src/`, leaves out tests, the pipeline, the manifest and the development-only performance tracker, adds every product file as zero when unexecuted, and writes `coverage/report` (html, lcov, json summary). The records must not be pre-merged by adding range counts, see the note under the title.
- The structural columns come from a script that reads each feature's `index.metadata.ts` (config keys, pages) and `index.ts` (hooks) and its spec (keys set, pages opened, disable, reload, in-page navigation).
- Profiling slows the pages by about 1.5 times and the unminified build alone is slower too; a coverage run is not a pass/fail run, and `npm run build` has to run again before one.
