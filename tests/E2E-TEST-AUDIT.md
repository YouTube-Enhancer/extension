# YouTube Enhancer end-to-end test audit

Branch `rebase/playwright-testing-onto-dev` (commit `d30fdfcd`), audited 2026-09-02/03. Scope: every Playwright spec under `src/features/__tests__/` plus `src/pages/options/Options.spec.ts`, the helpers under `src/utils/_tests/`, `playwright.config.ts`, the generated selector pipeline and the CI workflow.

This document has three jobs: list the tests that exist today, mark the ones that are not needed, and list the ones that are missing. Section 4 is the per-spec catalogue that does all three for every spec; sections 2 and 3 explain the patterns behind most of those verdicts so they can be fixed once rather than 60 times.

## Status

- 2026-09-03: every "Not needed" verdict in section 4 has been applied (see the commit "test(e2e): remove tests the audit judged unnecessary"). The suite went from 1353 to 461 generated cases per browser project. The "Tests we have" tables in section 4 describe the suite before that pass.
- 2026-09-03: every "Incorrect" verdict in section 4 has been applied (commit "test(e2e): fix the tests the audit judged incorrect"), together with the harness changes from section 3.6 that they depended on (reloadPage, spaNavigateToRelatedVideo, expectToStay, requireMatch, a state-checking toggleFullscreen, a throwing injectDynamicContent, one error-watch loop per page) and a body marker for the speed control. Three product-side halves were deferred and are listed in the commit message. The "Missing" tables are still open.
- 2026-09-03: every "Missing" verdict in section 4 has been applied (commit "test(e2e): add the tests the audit judged missing"). The suite now has 695 generated cases per browser project (Playwright `--list`, chromium; 19 of them in the Options spec). Where a new test exposed a product defect, the defect was fixed in its own `fix(...)` commit instead of leaving a `test.fixme` marker; section 3.10 records what was fixed and what is still open. Two specs were dropped as unneeded during this pass (`zz-debug-live.spec.ts`, `_registry.spec.ts`), and `onScreenDisplay.spec.ts` was added. Confirmation run: every test that failed on the first run of the new suite was re-run headless against the rebuilt extension after triage (42 tests across 25 specs, in two batches); all pass except `pauseBackgroundPlayers` "should not pause other tabs when playback starts in a hidden tab", which skips with a reason because headless Chrome reports every tab as visible, and `onScreenDisplay` "offsets the display below the shorts player controls", which skips on the newer shorts layout that has no `ytd-shorts-player-controls`. The full `playerQuality` and `playerSpeed` specs were re-run after the player-manager change (26 of 26 pass), and the in-page navigation test of `playerQuality` was repeated 8 times in a row without a failure. Live and shorts fixtures remain subject to YouTube throttling; a failure that starts inside the live-stream hunt or on a "Video unavailable" shorts page is the fixture, not the feature.
- 2026-09-03: full headless run of the suite on one worker with one retry (2.3 h): 603 passed, 8 flaky (passed on retry), 72 skipped with a reason, 12 failed. Of the 12: four were the live-stream hunt timing out (`scrollWheelVolumeControl`, `skipContinueWatching`'s non-target page, two `volumeBoost` live cases); five were spec bugs fixed afterwards (`deepDarkCSS` built its colour regex from a template literal that dropped `\\s`, `hideSidebarRecommendedVideos` asserted YouTube's DOM shape instead of the feature, both `screenshotButton` clipboard reads used `waitForFunction` with an async predicate that resolves on the first call, `pauseBackgroundPlayers` expected the other tab to keep playing after the navigated tab autoplayed, `maximizePlayerButton`'s conflict test enabled theater mode before the maximize had landed, which is a spec race on top of the theater defect); three were product defects fixed afterwards (`openYouTubeSettingsOnHover`, `timestampPeek`, `automaticTheaterMode`, see 3.10); one was `playerQuality`'s in-page test waiting for a 4K level to stream, which now also accepts the player's own request. `defaultToOriginalAudioTrack` gained a visible skip for loads YouTube does not auto-dub. The suite's 30-minute `globalTimeout` under CI stops a full run early; the full run used `--global-timeout=0`.
- 2026-09-03: the 63 login-gated skips plus the hidden-tab case were run headed with the saved login profile (`npm run test:auth`, then no `CI`): 62 pass, 2 skip on fixture conditions (the playlist fixture renders all rows up front; no home card resolved to a video outside Watch Later). Four spec issues were fixed on the way: the home-tile selector predates the lockup layout, the saveToWatchLaterButton spec read the button data without calling the getter YouTube wraps it in after render (the feature itself was fine), the hidden-tab test now stubs `document.hidden` when the browser keeps every tab visible instead of skipping, and the navigation helpers ignore YouTube's `themeRefresh` parameter and dispatch the home-logo click directly when a maximized player keeps the masthead out of the viewport.
- 2026-09-03: the 8 tests that had passed only on retry were rerun three times each with no retries. Two reproduced and were traced: `timestampPeek`'s comment test scrolled the comments section into view a few hundred milliseconds before the watch-next response attached its continuation, so YouTube never loaded a thread (the helper now takes the section out of view and back until the first thread renders); the Options reset-dismiss test hit a product race in the notification provider (see 3.10). One more reproduced only on the verification pass and turned out to be the feature clicking while YouTube had hidden the subtitles button after a live pre-roll ad (see 3.10). The others were hardened on their live cases: the quality wait allows for a live player's slower reaction, the captions tests skip with a reason when a video offers no captions or withdraws them mid-test instead of returning silently, the feature-button wait allows 15 s instead of the 5 s default, and the settings-on-hover tests hover until the feature's asynchronously attached listeners open the menu instead of dispatching a single mouseenter. `miniPlayer`'s navigation case was already covered by the 30 s sidebar wait. The one signed-in flake (`hidePlaylistRecommendationsFromHomePage` after navigation) was three full page loads outrunning the 120 s test timeout under YouTube throttling and is left as environmental.
- 2026-09-04: `playwright.config.ts` decouples headless mode from CI: `PLAYWRIGHT_HEADLESS=1` runs headless with the saved login profile, `CI=1` still runs headless without it (GitHub has no profile). Three workers everywhere (`PLAYWRIGHT_WORKERS` overrides), the per-test timeout is 120 s for both, the CI global timeout is 80 minutes and the CI reporters are `dot`, `github` and an `html` report the workflow can upload. `.github/workflows/playwright.yml` now builds the extension before testing, takes Node from `.nvmrc`, installs `npm ci --legacy-peer-deps` (the vite peer conflict), installs Chromium only, runs the chromium project in four shards and can be started by hand (`workflow_dispatch`). Not yet exercised on GitHub.
- 2026-09-04: full run on three workers, headless without the login profile (`CI=1`, zero retries): 696 tests, 618 passed, 67 skipped (63 for login), 11 failed. Nine of the failures were the extension folder being rebuilt underneath the run by a second launcher that collided with it (the content script never attached); the other two were real: `hideShorts`'s dynamic-content case failed when the watch page served no Shorts shelf to clone (now a visible skip; `injectDynamicContentWhenPresent` also waits up to 10 s for late sidebars), and the Options custom-CSS test typed into Monaco faster than it settled, which put the auto-closed brace mid-string (the text is now inserted as one input event).
- 2026-09-04: full run on three workers, headless with the login profile (`PLAYWRIGHT_HEADLESS=1`, one retry, 64 min): 676 passed, 10 flaky (passed on retry), 5 failed, 5 skipped with a reason. The five failures were all spec assumptions that a signed-in session breaks: the signed-in masthead renders YouTube's newer search box and hides the legacy `input#search`, so `blockNumberKeySeeking` and `maximizePlayerButton` now find the search box by its `combobox` role; `defaultToOriginalAudioTrack`'s in-page switch landed on a single-track recommendation, so the spec hops through related videos until one offers several tracks and skips otherwise; `saveToWatchLaterButton`'s render test assumed the fixture video was not in Watch Later, which the toggle test on another worker can hold it in, so it accepts either state; and its card-save test read membership seven seconds after a successful edit and YouTube's playlist read still trailed the write, so the spec now waits for a fresh read to list the video and removes it in a `finally` if an assertion fails. Of the ten flaky: `hideLiveStreamChat` (twice) and `globalVolume` on a freshly opened live stream read the player before it had loaded the stream, a product race (see 3.10); `miniPlayer`'s live sentinel needed the 15 s allowance other live assertions have; the captions live hunt overran the 360 s test budget on a channel with many streams (the hunt now takes a deadline and the spec skips instead); the remaining five were the signed-in home feed or a watch reload getting no response to the document request for 30 s three times in a row, which the retry then passed in 20 s. That last pattern is YouTube slowing repeated loads from one session and is left to the retry.
- 2026-09-04: the 17 tests touched above were rerun twice each with one retry (headless, login profile, three workers, 8 min): 55 passed, 3 flaky, 0 failed, 2 skipped (no Shorts shelf on the watch fixture). Two of the flaky were the home-feed stall; the third was a live stream whose sidebar listed no VOD within 15 s, so `spaNavigateToRelatedVod` now nudges the page for up to 30 s and skips with a reason (3/3 passes afterwards).
- 2026-09-04: the navigation stalls of the signed-in runs were not YouTube slowing the session. Their traces show the document request never left the browser (no DNS, connect or send timing, status -1) while the old page's own requests kept completing. Every signed-in navigation was fronted by YouTube's service worker, whose registration came along with the copied login profile, and under load that worker sometimes never issued its fetch; the anonymous profile has no such worker, which is why those runs never stalled. The same mechanism explains the two "`html[yte-ready]` never attached" cases: there the response started and never completed. `playwright.config.ts` now leaves the `Service Worker` and cache folders out of every profile copy and launches the context with `serviceWorkers: "block"` (the extension's own MV3 worker is unaffected). The five stall-prone tests then passed 20 of 20 attempts in 2.5 minutes without retries, where two of six had stalled just before.
- 2026-09-04: the 13 spec files touched today were rerun in full, every test twice with one retry, under the new configuration (340 tests, 28 min): 333 passed, 2 flaky, 1 failed, 4 skipped with a reason. The failure and one of the flaky were the same case: `hidePlaylistRecommendationsFromHomePage`'s SPA test clicked the first home tile, which on the signed-in feed was a mix that the feature under test had just hidden, so `spaNavigateToFirstVideo` now picks the first visible link. The other flaky was the maximize button on a slow live stream, which now gets the 30 s the other live assertions have. Both then passed 3 of 3 without retries. While reading the traces the embedded script turned out to fire a dozen 404 requests at `youtube.com/src/<chunk>.js` on every page load (see 3.10).
- 2026-09-04: fresh run of the whole suite after the day's commits, in two parts: `pauseBackgroundPlayers` headed on one worker (8 passed, 2.7 min), then the other 688 tests headless and signed in on three workers with one retry (59 min): 666 passed, 7 flaky, 10 failed, 5 skipped with a reason, so 674 / 7 / 10 / 5 of 696 overall. The headed part was meant to give the hidden-tab test a real background tab, and it cannot: Playwright's Chromium keeps `document.visibilityState` at `visible` on every page it drives, headed or headless, after `bringToFront`, with focus emulation switched off and even in a minimized window (standalone probes on Playwright 1.62), and its maintainers describe that as intentional (microsoft/playwright #1290, #2286, #22634, #41873). The stub in that test is therefore the design, not a fallback, and its comment says so now. Of the 17 failed or flaky tests, 11 shared one signed-in artefact: the related list of the watch fixture ranks a live stream first (5 of its 20 lockups were live), so every helper that clicks "the next video" (`spaNavigateToRelatedVideo`, `spaNavigateToFirstVideo` and the captions and audio hops built on them) landed on a live page, where watch-gated features drop out and the player has no speed, timestamps or captions to assert on (`automaticallyEnableClosedCaptions` twice, `copyTimestampUrlButton`, `hidePaidPromotionBanner`, `hideShorts`, `openTranscriptButton`, `playerSpeed`, `remainingTime`, `videoHistory`, and the channel hop of `automaticallyDisableAutoPlay`); the helpers now skip lockups that carry a LIVE badge. Three more were `automaticallyDisableAutoPlay`, plus one `automaticallyShowMoreVideosOnEndScreen` flaky, meeting a folded control bar that the feature could not operate, fixed in the product afterwards (see 3.10). The last four were feature buttons (`flipVideoButtons`, `maximizePlayerButton`, `miniPlayerButton`, `monoToStereo`) that never appeared within 30 s on a live stream although the feature menu button had been inserted; the same four tests passed 8 of 8 on the same streams a few minutes later with three workers, and an instrumented probe saw the button land within 2 s three times in a row, so this is load-sensitive and stays under watch rather than patched. Verification of the 17 tests, three times each with one retry (51 runs, 5.4 min): 48 passed, 2 flaky, 1 failed. The flaky pair were the two `automaticallyDisableAutoPlay` tests whose reload or channel hop came back with a folded toggle that the feature could not click (their retries passed), which is what led to the product fix in 3.10. The failure was `playerSpeed`'s hop landing on a sponsored lockup in the related list, a 15-second ad whose ended player read speed 1 twice in a row, so the helpers skip promoted lockups too (the ad badge); that test and `copyTimestampUrlButton`'s hop then passed 6 of 6 without a retry.
- 2026-09-04, later: the four live-button cases were run to ground. Twenty-four-run stress loops of those tests (three workers, six repeats each) failed 4, 3, 6 and 8 times before the fix, and an instrumented build showed the extension logging nothing at all after the test's two settings: no config change, no enable. The trace's network log had the reason. YouTube reloads a live watch document about a second after an in-page navigation to it, and in the new document the content script only forwards `storage.onChanged` from the page script's `pageLoaded` on, while the page script had read its options at the very start of its setup, several seconds earlier under load; every setting written in that window was lost on that page (see 3.10). After the fix the same stress loop passed 24 of 24. Of the five skips, three became assertions: `hidePlayables` injects its synthetic shelf when the feed has none, `hideShorts` injects a synthetic Shorts shelf on a watch page that served none, and the live hunt gained an `ambientMode` capability so `automaticallyDisableAmbientMode`'s live case looks for a stream that carries the control (the channel had none on air in two hunts, so that case still stops with a reason). `playlistManagementButtons`' rendered-later case keeps its reason: its 29-row fixture renders everything up front, and the channel-uploads playlist that does render in batches uses YouTube's newer lockup rows, on which the feature adds no buttons at all (open in 3.10).
- 2026-09-04, evening: second fresh run of the whole suite with every fix of the day (headed `pauseBackgroundPlayers` 8 passed, then 688 headless on three workers, 62 min): 674 passed, 6 flaky, 3 failed, 5 skipped, so 682 / 6 / 3 / 5 of 696. The nine failed or flaky tests plus the four live-button tests were then run three times each with one retry (39 runs): 32 passed, 1 flaky, 6 failed. The live-button tests went 12 of 12, the two Options-page and the videoHistory timeouts and the maximize menu, playerSpeed re-enable and Watch Later reads passed 3 of 3, so those were late-run load. Two things remain. `playerQuality`'s restore-after-disable case is flaky (1 of 3): on a video without the requested hd2160 the player picks its own format after the feature's request, the feature reads that as a manual change and suspends itself, and the disable then has nothing to restore; that is the feature's own manual-change detection and is recorded in 3.10. `timestampPeek`'s two comment cases failed 6 of 6 because the `timestamps` fixture `yk4I80XVuk4` now serves a single comment and renders no thread; a `commentTimestamps` fixture (`NvbbEBL9My4`, a mix whose top comments list the tracks, 37 timestamp links) restored the hover case, while the seek case fails on every candidate video at its own precondition: once the preview overlay is open, `window.scrollY` reads 0 although the page had been scrolled to the comments (a probe without the feature keeps scrollY at 1861), so either the preview or YouTube's reaction to its seek now scrolls the page to the top before the click. Left failing with that diagnosis rather than papered over.
- 2026-09-05: the nine failed or flaky tests of the evening run were run to ground and every one had a cause. Three were product defects, fixed in their own commits and recorded in 3.10: `playerQuality` left the enable run's player-state hook in place after a disable, so the hook re-ran enforcement over the restore (the "manual change" of the earlier diagnosis was that hook seeing the restore's request); `playerSpeed` took YouTube's own rate reset after a pre-roll for a manual change and stood down for the video; `videoHistory` returned without a prompt when the player was not in the document yet at start-up. `timestampPeek`'s seek case was two things: on this signed-in profile YouTube never completes a seek outside the buffered range (checked with the feature off, headed and headless, on every video over a few minutes), so the comment preview at 3:15 stalled, and the feature attached the overlay's click and leave listeners only once that preview's `play()` had resolved, so the click was lost (fixed: listeners first, one restore position, a generation guard; the earlier "scrollY reads 0" reading was wrong). The rest were test-side: the Watch Later case reloaded before the save request had finished (it now waits for the `edit_playlist` response), the options fixture loaded youtube.com to learn the extension id (it now reads the id off the extension's service worker), and the maximize case gave a feature that waits for a loaded player 5 s (15 now). A fresh full run followed, from a worktree since the main checkout had been switched to `dev` (headed `pauseBackgroundPlayers` 8 passed, then 689 headless on three workers with one retry, 58 min): 676 passed, 3 flaky, 6 failed, 4 skipped, so 684 / 3 / 6 / 4 of 697, with all fourteen of the previous list passing. The six failures were new: one was a regression of the playerSpeed fix (the extension's own speed buttons are clicked with a scripted click in the conflict test, which carries no input, so the feature put its speed back; the feature now counts its own controls as the user's input, 30 of 30 after), four were `playlistManagementButtons` finding no row with watch progress any more (the feature's reset button removes videos from the account's history, so earlier runs had used the fixture's watched rows up; the four tests now watch the first item for a moment when none carries progress, 8 of 8 after), and one was the shorts volume read taking the outgoing reel's fading video element after a move to the next short (the helper reads the active `div#shorts-player` now, 2 of 2). Of the three flaky, the autoplay "keeps it on" case sampled YouTube's rebuild of the toggle right after an in-page navigation (it waits for the toggle to settle now, 2 of 2); the other two were a 30 s navigation stall and a button that took over 10 s once, both passing on retry and in a rerun, and left alone. `tests/E2E-TEST-STATUS.md` carries the per-test detail.
- 2026-09-06: the branch was rebased onto `dev` at `94353bf2`, one commit past the `v1.35.0` release. Of the branch's 113 commits since the common base, 50 were already on `dev` as cherry-picks and were dropped; the other 63 replayed with six conflict stops, all mechanical: `package.json` four times and `package-lock.json` twice (resolved to `dev`'s files plus the `test` scripts, `@playwright/test` and `playwright-webextext`, the lockfile carrying the same Playwright 1.62.1 the previous runs used), `timestampPeek/index.ts` once (the branch's August change to reset state on setup and disable rather than on `yt-navigate-start`, kept) and `timestampPeek/utils.ts` once (`dev`'s own `previewGeneration` bump, kept; the 2026-09-05 fix was then merged onto it so one counter serves both the restore and a newer preview). The rebased tree's test files are byte-identical to the branch tip before the rebase, and the product delta against `dev` is only the branch's own additions, listed in `E2E-TEST-STATUS.md`. `dev`'s toolchain came with it: oxlint in place of ESLint (the spec files pass its type-aware rules unchanged), TypeScript 7, zod 4.5. A full run followed, from the rebased tree with the 2026-09-05 fixes applied (headed `pauseBackgroundPlayers` 8 passed, then 689 headless on three workers with one retry, 62 min): 683 passed, 1 flaky, 0 failed, 5 skipped, so 691 / 1 / 0 / 5 of 697. The six failures of the previous run passed, as did the autoplay and Watch Later flakes; the one flaky case was the miniPlayer live sentinel after a second live hunt that spent a minute on unplayable tiles (a fixture condition, passed on retry); the audio-track in-page switch skipped because no related video offered a second audio track; the four fixture skips stand. Nothing `dev` changed altered a test's outcome.
- 2026-09-06, later: `dev` gained `keywordBlocklist` (95b237cc), so the branch was rebased again, this time with the signed pass: rerere replayed the six recorded resolutions, 62 commits landed on top of `dev` (one, the branch's copy of the timestampPeek video-return fix, was dropped as empty) and the tree differed from the tested one by exactly the feature commit. A spec for the feature followed (catalogue entry below) and found one defect, recorded in 3.10: the feature acted on keyword edits while disabled, masking with an unresolved label and losing the original titles. A 30-case plan from another agent was reviewed against the feature's code. Adopted in some form: the injected markup families, title rewrites in place, the late thumbnail, the excluded image, srcset handling, the multi-node title, click-through, the playlist panel, the hover preview check, substring and blank-line matching and the options-page string-list cases. Declined: infinite scroll on home and a home-to-watch hop (no deterministic keyword on those feeds, and the observer path is covered by injection), the live end-screen (the profile cannot seek there), playback starving scans (the watch case already runs with playback going), the three-dot menu (YouTube's behaviour, not the feature's), notification injection (see the catalogue), a type-then-close race and an edit-then-delete race (speculative), cross-tab propagation (the storage bridge every test already relies on) and asserting that playlist rows and the Shorts player stay unmasked (a feature gap should not be pinned down as intended behaviour). The spec's 17 cases and the 2 options cases passed on their own and three times over on three workers, 57 of 57. The user then flagged the onScreenDisplay shorts case as invalid: it skipped on a selector from a layout YouTube no longer serves. Probing the live page showed the control bar over the top of the video and the title block over its bottom, neither of which the display manager found any more (3.10); the manager was fixed and the case replaced by two that assert against the real layout. The user also filled the `playlistManagementButtons` fixture to over 300 rows: the "rendered after enabling" case, which had skipped for want of rows rendering later, now passes; the header case still skips, and a look at the page shows why: its header is a `yt-page-header-view-model` with a `yt-flexible-actions-view-model` row and no chip bar at all, so the "remove all watched videos" button has no host on today's regular playlist page (open item below). Probing the account's other playlist pages found the chip bar alive on Watch Later, where the feature works once a video there is fully watched, so the header case now opens Watch Later (new fixture capability `playlistChipBar`). At the user's suggestion it then became a real, self-contained case: a new harness module `src/utils/_tests/watchLater.ts` (the actions-row toggle helpers moved there from the Watch Later spec, plus `ensureInWatchLater` and `watchToTheEnd`) puts the 34 s video `WldIfjaOAAE` into Watch Later and plays it muted at four times speed to the end; the test then waits for the row to read fully watched, enables the button, checks its count, clicks it, sees the rows leave the page live (the feature dispatches YouTube's own remove action after the API call) and stay gone across a reload, and puts the video back. It passed on its own and twice more in a row; the button does remove every fully watched video from the account's Watch Later. The user's own headed run of the suite then showed three `playlistReverseButton` failures on the playlist page, a product defect the longer fixture exposed (3.10): the feature reversed only the loaded rows and pulled YouTube's continuation trigger to the top. Fixed to fetch every page first; the spec's playlist-page cases were reshaped accordingly and pass, 7 of 7 and the whole spec on three workers.

## 1. Summary

| Metric | Value |
|---|---|
| Specs | 61 (60 feature/core specs + Options) |
| Generated test cases today, per browser project | 1353 (Playwright `--list`; ×2 with the Firefox project) |
| Estimated cases after all recommendations | ~743 |
| Tests judged unnecessary | 302 findings, ~895 generated cases per project |
| Tests judged incorrect (wrong expectation, cannot fail, races) | 203 |
| Missing tests | 298 (112 high priority) |
| Harness, configuration and family-template findings | 73 |
| Findings discarded during adversarial verification | 167 |

Case counts are exact for today (taken from `npx playwright test --list --project=chromium`). The "after" estimate assumes both the removals and the ~230 recommended additions land; removals alone would leave roughly 460 cases per project. At 10–20 seconds per case against live YouTube, the removals alone are worth 3–5 hours of wall clock per project per full run.

Eight specs for features that declare no `includePages` run every test on all 11 page types and account for 589 of the 1353 cases: `hideArtificialIntelligence` 77, `hideMembersOnlyVideos` 77, `hidePlayables` 77, `videosPerRow` 77, `customCSS` 77, `hideScrollBar` 71, `deepDarkCSS` 67, `removeRedirect` 66.

## 2. How the audit was done

- One auditor per spec read the spec, the feature's `index.metadata.ts` (config fields, `includePages`, buttons), `index.ts` lifecycle hooks, CSS and the helpers the spec calls, enumerated the observable surface, and classified every test as covering, unnecessary or incorrect, and every uncovered surface item as missing.
- One adversarial verifier per spec then tried to refute each finding with file evidence: searching the whole suite for existing coverage, re-reading the feature code, and recounting the loop-expanded cases. Roughly one finding in three was discarded at this stage; only surviving findings appear below.
- Four cross-cutting auditors covered the harness and configuration, the non-feature surface (options page, core config keys, content script), the hide-family template and the button-family template. A final critic looked for what the audit itself missed; its corrections are folded in.
- Hard numbers (case counts) come from Playwright's own test list, not from estimates.

Legend used in the catalogue: **remove** delete the test; **merge-into** fold its assertions into the named test; **reduce-pages** keep the test but run it only on the listed pages; **simplify** keep the behaviour, cut the redundant steps. Priorities: **high** = user-facing behaviour or a config field with zero coverage, or a branch that recently changed; **medium** = a lifecycle transition or page variant; **low** = nice to have.

## 3. Cross-cutting findings

These patterns recur across many specs; each per-spec entry in section 4 that mentions "nav re-enables", "vacuous", "page loop" or "template" is an instance of one of them.

### 3.1 "Persists after navigation" tests re-enable the feature before asserting

In about 30 specs the navigation test navigates away and back, then calls `disableFeature` and `enableFeature` (sometimes also `setOption(placement)`) before the assertion. The assertion therefore observes a fresh `onEnable`, so a broken `onNavigate` cannot fail it. Examples: `hidePosts.spec.ts:37-49`, `loopButton.spec.ts:58-69`, `flipVideoButtons.spec.ts:44-55`, `customCSS.spec.ts:38-48`, `globalVolume.spec.ts:27-35`, `automaticTheaterMode.spec.ts:56-64`, `hideLiveStreamChat.spec.ts:35-43`, `miniPlayerButton.spec.ts:52-62`.

Two harness facts make it worse. `navigateToPageType` always performs a full `page.goto` (`src/utils/_tests/navigation.ts`), so even a corrected navigation test exercises the reload path, not YouTube's single-page navigation. And `navigateToYoutubePage` skips the `goto` entirely when the URL already matches, so the home-page features (`hideOfficialArtistVideosFromHomePage`, `hidePosts`, `hidePlaylistRecommendationsFromHomePage`, `hideShorts` home, `playlistManagementButtons`) perform zero navigations in their navigation tests.

Consequence: `onNavigate` and the SPA dependency gate (`featureNavigationManager.handleNavigation` → `featureOrchestrator.updateFeatureOnNavigation`) have no coverage anywhere in the suite. No spec uses `goBack`, `pushState`, an in-page link click or `yt-navigate-finish`.

Fix once: delete the post-navigation disable/enable pairs; merge the navigation test into the reload test where they become identical; add a `spaNavigate(page, target)` helper (in-page anchor click plus `waitForURL`) and give every feature that implements `onNavigate` or declares `includePages` one genuine SPA test.

### 3.2 Assertions that cannot fail

1. **Vacuous element assertions.** `expectElementsHidden` and `expectElementsNotHidden` default to `mode: "all"`, whose loop runs zero iterations when nothing matches (`src/utils/_tests/assertions.ts`). There are 117 `expectElementsHidden` call sites and none uses `mode: "any"`. On pages where YouTube renders no matching markup (the normal case for `hidePaidPromotionBanner`, `hideTranslateComment`, `hideEndScreenCards`, `hidePlayables` away from home) only the body-class assertion is real.
2. **`injectDynamicContent` returns `null` when it finds nothing to clone and no caller checks** (24 call sites). Every "hides dynamically added content" test can silently be a no-op.
3. **Disabling a feature that is already disabled.** Every feature defaults to `enabled: false` and every test gets a fresh profile, so `disableFeature` writes an unchanged value, the orchestrator short-circuits and no hook runs. About 30 "should not X when disabled" tests observe only the default configuration. Verifiers kept a few of these (for example `automaticTheaterMode` and `hidePlayables`) because they are the only observation that a feature is inert at cold start; do not bulk-delete them, convert them into real enable→disable transitions.
4. **Tautologies and weak negatives.** `expect(body).toBeAttached()` (`saveToWatchLaterButton.spec.ts:19-28`, `playlistManagementButtons.spec.ts:34`); asserting the extension's message element exists (`playlistReverseButton.spec.ts:46,160`, `videoHistory.spec.ts:19`); `expect(download).toBeTruthy()` (`screenshotButton.spec.ts:30`); `.not.toBe(x)` polls that pass on the first sample (`globalVolume.spec.ts:14`, `shortsAutoScroll.spec.ts:24-30`, `rememberVolume.spec.ts:159`); `if (!x) return` early exits that turn a failure into a pass (`removeRedirect.spec.ts:34,41,48,71,81`, `hideScrollBar.spec.ts:39,121,149`, `blockNumberKeySeeking.spec.ts:34`).

Fix once: add a `requireMatch` option (default true) to both element assertions; make `injectDynamicContent` throw when it clones nothing; replace early returns with `test.skip(condition, reason)` or injected fixture markup.

### 3.3 Page loops multiply identical behaviour

`resolvePageTypes` returns all 11 page types when a feature declares no `includePages` (`src/utils/_tests/utils.ts`). The eight page-agnostic features listed in section 1 spend 589 cases on behaviour that has no page-specific branch (CSS injection, body classes, redirect rewriting); the recommended replacements total about 86 cases. `live` is also pulled into loops for features with no live branch; every live navigation costs a channel-page hunt under a 120 s timeout. Worse, after `page.reload()` several specs call `navigateToPageType(page, "live")`, which hunts for a new live video and discards the reloaded page, so about 15 "persists after reload" tests never observe a reload.

Fix once: drive page lists from an explicit per-spec `coveragePages` constant rather than `includePages`; keep `live` only where the feature branches on it (`hideLiveStreamChat`, `forwardRewindButtons`, one smoke case elsewhere); after `page.reload()` call `waitForExtensionReady(page)` instead of navigating.

### 3.4 Hide family: thirteen hand-copied templates

The 13 `hide*` specs cost 400 cases per project for features that toggle a `yte-hide-*` body class plus static CSS. Only four behaviours are distinct: class added and element hidden, absent on cold load, toggle cycle, restored after reload, plus the SPA gate for the nine page-gated ones. `restores original state when disabled` is a strict prefix of `re-applies after disable then re-enable` in all 13, and `hides dynamically added content` is tautological for CSS-only features. The copies have already drifted (`hideArtificialIntelligence` guards with `hasAnyMatch`, `hideMembersOnlyVideos.spec.ts:17` string-edits the body class, `hideEndScreenCards` hoists the reload test, `hideScrollBar` is a bespoke rewrite with no CSS file). Recommendation: a shared `describeHideFeature({ featureId, configKey, bodyClass, selectors, coveragePages, gated })` factory, targeting about 85 cases per project.

### 3.5 Button family: per-feature specs re-test the button controller

About 64 cases across 11 button specs re-prove `ButtonController.placeButton` and `handleFullscreenChange`, which are feature-agnostic; `loopButton.spec.ts:107,119` and `screenshotButton.spec.ts:123,132` are identical to tests in `buttonController.spec.ts`. Recommendation: one placement smoke test per button and no per-feature fullscreen describes (about 50 cases saved). What the family lacks instead is behaviour: `clickFeatureMenuItem` has zero call sites, so no test ever clicks a feature-menu item; no toggle button is checked for `aria-checked`, icon swap or `data-title` after a click (the only `aria-checked` assertions are the maximize-button sync tests); `featureMenu.openType: "hover"` and its live rewire are untested; tooltips are never asserted.

### 3.6 Timing and harness hygiene

- `setFeatureValue` sleeps a flat 500 ms after every write; across roughly 1230 call sites that is about 10 minutes of sleep per project run, and it is still a race (the earlier watch-page failures were exactly this). Replace it with an acknowledgement or a poll on the existing response channel.
- Specs add about 80 more `page.waitForTimeout` calls (23 in `timestampPeek`, 19 in `playlistReverseButton`, 9 in `hideScrollBar`), most directly in front of an `expect.poll` that already waits.
- `pageSetup` runs on every `navigateToPageType`, including when the `goto` was skipped, and each call starts a detached error-watch loop that can `page.reload()` mid-assertion. A spec that navigates three times has three such loops. `handleYoutubeAds` alone can wait up to 60 s plus a 30 s trailing check, which exceeds the CI per-test timeout.
- `waitForYoutubePlayerReady` requires `currentTime` to be unchanged over 200 ms, so it is only satisfiable while playback is not advancing.
- `toggleFullscreen(page, state)` clicks unconditionally, so calling it with the state the page is already in enters the wrong state and then fails its own wait.
- `expectCurrentQualityLevelToBeFalsy` reads once while its positive twin polls, so it can pass before the feature has acted.
- `waitForStableTime` has no timeout; `loadDefaultConfig` boots a Vite dev server in-process and has no caller that needs it; `setOption` is an alias of `setFeatureValue`; `buttonController.spec.ts` re-implements `toggleFullscreen` locally.

### 3.7 Configuration and CI

- The `use` block in `playwright.config.ts` (permissions, device, viewport, timeouts) never reaches the browser: both fixtures build their own context with `launchPersistentContext` and pass only `acceptDownloads`, `args`, `downloadsPath` and `headless`. Clipboard permissions are therefore not granted on either project, which affects `copyTimestampUrlButton` and `screenshotButton` clipboard assertions. Failure artefacts (screenshots, traces) are still captured, as observed in real failures. Grant permissions inside `createExtensionContext` or drop the inert keys.
- `.github/workflows/playwright.yml` runs `npm ci` and `npx playwright test` with no build step while the config hard-codes `dist/Chrome` and `dist/Firefox`; every test would fail at the readiness wait. `globalTimeout` is 30 minutes at one worker for 2706 cases; the CI per-test timeout (30 s) is shorter than the harness's own 30 s readiness wait; Node 18 is pinned while `.nvmrc` says 24.19.0; `npm ci` currently fails on the vite peer conflict; the CI reporter is `dot` but the workflow uploads `playwright-report/`; `actions/*@v3` are deprecated; Firefox runs headed on Ubuntu with no display; the branch filter is `main`/`master` only.
- `hasAuthState()` only checks that `playwright/.auth-profile` exists, but the config copies the profile only when `CI` is unset, so login-gated specs would run without a login in CI. Locally the copied profile is a real Chrome profile whose YouTube preferences (captions, theater mode, volume, quality) are baked into every test; specs that assert a pre-existing player state (`automaticallyDisableClosedCaptions`, `automaticTheaterMode`, `globalVolume`, `rememberVolume`) are environment-dependent and no spec establishes its own precondition.
- `generateMissingFeatureTests()` runs as a side effect of loading the config and copies the empty `__base__.spec.ts` for any feature without a spec, so a new feature silently gains a zero-test spec that satisfies the "every feature has a spec" rule.
- `generateHideFeatureSelectors` runs only in the post-build pipeline, so `playwright test` never refreshes the generated selectors after a CSS edit. Its capture regex writes CSS guards into `bodyClass` (`yte-hide-members-only-videos:not(:has(yt-sponsorships-hub))`), which `expectBodyWithClass` turns into a regular expression that can never match (worked around locally in `hideMembersOnlyVideos.spec.ts:17`), and rules that hide by means other than `display: none` are dropped silently.
- `tests/test-settings.json` is the legacy flat snake_case format; the import has no version or migration logic, so the Options import test only proves a toast appeared.

### 3.8 Behaviour outside feature specs

Core config keys with zero coverage: `featureMenu.openType`, `language`, `onScreenDisplay.type`, `onScreenDisplay.color`, `onScreenDisplay.opacity`, `youtubeDataApiV3Key`, `openSettingsOnMajorOrMinorVersionChange`; `onScreenDisplay.padding` is set but never asserted. The options UI is effectively untested: the settings generator, setting search, the conflict-resolution dialog, import validation, `disabledWhen`/`visibleWhen` gating. No test anywhere changes a setting through the UI and verifies it reaches storage. Back/forward-cache restore is never exercised. The popup page shares the settings page and has no spec (low priority).

### 3.9 A test hook ships in production builds

`src/pages/content/index.ts` handles the `test_setConfigValue` message unconditionally. The message channel is a DOM element plus a custom event, which any script on youtube.com can use, so a page script can rewrite arbitrary extension configuration in released builds. Guard the handler behind a build-time flag and fail the build if the string reaches `dist`.

### 3.10 Product defects surfaced by the audit and by the missing-test pass

These are code findings, not test findings. The first list is the audit's original suspicions with their outcome; the second list is what the new tests found while they were being written. "Fixed" means a `fix(...)` commit exists on this branch (and, where noted, has been carried to `dev`).

Original suspicions:

- `forwardRewindButtons/index.ts` dropped every listener of the feature when one button was removed. **Fixed** (`fix(buttons)`: listener removal is scoped to the button's own target).
- `miniPlayer/controller.ts` `close()` never unchecked `miniPlayerButton`. **Fixed** (`fix(miniPlayer)`: the controller announces state changes and the button follows them).
- `src/i18n/index.ts` returned the cached instance regardless of the requested locale. **Fixed** (`fix(i18n)`: one instance promise per locale).
- `featurePlayerManager` defaults `pageTypes` to `["watch", "live"]`, so the shorts path of `automaticallyDisableAmbientMode` and `defaultToOriginalAudioTrack` is dead. **Open.** The shorts cases of those specs stay skipped with a visible reason until the features pass `pageTypes` that include `shorts`.
- `hideEndScreenCardsButton/index.ts` used opposite `checked` conventions for the feature menu and the player placements. **Fixed** (`fix(hideEndScreenCardsButton)`: `aria-checked="true"` means the cards are hidden everywhere).
- `Select.tsx` renders `id={label}`, so `#language` could not be located. **Resolved on the test side**: the Options spec locates selects by their label.
- `playerQuality` did not suspend enforcement for a manual change made during its own switch. **Fixed** (`fix(playerQuality)`: manual changes are detected through the requested quality and the feature's own switches are settled first).

Found by the missing-test pass:

- `hideArtificialIntelligence` never reached the live chat, which lives in an iframe the embedded script does not run in. **Fixed** (`fix(hideArtificialIntelligence)`: a style element is injected into the chat frame and re-injected on reload).
- `removeRedirect` kept its `MutationObserver` after being disabled. **Fixed** (`fix(removeRedirect)`).
- `automaticallyDisableClosedCaptions` / `automaticallyEnableClosedCaptions` toggled the caption button blindly on navigation, so they could flip captions the wrong way. **Fixed** (`fix(closedCaptions)`: the state is read from `aria-pressed` first).
- `defaultToOriginalAudioTrack` remembered one original track for the whole session. **Fixed** (`fix(defaultToOriginalAudioTrack)`: the track is keyed by video id).
- `globalVolume` ignored a volume change made while the feature was enabled. **Fixed** (`fix(globalVolume)`).
- `src/utils/url` read the live flag from the previous video right after a single-page navigation. **Fixed** (`fix(url)`).
- `hideLiveStreamChat` left its hide class behind when disabled off a live page. **Fixed** (`fix(hideLiveStreamChat)`).
- `hideLiveStreamChat` read `getVideoData().isLive` once, as soon as `#movie_player` existed; on a freshly opened live stream that read can still be empty or the previous video's, and a false answer dropped the hide for good. **Fixed** (`fix(hideLiveStreamChat)`: the check runs through `playerManager.executeWithRetries` with `waitForLoaded` and only trusts data that belongs to the page's video).
- `globalVolume` set the volume as soon as `#movie_player` existed; a live stream's player finishes initialising later and reads YouTube's stored volume back over it. **Fixed** (`fix(globalVolume)`: the volume is applied once the player has loaded and re-applied briefly until `getVolume()` reports it; `playerShowsPageVideo` moved to `src/utils/dom/player.ts` for both features).
- The content-script build (`src/pipeline/steps/buildContentScripts.ts`) did not set `modulePreload: false` like the main build does, so Vite wrapped the embedded script's dynamic imports in its preload helper. Inside youtube.com the helper's `<link rel="modulepreload">` hrefs resolve against the page, and every page load fired about a dozen 404 requests at `youtube.com/src/<chunk>.js` before the real `import()` loaded the chunk from the extension. **Fixed** (`fix(pipeline)`: preload disabled for that build; a signed-in watch page now makes no such request).
- `automaticallyDisableAutoPlay` switched autoplay off by clicking YouTube's toggle, and YouTube's newer control bar sometimes folds that toggle away at load (inline `display: none`, the expander beside it hidden too); while folded the button is inert, so the feature's clicks changed nothing and autoplay stayed on. Two more races sat behind it: the feature trusted the first "off" reading, although YouTube re-initialises the toggle from the account's setting about a second after an in-page navigation and turned autoplay back on after the feature had finished; and a click that YouTube dropped was retried at most three times. **Fixed** (`fix(automaticallyDisableAutoPlay)`): a folded toggle, or a third attempt, goes through the player's own autonav API (`setAutonav` / `setAutonavState`, the calls the toggle itself makes; probed 2026-09-04), "off" has to hold for six reads before the work counts as done, and a trusted click on the toggle is taken as the user's choice that ends the override, which is what the first version of the stability check had broken for a user who turns autoplay back on within two seconds. The spec plus the end-screen test then passed 21 of 21 across three repeats without a retry; the spec's own clicks still need a visible toggle, so it reloads once when the bar is folded and otherwise stops with a reason.
- A setting changed while a page's extension setup was still running was lost on that page. The content script forwards storage changes to the page script only from `pageLoaded` on, and the page script read its options at the start of `setupYouTubePage`, so a change in between (a user editing an option while a page loads; every e2e enable on a live page YouTube had just reloaded) was neither forwarded nor read. The orchestrator also dropped an update that arrived while the same feature was mid-update. **Fixed** (`fix(embedded)`): `lifecycle.ts` re-reads the options once forwarding is on and applies every feature whose config changed, and `featureOrchestrator.updateFeatureEnabledState` queues the newest concurrent request instead of dropping it. Stress loops of the four affected live-button tests went from 4 to 8 failures of 24 to 0 of 24.
- `openYouTubeSettingsOnHover` closed YouTube's settings popup the moment a submenu (Quality, Playback speed) was opened. When YouTube swaps the panel the menu fires a mouseleave and stops matching `:hover` although the pointer has not moved; the feature's post-click check ran 300 ms later, saw "not hovered", and clicked the settings button shut. Reported by the user on 2026-09-04; present with and without the day's commits, so older than them. **Fixed** (`fix(openYouTubeSettingsOnHover)`): a click inside the menu only cancels a pending hide, the hide decision compares the pointer's last position with the live menu and button rectangles instead of trusting hover state or mouseleave, and a setup that a later one overtook while waiting attaches nothing, so a navigation can never leave two listener sets behind. Verified headless on a fresh page and after an in-page navigation: hover opens with one click, the Quality submenu stays open, leaving closes it; the spec gained a submenu case.
- `src/utils/audioEngine.ts` returned `undefined` for the engine it had just created. **Fixed** (`fix(audioEngine)`).
- `automaticallyDisableAutoPlay` treated a click on the autoplay toggle as done even when YouTube dropped it, which happens right after a single-page navigation. **Fixed** (`fix(automaticallyDisableAutoPlay)`: the click is only counted once the toggle reports the new state, with a retry budget).
- `shareShortener` cached the first `#share-url` input; YouTube keeps closed dialogs in the DOM, so the second dialog was never cleaned. **Fixed** (`fix(shareShortener)`: every `#share-url` input is cleaned on each tick).
- `videoHistory` compared the navigation signature (`watch:<id>`) with `"start"`/`"finish"`, so `onNavigate` never ran either branch. **Fixed** (`fix(videoHistory)`).
- `playerQuality` applied while a pre-roll ad was showing (taking the ad's "unknown" quality, level list and request as its baseline) and, when the player reported nothing usable for 15 s, ran out of attempts and never enforced the quality for that video. **Fixed** (`fix(playerQuality)`: no apply while an ad shows, a quality range is set on a player that has not started yet as soon as it holds the current video, and the request baseline used to detect manual changes is only taken once the level is seen playing; `featurePlayerManager` installs the player-state re-run hook after a failed run too, re-runs when the player's `ad-showing` class clears because an ad ending is not always a state change, and discards a run that a navigation or a newer run superseded while it was still waiting for the player). The hook changes also apply to `playerSpeed`, the only other user of `onPlayerStateChange`.
- `openYouTubeSettingsOnHover` re-ran its listener setup on every navigation without removing the previous set, so after an in-page navigation each hover clicked the settings button twice and closed the menu it had just opened. **Fixed** (`fix(openYouTubeSettingsOnHover)`: the setup replaces the feature's listeners).
- `timestampPeek` removed its preview overlay on disable and on navigation while the player's own video element was still inside it, which left the player without a video and made every later preview stay hidden. **Fixed** (`fix(timestampPeek)`: the video is moved back into the player before the overlay is removed).
- `automaticTheaterMode` counted its size-button click as success. A maximized player takes that click as a user click and minimizes, and the click also toggles YouTube's theater mode off, so enabling theater mode on a maximized player ended with neither. **Fixed** (`fix(automaticTheaterMode)`: the task only ends once the mode reads as desired, with clicks spaced a second apart).
- `defaultToOriginalAudioTrack` handed `setAudioTrack` the nested descriptor (name, id, flags) it had parsed out of a track instead of the track object itself; the player throws on that, so the feature never switched a track on the current player. Its tests only passed while YouTube had not auto-dubbed the fixture, which for an en-US profile is always, since the fixture's original is English. **Fixed** (`fix(defaultToOriginalAudioTrack)`: the parsed result keeps the track object for the player and the descriptor for comparisons); the spec now selects the auto-dubbed track through the player API when a load did not start on one.
- `scrollWheelController` listened in the bubble phase on the player and its wrappers, so YouTube's own handlers on the controls and overlays could take the wheel event first, and it pinned the player element it found at enable time, so on shorts, where YouTube swaps the player element after an in-page navigation, the control drove a discarded player. **Fixed** (`fix(scrollWheelController)`: one capture-phase listener on the document, the player resolved per event and the runtime kept on the live element; the volume spec covers moving to the next short).
- The options page's notification provider removed a notification by object reference while its progress loop replaced every notification object each frame, so a toast's close button and the reset confirm button only removed the toast when no frame had run since the last render. **Fixed** (`fix(notifications)`: notifications are matched by timestamp, type and action).
- `automaticallyEnableClosedCaptions` and `automaticallyDisableClosedCaptions` clicked the subtitles button once, at enable or navigation time. That click is lost while a pre-roll ad is showing (it goes to the ad's player), while the video's caption track has not loaded (YouTube hides the button and drops the click; a live stream does this again for a while after an ad) and, for the disable feature, whenever YouTube turns captions on from the viewer's preference after the click, which it does after every reload. **Fixed** (`fix(closedCaptions)`: both features run the click as a player-manager task that waits out ads and missing tracks and checks the button's state after every click; the disable feature ends its run once captions have stayed off for two attempts after the track loaded, so a caption the viewer turns on later is left alone). The button's aria-label is no signal of availability - on the watch fixture it reads "unavailable" while the player lists five caption tracks - and since the caption test helpers keyed on that label, every captions test on watch had been returning early without asserting; availability now follows the player response's caption tracks (a live stream is the exception: it keeps its auto-generated track outside the response and lists it only once captions are on, so on live the fixture hunt proves captions by turning them on and restores what it found), and both specs skip with a reason instead of returning silently. The live fixture hunt accepted a stream without captions, since it only checked that the button reports a state; it now requires a caption track and stops after one clean pass over the channel, and the specs skip when no captioned stream is on air. The captions specs hop to a related video that offers captions for their in-page navigation, and the related-video helper falls back to the player's next button when YouTube renders no sidebar.
- `playerQuality` left the enable run's player-state hook in place when the feature was disabled. The hook re-ran enforcement on the next state change (the buffering that the disable's own quality switch causes), and since a new run supersedes the one in flight, the restore run that `onDisable` had just started was cancelled before it touched the player: the quality stayed at the enforced level and `data-default-quality` never went back. The "manual change" the earlier diagnosis blamed was that same stale hook seeing the restore's request. **Fixed** (`fix(playerQuality)`: `onDisable` cleans up the feature's manager runs and hook before it starts the restore). `getAvailableQualityData()` no longer carries a `formatId` (only `qualityLabel`, `quality`, `isPlayable` on 2026-09-05), so entries without one are no longer picked by format, which also ends the "Selected format undefined" log.
- `playerSpeed` took every rate change it had not written itself as the user's choice and stood down for the rest of the video. YouTube writes the rate itself when a video or an ad starts (a pre-roll ending set it back to 1 right after the feature had set 2 in the traced run), so the configured speed was lost on exactly the loads that had an ad. **Fixed** (`fix(playerSpeed)`: a rate change counts as manual only when a real key press, click or wheel turn came within 1.5 s or a pointer is held; any other change is put back to the configured speed, at most five times per video). The spec's manual-change case now uses YouTube's `<` shortcut instead of writing `playbackRate` from the test.
- `videoHistory` read `div#movie_player` once when it was enabled, and at extension start-up on a slow load the element was not there yet, so the feature returned without a prompt and without tracking, and nothing ran it again before the next navigation. It also took the first `getVideoData()` as the page's video, which during a pre-roll is the ad. **Fixed** (`fix(videoHistory)`: the player is waited for, and on the first read of a page the feature waits until the player holds the video the URL names and no ad is showing, up to 15 s).
- `timestampPeek` attached the preview overlay's mouseenter, mouseleave and click listeners only after the preview's seek and `play()` had gone through, so while those were pending (a slow connection, or a position YouTube would not serve) a click on the overlay did nothing and a leave was never heard. It also captured the position to return to on every mouseenter of the timestamp, so re-entering the link while the preview was up, or moving to the next timestamp, made the preview's own position the restore target. **Fixed** (`fix(timestampPeek)`: the listeners go on before the preview starts and the previous hover's are dropped, the restore position is held in one place from the first hover until the restore, and a generation counter stops a preview that a leave or a click ended while its seek was pending). The seek-on-click case's earlier failures were this, not scrolling: on the signed-in profile YouTube never completes a seek outside the buffered range on videos over a few minutes (`seekTo()` and `currentTime` alike stay `seeking`, checked headed and headless with the feature off), so the comment preview at 3:15 stalled and the click was lost.
- `keywordBlocklist` (new on `dev` 2026-09-06) acted on config changes while disabled. The registry hands every config change to every feature, and this one started observing and masking as soon as a keyword was saved, before `onEnable` had resolved the masked-title label, so the cards were marked with an empty title; and because the feature recognises its own output by that label, the next scan took the empty title for a rewrite by the page and dropped the stash, losing the original title until the next page load. **Fixed** (`fix(keywordBlocklist)`: `onConfigChange` returns while the feature is disabled, as the other features with a config hook do; the next enable reads the saved keywords).
- `onScreenDisplay` positioned itself on shorts against a layout YouTube no longer serves. The display manager looked for `ytd-shorts-player-controls` under `.player-controls` to keep a top display below the overlay controls, and for `ytd-reel-video-renderer[is-active] … div#overlay` to keep a bottom display above the overlay; the current layout marks no reel `is-active`, the control bar (play, mute, captions, menu, fullscreen) is the `.player-controls` div itself, and the title block is `.ytReelPlayerOverlayViewModelMetadataContainerMetapanel`, over the bottom of the video when the window is too short to place it beside. Both lookups came back empty, so a top display sat under the control bar and a bottom display under the title. **Fixed** (`fix(onScreenDisplay)`: the reel holding `#shorts-player` is the active one; its control bar and title block are read from there, with the old selectors as fallbacks, and a title block beside the video adds no bottom offset). Found on 2026-09-06 when the user pointed out that the spec's shorts case, which skipped on the dead selector, described a layout that does not exist.
- `playlistReverseButton` reversed only what the playlist page had loaded, and made things worse in doing so. YouTube renders a hundred rows and keeps a continuation item at the end of the list (and of the data array behind it) that fetches the next hundred when it scrolls into view; the feature reversed the children and the data array wholesale, so the continuation item landed at the top, in view, and fetched the next page at once, whose rows were appended below the reversed ones in forward order. On a 374-row playlist a click gave rows 100 to 1 followed by 101 to 200, and a reload cascaded through every page. Surfaced on 2026-09-06 by the user's headed run after the fixture grew past a hundred rows. **Fixed** (`fix(playlistReverseButton)`: on the playlist page the feature fetches every page first, by scrolling the continuation item into view until none is left, capped at fifty pages, with the scroll position given back, and then reverses the whole list; the continuation item stays last in the DOM and in the data whenever one remains). The spec's playlist-page cases load the whole list before capturing the order, except the double-click case, which leaves the fetching to the feature and checks the reversed list ends with the reversed first page and is longer than it; the order reader was also scoped to the list, since an owned playlist shows suggested videos in rows of the same kind below it.

Still open (observed while writing tests, not fixed on this branch):

- `playlistManagementButtons` appends its "remove all watched videos" button to `chip-bar-view-model`, which regular playlist pages no longer have (2026-09-06, fixture `PLA-lApStgDt8`, over 300 rows): their header is a `yt-page-header-view-model` whose play-all, shuffle and menu actions live in a `yt-flexible-actions-view-model` row, so on every regular playlist the button never appears. It still works on Watch Later, which keeps the older `ytd-playlist-header-renderer` layout with a sort chip bar over legacy rows, and that is what the July 2026 commit was evidently written against. The flexible-actions row is the natural second host for regular playlists.

- `maximizePlayer` never sets `header.visible = false` when it maximizes; the header stays in the state YouTube left it in.
- `volumeBoost` leaves the gain node applied when the mode changes from global to per-video.
- `useNotifications` hard-codes `en-US` for its provider instead of the configured language.
- `shareShortener/utils.ts` `observeShareURLInput` never assigns `inputObserver`, so `removeObserver` cannot disconnect an observer that has not disconnected itself.
- `hideEndScreenCardsButton` uses the same icon pair in fullscreen as in the normal player (the fullscreen swap in `icons.ts` is unverified).
- `playlistManagementButtons` keys on `ytd-playlist-video-renderer` rows with a legacy `ytd-thumbnail-overlay-time-status-renderer`; a playlist rendered with YouTube's newer `yt-lockup-view-model` rows (the channel-uploads playlist `UUuAXFkgsw1L7xaCfnd5JJOw` on 2026-09-04, 100 rows, badge-shape overlays) gets no buttons at all.

## 4. Per-spec catalogue

For every spec: the tests that exist (collapsed over page loops, with the exact number of generated cases), the tests that are not needed, the tests that are incorrect, and the tests that are missing. Line numbers refer to the spec file at commit `d30fdfcd`.

### Options

`src/pages/options/Options.spec.ts` — 6 generated cases today, about 18 after the recommendations below.

Options.spec.ts is a thin smoke test: 6 static tests, no page loops, so 6 generated cases per project. It touches the footer buttons and the page title, and asserts nothing about the settings UI itself. The single hard failure is "should render language select" (Options.spec.ts:9): Select discards the id prop it is given (src/components/Inputs/Select/Select.tsx:39-84 renders id={label}), so #langu…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should render YouTube Enhancer settings page | — | 1 |
| should render language select | — | 1 |
| should import settings | — | 1 |
| should export settings | — | 1 |
| should clear data | — | 1 |
| should reset data | — | 1 |

**Not needed** (1)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should render YouTube Enhancer settings page | 4 | merge-into:should render a section for every feature metadata section | 1 | Both assertions are supplied by the harness, not the product: page.url() is the URL the optionsTest fixture navigated to (playwright.config.ts:108-125) and the <title> is static markup in src/pages/options/index.html:4, … |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should render language select | 9 | high | #language never exists in the DOM, so the locator matches nothing and toBeAttached fails (stale test left behind by commit cb1b6f71 "refactor: remove id since it wasn't properly used"). Setting forwards id to Select (src… | Locate the control by its label association instead: page.getByLabel("Language") (the <label htmlFor={label}> at Select.tsx:69-71 names the button) or page.locator("button#Language"); better, restore an explicit id/data-… |
| should reset data | 48 | medium | The title promises a reset that the body never observes. "Options saved." is emitted both by the confirm handler and by refreshSettings -> settingsMutate onSuccess (Settings.tsx:79-88), and setSettings returns early with… | Change one setting first (or seed storage via page.evaluate), then after clicking #confirm_button read chrome.storage.local and assert the changed key is back to its getDefaultConfiguration() value; keep the toast assert… |
| should import settings | 15 | medium | Two issues. (a) importSettings.click() calls settingsImportRef.current.click() on the hidden file input (SettingsFooter.tsx:143-154); Playwright only enables Page.setInterceptFileChooserDialog when a filechooser listener… | Drop the button click (or wrap it in page.waitForEvent("filechooser")) and call setInputFiles directly; after the toast, read chrome.storage.local and assert migrated values from tests/test-settings.json, e.g. playerQual… |
| should clear data | 38 | low | Under-asserts its title: the toast fires from the confirmed branch but browser.storage.local.set(defaultConfiguration) is a fire-and-forget `void` call (SettingsFooter.tsx:136), so a write that fails or is a no-op still … | Seed a non-default setting and a state:<featureId> key via page.evaluate first; after the toast read chrome.storage.local and assert config keys equal getDefaultConfiguration() and assert explicitly that state: keys surv… |
| should export settings | 26 | low | addNotification runs unconditionally right after a.click() (SettingsFooter.tsx:181-186), so a broken blob, filename or state serialisation still shows "Settings successfully exported". The title promises an export the bo… | Wrap the click in page.waitForEvent("download"), assert suggestedFilename matches /^youtube_enhancer_settings_.+\.json$/, and parse the saved file to assert it contains every getDefaultConfiguration() key plus the state:… |

**Missing** (11; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should render a section for every feature metadata section | options page (optionsTest fixture) | SettingsGenerator builds the entire settings UI from feature metadata (section grouping, sort, flatten) and not one assertion in the repo observes it; a bad section id, a thrown render or a stuck <Loader /> would leave e… | src/components/Settings/SettingsGenerator.tsx:56-96 (section map build), :333-348 (SettingSection per key); src/componen… |
| high | should persist a select change made in the options UI | options page | createOptionSetter -> updateConfigAtPath -> settingsMutate -> setSettings -> browser.storage.local.set is the only write path of the options UI and nothing touches it; every feature spec writes config through the content… | src/components/Settings/Settings.tsx:109-137 (createOptionSetter/setValueOption), :197-201 (setSettings), src/components… |
| high | should show the import conflict dialog and apply a resolution | options page | detectConflicts + ConflictResolutionDialog is a whole user-facing flow (3 conflict types) with zero coverage, and it is the only path that can silently corrupt an import. tests/test-settings.json triggers no conflict (no… | src/components/Settings/components/SettingsFooter.tsx:96-103 (early return when conflicts exist), :295-328 (onResolve wr… |
| medium | should reject an invalid settings file and leave storage untouched | options page | Zod validation, the numeric-constraint alert and the unknown-error alert are three untested failure branches; without a dialog handler Playwright auto-dismisses, so a regression that swallowed the alert and imported garb… | src/components/Settings/components/SettingsFooter.tsx:80-94 (validation + validateNumbers alerts), :121-126 (unknown-err… |
| medium | should disable child settings while the parent feature is off | options page | disabledWhen + parentSetting drive both a disabled control and the explanatory tooltip on most generated settings and neither is asserted anywhere. | src/components/Settings/SettingsGenerator.tsx:139-140 (evaluateConditions disabled mode); src/components/Settings/compon… |
| medium | should reveal deep dark colour pickers only for the Custom preset | options page | visibleWhen is a conditional-render branch gating 7 config fields (the only way to reach deepDarkCSS.colors.*); deepDarkCSS.spec.ts only exercises presets through the content script and never renders these controls. | src/features/deepDarkCSS/index.metadata.ts:53-129 (7 nodes with visibleWhen preset === "Custom"); src/components/Setting… |
| medium | should filter settings with the header search box | options page | SettingSearch gates the visibility of every Setting and SettingSection through two independent matchers and has no coverage; a broken matcher would hide the whole page. | src/components/Settings/components/SettingSearch.tsx:14-21; src/components/Settings/components/Setting.tsx:52-57; src/co… |
| medium | should save custom CSS typed into the editor | options page | The css-editor is the only rich input in the settings UI (500 ms debounce + blur flush + external-value sync) and nothing exercises it; customCSS.spec.ts writes customCSS.code through the content script and never opens t… | src/components/Inputs/CSSEditor/CSSEditor.tsx:49-77 (value sync, debouncedOnChange, flushSave on blur); src/features/cus… |
| medium | should restore the reset button when the reset notification is dismissed | options page | The footer swaps reset/confirm purely off the presence of the reset_settings notification; the cancel half of that branch (close button -> removeNotification) is unobserved, and a regression there would leave a permanent… | src/components/Settings/components/SettingsFooter.tsx:231-258 (notifications.filter(...reset_settings) ternary); src/com… |
| medium | should switch interface language and text direction | options page | Language selection reloads the i18n instance and flips localeDirection; the rtl branch is user-facing and untested (and this is also the only select whose current test is broken). | src/components/Settings/Settings.tsx:97-104 (i18nService reload), :149 direction context, :160 dir={localeDirection[sett… |
| low | should not clear data when the confirm dialog is dismissed | options page | window.confirm returning false is an explicit branch; only the accept path runs today, and a regression that ignored the return value would silently wipe user config. | src/components/Settings/components/SettingsFooter.tsx:132-141 (userHasConfirmed guard) |

### automaticallyDisableAmbientMode

`src/features/__tests__/automaticallyDisableAmbientMode.spec.ts` — 12 generated cases today, about 9 after the recommendations below.

The spec has six tests expanded over includePages ["watch","shorts"] = 12 cases per project (24 across chromium+firefox), but very little of it can fail. All six shorts cases are dead: since the executeWithRetries migration (commit 9473f0a9) the feature passes no `pageTypes`, so featurePlayerManager.ts:42,69 rejects shorts before the task runs, and the spec's getAmbientState (spec:14-26) only read…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| disables ambient mode | watch, shorts | 2 |
| restores ambient mode when feature disabled | watch, shorts | 2 |
| should persist disabled ambient mode after navigation | watch, shorts | 2 |
| re-applies after disable then re-enable | watch, shorts | 2 |
| persists after full page reload | watch, shorts | 2 |
| should not disable ambient mode when feature is off | watch, shorts | 2 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores ambient mode when feature disabled on ${pageType} | 41 | merge-into:re-applies after disable then re-enable on ${pageType} | 2 | Byte-for-byte a strict prefix of `re-applies after disable then re-enable on ${pageType}` (spec:88-118): same navigate, same null guard, same enable -> poll false, same disable -> poll initialState; the longer test then … |
| disables ambient mode on ${pageType} | 29 | merge-into:re-applies after disable then re-enable on ${pageType} | 2 | Its single assertion (enable -> poll ambient false) is step one of `re-applies after disable then re-enable on ${pageType}` (spec:92-100) and is repeated verbatim by spec:45-53, 66-74 and 123-131. Its only unique propert… |
| should not disable ambient mode when feature is off on ${pageType} | 143 | remove | 2 | It exercises the harness, not the feature: the feature defaults to enabled=false (index.metadata.ts:7), so disableFeature writes an unchanged value and notifyConfigChange short-circuits at `if (!featureConfigManager.hasC… |
| for (const pageType of testPages) - the shorts half of the expansion | 28 | reduce-pages:watch | 3 | Count side of the shorts defect described under `disables ambient mode on ${pageType}`: onEnable passes no pageTypes, so executeWithRetries falls back to ["watch","live"] and isOnAllowedPage returns false on /shorts, abo… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| disables ambient mode on ${pageType} | 29 | high | On shorts the expectation contradicts the feature code. onEnable calls executeWithRetries without a pageTypes override (index.ts:113-119), so DEFAULT_CONFIG.pageTypes = ["watch","live"] applies (featurePlayerManager.ts:3… | Restrict testPages to ["watch"] at spec:12 and fix the feature to pass pageTypes:["watch","shorts"] plus a shorts-aware isAmbientEnabled(); only then re-add a shorts test with a shorts-aware probe. |
| re-applies after disable then re-enable on ${pageType} | 88 | high | Nothing establishes that ambient mode is ON before the feature is enabled, so the `.toBe(false)` polls at spec:93-100 and 111-118 are satisfied by a page where ambient was never on and the extension did nothing. The "amb… | Add a helper that turns ambient ON through the player settings menu (reuse the ambientModePathSelectors item), assert getAmbientState() === true before enabling, then keep the existing sequence; replace the bare `return`… |
| should persist disabled ambient mode after navigation on ${pageType} | 64 | high | The title promises persistence across navigation, but no SPA navigation happens and onNavigate (index.ts:120-126) never fires. navigateToPageType -> navigateToYoutubePage does page.goto whenever the URL differs (src/util… | Do a real in-page navigation (click a suggested-video link and wait for the ?v= id to change so yt-navigate-finish fires), turn ambient back on through the player menu, then assert getAmbientState() becomes false again w… |
| persists after full page reload on ${pageType} | 120 | medium | The post-reload assertion cannot distinguish the extension re-applying the setting from the setting simply never having been on: no step establishes ambient was ON (same root cause as spec:88), and once the feature has c… | After the first `.toBe(false)`, turn ambient back ON through the player settings menu (the feature has no observer, so it will not react), then page.reload() and assert the extension turns it off again; combine with the … |

**Missing** (4; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | does not turn ambient mode on when it was already off before the feature was enabled | watch | onDisable is guarded by `if (!ambientModeWasEnabled) return` (src/features/automaticallyDisableAmbientMode/index.ts:105-106) and the capture at index.ts:44-46 only happens once. No test controls that precondition: `resto… | src/features/automaticallyDisableAmbientMode/index.ts:44-46 and 105-112; spec:41-63 and 88-118 assert only `.toBe(initia… |
| medium | leaves the YouTube settings menu usable after disabling ambient mode | watch | The watch branch mutates YouTube's own settings menu: it adds class `hidden` and clicks the settings button twice to prime an empty panel (index.ts:53-57), and only removes `hidden` on the two later paths (index.ts:61, 6… | src/features/automaticallyDisableAmbientMode/index.ts:48-68; settingsPanelMenuSelector = "div.ytp-settings-menu:not(#yte… |
| medium | does not touch ambient mode on a live stream | live | live is outside includePages so areDependenciesMet() blocks enabling (featureNavigationManager.ts:27-35), but live videos are served from /watch URLs, so isWatchPage() is true (src/utils/url/index.ts:113-115) and execute… | src/features/automaticallyDisableAmbientMode/index.metadata.ts:8; src/utils/url/index.ts:38-49 (live classification) and… |
| low | options page checkbox toggles automaticallyDisableAmbientMode.enabled | options (optionsTest fixture) | The declared setting (index.metadata.ts:10-17) has no UI coverage anywhere; Options.spec.ts only tests page render, language select, import, export, clear and reset - no per-feature control at all. | src/features/automaticallyDisableAmbientMode/index.metadata.ts:10-17; src/pages/options/Options.spec.ts:3-50. |

### automaticallyDisableAutoPlay

`src/features/__tests__/automaticallyDisableAutoPlay.spec.ts` — 6 generated cases today, about 8 after the recommendations below.

The spec expands to 6 cases (includePages is ["watch"] only, index.metadata.ts:8) and meaningfully covers the first override, the restore-on-disable path, and the re-override after a config toggle. Its main gap is the SPA half of the feature: navigateToPageType only performs full page.goto loads (navigation.ts:136), so onNavigate/makeNavigateTask (index.ts:66-79) and the once-per-session hasOverri…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| disables autoplay | watch | 1 |
| does not re-enable autoplay when disabled | watch | 1 |
| disables autoplay after navigation | watch | 1 |
| should disable autoplay on re-enable after disable | watch | 1 |
| restores autoplay when disabled after being enabled | watch | 1 |
| persists disable after full page reload | watch | 1 |

**Not needed** (2)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| disables autoplay after navigation on ${pageType} | 48 | remove | 1 | navigateToPageType only performs full page.goto loads (navigation.ts:136, 216-218), so the home round trip re-runs exactly the fresh-load path the reload test covers, and module state (previousAutoPlayState / hasOverridd… |
| should disable autoplay on re-enable after disable on ${pageType} | 59 | merge-into:restores autoplay when disabled after being enabled on ${pageType} | 1 | Lines 60-64 are byte-identical to lines 69-73; the restore test is a strict prefix that additionally asserts the restore to true (line 74). Appending `enableFeature` + `poll(...).toBe(false)` to the restore test keeps bo… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| does not re-enable autoplay when disabled on ${pageType} | 40 | medium | Both polls sample a value that is already false when polling starts, so each passes on its first tick and neither ever observes the behaviour it names. Line 42 sets autoplay off, so the enable task takes the settle branc… | Replace each poll with a stability check that spans the retry window: loop about 8 times asserting expect(await getAutoPlayState(page)).toBe(false) with a 500 ms wait between samples (about 4 s > the 10 x 300 ms settle w… |
| disables autoplay after navigation on ${pageType} | 48 | medium | The title promises that the navigation triggers a disable, but there is no assertion between the return navigation (line 54) and the disable/enable cycle at lines 55-56; the only post-navigation check (line 57) therefore… | Preferred: delete the test (see the unnecessary finding, it duplicates the reload path). If kept, add `await setAutoPlayState(page, true)` after line 52, assert `poll(...).toBe(false)` immediately after line 54, and drop… |
| persists disable after full page reload on ${pageType} | 76 | low | Autoplay is already off when page.reload() runs at line 81, and YouTube persists the autonav preference itself, so the poll at line 83 cannot distinguish 'the extension re-applied the override on load' from 'YouTube rest… | Insert `await setAutoPlayState(page, true)` between lines 80 and 81. This is safe: the enable task has already set hasOverriddenDefault (index.ts:57) and its retry loop has resolved, and executeWithRetries defaults onPla… |
| getAutoPlayState helper (used by every test) | 18 | low | `expect(value).not.toBeNull()` cannot fail: line 16 has already awaited toHaveAttribute("aria-checked", /^(true\|false)$/) on the same locator, so the attribute is present by construction when it is read on line 17. | Delete line 18 and return `value === "true"`; the toHaveAttribute assertion on line 16 is the readiness gate. |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | keeps autoplay on for later videos once the user turns it back on | watch | makeNavigateTask's `if (hasOverriddenDefault) return true` early return is the whole once-per-session rule and is the subject of the two most recent feature commits (e3fb2ea0 "Re-disable autoplay on SPA navigation", f732… | src/features/automaticallyDisableAutoPlay/index.ts:66-79 and :12-14; onNavigate only fires on SPA navigation (featureNav… |
| medium | disables autoplay after an in-page navigation onto a watch page | channel_videos -> watch | Covers the deps-unmet -> deps-met transition driven by navigation (updateFeatureOnNavigation -> updateFeatureEnabledState -> enableFeature, then navigateFeature) plus the makeNavigateTask click branch; every existing tes… | src/features/_registry/featureOrchestrator.ts:172-190 (enable then navigate on the same SPA event) and :142-166; src/fea… |
| low | does not touch autoplay when the feature is disabled | watch | The default config value has zero direct coverage; the closest test (spec:68) only asserts the restore right after a disable. A regression running the enable task irrespective of config would still pass every test in thi… | src/features/automaticallyDisableAutoPlay/index.metadata.ts:7; parallel test `should not disable ambient mode when featu… |

### automaticallyDisableClosedCaptions

`src/features/__tests__/automaticallyDisableClosedCaptions.spec.ts` — 12 generated cases today, about 8 after the recommendations below.

The spec runs 6 tests over watch+live (12 cases) but only one of them ("restores captions when feature disabled on ${pageType}", spec:24) actually observes the feature disabling captions; three others start with captions already off so their assertions cannot fail, and one asserts an outcome the code cannot produce. Key defects: spec:53 expects captions restored although onDisable returns early wh…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| disables captions | watch, live | 2 |
| restores captions when feature disabled | watch, live | 2 |
| disables captions after navigation | watch, live | 2 |
| re-applies after disable then re-enable | watch, live | 2 |
| persists after full page reload | watch, live | 2 |
| should not disable captions when feature is off | watch, live | 2 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should not disable captions when feature is off on ${pageType} | 69 | remove | 2 | Confirmed no-op: the feature default is enabled:false (index.metadata.ts:55) and a fresh persistent context is created per test (playwright.config.ts:25-43,82-96), so disableFeature writes false over false. In updateFeat… |
| restores captions when feature disabled on ${pageType} | 24 | merge-into:re-applies after disable then re-enable on ${pageType} | 2 | Once spec:49 is corrected to ensureCaptionsState(page, true) (see incorrect #1), the test at spec:46 runs on -> enable -> off -> disable -> on -> enable -> off, a strict superset of this test's on -> enable -> off -> dis… |
| disables captions after navigation on ${pageType} | 33 | reduce-pages:watch | 1 | The feature has no live/VOD branch (index.ts has no page checks). Conditional on adding the explicit SPA-navigation test above: today the live variant is the only case in the whole suite where onNavigate can actually fir… |
| persists after full page reload on ${pageType} | 57 | reduce-pages:watch | 1 | No page-specific code path, and on live the test does not even assert on the reloaded page: after page.reload() it calls navigateToPageType(page, "live"), which goes back to the channel URL and opens whatever live video … |
| disables captions on ${pageType} | 15 | reduce-pages:watch | 1 | After the retitle (incorrect #3) this test covers only onEnable's already-off early return (index.ts:39-41), which has no page-dependent behaviour; live retains coverage through the merged enable/disable/re-enable test. |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| re-applies after disable then re-enable on ${pageType} | 53 | high | Confirmed contradiction, this test should fail today. spec:49 forces captions OFF, so onEnable reads aria-pressed="false", sets captionsWhereEnabled=false and returns without clicking (index.ts:39-41). disableFeature the… | Change spec:49 to ensureCaptionsState(page, true) so the sequence off (51) / on (53) / off (55) matches the code, and cover the captions-already-off case with the separate no-restore test proposed under missing. |
| disables captions after navigation on ${pageType} | 42 | high | The title promises post-navigation behaviour, but spec:42-43 disables and immediately re-enables the feature before asserting, so the final assertion measures a fresh onEnable, not onNavigate. On live (the only variant w… | Delete spec:42-43 and assert expectStableCaptionsState(page, false) immediately after returning to the page. Note this only exercises onNavigate where a real SPA navigation happens; navigateToPageType uses page.goto (nav… |
| disables captions on ${pageType} | 20 | medium | Title/body mismatch: ensureCaptionsState(page, false) leaves captions already off, so onEnable takes the early return at index.ts:39-41 and never disables anything. The assertion is not vacuous (it would fail if onEnable… | Retitle to 'does not toggle captions when they are already off on ${pageType}' to name the early-return branch it really covers; the actual disabling is covered by the corrected enable/disable test at spec:46. |
| persists after full page reload on ${pageType} | 61 | medium | Captions are off before enabling and YouTube keeps them off across the reload, so onEnable at load time takes the early return again and spec:67 asserts a state that was already true before the feature did anything. Load… | After enableFeature, call ensureCaptionsState(page, true) so YouTube persists captions ON, then reload and assert expectStableCaptionsState(page, false); if YouTube fails to restore captions the test degrades to today's … |

**Missing** (3; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | does not re-enable captions on disable when they were off before enabling | watch | onEnable stores captionsWhereEnabled = (aria-pressed === "true") and onDisable returns early when it is false, so the no-restore branch is a real code path with zero correct coverage; the only test that reaches this setu… | src/features/automaticallyDisableClosedCaptions/index.ts:8,31,39-41; spec:49-53. Verified no other spec covers it: autom… |
| high | keeps captions disabled after an in-page (SPA) navigation to another watch page | watch | onNavigate calls disableCaptions() which clicks button.ytp-subtitles-button unconditionally (no aria-pressed check), so a navigation while captions are already off turns them ON. Nothing in the suite drives that path del… | src/features/automaticallyDisableClosedCaptions/index.ts:18-23,45-47; src/features/_registry/featureOrchestrator.ts:179-… |
| medium | conflict checkbox is disabled in options while auto-enable CC is on | options | disabledWhen/disabledReason rendering has zero coverage anywhere: Options.spec.ts contains only 6 tests (render page, language select, import, export, clear, reset) and automaticallyEnableClosedCaptions.spec.ts:94 assert… | src/features/automaticallyDisableClosedCaptions/index.metadata.ts:58-69; src/components/Settings/SettingsGenerator.tsx:1… |

### automaticallyEnableClosedCaptions

`src/features/__tests__/automaticallyEnableClosedCaptions.spec.ts` — 15 generated cases today, about 12 after the recommendations below.

The spec covers the happy path (enable -> captions on, disable -> captions off) on watch and live, but the two branches that make this feature non-trivial are untested: the `captionsWhereEnabled` guard (captions already on when the feature is enabled -> onEnable/onDisable must not touch them, src/features/automaticallyEnableClosedCaptions/index.ts:27,37-39) and `onNavigate`'s unconditional `subtit…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| enables captions | watch, live | 2 |
| restores captions when feature disabled | watch, live | 2 |
| enables captions after navigation | watch, live | 2 |
| should enable captions on re-enable after disable | watch, live | 2 |
| persists after full page reload | watch, live | 2 |
| should not enable captions when feature is off | watch, live | 2 |
| feature conflicts › CC auto-enable vs auto-disable › disabledWhen metadata cross-references are configured correctly | — | 1 |
| feature conflicts › CC auto-enable vs auto-disable › last-enabled feature determines captions state when both enabled | watch | 1 |
| feature conflicts › CC auto-enable vs auto-disable › disabling one feature allows the other to take effect | watch | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should enable captions on re-enable after disable on ${pageType} | 49 | merge-into:restores captions when feature disabled on ${pageType} | 2 | Confirmed: spec:49-57 is byte-for-byte the disable test (spec:25-34) plus enableFeature + one assertion. The only distinct thing it exercises is onEnable running after onDisable's unloadModule (index.ts:29) - appending `… |
| restores captions when feature disabled on ${pageType} | 25 | reduce-pages:watch | 1 | onEnable/onDisable contain no live-vs-VOD branch (index.ts:21-41 only touches div#movie_player and button.ytp-subtitles-button, both identical on live), and the live expansion pays navigateToLiveVideo's up-to-120 s strea… |
| persists after full page reload on ${pageType} | 59 | reduce-pages:watch | 1 | On live the test does not even observe what its title claims: after page.reload() (spec:66) it calls navigateToPageType(page, "live") (spec:67), which goes back to the channel URL and opens a live video that may be a dif… |
| should not enable captions when feature is off on ${pageType} | 71 | reduce-pages:watch | 1 | With the feature off no lifecycle hook runs on any page (featureOrchestrator.ts:152), so the live expansion pays a live-stream hunt for a page-agnostic negative control that has no live-specific branch in the feature cod… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| enables captions after navigation on ${pageType} | 36 | high | The title promises post-navigation behaviour, but (a) navigateToPageType is a full document load (page.goto, navigation.ts:157-163/215-226), so on watch onNavigate never runs at all - the assertion measures enableAll -> … | Delete spec:45-46 and assert `await expectStableCaptionsState(page, true)` immediately after re-navigating; keep the live expansion (it is the only SPA navigation in the spec) and add the watch->watch SPA test from missi… |
| persists after full page reload on ${pageType} | 59 | medium | The feature enables captions by clicking button.ytp-subtitles-button (index.ts:17), which is the same control whose on/off state the YouTube player persists for the profile; page.reload() keeps the same browser context, … | After enabling and confirming captions on, click the CC button off manually (this does not change the module-level captionsWhereEnabled, index.ts:8,37), then reload and assert the feature turns captions back on. |
| should not enable captions when feature is off on ${pageType} | 71 | medium | The feature defaults to enabled:false (index.metadata.ts:7), so disableFeature at spec:75 writes an unchanged value: updateFeatureEnabledState computes hasEnabledChanged=false and hasConfigChanged=false and returns at fe… | Drop the disableFeature call; force captions off, reload the page with the feature off, wait for html[yte-ready], then assert captions are still off. |
| disabling one feature allows the other to take effect on watch | 123 | medium | Captions return at spec:134 because automaticallyDisableClosedCaptions.onDisable re-clicks the subtitles button (src/features/automaticallyDisableClosedCaptions/index.ts:26-33 with captionsWhereEnabled true), not because… | Rename to something like 'auto-disable restores captions when it is turned off', or make auto-enable actually act: after disabling auto-disable, force captions off manually and assert auto-enable re-enables them on the n… |

**Missing** (3; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | keeps captions on when they were already enabled before the feature is enabled | watch | captionsWhereEnabled is the only user-protection branch in the feature: it must not re-click a CC button that is already pressed and must not unload the captions module the user had on. Zero coverage anywhere. | src/features/automaticallyEnableClosedCaptions/index.ts:37-39 (early return when aria-pressed==="true") and :27 (onDisab… |
| high | keeps captions enabled after an in-page (SPA) navigation to another watch video | watch | onNavigate calls enableCaptions() unconditionally - it clicks button.ytp-subtitles-button with no aria-pressed check - so on a watch->watch SPA navigation (feature stays enabled, so updateFeatureEnabledState returns at f… | src/features/automaticallyEnableClosedCaptions/index.ts:42-44 vs the guarded onEnable at :37-39; src/features/_registry/… |
| medium | auto-enable checkbox is disabled and shows the conflict reason when auto-disable is enabled | options page (optionsTest fixture) | disabledWhen is only asserted as metadata literals; the rendered behaviour a user sees (disabled input + reason span) is untested anywhere, and it is fully observable on the options page. | src/features/automaticallyEnableClosedCaptions/index.metadata.ts:13-17; src/components/Settings/SettingsGenerator.tsx:13… |

### automaticallyMaximizePlayer

`src/features/__tests__/automaticallyMaximizePlayer.spec.ts` — 13 generated cases today, about 13 after the recommendations below.

The spec exercises exactly one thing - body[yte-maximized] toggling with the enabled flag - across watch and live, and four of its seven tests restate that same fact. Test 3 (line 31) claims navigation coverage but disables and re-enables the feature before asserting, so onNavigate and the yt-navigate-start minimize handler (src/features/maximizePlayerButton/utils.ts:172-175) have zero coverage; t…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| player should automatically maximize | watch, live | 2 |
| player shouldn't automatically maximize | watch, live | 2 |
| player should maximize after navigation | watch, live | 2 |
| player should re-maximize after disable then re-enable | watch, live | 2 |
| player should maximize after full page reload | watch, live | 2 |
| restores player to original state when disabled | watch, live | 2 |
| should not maximize player on non-target page | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| player shouldn't automatically maximize on ${pageType} | 26 | remove | 2 | It disables a feature that is already false by default (index.metadata.ts:38), so it only restates the default config, and expect.poll(...).toBeFalsy() resolves on its first sample ~500 ms after a no-op config write - it… |
| restores player to original state when disabled on ${pageType} | 58 | remove | 2 | wasMaximized is read at line 60 in a fresh context with enabled:false by default, so it is always false and line 64 degrades to the exact assertion already made at line 46; lines 61-62 duplicate lines 43-44. It is a stri… |
| player should maximize after full page reload on ${pageType} | 50 | reduce-pages:watch | 1 | On live the reload is immediately discarded: navigateToPageType always re-enters the live branch, which goes back to the channel URL and opens a live video again (src/utils/_tests/navigation.ts:146-161,187-214), so line … |
| player should maximize after navigation on ${pageType} | 31 | reduce-pages:watch | 1 | Both page variants run the identical code path (onEnable via executeWithRetries; there is no page branch in automaticallyMaximizePlayer/index.ts), and the live variant performs two full live-video hunts plus a home load.… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| player should maximize after navigation on ${pageType} | 31 | high | The title promises navigation-driven maximization, but after returning to the page the test disables and re-enables the feature (lines 37-38), so the assertion at line 39 is produced by onEnable. Additionally navigateToP… | Delete lines 37-38 and assert body[yte-maximized] straight after returning; better, replace the body with an in-page navigation: click a#logo (expect the attribute to be removed by navigateStartHandler) then page.goBack(… |
| should not maximize player on non-target page | 68 | low | expect.poll(...).toBeFalsy() succeeds on its first sample, ~500 ms after enableFeature returns (setFeatureValue waits 500 ms, features.ts:63-70), while the maximize task's budget is 20 s (index.ts:18-22). A gating regres… | Assert the attribute stays absent over a window instead of at one instant - poll for a stable-count like expectStableCaptionsState (src/utils/_tests/player.ts:132-143), or expect(page.locator("body")).not.toHaveAttribute… |
| player should automatically maximize on ${pageType} | 24 | low | The positive polls use the default 5 s expect timeout while maximizePlayer runs behind waitForElement/waitForPlayerLoaded with a 20 s overall budget (featurePlayerManager.ts:64-86, index.ts:18-22), so they can time out s… | Pass { timeout: 15000 } to the truthy polls at lines 24, 34, 39, 44, 48, 53, 62 to match line 56. |

**Missing** (7; 4 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | maximizing sets the size-button state and viewport CSS variables on watch | watch | Every test in this spec and in maximizePlayerButton.spec.ts reads only body[yte-maximized]; a maximizePlayer that set the attribute but skipped lines 199-203 would pass the whole suite, yet the layout CSS (height/full-bl… | src/features/maximizePlayerButton/utils.ts:199-203 sets the attribute and both variables; src/features/maximizePlayerBut… |
| high | pressing Escape minimizes the automatically maximized player on watch | watch | onKeyDown is attached only from maximizePlayer's attachRuntimeListeners and is the keyboard exit path; it and its input/textarea/contenteditable guard have zero coverage. Deterministic: once the maximize task returns tru… | src/features/maximizePlayerButton/utils.ts:176-182 (handler) and 244 (attachment); no spec calls page.keyboard.press("Es… |
| high | SPA navigation away minimizes and returning re-maximizes on watch | watch | navigateStartHandler and the feature's onNavigate hook have no coverage: the existing navigation test (line 31) uses full page.goto loads and then disables/re-enables the feature, so its final assertion comes from onEnab… | src/features/automaticallyMaximizePlayer/index.ts:24-30 (onNavigate); src/features/maximizePlayerButton/utils.ts:172-175… |
| high | disabling restores the player out of theater mode on watch | watch | minimizePlayer's clickAndRestore is the user-visible cleanup (without it the user is left in YouTube theater mode after turning the feature off) and nothing asserts it; the current "restores player to original state" tes… | src/features/maximizePlayerButton/utils.ts:196 (enter click), 209-216 (restore click + destroyPlayerController removing … |
| medium | disabling keeps theater mode when the player was already in theater on watch | watch | The theater branch of maximizePlayer (skip the size-button click, store state "theater") and the matching skip in minimizePlayer have no assertion - maximizePlayerButton.spec.ts:96 checks only yte-maximized after the sam… | src/features/maximizePlayerButton/utils.ts:194-196,200,209-214; src/features/automaticTheaterMode/index.ts:14-26; src/fe… |
| medium | clicking the native player size button while auto-maximized minimizes on watch | watch | handleUserClick plus the isProgrammaticClick guard decide whether a user can escape maximize with YouTube's own controls; untested. maximizePlayerButton.spec.ts:46 only covers clicking the extension's own feature button.… | src/features/maximizePlayerButton/utils.ts:70-74 (handleUserClick), 234-243 (listeners on pip/size/mini), 162-171 + 258-… |
| medium | header reveals on mouse move to the top of the viewport while maximized on watch | watch | The auto-hiding masthead is the most visible consequence of maximizing (the CSS translates it fully off screen) and neither the class nor the reveal has any assertion anywhere in the suite. | src/features/maximizePlayerButton/utils.ts:127-157,204; src/features/maximizePlayerButton/index.css:41-49; grep for yte-… |

### automaticallyShowMoreVideosOnEndScreen

`src/features/__tests__/automaticallyShowMoreVideosOnEndScreen.spec.ts` — 7 generated cases today, about 8 after the recommendations below.

The spec is 7 body-class tests over one page (watch) that never look at what the feature actually does. Both CSS rules - forcing #movie_player.ended-mode div.html5-endscreen to display:block and hiding div.ytp-fullscreen-grid (index.css:1-13) - are unasserted, so a broken selector or a dropped !important would ship green. The navigation test (spec:29) is the one incorrect test: it disables and re-…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should add show more videos classes | watch | 1 |
| should remove show more videos classes when disabled | watch | 1 |
| should persist show more videos classes after navigation | watch | 1 |
| persists show more videos classes after full page reload | watch | 1 |
| restores original state when disabled after being enabled | watch | 1 |
| re-applies after disable then re-enable | watch | 1 |
| should not add show more videos classes on non-target page | — | 1 |

**Not needed** (2)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should remove show more videos classes when disabled on ${pageType} | 23 | remove | 1 | Confirmed vacuous. The config field defaults to false (index.metadata.ts:7, defaults come from metadataRegistry.getDefaults - src/utils/config/defaults.ts:13-18), so disableFeature writes an unchanged value; updateFeatur… |
| restores original state when disabled after being enabled on ${pageType} | 51 | merge-into:re-applies after disable then re-enable on ${pageType} | 1 | Its enable-assert-disable-assert body (spec:52-58) is a literal prefix of spec:61-67, which makes the identical four assertions and then adds the re-enable step. Same page, same config value, same lifecycle path (onEnabl… |

**Incorrect** (1)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist show more videos classes after navigation on ${pageType} | 29 | medium | Confirmed: after navigating away and back the test disables and re-enables the feature (spec:36-37) before its assertions (spec:38-39), so the classes come from a fresh onEnable rather than from the navigation. The title… | Delete spec:36-37. Use nonTargetPage (channel_home) instead of home for the intermediate hop, assert expectBodyWithoutClass for both classes while off target (the includePages gate on a fresh load), then navigate back to… |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | shows the html5 end screen when the video ends on watch | watch | The two body classes the whole spec asserts are only a proxy for the class name; the display:block rule keyed on #movie_player.ended-mode div.html5-endscreen is the entire user-visible payload and nothing in src/features… | src/features/automaticallyShowMoreVideosOnEndScreen/index.css:7-13 (rule); spec:20-21,32-33,44-45,54-55,63-64,69-70 (onl… |
| low | hides the fullscreen end screen grid in fullscreen on watch | watch | The yte-hide-ytp-fullscreen-grid rule is asserted nowhere in the suite (no spec references .ytp-fullscreen-grid) and expectElementsHidden passes vacuously when nothing matches; priority lowered from the auditor's medium … | src/features/automaticallyShowMoreVideosOnEndScreen/index.css:1-5; src/utils/_tests/assertions.ts:24-39 (vacuous pass); … |
| low | options page checkbox toggles automaticallyShowMoreVideosOnEndScreen.enabled | options | The declared setting entry is never rendered or clicked by any test; Options.spec.ts covers only render, language select, import, export, clear and reset. CheckBox.tsx renders id={id} and SettingsGenerator puts feature s… | src/features/automaticallyShowMoreVideosOnEndScreen/index.metadata.ts:10-17; src/pages/options/Options.spec.ts:3-50; src… |

### automaticTheaterMode

`src/features/__tests__/automaticTheaterMode.spec.ts` — 13 generated cases today, about 9 after the recommendations below.

The spec is a copy of automaticallyMaximizePlayer.spec.ts and inherits its weaknesses. Real coverage is thin: only "theater mode should be enabled on ${pageType}" (spec:46) and "theater mode should re-apply after disable then re-enable on ${pageType}" (spec:67) can actually fail. "theater mode should be disabled on ${pageType}" (spec:51) is a no-op because the feature is disabled by default and un…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| theater mode should be enabled | watch, live | 2 |
| theater mode should be disabled | watch, live | 2 |
| theater mode should be applied after navigation when enabled | watch, live | 2 |
| theater mode should re-apply after disable then re-enable | watch, live | 2 |
| theater mode should persist after full page reload | watch, live | 2 |
| restores theater mode to original state when disabled | watch, live | 2 |
| should not enable theater mode on non-target page | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should not enable theater mode on non-target page | 109 | remove | 1 | Confirmed vacuous. resolveNonTargetPage returns the first pageType that is neither watch/live nor login-gated, and pageTypes is alphabetical (types.ts:282-294), so nonTargetPage is channel_home. On a channel page neither… |
| theater mode should be disabled on ${pageType} | 51 | reduce-pages:watch | 1 | Refuting the auditor's 'remove': the test is not entirely dead. disableFeature does write an unchanged value (default enabled=false, index.metadata.ts:7) and handleConfigChanges drops structurally equal changes (src/page… |
| theater mode should persist after full page reload on ${pageType} | 76 | reduce-pages:watch | 1 | The init path (featureOrchestrator.enableAll, featureOrchestrator.ts:39-76) has no live-vs-VOD branch, and on live the test does not even assert on the reloaded page: navigateToPageType(page, 'live') re-runs channel disc… |
| theater mode should re-apply after disable then re-enable on ${pageType} | 67 | reduce-pages:watch | 1 | onEnable/onDisable call the same makeTheaterTask with no page-specific code (index.ts:31-44); the only live-specific logic is the isLivePage gate in featurePlayerManager.isOnAllowedPage (featurePlayerManager.ts:171-176),… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| restores theater mode to original state when disabled on ${pageType} | 84 | high | The title and the toBe(wasTheater) assertion claim restore semantics that index.ts does not implement: onDisable unconditionally runs makeTheaterTask(false), i.e. it drives theater to off regardless of the pre-existing s… | Delete both generated cases. The disable half of 'theater mode should re-apply after disable then re-enable on ${pageType}' (spec:71-72) already asserts the real contract (theater off after disable). Only add a restore t… |
| theater mode should be applied after navigation when enabled on ${pageType} | 56 | high | The title promises navigation coverage the body does not provide. navigateToPageType uses page.goto (navigation.ts:133-163), so the round trip home -> pageType is two document loads, and featureNavigationManager.initiali… | Delete lines 63-64 and replace the home round trip with an in-page click on a recommended-video link (assert the URL video id changes, then assert `theater` on the new video), and run it on watch only. That converts it i… |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | re-applies theater mode after SPA navigation to another video | watch | onNavigate has zero coverage in the whole suite. featureNavigationManager.initialize() seeds currentNavigationSignature from the loaded page (featureNavigationManager.ts:68-77) and handleNavigation returns early when the… | src/features/automaticTheaterMode/index.ts:45-51; src/features/_registry/featureNavigationManager.ts:60-77,240-264; src/… |
| medium | does not toggle theater off when the video is already in theater mode | watch | The `current === desired` early return (index.ts:23-24) is unexercised: no test puts the page into theater before enabling. A regression that always called clickSizeButton would return true on the first tick (executeWith… | src/features/automaticTheaterMode/index.ts:21-27,39-43; src/features/_registry/featurePlayerManager.ts:113-131 |
| low | minimizing the player does not re-toggle theater while automaticTheaterMode is enabled | watch | minimizePlayer only skips clickAndRestore when automaticTheaterMode.enabled is true (maximizePlayerButton/utils.ts:209-214); no spec ever minimizes with that feature enabled, so removing the config check would go unnotic… | src/features/maximizePlayerButton/utils.ts:194-214,251-273; src/features/automaticTheaterMode/index.ts:14-19; src/featur… |

### blockNumberKeySeeking

`src/features/__tests__/blockNumberKeySeeking.spec.ts` — 12 generated cases today, about 7 after the recommendations below.

The feature is 20 lines: one capture-phase document keydown listener added in onEnable and removed in onDisable (src/features/blockNumberKeySeeking/index.ts:19-20). The spec spends 6 tests x 2 pages = 12 cases (x2 Playwright projects) on the enabled/disabled toggle, restating "enable then assert blocked" five times, while leaving both of the handler's internal branches untested: the INPUT/TEXTAREA…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| blocks number key seeking | watch, live | 2 |
| number key seeking works when disabled | watch, live | 2 |
| blocks number key seeking after navigation | watch, live | 2 |
| re-applies after disable then re-enable | watch, live | 2 |
| persists after full page reload | watch, live | 2 |
| restores seeking when disabled after being enabled | watch, live | 2 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| blocks number key seeking on ${pageType} | 25 | merge-into:restores seeking when disabled after being enabled on ${pageType} | 2 | Lines 26-35 (navigate, enable, freeze, press digits, expect delta < 0.5) are identical to lines 118-127 of the restore test, which then continues with the disable half. There is no distinct lifecycle path, config value o… |
| re-applies after disable then re-enable on ${pageType} | 72 | merge-into:restores seeking when disabled after being enabled on ${pageType} | 2 | Lines 73-84 repeat the restore test's enable/block/disable sequence verbatim; only the trailing re-enable + assert-blocked (85-92) is unique. Appending `enableFeature` + one blocked assertion to the restore test yields e… |
| number key seeking works when disabled on ${pageType} | 37 | reduce-pages:watch | 1 | Downgraded from the auditor's merge-into verdict: a full merge WOULD lose coverage. This test never calls disableFeature, so it is the only case observing that a feature whose config is false at content-script init is ne… |
| blocks number key seeking after navigation on ${pageType} | 48 | reduce-pages:watch | 1 | index.ts registers a single document-level listener and featureNavigationManager.areDependenciesMet (featureNavigationManager.ts:27-34) is page-type agnostic, so the live run adds no branch. It does add two full channel … |
| persists after full page reload on ${pageType} | 94 | reduce-pages:watch | 1 | On watch the post-reload navigateToPageType short-circuits (navigation.ts:216 skips goto when the URL matches), so the reload is genuinely what is measured. On live, navigateToPageType always re-runs navigateToLiveVideo … |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| blocks number key seeking on ${pageType} | 34 | high | `if (!end) return;` treats a currentTime of 0 as a bail-out. getValueFromYouTubePlayer returns `Nullable<number>` (player.ts:193-209), so `expect(end).not.toBeNull()` passes for 0 and the guard then returns early, skippi… | Narrow on null only: `expect(start).not.toBeNull(); expect(end).not.toBeNull(); if (start === null \|\| end === null) return;` (or assert with non-null assertions after the expects). Additionally make the blocked assertion… |
| blocks number key seeking after navigation on ${pageType} | 61 | high | After navigating away and back, the test disables and re-enables the feature (spec:61-62) before asserting at spec:70, so the assertion measures a fresh onEnable (index.ts:20) rather than the navigation-driven re-enable … | Delete spec:61-62 and assert blocking immediately after returning to the page. To exercise the real path, navigate away and back in-page (click a YouTube link / trigger the SPA route change) rather than via two page.goto… |
| persists after full page reload on ${pageType} | 106 | medium | On live, page.reload() is immediately followed by navigateToPageType(page, "live"), which unconditionally re-runs navigateToLiveVideo - back to the channel URL and into a (possibly different) live video (navigation.ts:14… | Run this test on watch only. Once live is dropped, spec:95's `test.setTimeout(120_000)` is dead (navigateToPageType already sets it for live, navigation.ts:147) and the pre-reload press cycle at spec:98-105 can go too, s… |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | does not block digits typed in the search box while enabled | watch | index.ts:10 early-returns for INPUT/TEXTAREA/contenteditable targets; that guard is the only thing keeping the capture-phase preventDefault from swallowing every digit typed anywhere on YouTube. Nothing in src/features/_… | src/features/blockNumberKeySeeking/index.ts:8-10; guard has no coverage anywhere: grep of src/features/__tests__ + src/p… |
| medium | does not block non-digit player shortcuts while enabled | watch | index.ts:12 blocks only /^[0-9]$/; widening it (or moving stopImmediatePropagation out of the regex branch) would kill k/j/l/space/arrow shortcuts and all six existing tests would still pass, since every one of them only… | src/features/blockNumberKeySeeking/index.ts:12-15; spec only ever presses digits (blockNumberKeySeeking.spec.ts:15-21,42… |
| low | does not block digits typed in a contenteditable element while enabled | watch | `target.isContentEditable` (index.ts:10) is a distinct condition from the tagName checks; a refactor that keeps `tagName === "INPUT" \|\| tagName === "TEXTAREA"` but drops isContentEditable breaks comment typing and nothin… | src/features/blockNumberKeySeeking/index.ts:10 |

### buttonController

`src/features/__tests__/buttonController.spec.ts` — 19 generated cases today, about 17 after the recommendations below.

buttonController.spec.ts is the only spec for the shared button/menu machinery, but roughly half of it re-tests scenarios that loopButton.spec.ts, screenshotButton.spec.ts and maximizePlayerButton.spec.ts already own (fullscreen left/right moves, "same" placement, left/right placement, disable removal) while several module-specific behaviours have zero coverage. The genuinely unique value is conce…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| featureMenu › feature menu should be enabled | — | 1 |
| featureMenu › feature menu should be disabled | — | 1 |
| featureMenu › should add feature menu item to feature menu | — | 1 |
| featureMenu › feature menu should open when button is clicked | — | 1 |
| featureMenu › feature menu item should be added when feature enabled and removed when disabled | — | 1 |
| featureMenu › feature menu should close when button is clicked again | — | 1 |
| buttonPlacement › fullscreen › should move loop button from left to right controls when entering fullscreen and back when exiting | — | 1 |
| buttonPlacement › fullscreen › should move screenshot button from right to left controls when entering fullscreen and back when exiting | — | 1 |
| buttonPlacement › fullscreen › should not move loop button when fullscreenPlacement is same | — | 1 |
| buttonPlacement › fullscreen › should move screenshot button to feature menu when entering fullscreen and back when exiting | — | 1 |
| buttonPlacement › fullscreen › should move screenshot button from below player to left controls when entering fullscreen and back when exiting | — | 1 |
| buttonPlacement › normal › should place screenshot button in player_controls_left | — | 1 |
| buttonPlacement › normal › should not place screenshot button when disabled in player_controls_left | — | 1 |
| buttonPlacement › normal › should place screenshot button in player_controls_right | — | 1 |
| buttonPlacement › normal › should not place screenshot button when disabled in player_controls_right | — | 1 |
| buttonPlacement › normal › should place screenshot button in below_player | — | 1 |
| buttonPlacement › normal › should not place screenshot button when disabled in below_player | — | 1 |
| below player container › container ignores pointer events while its buttons stay clickable | — | 1 |
| below player container › container is centred on the player and follows theater mode | watch | 1 |

**Not needed** (8)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should not place screenshot button when disabled in ${placement} | 145 | remove | 3 | below_player, player_controls_left and player_controls_right all fall through the same shared `case` in removeButton (ButtonController.ts:481-508: the three placements share one branch that does document.querySelectorAll… |
| should place screenshot button in ${placement} | 138 | reduce-pages:below_player | 2 | The player_controls_left and player_controls_right iterations are verbatim duplicates of screenshotButton.spec.ts:123-129 (`should render button in ${placement}`) - same feature, same page, same setOption/enableFeature o… |
| feature menu should be enabled | 21 | remove | 1 | The menu button is created on every watch page by core registration before html[yte-ready] is set (lifecycle.ts:63 -> coreFeatures.register -> enableFeatureMenuButton, ButtonController.ts:358-384), so `toBeAttached()` pa… |
| should add feature menu item to feature menu | 34 | merge-into:feature menu item should be added when feature enabled and removed when disabled | 1 | Identical setup and identical single assertion; the add-then-remove test at line 50 performs exactly this expectFeatureMenuItemToBeTruthy call before disabling, and screenshotButton.spec.ts:132-137 repeats it a third tim… |
| should move loop button from left to right controls when entering fullscreen and back when exiting | 78 | remove | 1 | Line-for-line the same scenario as loopButton.spec.ts:107-117 (same feature, same placements, same helper). The control-bar-to-control-bar branch of handleFullscreenChange is additionally repeated by screenshotButton.spe… |
| should move screenshot button from right to left controls when entering fullscreen and back when exiting | 89 | remove | 1 | Mirror direction only; handleFullscreenChange (ButtonController.ts:806-845) has no direction-dependent branch, and the placeButton player_controls_left path it supposedly adds is already run on fullscreen exit in loopBut… |
| should not move loop button when fullscreenPlacement is same | 100 | remove | 1 | getEffectivePlacement's "same" branch (ButtonController.ts:660-662) is already asserted by loopButton.spec.ts:119-129 with the identical feature and placement, and by ~12 other feature specs (screenshotButton.spec.ts:153… |
| container ignores pointer events while its buttons stay clickable | 157 | merge-into:should place screenshot button in below_player | 1 | Repeats the below_player setup and the same expectFeatureButtonToBeIn assertion just to add two toHaveCSS checks. Its title also over-promises: it never clicks anything, so "buttons stay clickable" is only inferred from … |

**Incorrect** (1)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| feature menu should be disabled | 28 | high | The test never puts a button in the feature menu, so the menu button it asserts on is the one core registration creates on every watch page with styles {display:none, visibility:hidden} (ButtonController.ts:377-382). `no… | Enable screenshotButton with placement feature_menu, assert #yte-feature-menu-button is visible (display:flex), then disableFeature and assert it is hidden (display:none) and #yte-feature-menu has visibility:hidden. |

**Missing** (8; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | feature menu opens on hover when featureMenu.openType is hover | watch | featureMenu.openType is a real user-facing core config field (default "click", select in the options UI) whose "hover" value has zero coverage; setting it live also exercises the featureMenuOpenTypeChange -> coreFeatures… | Verified: hover branch src/features/buttonController/ButtonController.ts:582-608 (pointerenter show / pointerleave sched… |
| high | clicking a feature menu item toggles its checked state and applies the feature | watch | featureMenuClickListener is the only way a menu-placed button does anything, and no spec clicks a menu item anywhere - every menu test only asserts the item is attached. The harness even ships an unused helper for it. | Verified: featureMenuClickListener src/features/buttonController/ButtonController.ts:743-748 + setMenuItemChecked 960-96… |
| high | changing fullscreenPlacement after the button is placed applies on the next fullscreen | watch | The `fullscreenChanged && !moved && wasActive` branch that calls updateTrackedButtonConfig is the only path that mutates a tracked button's fullscreen config in place; without it a settings change made while watching sil… | Verified: src/features/_registry/featureButtonManager.ts:113-124 (branch) and src/features/buttonController/ButtonContro… |
| medium | feature menu closes when clicking outside the menu and button | watch | clickOutsideListener is registered for both open types and is the primary dismissal path (the only one in hover mode besides the pointer debounce); no spec asserts it. | Verified: clickOutsideListener src/features/buttonController/ButtonController.ts:569-573, registered at 577 (click mode)… |
| medium | no feature menu button is created on non-watch pages | shorts | enableFeatureMenuButton has an explicit isWatchPage guard and coreFeatures.register runs on every page type; this page-variant branch has no assertion anywhere. Note the assertion needs no feature enabled - the menu is c… | Verified: guard src/features/buttonController/ButtonController.ts:360 (`if (!isWatchPage()) return;`), isWatchPage src/u… |
| medium | hovering a feature button shows a tooltip with the button label | watch | A tooltip is created for every feature button and for the feature menu button by shared buttonController code, and no spec asserts a #yte-feature-*-tooltip element ever appears or is removed. | Verified: makeFeatureButton wires the mouseover tooltip listener at src/features/buttonController/ButtonController.ts:88… |
| low | below player container re-syncs its width after a viewport resize | watch | The window resize listener and the ResizeObserver on #movie_player are separate triggers for syncContainerGeometry; only the initial placement and the theater-mode reposition are asserted today. Lower value than the audi… | Verified: resize listener registration src/features/buttonController/ButtonController.ts:129-131 and 148-149 (ResizeObse… |
| low | left control buttons hide while the player auto-hides | watch | A shipped CSS rule of this module that nothing observes; same style of assertion the spec already makes for pointer-events on the below-player container. | Verified: src/features/buttonController/index.css:53-55 `#movie_player.ytp-autohide .yte-button-player-controls-left { d… |

### copyTimestampUrlButton

`src/features/__tests__/copyTimestampUrlButton.spec.ts` — 13 generated cases today, about 10 after the recommendations below.

The spec's genuine value is one test: the click writes https://youtu.be/<id>?t=<sec> to the clipboard. Around it, 7 of 13 generated cases re-test buttonController mechanics (placement left/right, fullscreen move, fullscreen 'same', feature-menu existence) that buttonController.spec.ts:34-144 already covers generically, plus an enable-existence duplicate and a disable test that only observes the de…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| copy timestamp url button should be enabled | watch | 1 |
| copy timestamp url button should be disabled | watch | 1 |
| copy timestamp url button should copy timestamp url | watch | 1 |
| copy timestamp url button should toggle copied state on second click | watch | 1 |
| copy timestamp url button should persist after navigation | watch | 1 |
| copy timestamp url button should re-appear after disable then re-enable | watch | 1 |
| copy timestamp url button should persist after full page reload | — | 1 |
| copy timestamp url button should not be present on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| copy timestamp url button should be enabled on watch | 31 | merge-into:copy timestamp url button should copy timestamp url on watch | 1 | Its only assertion - button attached after setting placement left and enabling - is repeated verbatim inside the copy test (spec:48-50) and again in the placement test (spec:119-121). Same page, same lifecycle path (onEn… |
| copy timestamp url button should be disabled on watch | 37 | remove | 1 | button.enabled defaults to false and every test gets a fresh user data dir, so disableFeature writes false over false and the test only observes the untouched default; the removal-on-disable path is asserted by the re-ap… |
| should render button in ${placement} | 117 | remove | 2 | Pure buttonController placement mechanics with no feature-specific branch: the same icon object serves both control placements (icons.ts:446-449 shared_icon_position), and addButton/makeFeatureButton/placeButton are alre… |
| should move button from left to right on fullscreen enter/exit | 135 | remove | 1 | Identical scenario to the generic loop-button fullscreen test; the feature only forwards fullscreenPlacement into addFeatureButton (index.ts:48), and getEffectivePlacement/handleFullscreenChange are feature-agnostic. Cos… |
| should not move button when fullscreenPlacement is same | 147 | remove | 1 | Duplicates the generic 'same' fullscreenPlacement test line for line (only the feature id differs); handleFullscreenChange skips when the effective placement is unchanged, which is shared code. |
| should render button in feature menu | 126 | merge-into:should copy timestamp url when the feature menu item is clicked | 1 | Menu item existence is generic (buttonController.spec.ts:34-39 for screenshotButton) and the proposed menu-click test asserts existence implicitly (clickFeatureMenuItem waits for the item to be visible) plus the untested… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| copy timestamp url button should toggle copied state on second click on watch | 59 | medium | The button is not a toggle - addFeatureButton is called with isToggle=false (index.ts:46, matching the addButton signature at ButtonController.ts:242-250) - and each click unconditionally sets data-title to the Copied la… | Rename to 'should restore the button label one second after copying', drop the second click, and poll data-title back to the button label (plus tooltip removal per the missing tooltip test). |
| copy timestamp url button should copy timestamp url on watch | 53 | medium | The data-title poll runs only after the clipboard poll resolves, but index.ts:27-31 restores the label 1000 ms after the click. Any slow clipboard read (or a Playwright retry with tracing/video on) pushes the second poll… | Capture both in one page.evaluate immediately after the click (return {clipboard, title}), or read data-title first and then poll the clipboard. |
| copy timestamp url button should copy timestamp url on watch | 46 | medium | expect(start).toBeTruthy() treats a currentTime of 0 as a failure. waitForYoutubePlayerReady only resolves when the video clock is stable across 200 ms (player.ts:292-300), i.e. for a paused/VIDEO_CUED player, which is e… | Assert expect(start).not.toBeNull() (or typeof start === "number") instead of toBeTruthy. |

**Missing** (5; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should copy timestamp url when the feature menu item is clicked | watch | feature_menu is a supported placement and the click there runs a different DOM path (featureMenuClickListener on a div menu item, and getFeatureButton returns the menu item so the feedback lands on it, not on a button). … | src/features/copyTimestampUrlButton/index.ts:11-17; src/features/buttonController/ButtonController.ts:277-282 and 336 (m… |
| medium | should render button in the default placement without setting the option | watch | The feature overrides the shared buttonField placement default (feature_menu) with player_controls_right, and defaults come straight from the metadata registry, so a regression would silently move the button into the fea… | src/features/copyTimestampUrlButton/index.metadata.ts:9 vs src/features/_registry/defineConfig.ts:58-62; src/utils/confi… |
| medium | should keep the button after in-page SPA navigation away and back | watch | Every navigation helper does page.goto, so the yt-navigate-finish / pushState re-add path in featureNavigationManager is never exercised by any spec; the existing 'persist after navigation' test can be repurposed instead… | src/utils/_tests/navigation.ts:133-144 (navigateToPage -> page.goto) and 215-226 (navigateToYoutubePage); src/features/_… |
| medium | should show Copied! in the hover tooltip and remove it after one second | watch | The tooltip is the user-visible 'Copied!' feedback; the feature's update() and the 1000 ms remove() only act on an existing hover tooltip (same id as the ButtonController hover tooltip), and nothing asserts either. Today… | src/features/copyTimestampUrlButton/index.ts:19-31; src/features/buttonController/ButtonController.ts:882-897 (mouseover… |
| low | should point the copied tooltip downward when the button is below the player | watch | placement === 'below_player' ? 'down' : 'up' is the only feature-specific placement branch in the click listener, and below_player is the one placement this spec never exercises. | src/features/copyTimestampUrlButton/index.ts:19-24; src/utils/dom/tooltip.ts:104-107 (direction 'down' positioning, with… |

### customCSS

`src/features/__tests__/customCSS.spec.ts` — 77 generated cases today, about 9 after the recommendations below.

customCSS.spec.ts is a near-verbatim clone of the deepDarkCSS template: 7 tests x 11 page types = 77 cases that exercise one page-agnostic code path (append/remove a <style> in document.head, src/features/customCSS/index.ts:14-35). Test 7 (spec:69) duplicates test 2 (spec:21) exactly, and test 2 is a strict prefix of the re-enable test (spec:50). The navigation test (spec:38) is mis-titled: it dis…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should inject custom CSS | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should remove custom CSS when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should update custom CSS content | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists custom CSS after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| re-applies after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists custom CSS after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| restores original state when disabled after being enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores original state when disabled after being enabled on ${pageType} | 69 | remove | 11 | Verified statement-for-statement identical to "should remove custom CSS when disabled on ${pageType}" (spec:70-75 vs spec:22-27): same navigateToPageType, same setOption, same enableFeature, same toBeAttached, same disab… |
| should remove custom CSS when disabled on ${pageType} | 21 | merge-into:re-applies after disable then re-enable on ${pageType} | 11 | Confirmed strict prefix: spec:51-56 repeats spec:22-27 verbatim and then adds enable + toBeAttached. Removing it loses no assertion; the onDisable removal path (index.ts:14-21) is still observed at spec:56. |
| should inject custom CSS on ${pageType} | 15 | reduce-pages:watch,search | 9 | customCSS declares no dependencies (index.metadata.ts has no dependencies key, so resolvePageTypes returns all 11 pageTypes from types.ts:282-294) and the feature only appends/removes a <style> in document.head with zero… |
| should update custom CSS content on ${pageType} | 29 | reduce-pages:watch | 10 | onConfigChange -> updateCustomCSS does document.querySelector("#yte-custom-css") + replaceWith with no page-dependent logic (index.ts:9-13, utils.ts:19-25), so 10 of 11 iterations re-run identical code against a differen… |
| re-applies after disable then re-enable on ${pageType} | 50 | reduce-pages:watch | 10 | onEnable/onDisable touch only document.head (index.ts:14-35) and areDependenciesMet is trivially true for a feature with no dependencies (featureNavigationManager), so repeating across channel_home/channel_posts/playlist… |
| persists custom CSS after full page reload on ${pageType} | 60 | reduce-pages:watch | 10 | Reload re-runs enableAll identically on every page type (featureOrchestrator.ts:39-77); nothing about head-injection differs per page. Reducing to watch also removes the broken live iteration (see incorrect finding). |
| persists custom CSS after navigation on ${pageType} | 38 | reduce-pages:watch | 10 | Confirmed that for pageType home the three navigations collapse to zero navigations: navigateToYoutubePage skips the goto when the normalized URL already matches (src/utils/_tests/navigation.ts:215-218), so that iteratio… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| persists custom CSS after navigation on ${pageType} | 38 | high | The title claims persistence across SPA navigation, but spec:46-47 disable then re-enable the feature between the return navigation and the final assertion, so the only thing spec:48 proves is that onEnable works - which… | Delete the disableFeature/enableFeature calls at spec:46-47 and assert immediately after navigating back: await expect(page.locator("#yte-custom-css")).toBeAttached(), await expect(...).toHaveText("body { background: red… |
| persists custom CSS after full page reload on ${pageType} | 66 | medium | For pageType "live" the post-reload navigateToPageType does not simply wait for readiness: navigateToPageType routes live through navigateToLiveVideo, which goes back to the channel URL and clicks whatever live thumbnail… | Restrict both tests to watch (already recommended above); if the loop is kept, replace the post-reload navigateToPageType with waitForExtensionReady(page) (src/utils/_tests/navigation.ts:172-176) so the reloaded page is … |
| should update custom CSS content on ${pageType} | 35 | low | The content is read once with page.locator(...).textContent() with no retry, so the assertion depends entirely on the fixed 500 ms page.waitForTimeout inside setFeatureValue (src/utils/_tests/features.ts:63-71) being lon… | Use retrying assertions: await expect(page.locator("#yte-custom-css")).toContainText("green") and await expect(page.locator("#yte-custom-css")).not.toContainText("blue"). |

**Missing** (4; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | injects the configured code and it actually renders (strengthen "should inject custom CSS on ${pageType}") | watch | code is the feature's only payload field and it is never asserted on the onEnable path. onEnable builds the element via createCustomCSSElement({ code }) (index.ts:30-34, utils.ts:5-11); the sole content assertion in the … | src/features/customCSS/index.ts:22-34; src/features/customCSS/utils.ts:5-11; spec lines 15-20 assert only toBeAttached; … |
| medium | changing customCSS.code while the feature is disabled injects nothing | watch | Confirmed reachable: FeatureOrchestrator.notifyConfigChange calls lifecycleManager.configChange unconditionally (featureOrchestrator.ts:101-103) and FeatureLifecycleManager.configChange has no enabled-state guard (featur… | src/features/customCSS/utils.ts:19-25; src/features/_registry/featureOrchestrator.ts:95-103; src/features/_registry/feat… |
| low | exactly one #yte-custom-css element exists after re-enable and after navigation | watch | The customCSSExists() short-circuit (index.ts:23-28) and updateCustomCSS's replaceWith (utils.ts:24) exist precisely to keep a single element; nothing in the spec ever counts them, so a duplicate-injection regression is … | src/features/customCSS/index.ts:23-28; src/features/customCSS/utils.ts:12-18,24; spec has no toHaveCount call anywhere. |
| low | custom CSS content survives a full page reload | watch | Reload rebuilds the element from stored config via enableAll -> lifecycleManager.enableFeature (featureOrchestrator.ts:39-77), a different delivery path than live setOption; only attachment is checked at spec:67, so a co… | spec:60-68; src/features/_registry/featureOrchestrator.ts:45-68. |

### deepDarkCSS

`src/features/__tests__/deepDarkCSS.spec.ts` — 67 generated cases today, about 12 after the recommendations below.

deepDarkCSS declares no dependencies and no page-specific code, yet the spec loops six tests over all 11 page types, generating 67 live-YouTube cases that exercise one head-injection path. Coverage is also shallow: only the presence and text of the style tag are checked. Nothing verifies the CSS actually paints (deepDarkMaterialCSS.ts:111 sets html background from --main-background), nothing touch…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should inject deep dark CSS | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should remove deep dark CSS when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should persist deep dark CSS after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should update deep dark CSS content when preset changes | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should work on re-enable after disable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists deep dark CSS after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| applies every bundled preset | watch | 1 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist deep dark CSS after navigation on ${pageType} | 28 | remove | 11 | Upgraded from reduce-pages:watch to remove. On home both navigateToPageType calls are no-ops (navigateToYoutubePage skips goto when normalizeUrl(page.url()) equals the fixture URL), and on every other page the corrected … |
| should remove deep dark CSS when disabled on ${pageType} | 21 | merge-into:should work on re-enable after disable on ${pageType} | 11 | Lines 22-26 are lines 49-53 verbatim; the re-enable test is a strict superset on all 11 pages, and onDisable has no page-specific branch (metadata declares no dependencies). |
| should update deep dark CSS content when preset changes on ${pageType} | 38 | merge-into:applies every bundled preset on watch | 11 | Discord (#7289da) is one of the 31 presets the loop already switches to and polls for. Only the default-preset assertion (#00adee, spec:43) is unique; move it to the top of the loop test, before the first setOption. |
| should work on re-enable after disable on ${pageType} | 48 | reduce-pages:watch | 10 | onEnable appends to document.head and onDisable removes by id, with zero page-specific branches, and metadata declares no dependencies so areDependenciesMet is trivially true on all 11 pages. Keep one watch run (which al… |
| persists deep dark CSS after full page reload on ${pageType} | 57 | reduce-pages:watch | 10 | Re-injection from persisted storage is page-agnostic. On watch the follow-up navigateToPageType is a genuine no-op wait-for-ready (URL unchanged), so the reload path is clean there; on live it re-runs the whole channel-t… |
| should inject deep dark CSS on ${pageType} | 16 | reduce-pages:shorts | 10 | Injection on watch is already asserted by the surviving re-enable test (spec:51) and by every proposed new test; the remaining pages exercise navigateToPageType, not the feature. Keep exactly one non-watch shell (shorts)… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist deep dark CSS after navigation on ${pageType} | 28 | medium | Confirmed. The title promises persistence across navigation, but the only post-navigation assertion (line 36) comes after disableFeature+enableFeature (lines 34-35), so it measures re-enable, which the test at line 48 al… | Delete the test: the corrected form (assert count between lines 33 and 34, dropping lines 34-35) would be a duplicate of 'persists deep dark CSS after full page reload on ${pageType}', since navigateToPageType always per… |
| should update deep dark CSS content when preset changes on ${pageType} | 45 | low | Confirmed timing weakness: the post-change textContent is read exactly once, gated only by setFeatureValue's fixed 500 ms sleep (src/utils/_tests/features.ts:63-71), while the update travels content script -> storage.loc… | Use expect.poll(() => page.locator("#yte-deep-dark-css").textContent()).toContain("#7289da"), as the preset loop already does at spec:76-78. Moot if this test is merged into 'applies every bundled preset on watch', which… |
| should inject deep dark CSS on ${pageType} | 19 | low | Every presence assertion in the spec uses toBeGreaterThan(0) (lines 19, 24, 31, 36, 41, 51, 55, 60, 63), so a regression in which updateDeepDarkCSS appends instead of replaceWith, or the deepDarkCSSExists() guard in onEn… | Change those nine polls to .toBe(1). |

**Missing** (6; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | applies the Custom preset colors to the injected CSS | watch | Verified: the preset loop skips Custom (spec:72) and no other spec in src/features/__tests__ mentions deepDarkCSS at all, so getDeepDarkCustomThemeStyle and all seven colors.* fields are never executed. The output format… | src/features/__tests__/deepDarkCSS.spec.ts:72; src/features/deepDarkCSS/index.ts:15,31,33; src/features/deepDarkCSS/util… |
| high | deep dark CSS actually repaints the page background | watch | Confirmed: every existing assertion only counts or reads the style tag's text, so an inert or malformed sheet passes all 67 cases. deepDarkMaterial is prepended to every preset and sets html{background-color:var(--main-b… | src/deepDarkMaterialCSS.ts:110-116; src/features/deepDarkCSS/utils.ts:6-12 (textContent = `${deepDarkMaterial}\n${css_co… |
| high | sets, updates and clears the html deep dark data attributes | watch | Confirmed zero coverage (no spec under src/features/__tests__ references deepDark or data-yte-deep-dark). setDeepDarkData runs in both onEnable and onConfigChange and clearDeepDarkData in onDisable; getDeepDarkData is th… | src/utils/deep-dark-theme/dom.ts:4-7,16-22; src/features/deepDarkCSS/index.ts:17,25,36; src/utils/deep-dark-theme/index.… |
| medium | recolors below-player button icons for light and dark presets | watch | onEnable, onDisable and onConfigChange all clear buttonColorCache and call updateButtonsIconColor, and resolveContrastColor picks #FFFFFF vs #000000 from --main-background; no spec (including buttonController.spec.ts, wh… | src/features/deepDarkCSS/index.ts:18-19,26-27,37-38; src/features/buttonController/ButtonController.ts:638-646,691-699; … |
| medium | changing the preset while the feature is disabled injects nothing | watch | Confirmed in code: notifyConfigChange calls lifecycleManager.configChange before and independently of any enabled/deps check, and configChange has no enabled guard, so onConfigChange runs for a disabled feature; deepDark… | src/features/_registry/featureOrchestrator.ts:95-101; src/features/_registry/featureLifecycleManager.ts:20-31; src/featu… |
| medium | does not inject deep dark CSS before it is enabled | watch | enabled defaults to false and every test enables first, so a regression that injected on load regardless of config would pass the whole spec. Free to add as a first assertion. | src/features/deepDarkCSS/index.metadata.ts:18; src/features/__tests__/deepDarkCSS.spec.ts:16-20,48-51 |

### defaultToOriginalAudioTrack

`src/features/__tests__/defaultToOriginalAudioTrack.spec.ts` — 12 generated cases today, about 12 after the recommendations below.

The spec has 6 tests x 2 pages = 12 cases, but only two of them (spec:20 and spec:130) ever read the audio track; the re-enable (spec:114) and reload (spec:122) tests assert nothing but player visibility and cannot fail, and the disabled test (spec:221) compares a track id to itself after a fixed 2 s sleep. The restore test (spec:69) disables 500 ms after enabling without waiting for the switch, s…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should switch to original (non-auto-dubbed) audio track | watch, shorts | 2 |
| should restore original audio track when disabled | watch, shorts | 2 |
| should switch to original audio track on re-enable after disable | watch, shorts | 2 |
| should persist original audio track after full page reload | watch, shorts | 2 |
| should switch to original audio track after navigation | watch, shorts | 2 |
| should not switch to original audio track when disabled | watch, shorts | 2 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist original audio track after full page reload on ${pageType} | 122 | remove | 2 | Its only assertions are that the player is visible (spec:125,128), which navigateToPageType already guarantees - waitForYoutubePlayerReady runs for watch/shorts (navigation.ts:220-222). It never reads getAudioTrack. The … |
| should switch to original audio track on re-enable after disable on ${pageType} | 114 | merge-into:should restore original audio track when disabled on ${pageType} | 2 | As written it asserts nothing beyond player visibility (see the incorrect finding at spec:114). The disable/re-enable round trip is worth keeping, but it belongs at the end of the restore test, which already holds the ba… |
| should not switch to original audio track when disabled on ${pageType} | 221 | reduce-pages:watch | 1 | The disabled path has no shorts-specific code beyond the player selector (index.ts:16,28,40), and on /shorts the feature cannot run at all (featurePlayerManager.ts:42,69 + url/index.ts:102,112), so the shorts iteration o… |
| should switch to original audio track after navigation on ${pageType} | 130 | simplify | 0 | Lines 135-174 duplicate the 40-line poll from spec:25-66 verbatim, and 180-219 duplicate it a third time; the same object-walking evaluate is copy-pasted five times across the spec in two different (strict vs loose) vari… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should switch to original audio track on re-enable after disable on ${pageType} | 114 | high | The title promises a track switch but the body only asserts the player is visible (spec:117,120). navigateToPageType already awaited player readiness for watch/shorts (navigation.ts:220-222, player.ts:273-298), so both a… | After the second enableFeature, poll getAudioTrack until isAutoDubbed===false; and after disableFeature first poll until the id is back to the pre-enable dubbed id, so the round trip is actually observed. Per the unneces… |
| should switch to original (non-auto-dubbed) audio track on ${pageType} | 20 | high | On the shorts iteration the expectation contradicts the feature code. index.ts passes only { maxAttempts, waitForLoaded } to executeWithRetries, so resolved.pageTypes falls back to DEFAULT_CONFIG's ['watch','live'] (feat… | Decide which is wrong and align them: either pass pageTypes: ['shorts','watch'] in the three executeWithRetries calls (index.ts:56,62,70) so the shorts branch at index.ts:16,28,40 actually executes, or drop 'shorts' from… |
| should not switch to original audio track when disabled on ${pageType} | 221 | medium | The assertion can never fail. enabled defaults to false (index.metadata.ts:7), so disableFeature (spec:223) is a no-op on a fresh context; the body then reads a track id, sleeps a fixed 2000 ms (spec:242) and compares th… | Drop the early return and the fixed sleep. Assert the positive complement instead: on the dubbedAudio fixture with the feature off, the current track must satisfy isAutoDubbed===true (using the strict predicate from spec… |
| should restore original audio track when disabled on ${pageType} | 69 | medium | disableFeature fires exactly 500 ms after enableFeature (setFeatureValue waits a flat 500 ms, features.ts:63-71) with no wait for the switch to land. onDisable's executeWithRetries calls abortRetry(featureId) first (feat… | Between spec:87 and spec:88, poll until the current track actually changed (isAutoDubbed===false, or id !== originalTrackId), then disable and poll for the return to originalTrackId. That makes both directions real. |
| should restore original audio track when disabled on ${pageType} | 71 | low | The id extraction at spec:78-82 (and the identical copies at spec:100-105, 233-238, 250-255) accepts the first nested object that merely has a string `id`, whereas the feature's parseAudioTrack only accepts objects carry… | Use the same strict shape check as spec:35-47 (name/isDefault/isAutoDubbed/id all present and correctly typed) when extracting the id, ideally via the shared helper proposed in the simplify finding, so the spec and parse… |

**Missing** (2; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should re-apply the original audio track after an in-page (SPA) navigation | watch | onNavigate is the hook that keeps the feature working as a user clicks from video to video - the primary real-world usage - and no test reaches it. Every navigation in this spec goes through navigateToPageType -> page.go… | src/features/defaultToOriginalAudioTrack/index.ts:69-74 (onNavigate -> setDefault only); src/utils/_tests/navigation.ts:… |
| medium | should restore the current video's audio track, not the previous video's, after an in-page switch to another video | watch | originalAudioTrack is module scope and saveTrack short-circuits while it is non-null, so after an SPA navigation a disable on video B pushes video A's track object into B's player; the restore either no-ops or throws and… | src/features/defaultToOriginalAudioTrack/index.ts:10 (module-level originalAudioTrack), :25-26 (saveTrack early return),… |

### flipVideoButtons

`src/features/__tests__/flipVideoButtons.spec.ts` — 27 generated cases today, about 18 after the recommendations below.

The spec spends all 27 generated cases on button presence/placement plumbing and never once clicks a flip button, so the feature's actual behaviour (utils.ts:6-27: transform scale(-1,1)/(1,-1), the combined scale(-1,-1), the toggle-back, transformOrigin, and the document.querySelector("video") target) has zero coverage. Two tests are vacuous (spec:25, spec:38 disable an already-disabled button - e…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| flipVideoHorizontalButton › horizontal flip button should be present | watch, live | 2 |
| flipVideoHorizontalButton › horizontal flip button should not be present when disabled | watch, live | 2 |
| flipVideoVerticalButton › vertical flip button should be present | watch, live | 2 |
| flipVideoVerticalButton › vertical flip button should not be present when disabled | watch, live | 2 |
| horizontal flip button should persist after navigation | watch, live | 2 |
| vertical flip button should persist after navigation | watch, live | 2 |
| horizontal flip button should re-appear after disable then re-enable | watch, live | 2 |
| vertical flip button should re-appear after disable then re-enable | watch, live | 2 |
| horizontal flip button should persist after full page reload | — | 1 |
| vertical flip button should persist after full page reload | — | 1 |
| should not create flip video buttons on non-target page | — | 1 |
| button placement › horizontal flip button should render in player_controls_left | — | 1 |
| button placement › vertical flip button should render in player_controls_left | — | 1 |
| button placement › horizontal flip button should render in player_controls_right | — | 1 |
| button placement › vertical flip button should render in player_controls_right | — | 1 |
| fullscreen transition › horizontal flip button should move from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › vertical flip button should move from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › horizontal flip button should not move when fullscreenPlacement is same | — | 1 |
| fullscreen transition › vertical flip button should not move when fullscreenPlacement is same | — | 1 |

**Not needed** (12)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| horizontal flip button should not be present when disabled on ${pageType} | 25 | remove | 2 | buttonField.enabled defaults to false (defineConfig.ts:57-61; the metadata overrides only placement, index.metadata.ts:11-12), so the test disables an already-disabled button and asserts a button that was never created: … |
| vertical flip button should not be present when disabled on ${pageType} | 38 | remove | 2 | Same vacuity - flipVideoVerticalButton.enabled also defaults to false, so expectFeatureButtonToBeFalsy passes whether or not disabling removes anything. spec:79 covers the real transition. |
| vertical flip button should persist after navigation on ${pageType} | 56 | merge-into:horizontal flip button should persist after navigation on ${pageType} | 2 | navigateToPageType does a hard page.goto (navigation.ts:215-218), so this is the framework's load-time add path, identical for both buttons; enabling both before the hop and asserting both ids after it loses nothing and … |
| vertical flip button should re-appear after disable then re-enable on ${pageType} | 79 | merge-into:horizontal flip button should re-appear after disable then re-enable on ${pageType} | 2 | Both buttons take the same featureButtonManager add/remove path keyed per button name (featureButtonManager.ts:80-130); one test can toggle both configs and assert both ids, preserving per-button coverage. |
| vertical flip button should render in ${placement} | 127 | merge-into:horizontal flip button should render in ${placement} | 2 | Same placement loop, same containers; set both placements and enable both buttons in the horizontal test and assert both ids in one page load. |
| horizontal flip button should not move when fullscreenPlacement is same | 162 | remove | 1 | "same" is the buttonField default and pure buttonController mechanics; buttonController.spec.ts:100-110 already asserts a button with fullscreenPlacement "same" stays put, and spec:138 already proves index.ts forwards th… |
| vertical flip button should not move when fullscreenPlacement is same | 174 | remove | 1 | Line-for-line duplicate of spec:162 with the other id, and of buttonController.spec.ts:100-110; nothing feature-specific is asserted. |
| vertical flip button should move from left to right on fullscreen enter/exit | 150 | merge-into:horizontal flip button should move from left to right on fullscreen enter/exit | 1 | One fullscreen round-trip can assert both ids; the only feature-specific fact is that index.ts:26,48 forwards each button's fullscreenPlacement, which the merged test still checks for both buttons. |
| vertical flip button should persist after full page reload | 102 | merge-into:horizontal flip button should persist after full page reload | 1 | Reload persistence is stored-config/load-time behaviour, identical for both buttons; enable both before page.reload() and assert both afterwards. |
| vertical flip button should be present on ${pageType} | 32 | reduce-pages:watch | 1 | index.ts and utils.ts contain no live-vs-VOD branch, and the live iteration costs up to 120 s (navigation.ts:145-160 sets a 120 s test timeout and polls .ytp-live-badge for 120 s). Keep the horizontal presence test on li… |
| horizontal flip button should re-appear after disable then re-enable on ${pageType} | 68 | reduce-pages:watch | 1 | Enable/disable handling lives entirely in featureButtonManager and is page-independent; the live run re-proves it at up to 120 s of navigation. |
| horizontal flip button should persist after navigation on ${pageType} | 44 | reduce-pages:watch | 1 | The live variant performs two live-channel scans (live -> home -> live), each capped at 120 s, to re-prove page-independent load-time re-add. |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| horizontal flip button should persist after navigation on ${pageType} | 44 | high | After navigating back (lines 49-50) the test disables, re-enables and re-sets placement (lines 51-53) before asserting, so the final expect at line 54 observes a freshly added button, not survival of the navigation. If t… | Delete lines 51-53 and assert expectFeatureButtonToBeTruthy (plus expectFeatureButtonToBeIn right) immediately after navigateToPageType(page, pageType). |
| vertical flip button should persist after navigation on ${pageType} | 56 | high | Same defect: lines 63-65 disable, re-enable and re-set placement after returning to the target page, so the assertion at line 66 cannot fail if the button is lost across the navigation. | Delete lines 63-65 and assert right after navigating back - or, applying the merge above, fold both ids into the fixed horizontal navigation test. |
| should not create flip video buttons on non-target page | 112 | low | The title promises both flip buttons, but the body only enables and checks flipVideoHorizontalButton (lines 114-115), so an includePages gating regression affecting only the vertical button would pass. | Also enable flipVideoButtons.buttons.flipVideoVerticalButton.enabled and add expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoVerticalButton-button") in the same test (no extra page load). |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | horizontal flip button should flip the video and unflip on a second click | watch | The feature's only behaviour is untested: the spec never imports or calls clickFeatureButton, so a dead listener, a broken toggle, or getVideo() picking a non-player <video> all pass today. Sibling button specs (loopButt… | src/features/flipVideoButtons/utils.ts:6-9,16-27; src/features/flipVideoButtons/index.ts:18-27; src/utils/_tests/feature… |
| high | vertical flip button should flip the video and combine with the horizontal flip | watch | The vertical listener and the shared module-scope flipX/flipY state that composes both axes have zero coverage; a regression where one axis overwrites the other is invisible today. | src/features/flipVideoButtons/utils.ts:3-4,11-14,19-21; src/features/flipVideoButtons/index.ts:40-49 |
| low | flip buttons should use the configured default placement | watch | The metadata overrides buttonField's feature_menu default with player_controls_right; every existing test only asserts "attached" after re-setting placement, so a regression of that override would still pass. | src/features/flipVideoButtons/index.metadata.ts:11-12; src/features/_registry/defineConfig.ts:57-61 (buttonField placeme… |
| low | horizontal flip menu item should flip the video from the feature menu | watch | feature_menu is a valid placement for this feature and no spec anywhere calls clickFeatureMenuItem - buttonController.spec.ts:34-57 only asserts a screenshot menu item exists, never that a menu item's listener runs. (The… | src/utils/_tests/features.ts:28-38 (clickFeatureMenuItem, unused project-wide); src/features/buttonController/ButtonCont… |

### forwardRewindButtons

`src/features/__tests__/forwardRewindButtons.spec.ts` — 15 generated cases today, about 13 after the recommendations below.

forwardRewindButtons.spec.ts is a near-verbatim clone of playbackSpeedButtons.spec.ts, but forwardRewindButtons has two feature-specific behaviours the template does not cover. (1) The isLive early return (src/features/forwardRewindButtons/index.ts:36-37, 63-65) has zero coverage, even though live /watch URLs are a real page type in the harness. (2) The `time` field is only ever set before enablin…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| rewind button seeks backward | watch | 1 |
| forward button seeks forward | watch | 1 |
| forward button should not be present when disabled | watch | 1 |
| forward button should persist after navigation | watch | 1 |
| forward button should re-appear after disable then re-enable | watch | 1 |
| forward button should persist after full page reload | — | 1 |
| should not create forward rewind buttons on non-target page | — | 1 |
| button placement › forward button should render in player_controls_left | — | 1 |
| button placement › rewind button should render in player_controls_left | — | 1 |
| button placement › forward button should render in player_controls_right | — | 1 |
| button placement › rewind button should render in player_controls_right | — | 1 |
| fullscreen transition › forward button should move from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › rewind button should move from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › forward button should not move when fullscreenPlacement is same | — | 1 |
| fullscreen transition › rewind button should not move when fullscreenPlacement is same | — | 1 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| forward button should not be present when disabled on ${pageType} | 54 | merge-into:forward button should re-appear after disable then re-enable on ${pageType} | 1 | Corrected rationale (the auditor's "cannot fail" claim is wrong - it would fail if buttons rendered while enabled=false). What it actually covers is the default-disabled cold-load state, which is generic featureButtonMan… |
| forward button should render in ${placement} | 99 | reduce-placements:player_controls_right | 1 | Confirmed: clickFeatureButton calls expectFeatureButtonToBeIn(page, featureId, placement) as its first statement (src/utils/_tests/features.ts:11-17), and expectSeekDelta passes `left` (spec line 28), so the player_contr… |
| rewind button should render in ${placement} | 106 | reduce-placements:player_controls_right | 1 | Same, for the rewind id: "rewind button seeks backward on ${pageType}" clicks through clickFeatureButton with `left`, which asserts the button is inside .ytp-left-controls before clicking (src/utils/_tests/features.ts:17… |
| rewind button should move from left to right on fullscreen enter/exit | 129 | merge-into:forward button should move from left to right on fullscreen enter/exit | 1 | Byte-for-byte the same body as spec lines 117-127 with the id swapped; both buttons are moved by the same generic fullscreen relocation and both receive fullscreenPlacement from the same config object. Asserting both ids… |
| forward button should not move when fullscreenPlacement is same | 141 | remove | 1 | Confirmed duplicate of generic mechanics: buttonController.spec.ts:100-110 "should not move loop button when fullscreenPlacement is same" runs the identical sequence, and "same" is the shared default (src/features/_regis… |
| rewind button should not move when fullscreenPlacement is same | 153 | remove | 1 | Duplicate of the forward variant above and of the same generic buttonController coverage; nothing about the rewind button changes the "same" path. |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| rewind button seeks backward on ${pageType} | 40 | high | Confirmed on two counts. (a) expectSeekDelta never establishes a baseline position: navigateToPageType/pageSetup only dismisses ads and promos (src/utils/_tests/pageSetup.ts:220-225), it never seeks, so at freeze time cu… | Inside expectSeekDelta, seek to a safe baseline before freezing, e.g. await page.evaluate(() => document.querySelector<YouTubePlayerDiv>("div#movie_player")?.seekTo(60, true)) followed by a poll until getCurrentTime >= 6… |
| forward button seeks forward on ${pageType} | 47 | medium | expectSeekDelta reads the post-click time with waitForStableTime (line 29), but freezeAndGetTime already paused the video (src/utils/_tests/player.ts:143-150), so "stable" is true from the first sample: waitForStableTime… | Replace waitForStableTime with a value poll, mirroring playbackSpeedButtons.spec.ts:27: await expect.poll(() => getValueFromYouTubePlayer(page, "getCurrentTime", pageType), { intervals: [200], timeout: 10000 }).toBeGreat… |
| should not create forward rewind buttons on non-target page | 91 | medium | The title promises both buttons but the body only asserts #yte-feature-forwardButton-button (line 94); a regression that leaked only the rewind button onto a non-target page (nonTargetPage resolves to channel_home, src/u… | Add `await expectFeatureButtonToBeFalsy(page, "yte-feature-rewindButton-button");` after line 94. |
| forward button should re-appear after disable then re-enable on ${pageType} | 76 | low | After re-enabling, the test re-writes button.placement with the value it already set at line 70. notifyConfigChange returns early via featureConfigManager.hasChanged (featureOrchestrator.ts:98-100), so the call is a pure… | Delete line 76 so the final assertion depends only on the enable transition re-adding the button (and, per the merge above, add an expectFeatureButtonToBeFalsy before line 71 plus rewind-button assertions). |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | rewind button should still seek after button.placement is changed while enabled | watch | Verified live-code bug: featureButtonManager iterates the buttons array sequentially (rewindButton is buttons[0], forwardButton buttons[1]). On a placement change while enabled it does remove-then-add per button, and eac… | src/features/forwardRewindButtons/index.ts:52-55 and :80-83 (remove -> eventManager.removeEventListeners("forwardRewindB… |
| high | changing forwardRewindButtons.time while enabled updates both button titles and the seek amount | watch | Confirmed that a time-only change reaches onConfigChange but does NOT re-add the buttons (notifyConfigChange -> lifecycleManager.configChange, then handleButtonPlacement with moved=false, fullscreenChanged=false, isActiv… | src/features/forwardRewindButtons/index.ts:86-99 (onConfigChange -> updateFeatureButtonTitle x2) and :13-27 (listener re… |
| medium | forward and rewind buttons should not be added on a live stream | live | Downgraded from the auditor's high: the test does NOT deterministically exercise the isLive early return. getCurrentPageType classifies a live /watch URL as pageType "live", and includePages is ["watch"], so areDependenc… | src/features/forwardRewindButtons/index.ts:36-37 and :63-65; src/utils/url/index.ts:38-48 (watch URL is reclassified "li… |
| medium | both buttons should be removed when the feature is disabled | watch | Confirmed: no spec anywhere in src/features/__tests__ references yte-feature-rewindButton-button outside this file's placement/fullscreen tests, so rewindButton.remove is never observed. A regression in the rewind remove… | src/features/forwardRewindButtons/index.ts:51-55 (name/remove for rewindButton); spec lines 73-77 assert only the forwar… |

### globalVolume

`src/features/__tests__/globalVolume.spec.ts` — 20 generated cases today, about 15 after the recommendations below.

globalVolume is a small feature (enabled, volume, onEnable/onDisable/onNavigate, watch-live vs shorts container branch) yet the spec spends 20 generated cases on it while leaving three real branches unobserved. The disabled test (spec:14) cannot fail because it never configures volume=10 against the default of 25. The navigation test (spec:27) destroys its own premise by re-enabling the feature at…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should not set global volume when disabled | watch, live, shorts | 3 |
| should set global volume to 10 when enabled | watch, live, shorts | 3 |
| should persist volume after navigation | watch, live, shorts | 3 |
| re-applies volume after disable then re-enable | watch, live, shorts | 3 |
| persists volume after full page reload | watch, live, shorts | 3 |
| restores volume when disabled after being enabled | watch, live, shorts | 3 |
| feature conflicts › globalVolume vs rememberVolume › disabledWhen metadata cross-references are configured correctly | — | 1 |
| feature conflicts › globalVolume vs rememberVolume › last-enabled volume feature determines volume | watch | 1 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores volume when disabled after being enabled on ${pageType} | 62 | merge-into:re-applies volume after disable then re-enable on ${pageType} | 3 | Verified line-by-line duplicate: spec:63-68 (navigate, setOption volume, enable, poll toBe(volume), disable, poll not.toBe(volume)) is character-for-character the first six statements of spec:44-49 on the same three page… |
| should not set global volume when disabled on ${pageType} | 14 | reduce-pages:watch | 2 | With enabled=false the orchestrator never calls enableFeature/navigateFeature for this feature (featureOrchestrator.ts:159-166), so getPlayerContainer and its watch/live vs shorts branch (index.ts:10-17) are never reache… |
| should persist volume after navigation on ${pageType} | 27 | reduce-pages:watch,shorts | 1 | live takes exactly the same `isWatchPage() \|\| isLivePage() -> #movie_player` branch as watch (index.ts:12), so it adds no code coverage, while each navigateToPageType(live) re-runs the channel scan with a 120 s budget (n… |
| re-applies volume after disable then re-enable on ${pageType} | 43 | reduce-pages:watch,shorts | 1 | The disable/enable cycle goes through the same lifecycleManager path on every page (featureLifecycleManager.ts:33-58) and live shares watch's container branch (index.ts:12); the live case repeats identical code paths at … |
| persists volume after full page reload on ${pageType} | 53 | reduce-pages:watch,shorts | 1 | Load-time application (enableAll -> onEnable, featureOrchestrator.ts:52-67) is page-agnostic and live shares watch's container branch. Worse, on live this test does not test a reload at all: navigateToPageType(page, "liv… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should not set global volume when disabled on ${pageType} | 14 | high | The test never establishes the value it asserts against. globalVolume.volume is left at its default of 25 (index.metadata.ts:59) while the assertion is `not.toBe(volume)` with volume = 10 (src/utils/_tests/constants.ts:2… | After navigating, setOption(page, "globalVolume.volume", volume) and setVolume(page, 55, pageType) so the test owns both the config the feature would apply and the player's current value, then disable and assert getCurre… |
| should persist volume after navigation on ${pageType} | 27 | high | spec:34-35 disables and re-enables the feature after navigating back, re-running onEnable (featureLifecycleManager.ts:47-58) immediately before the final poll, so the assertion measures re-enable, not navigation persiste… | Delete the disableFeature/enableFeature pair at spec:34-35 and replace the home->pageType goto round trip with a real in-page navigation (click a related-video link and await the URL change, or trigger history.pushState)… |
| re-applies volume after disable then re-enable on ${pageType} | 49 | medium | The post-disable check is `not.toBe(volume)`, which passes for any wrong restored value and also when getCurrentVolume returns null (helper returns null when the player element or the video is missing, src/utils/_tests/p… | Capture `const original = await getCurrentVolume(page, pageType)` before enableFeature, then after disableFeature assert `expect.poll(...).toBe(original)` instead of `not.toBe(volume)`; do this in the re-enable test (spe… |
| last-enabled volume feature determines volume on watch | 105 | low | The title states a general last-enabled-wins rule, but the body only runs rememberVolume-then-globalVolume; the reverse order is never exercised, so the title promises a symmetric guarantee the test does not check. | Rename to "globalVolume overrides rememberVolume when enabled last on watch". Adding the reverse case is optional and not free: rememberVolume's onEnable only restores when its stored per-page volume is truthy (src/featu… |
| should not set global volume when disabled on ${pageType} | 17 | low | page.waitForTimeout(1000) at spec:17 and spec:24 precedes an expect.poll that already retries for up to 10 s, adding a fixed second of dead time to six generated cases without strengthening either assertion (the enable p… | Delete both waitForTimeout(1000) calls and rely on the existing expect.poll conditions. |

**Missing** (5; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | re-applies global volume after an in-page (SPA) navigation to another video | watch | onNavigate is the only hook that keeps the configured volume applied while the user browses YouTube, and nothing in the suite ever fires it: every navigateToPageType is a full document load, on which the volume is applie… | src/features/globalVolume/index.ts:30-34 (onNavigate) reached only via featureOrchestrator.updateFeatureOnNavigation (fe… |
| high | unmutes the player when applying the global volume | watch | setPlayerVolume's unmute branch is the difference between an audible and a silent player after the feature applies its volume; it has zero coverage and no test in the suite ever mutes a player. | src/features/globalVolume/utils.ts:47,51 (`const [currentVolume, isMuted] = await Promise.all(...)`, `if (isMuted && typ… |
| medium | changing globalVolume.volume while the feature is already enabled | watch | volume is one of only two config fields and every existing test writes it before enabling (spec:22,29,45,55,64), so the options-page use case 'user edits the number while watching' is completely unobserved; it currently … | src/features/globalVolume/index.ts:18-35 declares only onDisable/onEnable/onNavigate; featureOrchestrator.notifyConfigCh… |
| medium | globalVolume settings are disabled on the options page while rememberVolume is enabled | options page (src/pages/options/Options.spec.ts) | This is the only user-visible effect of the disabledWhen metadata that spec:87-103 merely inspects structurally, and it is the mechanism that stops users creating the volume conflict in the first place. | src/features/globalVolume/index.metadata.ts:68-69,76-82 feed src/components/Settings/SettingsGenerator.tsx:139 (`const i… |
| low | saving options with globalVolume and rememberVolume both enabled opens the conflict resolution dialog | options page | The documented resolution path for exactly this feature pair has no test; a regression there silently leaves both volume features fighting over the player. | src/components/Settings/components/SettingsFooter.tsx:97-101 (save calls detectConflicts and shows the dialog) and :299-… |

### hideArtificialIntelligence

`src/features/__tests__/hideArtificialIntelligence.spec.ts` — 77 generated cases today, about 19 after the recommendations below.

The spec is a 7-test template cloned across all 11 page types (77 cases), but the feature is a single boolean that adds one body class (index.ts:8-21) plus static CSS, so only the body-class assertions can ever fail. Every expectElementsHidden call passes vacuously when YouTube renders no AI markup (assertions.ts:24-37), which is the normal case on the fixture pages, so none of the 13 selectors - …

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides AI elements | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| shows AI elements when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| hides elements after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists hide after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| restores AI elements when disabled after being enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| re-applies after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| hides dynamically added content | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows AI elements when disabled on ${pageType} | 30 | remove | 11 | Verified it cannot fail on the body class either way: default is enabled:false so disableFeature short-circuits at featureOrchestrator.ts:152 (no state or config change, onDisable never runs) and the class was never adde… |
| hides dynamically added content on ${pageType} | 85 | remove | 11 | index.ts:8-21 is a body-class toggle with no MutationObserver and no onNavigate, and the CSS is static, so a clone of an already-matching node is hidden by the CSS engine by construction. When nothing matches (the normal… |
| restores AI elements when disabled after being enabled on ${pageType} | 62 | merge-into:re-applies after disable then re-enable on ${pageType} | 11 | Lines 64-69 are a strict prefix of lines 75-80; the only extra assertion is the conditional expectElementsNotHidden at line 70-71, which can be moved into the re-enable test between disable and re-enable, losing nothing. |
| re-applies after disable then re-enable on ${pageType} | 73 | reduce-pages:watch | 10 | onEnable/onDisable only add/remove a class on document.body and the feature declares no dependencies, so areDependenciesMet returns true unconditionally (featureNavigationManager.ts:27-35) and the toggle cycle takes the … |
| hides elements after navigation on ${pageType} | 38 | reduce-pages:watch | 10 | There is no onNavigate hook and no page-specific branch, so this is the same document-load path on every page; and for pageType home both navigateToPageType calls are no-ops because navigateToYoutubePage skips the goto w… |
| persists hide after full page reload on ${pageType} | 51 | reduce-pages:watch | 10 | Load-time application of the body class comes from the shared embedded bootstrap and has no page-specific code path; repeating the reload cycle on 11 pages costs roughly 15 s each for one behaviour that spec:23 already c… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on ${pageType} | 38 | medium | The title promises post-navigation persistence, but nothing is asserted between returning to the page (line 45) and the disableFeature/enableFeature cycle (lines 46-47). The final assertions at lines 48-49 only prove tha… | Assert expectBodyWithClass + expectElementsHidden immediately after line 45 and delete the disableFeature/enableFeature calls on lines 46-47. |
| restores AI elements when disabled after being enabled on ${pageType} | 71 | medium | The hasAnyMatch guard on line 70 only checks that an element exists, not that it is visible, while expectElementsNotHidden(..., {mode:"any"}) throws "No selectors matched the expected state" when every matched node is di… | Capture each matching element's computed display before enabling and assert the values return to that baseline after disabling, or restrict the not-hidden check to nodes the test injected itself. |
| hides elements after navigation on ${pageType} | 44 | low | The intermediate hop targets home, but navigateToYoutubePage skips the goto when the normalized URL already matches (navigation.ts:215-218) and the home fixture URL is https://www.youtube.com, so for pageType home neithe… | Pick an intermediate page that always differs from pageType (e.g. search, or home only when pageType !== home). Moot if the reduce-pages:watch recommendation is applied. |
| persists hide after full page reload on ${pageType} | 58 | low | For pageType live, navigateToPageType always re-runs the live-video hunt (navigation.ts:146-160 -> navigateToLiveVideo:187-214), which navigates to the channel page and opens a possibly different live video, so the just-… | Replace navigateToPageType(page, pageType) on line 58 with waitForExtensionReady(page) (navigation.ts:172). |

**Missing** (5; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | hides every declared AI selector against synthetic markup | watch | Every element assertion in the spec today is vacuous: expectElementsHidden loops over locator.count() and asserts nothing when a selector has no match (assertions.ts:24-37), and none of these 13 selectors reliably matche… | src/utils/_tests/assertions.ts:24-37 (no match = pass); src/features/hideArtificialIntelligence/index.css:2-19; src/feat… |
| high | hides the live chat AI summary banner inside the chat iframe | live | Confirmed broken code path with zero coverage: live chat renders in the #chatframe document, which contains no ytd-live-chat-frame ancestor, and the embedded script that adds body.yte-hide-ai bails out in sub-frames (win… | src/features/hideArtificialIntelligence/index.css:14-17 (added in d92e971f, 2026-08-31); src/pages/embedded/index.ts:26 … |
| medium | collapses the menu button margin when enabled | watch | This is a second, separate rule in the feature CSS and the only non-display side effect the feature has. The generator only walks child rules that declare display:none under a `body.yte-hide-*` parent rule, so this rule … | src/features/hideArtificialIntelligence/index.css:21-22; src/pipeline/steps/generateHideFeatureSelectors.ts:28-45 (only … |
| low | options checkbox toggles hideArtificialIntelligence.enabled | options | The feature declares exactly one setting control and nothing renders or clicks it: Options.spec.ts contains only 6 generic page tests (title, language select, import, export, clear, reset) and no spec references the sett… | src/features/hideArtificialIntelligence/index.metadata.ts:9-16; src/pages/options/Options.spec.ts:3-50 (6 generic tests)… |
| low | migrates the legacy hideArtificialIntelligenceSummary config key | options | The rename branch has zero coverage. Correction to the original proposal: seeding storage and reloading YouTube would NOT exercise it - updateStoredSettings runs only from the background 'update' event or from the option… | src/utils/config/storage.ts:34-44 (featureIdRenames), storage.ts:66-79 (getStoredSettings keeps all keys); src/pages/bac… |

### hideEndScreenCards

`src/features/__tests__/hideEndScreenCards.spec.ts` — 8 generated cases today, about 12 after the recommendations below.

The spec's body-class assertions are sound, but essentially all of its element-level assertions are vacuous: .ytp-ce-element is not in the DOM until the end screen renders and expectElementsHidden/NotHidden (src/utils/_tests/assertions.ts:24-58) pass when nothing matches. Only one test tries to reach the end screen (spec:34) and it asserts without waiting. The generated selector entry (hideFeature…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides end screen cards | watch | 1 |
| shows end screen cards when disabled | watch | 1 |
| hides end screen cards after navigation | watch | 1 |
| hides end screen cards on re-enable after disable | watch | 1 |
| hides dynamically added end screen cards | watch | 1 |
| persists hide after full page reload on target pages | — | 1 |
| should not hide end screen cards on non-target page | — | 1 |
| feature conflicts › hideEndScreenCards vs automaticallyShowMoreVideosOnEndScreen › hideEndScreenCards CSS class is applied when both are enabled | watch | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows end screen cards when disabled on ${pageType} | 30 | merge-into:hides end screen cards on re-enable after disable on ${pageType} | 1 | Its body is a strict subset of spec:56-62, but it starts from the default config (hideEndScreenCards.enabled defaults to false, index.metadata.ts:68), so disableFeature writes the value the config already holds and the r… |
| hides dynamically added end screen cards on ${pageType} | 67 | remove | 1 | ADDED finding. The feature is pure CSS (index.css:1-6) with no MutationObserver, no DOM hook and no per-element work: a rule scoped to body.yte-hide-end-screen-cards applies to any matching node the moment it is inserted… |
| hideEndScreenCards CSS class is applied when both are enabled on watch | 98 | simplify | 0 | Its only assertion (spec:102) is the same body-class assertion made at spec:27, and the two features touch disjoint classes (automaticallyShowMoreVideosOnEndScreen adds yte-show-html5-endscreen / yte-hide-ytp-fullscreen-… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides end screen cards after navigation on ${pageType} | 40 | medium | The title promises navigation coverage, but spec:47-48 disable then re-enable the feature after returning to watch, so the assertions at spec:49-50 only re-prove the enable toggle; nothing observes the class being re-app… | Delete spec:47-48 and assert expectBodyWithClass immediately after navigateToPageType back to watch; add expectBodyWithoutClass while on home (deps unmet, featureNavigationManager.ts:27-35). Real SPA navigation belongs i… |
| shows end screen cards when disabled on ${pageType} | 34 | medium | The seek at spec:34-37 sets video.currentTime and expectElementsNotHidden runs immediately, with no wait for the end screen to render; expectElementsNotHidden loops over locator.count() and asserts nothing when the count… | Either drop spec:34-38 entirely (the body-class assertion at spec:33 is the meaningful part) or seek via setValueOnYouTubePlayer(page, pageType, "seekTo", duration-2, true), await expect(page.locator(".ytp-ce-element")).… |
| hides end screen cards on ${pageType} | 28 | medium | expectElementsHidden returns without asserting when no element matches (assertions.ts:24-39), and no test in this spec (or any spec) ever proves a .ytp-ce-element exists on the page, so spec:28 - and by the same mechanis… | Before the hidden assertions, drive the player to the end screen and require a non-zero match count (await expect(page.locator(".ytp-ce-element")).not.toHaveCount(0)), or pass {mode:"any"} which throws when nothing match… |
| hides dynamically added end screen cards on ${pageType} | 72 | medium | injectDynamicContent returns the injected selector or null when nothing matched (dom.ts:23-41) and the return value is discarded, so on a page where no end screen card is in the DOM nothing is injected and spec:73-74 mer… | If the test is kept, assign and assert the result (expect(await injectDynamicContent(page, selectors)).not.toBeNull()) after making the end screen render; otherwise delete the test - the feature is CSS-only with no Mutat… |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | hides end screen cards once the end screen is actually rendered on watch | watch (endScreenCards fixture, src/utils/_tests/navigation.ts:118-121) | Nothing in the whole suite ever observes a rendered .ytp-ce-element: a grep of src/features/__tests__ finds the string only in the generated selector map. Every element-level assertion in this spec goes through expectEle… | src/utils/_tests/assertions.ts:24-39 and 40-59 (loops over 0 matches, no assertion); src/features/hideEndScreenCards/ind… |
| high | hideEndScreenCards button state (icon, title, aria-checked) stays consistent when the setting is toggled live | watch | onConfigChange is the feature's only hook besides onEnable/onDisable and has zero assertions anywhere; it is reached for real (storage write -> featureConfigChange -> lifecycleManager.configChange -> feature.onConfigChan… | src/features/hideEndScreenCards/index.ts:16-30 and 51-60; src/features/hideEndScreenCardsButton/index.ts:40-53 (initialC… |
| medium | keeps/removes the body class across SPA navigation away from watch and back | watch -> home/search -> watch | Every navigation in this spec (and in the harness) is a full page.goto, which throws the old document away, so the SPA path deps-met -> onEnable / deps-unmet -> onDisable is never exercised for this feature. It has a con… | src/features/hideEndScreenCards/index.ts:31-37; src/utils/dom/wait/index.ts:14 and 45-50 (rejects on timeout); src/featu… |
| low | feature menu item aria-checked follows the hideEndScreenCards setting | watch | The feature_menu branch of updateHideEndScreenCardsButtonState is a separate untested branch that writes the opposite value to the non-menu branch for the same state; the menu item id is observable and hideEndScreenCards… | src/features/hideEndScreenCards/index.ts:47-50 vs 51-60; src/features/buttonController/ButtonController.ts:330-336 (setM… |

### hideEndScreenCardsButton

`src/features/__tests__/hideEndScreenCardsButton.spec.ts` — 13 generated cases today, about 11 after the recommendations below.

The spec spends most of its 13 generated cases (12 static test() calls; testPages resolves to the single page "watch") on generic buttonController mechanics - placement, fullscreen moves, menu-item existence - that buttonController.spec.ts already proves with screenshotButton/loopButton, while every branch unique to this feature is untested: the inverted feature_menu click path (index.ts:25-27), t…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| button should be present | watch | 1 |
| button toggles hideEndScreenCards | watch | 1 |
| button should be disabled when feature is off | watch | 1 |
| button should persist after navigation | watch | 1 |
| button should re-appear after disable then re-enable | watch | 1 |
| button should persist after full page reload | — | 1 |
| should not create button on non-target page | — | 1 |
| feature conflicts › hideEndScreenCardsButton → hideEndScreenCards › hideEndScreenCards state persists after navigation with button active | watch | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| button should be present on ${pageType} | 26 | remove | 1 | Lines 27-30 are character-for-character the prefix of lines 33-36 in "button toggles hideEndScreenCards on ${pageType}", which asserts the same attachment before clicking. No distinct lifecycle, page or config value. |
| button should be disabled when feature is off on ${pageType} | 42 | remove | 1 | buttonField.enabled defaults to false (src/features/_registry/defineConfig.ts:58-62) and every test gets a fresh userDataDir (playwright.config.ts:29-33), so disableFeature writes a value that is already set and the test… |
| should render button in ${placement} | 109 | reduce-pages:player_controls_right (drop the player_controls_left iteration) | 1 | Nothing in the feature branches on player_controls_left vs player_controls_right (index.ts only branches on feature_menu). Left/right/below placement is already proven generically for screenshotButton. Keep one iteration… |
| should render button in feature menu | 118 | merge-into:feature menu item click drives hideEndScreenCards on watch | 1 | Menu-item creation is generic buttonController machinery already covered; the only feature-specific thing about feature_menu here is the inverted click branch (index.ts:25-27), which the proposed test exercises while als… |
| should move button from left to right on fullscreen enter/exit | 127 | remove | 1 | Same scenario, same helper, different button id. Fullscreen re-placement is done entirely from trackedButtons info inside ButtonController (ButtonController.ts:830-847) and never re-enters the feature's add(); the generi… |
| should not move button when fullscreenPlacement is same | 139 | remove | 1 | Byte-for-byte the generic fullscreenPlacement="same" scenario with a different id; the behaviour lives in getEffectivePlacement/the fullscreen handler, not in this feature. |
| button should persist after navigation on ${pageType} | 47 | merge-into:button should persist after full page reload | 1 | ADDED while verifying the incorrect finding: navigateToPageType always does a hard page.goto (src/utils/_tests/navigation.ts:163,215-221 -> navigateToPage -> page.goto), so "navigate to home and back" is a full extension… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| button should persist after navigation on ${pageType} | 47 | high | After navigating away and back, lines 54-56 disable and re-enable the feature, which re-creates the button through the enable path. A regression where updateFeatureOnNavigation stops re-adding the button on load cannot f… | Delete lines 54-56 (the placement is still player_controls_right in storage, so line 56 is also a no-op) and assert expectFeatureButtonToBeTruthy immediately after navigating back. Better still: delete the test, because … |
| hideEndScreenCards state persists after navigation with button active on watch | 90 | medium | The title says the state persists; line 102 asserts the body class is gone. The assertion matches the code (the button calls registry.updateFeatureEnabledState, which never writes featureConfigManager.setLast, so updateF… | Rename to something like "hideEndScreenCards toggled by the button resets after navigation on watch". |
| hideEndScreenCards state persists after navigation with button active on watch | 100 | medium | The test leans on page.waitForTimeout(500)/(2000) instead of awaiting a condition, and line 94 uses a raw locator click that skips ensurePlayerControlsVisible (every other click in the suite goes through clickFeatureButt… | Use clickFeatureButton(page, watch, "yte-feature-hideEndScreenCardsButton-button", right) at line 94, drop both waitForTimeout calls, and after navigating back await the button being re-attached inside .ytp-right-control… |

**Missing** (5; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | feature menu item click drives hideEndScreenCards on watch | watch | The feature_menu branch uses shouldHideCards = checked while the control-bar branch uses !checked, and the item is created with initialChecked = !endScreenCardsAreHidden, so the menu path is inverted relative to the butt… | src/features/hideEndScreenCardsButton/index.ts:22-27,49-51; ButtonController.ts:743-748 (featureMenuClickListener: newSt… |
| high | button is built in the "cards already hidden" state and unhides on click on watch | watch | endScreenCardsAreHidden decides initialChecked (= !hidden), the initial label and the initial icon; every existing test starts from cards visible, so only the false branch is ever built. A regression that inverts it woul… | src/features/hideEndScreenCardsButton/index.ts:21,43-51; ButtonController.ts:888-891 (setChecked/appendIcon with initial… |
| medium | changing hideEndScreenCards from the options config re-syncs the button on watch | watch | hideEndScreenCards.onConfigChange exists solely to keep this button in sync when the setting is changed outside the button, and nothing observes it. It is reachable: notifyConfigChange calls lifecycleManager.configChange… | src/features/hideEndScreenCards/index.ts:16-30,46-60; src/features/_registry/featureOrchestrator.ts:95-103; src/features… |
| medium | button title flips between "Hide end screen cards" and "Show end screen cards" on click | watch | updateFeatureButtonTitle runs on every control-bar click and is the only user-visible feedback besides the icon; no assertion in the repo touches data-title for any button. Costs no extra browser context if merged into "… | src/features/hideEndScreenCardsButton/index.ts:29-34; ButtonController.ts:652-661; public/locales/en-US.json:56-59; grep… |
| low | should not create button on a live stream | live | Downgraded from the auditor's medium: on a normal live load getCurrentPageType returns "live", so dependencies (includePages ["watch"]) already block the button and the isLive early return is not what the test would prov… | src/features/hideEndScreenCardsButton/index.ts:19-20; src/utils/url/index.ts:38-49 (watch branch falls back to "watch" w… |

### hideLiveStreamChat

`src/features/__tests__/hideLiveStreamChat.spec.ts` — 8 generated cases today, about 8 after the recommendations below.

This spec is the repo-wide hide-feature template plus a non-target check, and it tests none of what makes hideLiveStreamChat different from a pure CSS hide feature: the isLive guard in applyLiveChatVisibility and onDisable (src/features/hideLiveStreamChat/index.ts:13-39). Two tests are broken in a way that hides the behaviour they name: the navigation test destroys the navigated state with a disab…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides live stream chat | live | 1 |
| shows live stream chat when disabled | live | 1 |
| hides live stream chat after navigation | live | 1 |
| persists hide after full page reload | live | 1 |
| restores original state when disabled after being enabled | live | 1 |
| re-applies after disable then re-enable | live | 1 |
| hides dynamically added content | live | 1 |
| should not add body class on non-target page | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores original state when disabled after being enabled on live | 57 | merge-into:re-applies after disable then re-enable on live | 1 | Lines 58-63 are character-for-character the first half of lines 67-72; the only unique assertion is expectElementsNotHidden(page, selectors, {mode:"any"}) at line 64. Moving that one line into the toggle test after line … |
| hides dynamically added content on live | 77 | remove | 1 | Hiding is a static descendant CSS rule under body.yte-hide-live-stream-chat (index.css:1-8) and index.ts registers no MutationObserver, while injectDynamicContent clones the first element that already matches a selector … |
| shows live stream chat when disabled on live | 29 | remove | 1 | hideLiveStreamChat.enabled defaults to false (index.metadata.ts:7) and each test gets a fresh temp userDataDir (playwright.config.ts:29-33), so disableFeature writes the value it already has: updateFeatureEnabledState re… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides live stream chat after navigation on live | 35 | high | After returning to the live page the test calls disableFeature then enableFeature (lines 42-43) before asserting. disableFeature on a live page runs onDisable, which removes the class, and enableFeature runs onEnable, wh… | Delete lines 42-43 and assert expectBodyWithClass/expectElementsHidden immediately after the second navigateToPageType(page, pageType). Note that even then this is a cold-load check, not an SPA one, because navigateToPag… |
| persists hide after full page reload on live | 47 | high | Line 53 calls navigateToPageType(page, pageType) after page.reload(). For pageType "live" that helper always re-enters navigateToLiveVideo, which page.goto's back to the channel URL and hunts a live thumbnail again, so t… | Replace line 53 with await waitForExtensionReady(page) (already exported at navigation.ts:172) so the assertions run on the reloaded page; if the live player needs to be up first, add waitForYoutubePlayerReady(page, "liv… |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | removes the hide when SPA-navigating from a live stream to a VOD | live -> watch (SPA) | Verified end to end: leaving live makes includePages deps unmet (featureNavigationManager.areDependenciesMet), so updateFeatureEnabledState takes the !canEnable && prevEnabled path and calls onDisable; onDisable finds #m… | src/features/hideLiveStreamChat/index.ts:13-19; src/features/_registry/featureOrchestrator.ts:154-166; src/features/_reg… |
| low | hides the theater-mode full-bleed chat panel on live | live | Two of the five generated selectors (#full-bleed-chat-container #panels-full-bleed-container, #full-bleed-container #panels-full-bleed-container) only exist in theater mode. expectElementsHidden iterates locator.count() … | src/features/hideLiveStreamChat/index.css:4-5; src/features/__tests__/__generated__/hideFeatureSelectors.ts:27-28; src/u… |
| low | clears fixed-panel column padding on live when chat is hidden | live | The generated selector list only carries display:none rules, so this layout rule is outside the data every test in the spec iterates and no assertion in the repo observes it. Downgraded from medium because the rule is co… | src/features/hideLiveStreamChat/index.css:10-12; src/features/__tests__/__generated__/hideFeatureSelectors.ts:22-31 |

### hideMembersOnlyVideos

`src/features/__tests__/hideMembersOnlyVideos.spec.ts` — 77 generated cases today, about 13 after the recommendations below.

hideMembersOnlyVideos is a one-field, CSS-only feature (index.ts:7-21 adds/removes yte-hide-members-only-videos; index.css does all the work), yet the spec is the unmodified boilerplate clone of hideOfficialArtistVideosFromHomePage.spec.ts and expands to 77 cases per project across all 11 page types. Only the body-class assertions are real; every element-level assertion goes through expectElements…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides members only videos | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| shows members only videos when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| hides elements after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists hide after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| restores original state when disabled after being enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| re-applies after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| hides dynamically added content | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows members only videos when disabled on ${pageType} | 31 | remove | 11 | The feature defaults to enabled:false (index.metadata.ts:7) and each test gets a fresh userDataDir (playwright.config.ts:29,83-95), so disableFeature at spec:34 changes nothing: the body class was never added and expectE… |
| restores original state when disabled after being enabled on ${pageType} | 62 | merge-into:re-applies after disable then re-enable on ${pageType} | 11 | Verified strict subset: spec:64-69 (navigate, enable, class, hidden, disable, class absent) is duplicated verbatim by spec:74-79, which then adds the re-enable step. The only extra line is expectElementsNotHidden at spec… |
| hides dynamically added content on ${pageType} | 84 | remove | 11 | Hiding is pure static CSS with no MutationObserver (index.ts:7-21 only toggles a body class; index.css does the work), and injectDynamicContent clones an element that already matches the selector (dom.ts:23-37), so the c… |
| re-applies after disable then re-enable on ${pageType} | 72 | reduce-pages:watch | 10 | onEnable/onDisable only add/remove a class on document.body (index.ts:9-20), metadata declares no dependencies (index.metadata.ts:5-9 has no dependencies key, so featureNavigationManager.areDependenciesMet returns true i… |
| hides elements after navigation on ${pageType} | 38 | reduce-pages:watch,search | 9 | updateFeatureOnNavigation has no page-specific branch for a feature with no dependencies (featureOrchestrator.ts:171-188). Keeping watch and search keeps one player page and one list page and lets each act as the other's… |
| persists hide after full page reload on ${pageType} | 51 | reduce-pages:watch,search | 9 | Re-application after reload comes from stored config plus one body class with no page-specific code path, so 11 reloads assert the same thing. Prefer watch/search over the auditor's home/watch: home is login-gated (utils… |
| hides members only videos on ${pageType} | 24 | reduce-pages:home,watch,search,channel_home,channel_videos | 6 | Only these fixtures can plausibly contain the three selector families (rich grid, item-section shelf, lockup); on shorts, playlist, channel_posts, channel_streams and live the element assertions match nothing (assertions… |

**Incorrect** (1)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on ${pageType} | 38 | medium | The title promises the hide survives navigation, but after navigating away and back the test disables and re-enables the feature (spec:46-47) before asserting at spec:48-49, so the assertion measures a fresh onEnable rat… | Delete the disableFeature/enableFeature pair at spec:46-47 and assert expectBodyWithClass + expectElementsHidden immediately after navigating back; choose an intermediate page type that differs from the page under test (… |

**Missing** (2; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | hides an injected members-only item for every generated selector | watch | Every element-level assertion in the spec goes through expectElementsHidden in the default "all" mode, which loops over locator.count() and returns without asserting when the count is 0 (src/utils/_tests/assertions.ts:24… | src/features/hideMembersOnlyVideos/index.css:1-13 (three selectors, display:none !important); src/utils/_tests/assertion… |
| medium | does not hide members-only items while a sponsorships hub is present | watch | body.yte-hide-members-only-videos:not(:has(yt-sponsorships-hub)) is an intentional branch that switches hiding off on membership-hub views. The spec strips the :not(...) guard from the generated bodyClass at spec:17 pure… | src/features/hideMembersOnlyVideos/index.css:1; src/features/__tests__/__generated__/hideFeatureSelectors.ts:33; spec:17… |

### hideOfficialArtistVideosFromHomePage

`src/features/__tests__/hideOfficialArtistVideosFromHomePage.spec.ts` — 7 generated cases today, about 6 after the recommendations below.

The spec is a verbatim clone of the hide-feature template (compare src/features/__tests__/hidePlaylistRecommendationsFromHomePage.spec.ts) and does not fit this feature. Because resolvePageTypes(["home"]) yields one page, the loop at line 22 produces 7 cases, all on the login-gated home feed. The real problem is that only the body class is ever meaningfully asserted: the generated selector is `ytd…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides official artist videos | home | 1 |
| shows official artist videos when disabled | home | 1 |
| hides elements after navigation | home | 1 |
| persists hide after full page reload | home | 1 |
| restores original state when disabled after being enabled | home | 1 |
| re-applies after disable then re-enable | home | 1 |
| hides dynamically added content | home | 1 |

**Not needed** (2)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores original state when disabled after being enabled on home | 61 | merge-into:re-applies after disable then re-enable on home | 1 | Verified line-by-line: lines 63-69 are a strict prefix of lines 73-81 (navigate → enable → expectBodyWithClass → expectElementsHidden → disable → expectBodyWithoutClass). The only assertion not present in the line-71 tes… |
| hides dynamically added content on home | 83 | remove | 1 | The feature is a pure CSS rule with no MutationObserver or DOM insertion (index.ts:7-21 only adds/removes a body class), so a late-added node is styled by the same rule with no code path of its own. On top of that inject… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on home | 37 | high | Confirmed: testPages = resolvePageTypes(["home"]) yields exactly ["home"] (utils.ts:6-8, index.metadata.ts:8), so `pageType` is `home` at lines 43-44 and both calls resolve to the same fixture URL https://www.youtube.com… | Replace lines 43-46 with a real round trip: navigateToPageType(page, pageTypeRecord.channel_home); await expectBodyWithoutClass(page, bodyClass); navigateToPageType(page, home); await expectBodyWithClass(page, bodyClass,… |
| hides official artist videos on home | 23 | low | Title/body mismatch: the only assertion that can fail on an arbitrary live home feed is expectBodyWithClass (line 27). expectElementsHidden (assertions.ts:24-39) iterates `await locator.count()` matches and, in the defau… | Either retitle to "adds the hide class on home" to match what it actually checks, or strengthen it with the injected synthetic card described in the missing findings (do NOT switch to mode:"any", which throws when nothin… |

**Missing** (3; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | hides an injected official artist card and shows it again when disabled (home) | home | The CSS rule (the entire user-visible behaviour of this feature) has no assertion that can reliably fail: every expectElementsHidden/NotHidden call iterates page.locator(selector).count() matches, so it passes with zero … | src/features/hideOfficialArtistVideosFromHomePage/index.css:1-8; src/features/__tests__/__generated__/hideFeatureSelecto… |
| high | should not hide official artist videos on non-target page | channel_home (resolveNonTargetPage) | dependencies.includePages ["home"] is the only guard: the generated selector `ytd-rich-item-renderer:has(path[d=…])` is not scoped to `ytd-browse[page-subtype="home"]` (unlike the sibling hidePlaylistRecommendationsFromH… | src/features/hideOfficialArtistVideosFromHomePage/index.metadata.ts:8; src/features/_registry/featureNavigationManager.t… |
| low | options checkbox hideOfficialArtistVideosFromHomePage.enabled renders and writes storage | options | The declared setting (index.metadata.ts:10-17) has zero coverage: Options.spec.ts only exercises page chrome (title, language select, import/export/clear/reset) and no spec references this feature id outside its own spec… | src/features/hideOfficialArtistVideosFromHomePage/index.metadata.ts:10-17; src/pages/options/Options.spec.ts:3-51; grep … |

### hidePaidPromotionBanner

`src/features/__tests__/hidePaidPromotionBanner.spec.ts` — 8 generated cases today, about 7 after the recommendations below.

The feature is a two-line body-class toggle gated to watch (src/features/hidePaidPromotionBanner/index.ts:10-21, index.metadata.ts:8), and the generated selector entry (hideFeatureSelectors.ts:46-49) matches index.css exactly. The spec's body-class assertions are sound, but every element assertion in all 8 tests is vacuous: none of the six watch fixtures has a paid promotion (I fetched all six URL…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides paid promotion banner | watch | 1 |
| shows paid promotion banner when disabled | watch | 1 |
| hides elements after navigation | watch | 1 |
| persists hide after full page reload | watch | 1 |
| restores original state when disabled after being enabled | watch | 1 |
| re-applies after disable then re-enable | watch | 1 |
| hides dynamically added content | watch | 1 |
| should not hide paid promotion banner on non-target page | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores original state when disabled after being enabled on watch | 57 | remove | 1 | Lines 58-64 are a strict prefix of "re-applies after disable then re-enable on watch" (spec:67-72): same navigate, enable, expectBodyWithClass, expectElementsHidden, disable, expectBodyWithoutClass. Its only extra line i… |
| hides paid promotion banner on watch | 23 | merge-into:re-applies after disable then re-enable on watch | 1 | Its whole body (navigate, enableFeature, expectBodyWithClass, expectElementsHidden) is reproduced verbatim at spec:67-70 inside the re-enable test, and again at spec:36-39, 48-51, 78-81. There is no separate code branch … |
| shows paid promotion banner when disabled on watch | 29 | simplify | 0 | Keep expectBodyWithoutClass at spec:32 (the only assertion that the default-off config never applies the class), drop expectElementsNotHidden at spec:33: the watch fixture actually used (getFixture returns pageFixtures.w… |
| should not hide paid promotion banner on non-target page | 88 | simplify | 0 | resolveNonTargetPage yields channel_home (pageTypes order, types.ts:282-294; utils.ts:3-5), which has no player overlay at all, so expectElementsNotHidden at spec:92 iterates zero elements and cannot fail. expectBodyWith… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides dynamically added content on watch | 77 | high | The test claims late-added DOM is still hidden, but injectDynamicContent clones an existing match and returns null when nothing matches (dom.ts:23-41); the watch fixture has no paid promotion, so nothing is cloned, the r… | Synthesize instead of cloning: page.evaluate appending both a div with class ytp-paid-content-overlay and a ytm-paid-content-overlay-renderer element to document.body, each with inline style "display:block" (the feature … |
| hides elements after navigation on watch | 35 | medium | Both hops at spec:40-41 are full document loads (navigateToYoutubePage -> navigateToPage -> page.goto, navigation.ts:215-226 / 133-144), so the test exercises the same fresh-load path as "persists hide after full page re… | Delete spec:42-43 so the post-navigation assertion is unmasked, and replace the two goto hops with a genuine in-page navigation (click a related-video or channel link, then page.goBack()) so featureOrchestrator.updateFea… |

**Missing** (2; 0 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| medium | removes the hide on in-page navigation away from watch and restores it on return | watch | featureNavigationManager.handleNavigation recomputes currentPage from the signature and featureOrchestrator.updateFeatureOnNavigation -> updateFeatureEnabledState disables the feature when areDependenciesMet fails for th… | src/features/_registry/featureNavigationManager.ts:29-35 (areDependenciesMet), :60-67 (handleNavigation sets currentPage… |
| low | options checkbox hidePaidPromotionBanner.enabled writes the config | options | The feature declares a settings entry that no test renders or clicks; Options.spec.ts only covers page title, language select, import/export/clear/reset. This belongs in Options.spec.ts, not in this spec, and is a generi… | src/features/hidePaidPromotionBanner/index.metadata.ts:32-39 (settings entry, component checkbox); src/pages/options/Opt… |

### hidePlayables

`src/features/__tests__/hidePlayables.spec.ts` — 77 generated cases today, about 6 after the recommendations below.

hidePlayables is a pure body-class + CSS feature with one config field, no buttons, no page dependencies and only onEnable/onDisable (src/features/hidePlayables/index.ts:8-22). The spec is a verbatim copy of hidePosts.spec.ts expanded over all 11 page types (77 cases per project), but the CSS rule targets a home-feed-only element, so on 10 pages every element assertion passes vacuously (src/utils/…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides playables section | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| shows playables section when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| hides elements after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists hide after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| restores original state when disabled after being enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| re-applies after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| hides dynamically added content | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| hides elements after navigation on ${pageType} | 37 | merge-into:persists hide after full page reload on ${pageType} | 11 | REVISED (auditor said reduce-pages:home). navigateToPageType -> navigateToYoutubePage -> navigateToPage always uses page.goto (navigation.ts:130-141, 215-226); there is no SPA/history navigation helper anywhere in src/ut… |
| restores original state when disabled after being enabled on ${pageType} | 61 | merge-into:re-applies after disable then re-enable on ${pageType} | 11 | CONFIRMED. spec:71 runs the identical enable -> assert class -> disable -> assert class-absent sequence and then continues into re-enable; the only assertion spec:61 adds is expectElementsNotHidden after disabling (spec:… |
| hides dynamically added content on ${pageType} | 83 | remove | 11 | CONFIRMED. injectDynamicContent clones an existing match and returns null when none exists (dom.ts:23-41), so on every page where no playables shelf is rendered the test degrades to a second body-class assertion. The fea… |
| shows playables section when disabled on ${pageType} | 30 | reduce-pages:home | 10 | REVISED (auditor said merge-into spec:71, saving 11). The merge is wrong: this is the only test that observes the disabled-at-init state, i.e. that no body class is added when the feature is off on a fresh load. Reaching… |
| persists hide after full page reload on ${pageType} | 50 | reduce-pages:home | 10 | CONFIRMED. Reload persistence runs through storage plus the orchestrator's enable-all path, and areDependenciesMet is unconditionally true for a feature with no dependencies (featureNavigationManager.ts:27-34), so the 11… |
| re-applies after disable then re-enable on ${pageType} | 71 | reduce-pages:home | 10 | CONFIRMED. onEnable/onDisable only add/remove a class on document.body (index.ts:10-21) and no page gating exists, so the toggle cycle is page-independent; one home run suffices once spec:61's extra expectElementsNotHidd… |
| hides playables section on ${pageType} | 23 | reduce-pages:home,watch | 9 | REVISED (auditor said reduce-pages:home, saving 10). The reduction is right - no includePages are declared, areDependenciesMet is always true, and the CSS only matches home-feed markup - but collapsing every test in the … |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on ${pageType} | 45 | medium | CONFIRMED. After returning to the page the test calls disableFeature then enableFeature (spec:45-46), which re-runs onEnable and re-adds the body class, so the assertions at spec:47-48 cannot detect the class being lost … | Delete the disableFeature/enableFeature pair at spec:45-46 and assert expectBodyWithClass plus expectElementsHidden immediately after navigating back. Note that after this fix the test is behaviourally identical to "pers… |
| hides playables section on ${pageType} | 28 | medium | CONFIRMED. expectElementsHidden defaults to mode "all" and its per-selector loop runs zero iterations when the locator matches nothing, falling through with no assertion (assertions.ts:24-39). The playables shelf only ev… | Keep this test on home (plus one non-login page for the body class) and make the element assertion deterministic - either assert page.locator(selector).count() > 0 before asserting display:none, or assert against a scrip… |
| hides elements after navigation on ${pageType} | 43 | low | CONFIRMED. For pageType "home" both navigateToPageType calls at spec:43-44 are no-ops: navigateToYoutubePage skips page.goto when the normalized current URL already equals the fixture URL (navigation.ts:215-218), and the… | Use a fixed intermediate page that is never the current one - hop to pageTypeRecord.watch and back - so the transition is always a real load. (This only matters if the test is kept rather than merged into the reload test… |

**Missing** (1; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | hides an injected playables shelf and leaves sibling rich sections visible | home | The CSS rule is the entire user-facing effect of the feature and has zero deterministic coverage: expectElementsHidden defaults to mode "all" and its loop runs zero iterations when nothing matches, so every element asser… | src/features/hidePlayables/index.css:1-5 (body.yte-hide-playables ytd-rich-section-renderer:has(a[href="/playables"]) { … |

### hidePlaylistRecommendationsFromHomePage

`src/features/__tests__/hidePlaylistRecommendationsFromHomePage.spec.ts` — 7 generated cases today, about 6 after the recommendations below.

The spec is a verbatim clone of the generated template (identical to hideOfficialArtistVideosFromHomePage.spec.ts), and for a home-only, CSS-only feature that template overshoots on redundancy while missing the two branches that matter. Feature surface is tiny: one boolean `enabled` (index.metadata.ts:7), onEnable/onDisable toggling a body class (index.ts:9-20), one CSS rule (index.css:1-5, correc…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides playlist recommendations | home | 1 |
| shows playlist recommendations when disabled | home | 1 |
| hides elements after navigation | home | 1 |
| persists hide after full page reload | home | 1 |
| restores original state when disabled after being enabled | home | 1 |
| re-applies after disable then re-enable | home | 1 |
| hides dynamically added content | home | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows playlist recommendations when disabled on home | 30 | merge-into:hides playlist recommendations on home | 1 | Each test gets a fresh temp userDataDir (playwright.config.ts:29-33), so `enabled` is already false when the test starts; disableFeature writes the value it already has. The only regression it can catch is "class applied… |
| restores original state when disabled after being enabled on home | 61 | merge-into:re-applies after disable then re-enable on home | 1 | Lines 61-72 are a strict prefix of lines 73-84 (navigate, enable, expectBodyWithClass, expectElementsHidden, disable, expectBodyWithoutClass) plus one extra expectElementsNotHidden. Adding that single call after line 80 … |
| hides dynamically added content on home | 83 | merge-into:hides playlist recommendations on home | 1 | index.ts has no MutationObserver or onNavigate - the whole effect is one body class plus a static CSS rule, so a re-appended clone is styled by the browser's cascade, not by feature logic. injectDynamicContent also retur… |

**Incorrect** (1)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on home | 37 | high | The title is false: no navigation happens. testPages = resolvePageTypes(['home']) = ['home'] (spec:18, src/utils/_tests/utils.ts:6-8), so `navigateToPageType(page, home)` (line 43) and `navigateToPageType(page, pageType)… | Turn it into a real page transition that exercises the includePages gate: navigate to home, enable, assert the class and hidden tiles, navigateToPageType(page, watch) and assert expectBodyWithoutClass (featureOrchestrato… |

**Missing** (2; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | keeps non-collection home tiles visible when enabled | home | Nothing in the suite constrains the selector's narrowness. expectElementsHidden only iterates whatever the generated selector matches (src/utils/_tests/assertions.ts:24-39) and the generated selector is derived from inde… | src/features/hidePlaylistRecommendationsFromHomePage/index.css:2; src/features/__tests__/__generated__/hideFeatureSelect… |
| medium | should not hide playlist recommendations on non-target page | channel_home (resolveNonTargetPage) | includePages ['home'] is the only page-scoping logic in the feature and nothing observes it; featureNavigationManager.areDependenciesMet gates onEnable so a metadata regression is visible only through the body class. Pri… | src/features/hidePlaylistRecommendationsFromHomePage/index.metadata.ts:8; src/features/_registry/featureNavigationManage… |

### hidePosts

`src/features/__tests__/hidePosts.spec.ts` — 7 generated cases today, about 6 after the recommendations below.

hidePosts.spec.ts is an unmodified copy of the base template (identical body to hidePlaylistRecommendationsFromHomePage.spec.ts:21-93), and the copy fits this feature poorly. The feature is trivial (onEnable/onDisable toggle body.yte-hide-posts, one CSS rule, one boolean, includePages ["home"]), yet two of its three real behaviours are untested: page gating on non-target pages, and the CSS actuall…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides posts section | home | 1 |
| shows posts section when disabled | home | 1 |
| hides elements after navigation | home | 1 |
| persists hide after full page reload | home | 1 |
| restores original state when disabled after being enabled | home | 1 |
| re-applies after disable then re-enable | home | 1 |
| hides dynamically added content | home | 1 |

**Not needed** (2)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows posts section when disabled on home | 30 | merge-into:hides posts section on home | 1 | Verified: hidePosts.enabled defaults to false (index.metadata.ts:7 field(z.boolean(), false)) and each test gets a fresh context, so disableFeature writes an unchanged value; isValidChange/deepEqual in src/pages/content/… |
| restores original state when disabled after being enabled on home | 61 | merge-into:re-applies after disable then re-enable on home | 1 | Line 71 already performs the identical prefix - navigate, enable, expectBodyWithClass, expectElementsHidden, disable, expectBodyWithoutClass - and then continues with the re-enable. The only step line 61 adds is `await e… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on home | 37 | high | Confirmed: testPages = resolvePageTypes(["home"]) = ["home"] (utils.ts:6-8), so both navigateToPageType calls at lines 43-44 target the home fixture https://www.youtube.com, which is already loaded; navigateToYoutubePage… | Make the test actually cross a navigation boundary or delete it. The genuinely uncovered path is the SPA one (yt-navigate-finish -> FeatureNavigationManager.handleNavigation -> featureOrchestrator.updateFeatureOnNavigati… |
| hides dynamically added content on home | 83 | medium | Confirmed: injectDynamicContent returns null when no element matches any selector (dom.ts:26-38) and line 89 discards the return value; expectElementsHidden then loops over locator.count() and completes without a single … | Capture the return value of injectDynamicContent; when it is null, fall back to appending a synthetic node into ytd-rich-grid-renderer - document.createElement("ytd-rich-section-renderer") with a child carrying the is-po… |

**Missing** (1; 0 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| medium | should not hide posts on non-target page | channel_home | includePages:["home"] is hidePosts' only branch and this spec never leaves home, so nothing pins hidePosts' own dependency metadata: if includePages were widened or dropped from src/features/hidePosts/index.metadata.ts:8… | src/features/hidePosts/index.metadata.ts:8 (dependencies.includePages ["home"]); src/features/_registry/featureNavigatio… |

### hideScrollBar

`src/features/__tests__/hideScrollBar.spec.ts` — 71 generated cases today, about 7 after the recommendations below.

hideScrollBar is a 20-line, page-agnostic feature: onEnable appends one <style id="yte-hide-scroll-bar"> to document.head, onDisable removes it (src/features/hideScrollBar/index.ts:7-25); it has no index.css and correctly has no entry in src/features/__tests__/__generated__/hideFeatureSelectors.ts. The spec spends ~71 live-YouTube test cases (7 tests x 10 pages plus 1 skipped placeholder) re-asser…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| scrollbar should be hidden | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| scrollbar should be visible when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| scrollbar should stay hidden after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| persists scrollbar hide after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| restores scrollbar when disabled after being enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| re-applies scrollbar hide after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| dynamically added content keeps scrollbar hidden | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, subscriptions, watch | 10 |
| scrollbar tests are not applicable | shorts | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| page loop over all 10 non-shorts page types | 14 | reduce-pages:watch | 63 | metadata declares no dependencies (index.metadata.ts:6-17), so featureNavigationManager.areDependenciesMet returns true unconditionally (featureNavigationManager.ts:27-34) and the feature body is a single document.head <… |
| restores scrollbar when disabled after being enabled on ${pageType} | 105 | merge-into:re-applies scrollbar hide after disable then re-enable on ${pageType} | 1 | Lines 105-131 are a literal prefix of lines 133-170: navigate, enable, assert hidden, scrollHeight guard, disable, assert visible. The re-enable test then continues with enable + assert hidden. No distinct lifecycle path… |
| dynamically added content keeps scrollbar hidden on ${pageType} | 172 | merge-into:scrollbar should be hidden on ${pageType} | 1 | The feature is a static stylesheet (::-webkit-scrollbar / html{scrollbar-width:none}) with no MutationObserver and no onNavigate hook, so late-added DOM cannot change the outcome - there is no dynamic-content code path t… |
| scrollbar should stay hidden after navigation on ${pageType} | 51 | merge-into:persists scrollbar hide after full page reload on ${pageType} | 1 | navigateToPageType always does a full document goto (navigation.ts:133-144,214-216), so "navigate away and back" re-runs exactly the enableAll-from-storage path that the reload test at spec:79 already exercises. The trai… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| scrollbar should be visible when disabled on ${pageType} | 33 | medium | Title promises the disable path but the feature is never enabled first, so disableFeature writes false over the default false. test_setConfigValue rewrites the whole config object (src/pages/content/index.ts:181-192) and… | Retitle to "does not hide the scrollbar by default" and strengthen it to assert document.getElementById("yte-hide-scroll-bar") === null; the real enable->disable path is already covered at spec:133. |
| scrollbar should stay hidden after navigation on ${pageType} | 51 | medium | After navigating away and back the test disables and re-enables the feature (spec:66-67) before its final assertion at spec:73, so a regression where navigation dropped the style would be masked - the re-enable re-inject… | Delete spec:66-67 and assert the hidden state (plus presence of #yte-hide-scroll-bar) immediately after navigating back, using an intermediate page that differs from pageType - or drop the test entirely per the merge-int… |
| scrollbar should be hidden on ${pageType} | 27 | medium | `documentElement.clientWidth >= window.innerWidth` is trivially true on any page whose document does not overflow, so the assertion can pass with the feature completely broken and the test never guarantees overflow. Same… | Force overflow first (append a 10000px div, as spec:176-180 already does) and additionally assert document.getElementById("yte-hide-scroll-bar") is not null so the assertion is tied to the feature rather than to page lay… |
| scrollbar should be visible when disabled on ${pageType} / restores scrollbar when disabled after being enabled on ${pageType} / re-applies scrollbar hide after disable then re-enable on ${pageType} | 39 | medium | `if (!pageHasScrollbar) return;` (spec:39, 121, 149) ends the test as PASSED when the page did not overflow, silently skipping the entire disable assertion - at spec:39 that voids the whole test body. | Use test.skip(!pageHasScrollbar, "page does not overflow") so the skip is visible, or better, append a tall element to force overflow so the guard is unnecessary and the assertion always runs. |
| all tests (fixed sleeps) | 22 | low | page.waitForTimeout(1000) at spec:22, 54, 68, 82, 94, 108, 136, 161, 175 immediately precedes an expect.poll with a 10 s timeout that already awaits the same condition, on top of the 500 ms fixed wait inside setFeatureVa… | Delete the waitForTimeout calls; the following expect.poll awaits the condition. |

**Missing** (2; 0 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| medium | assert the injected #yte-hide-scroll-bar style element on enable and its removal on disable | watch | onEnable/onDisable's only direct observable is the style element (src/features/hideScrollBar/index.ts:13-25 append, :8-9 remove); every current assertion goes through the indirect width proxy `documentElement.clientWidth… | src/features/hideScrollBar/index.ts:7-25; no occurrence of "yte-hide-scroll-bar" anywhere under src/features/__tests__ (… |
| low | miscellaneous checkbox toggles hideScrollBar.enabled | options (Options.spec.ts, optionsTest fixture) | The declared checkbox setting has no coverage: Options.spec.ts only asserts page render, language select, import/export, clear and reset. The click path is observable (Settings.tsx:117-127 createOptionSetter -> settingsM… | src/features/hideScrollBar/index.metadata.ts:8-16; src/pages/options/Options.spec.ts:4-49; src/components/Settings/Setti… |

### hideShorts

`src/features/__tests__/hideShorts.spec.ts` — 37 generated cases today, about 29 after the recommendations below.

hideShorts is a pure CSS feature: applyShortsVisibility (src/features/hideShorts/utils.ts:16-24) adds/removes six body classes and index.css hides the matching elements; there are no buttons, no state, no live/VOD branch. The spec maps all six config fields to the correct generated selectors (__generated__/hideFeatureSelectors.ts:56-85 matches index.css exactly), and each sub-feature gets the same…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hideShorts.sidebar.enabled › hides | watch | 1 |
| hideShorts.sidebar.enabled › shows when disabled | watch | 1 |
| hideShorts.sidebar.enabled › sidebar hiding should persist after navigation | watch | 1 |
| hideShorts.sidebar.enabled › sidebar hiding should work on re-enable after disable | watch | 1 |
| hideShorts.sidebar.enabled › sidebar hiding should persist after full page reload | watch | 1 |
| hideShorts.sidebar.enabled › sidebar hiding should apply to dynamically added content | watch | 1 |
| hideShorts.home.enabled › hides | home | 1 |
| hideShorts.home.enabled › shows when disabled | home | 1 |
| hideShorts.home.enabled › home hiding should persist after navigation | home | 1 |
| hideShorts.home.enabled › home hiding should work on re-enable after disable | home | 1 |
| hideShorts.home.enabled › home hiding should persist after full page reload | home | 1 |
| hideShorts.home.enabled › home hiding should apply to dynamically added content | home | 1 |
| hideShorts.channel.enabled › hides | channel_home | 1 |
| hideShorts.channel.enabled › shows when disabled | channel_home | 1 |
| hideShorts.channel.enabled › channel hiding should persist after navigation | channel_home | 1 |
| hideShorts.channel.enabled › channel hiding should work on re-enable after disable | channel_home | 1 |
| hideShorts.channel.enabled › channel hiding should persist after full page reload | channel_home | 1 |
| hideShorts.channel.enabled › channel hiding should apply to dynamically added content | channel_home | 1 |
| hideShorts.search.enabled › hides | search | 1 |
| hideShorts.search.enabled › shows when disabled | search | 1 |
| hideShorts.search.enabled › search hiding should persist after navigation | search | 1 |
| hideShorts.search.enabled › search hiding should work on re-enable after disable | search | 1 |
| hideShorts.search.enabled › search hiding should persist after full page reload | search | 1 |
| hideShorts.search.enabled › search hiding should apply to dynamically added content | search | 1 |
| hideShorts.videos.enabled › hides | watch | 1 |
| hideShorts.videos.enabled › shows when disabled | watch | 1 |
| hideShorts.videos.enabled › videos hiding should persist after navigation | watch | 1 |
| hideShorts.videos.enabled › videos hiding should work on re-enable after disable | watch | 1 |
| hideShorts.videos.enabled › videos hiding should persist after full page reload | watch | 1 |
| hideShorts.videos.enabled › videos hiding should apply to dynamically added content | watch | 1 |
| hideShorts.subscriptions.enabled › hides | subscriptions | 1 |
| hideShorts.subscriptions.enabled › shows when disabled | subscriptions | 1 |
| hideShorts.subscriptions.enabled › subscriptions hiding should persist after navigation | subscriptions | 1 |
| hideShorts.subscriptions.enabled › subscriptions hiding should work on re-enable after disable | subscriptions | 1 |
| hideShorts.subscriptions.enabled › subscriptions hiding should persist after full page reload | subscriptions | 1 |
| hideShorts.subscriptions.enabled › subscriptions hiding should apply to dynamically added content | subscriptions | 1 |
| feature conflicts › hideShorts vs shortsAutoScroll › hideShorts sub-features active don't interfere with shortsAutoScroll page | watch | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows when disabled on ${page} | 72 | remove | 6 | Identical assertions (expectBodyWithoutClass + expectElementsNotHidden over the same selectors) are already made at spec:99-100 inside "${subFeature} hiding should work on re-enable after disable on ${page}", which reach… |
| ${subFeature} hiding should apply to dynamically added content on ${page} | 116 | reduce-pages:videos on watch only | 5 | Hiding is a body-class CSS rule with !important (src/features/hideShorts/index.css:1-36) and there is no observer or imperative code; injectDynamicContent clones an element that already matched the selector (src/utils/_t… |
| hideShorts sub-features active on watch don't interfere with shortsAutoScroll on shorts page | 131 | remove | 1 | shortsAutoScroll is never enabled and nothing about it is asserted, so the title is false; the single assertion expect(page.locator("#shorts-player")).toBeAttached() cannot fail because navigateToPageType(page, "shorts")… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| ${subFeature} hiding should persist after navigation on ${page} | 79 | medium | The title promises persistence across navigation, but after navigating away and back the body disables and re-enables the sub-feature (spec:87-88) before asserting, so the final expectBodyWithClass/expectElementsHidden m… | Delete the disableFeature/enableFeature pair at spec:87-88 and assert expectBodyWithClass + expectElementsHidden immediately after navigating back. Caveat the previous audit missed: navigateToPageType always does a full … |
| ${subFeature} hiding should persist after navigation on ${page} | 85 | medium | The intermediate page is hard-coded to home. For the hideShorts.home sub-feature page === home, and navigateToYoutubePage skips page.goto when normalizeUrl(page.url()) equals normalizeUrl(fixture.url) (src/utils/_tests/n… | Pick the intermediate page per sub-feature so it is never equal to the page under test - e.g. search when page === home, and watch or search otherwise - so a real document load always occurs. |
| hides on ${page} | 70 | medium | expectElementsHidden defaults to mode "all", which iterates locator.count() and asserts nothing when the count is zero (src/utils/_tests/assertions.ts:24-39). So the canonical hides-on test proves only that the body clas… | Use expectElementsHidden(page, selectors, { mode: "any" }) in "hides on ${page}" at least for hideShorts.channel on channel_home, where yt-tab-shape[tab-title="Shorts"] is structurally part of the channel tab bar. Siblin… |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | enabling one sub-feature does not add the other five body classes | watch | applyShortsVisibility rewrites all six classes on every call from one settings object, and no test in the repo ever asserts the absence of a class it did not enable (the spec only ever checks the single bodyClass of the … | src/features/hideShorts/utils.ts:16-23 (loop over shortsClassMap adds/removes all six); src/features/hideShorts/index.ts… |
| medium | disabling one sub-feature while another stays enabled keeps the other section hidden | watch | This is the only path through onConfigChange where resolveEnabled stays true, so onDisable does not run and the per-section removal must come from applyShortsVisibility itself. Every existing toggle test turns the last r… | src/features/_registry/featureRegistryCore.ts:44-54 (resolveEnabled returns true if any nested enabled is true); src/pag… |
| medium | body classes are not applied on a page outside includePages and are present again on a target page | watch -> shorts -> watch | Dependency gating is the feature's only page-dependent behaviour and nothing asserts it; the one test that visits shorts (spec:131-143) asserts only #shorts-player, which navigateToPageType already guarantees. Note the h… | src/features/hideShorts/index.metadata.ts:15 (includePages has no shorts/live/playlist); src/features/_registry/featureN… |

### hideSidebarRecommendedVideos

`src/features/__tests__/hideSidebarRecommendedVideos.spec.ts` — 8 generated cases today, about 6 after the recommendations below.

The spec is a verbatim copy of the shared hide-feature template (compare hideLiveStreamChat.spec.ts) applied to a feature whose entire implementation is one body class plus one CSS rule, so 4 of its 8 cases are duplicates or cannot fail. The generated selector entry (__generated__/hideFeatureSelectors.ts:86) matches index.css:1-5 exactly. Biggest real defect: "hides elements after navigation on wa…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides sidebar recommended videos | watch | 1 |
| shows sidebar recommended videos when disabled | watch | 1 |
| hides elements after navigation | watch | 1 |
| persists hide after full page reload | watch | 1 |
| restores original state when disabled after being enabled | watch | 1 |
| re-applies after disable then re-enable | watch | 1 |
| hides dynamically added content | watch | 1 |
| should not hide sidebar recommended videos on non-target page | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| hides sidebar recommended videos on watch | 23 | merge-into:re-applies after disable then re-enable on watch | 1 | Its entire body (navigateToPageType, enableFeature, expectBodyWithClass, expectElementsHidden) is reproduced verbatim as spec:67-70 of the re-enable test, and again as spec:58-61 and spec:48-51. There is no page branch, … |
| shows sidebar recommended videos when disabled on watch | 29 | merge-into:re-applies after disable then re-enable on watch | 1 | `enabled` defaults to false (index.metadata.ts:7), so disableFeature writes an unchanged value; notifyConfigChange short-circuits on hasChanged (featureOrchestrator.ts:100) and no lifecycle hook runs. The test therefore … |
| restores original state when disabled after being enabled on watch | 57 | merge-into:re-applies after disable then re-enable on watch | 1 | spec:58-63 is character-for-character the same sequence as spec:67-72; the only assertion not present in the re-enable test is the trailing expectElementsNotHidden at spec:64. Move that single call into the re-enable tes… |
| hides dynamically added content on watch | 77 | remove | 1 | The feature only adds/removes a class on document.body (index.ts:10-21); hiding is a static CSS rule (index.css:1-5) with no MutationObserver or per-element work. injectDynamicContent clones the matched #related and re-a… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides elements after navigation on watch | 35 | high | The title promises post-navigation behaviour, but after the watch -> home -> watch round trip the test calls disableFeature then enableFeature (spec:42-43) before asserting. enableFeature writes config, which drives upda… | Delete the disableFeature/enableFeature pair at spec:42-43 and assert expectBodyWithClass + expectElementsHidden immediately after returning to watch; better, repurpose the test as the SPA-navigation case (click an in-pa… |
| restores original state when disabled after being enabled on watch | 64 | medium | expectElementsNotHidden is called with the default mode "all", which iterates locator.count() matches and simply falls through when the count is zero (assertions.ts:40-58). The sibling hide spec passes { mode: "any" }, w… | Pass { mode: "any" } to expectElementsNotHidden at spec:64 (and to whichever not-hidden assertion survives the merges) so a selector that no longer matches fails the run. |
| should not hide sidebar recommended videos on non-target page | 92 | low | resolveNonTargetPage(metadata.dependencies) returns the first pageType that is neither in includePages ["watch"] nor login-gated, i.e. "channel_home" (utils.ts:3-5; types.ts:282-294). Channel browse pages never render `#… | Drop the expectElementsNotHidden call, or replace it with `await expect(page.locator(selectors[0])).toHaveCount(0)` so the test states what it actually verifies; put the real element-level negative on a live page (see th… |

**Missing** (3; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | keeps hide across SPA navigation away from watch and back | watch | The navigation dependency re-check is this feature's only runtime branch besides direct enable/disable, and nothing observes it: no spec in the repo performs an in-page navigation (grep for goBack/pushState/yt-navigate a… | src/features/_registry/featureRegistry.ts:45-49 wires the navigation callback to featureOrchestrator.ts:172-190 (updateF… |
| medium | does not hide related videos on a live stream watch page | live | A /watch URL whose player reports isLive resolves to pageType "live", so includePages ["watch"] excludes it and the sidebar must stay intact. resolveNonTargetPage only ever returns channel_home (first entry of pageTypes … | src/utils/url/index.ts:38-49; src/features/hideSidebarRecommendedVideos/index.metadata.ts:8; src/utils/_tests/utils.ts:3… |
| low | hides only the related section and leaves the rest of the sidebar visible | watch | The rule is scoped to `#related` inside `#secondary #secondary-inner`; if it were ever widened to `#secondary` the whole sidebar (including the playlist panel on the default watch fixture, which is a &list= URL) would di… | src/features/hideSidebarRecommendedVideos/index.css:1-5; src/features/__tests__/__generated__/hideFeatureSelectors.ts:86… |

### hideTranslateComment

`src/features/__tests__/hideTranslateComment.spec.ts` — 8 generated cases today, about 8 after the recommendations below.

The spec is cloned boilerplate (identical to hidePosts.spec.ts) that only ever verifies the body class. Because the feature's selector lives in the comments section, which is lazy-rendered below the 1280x720 viewport and never scrolled into view, every expectElementsHidden/expectElementsNotHidden call runs over zero matches and cannot fail (assertions.ts:24-58), and injectDynamicContent silently i…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| hides translate comment button | watch | 1 |
| shows translate comment button when disabled | watch | 1 |
| hides translate comment after navigation | watch | 1 |
| persists hide after full page reload | watch | 1 |
| restores original state when disabled after being enabled | watch | 1 |
| re-applies after disable then re-enable | watch | 1 |
| hides dynamically added content | watch | 1 |
| should not hide translate comment on non-target page | — | 1 |

**Not needed** (2)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| restores original state when disabled after being enabled on watch | 58 | remove | 1 | Its assertion sequence (navigate, enable, class present, disable, class absent) is a strict prefix of "re-applies after disable then re-enable on watch" (lines 67-77), which performs the identical enable/disable and then… |
| hides dynamically added content on watch | 78 | remove | 1 | Hiding is a static CSS descendant rule keyed off the body class (src/features/hideTranslateComment/index.css:1-5) with no MutationObserver in the feature, so late-added nodes are covered by definition. Worse, injectDynam… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| hides translate comment after navigation on watch | 36 | high | After navigating home and back to watch the test disables and re-enables the feature (lines 43-44) before asserting, so the assertion at line 45 observes the config-change path (already covered at lines 67-77), not the n… | Delete lines 43-44 and assert expectBodyWithClass immediately after returning to watch; to make the title true, drive the return leg with an in-page click (thumbnail/channel link) so featureOrchestrator.updateFeatureOnNa… |
| hides translate comment button on watch | 28 | medium | expectElementsHidden runs in default mode "all", which loops over locator.count() and asserts nothing when the count is zero (src/utils/_tests/assertions.ts:24-39); expectElementsNotHidden behaves the same (assertions.ts… | Delete the no-op selector assertions and replace them with one deterministic check (see the missing test): scroll #comments into view or append a synthetic ytd-tri-state-button-view-model.translate-button, then use expec… |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | hides a synthetic translate button (verifies the CSS rule actually loads) | watch | The body class is only half the feature; the stylesheet rule body.yte-hide-translate-comment > ytd-tri-state-button-view-model.translate-button { display:none } is what the user sees, and no current assertion can fail if… | src/features/hideTranslateComment/index.css:1-5; src/features/__tests__/__generated__/hideFeatureSelectors.ts:87; src/ut… |
| high | re-applies hide class when navigating back to a watch page in-page | channel_videos -> watch | updateFeatureOnNavigation is the only path that re-enables the feature when the user arrives at watch without a document load; if it regresses the feature silently stops working for the entire browsing session. navigateT… | src/features/_registry/featureOrchestrator.ts:171-190 (updateFeatureOnNavigation); src/features/_registry/featureNavigat… |
| medium | removes hide class when navigating away from watch in-page | watch -> channel_home | areDependenciesMet gates on includePages ['watch'], and on SPA navigation updateFeatureOnNavigation -> updateFeatureEnabledState is what drives onDisable; a stuck body class would hide translate buttons in comment surfac… | src/features/_registry/featureNavigationManager.ts:27-35; src/features/_registry/featureOrchestrator.ts:131-170 and 171-… |
| low | options checkbox toggles hideTranslateComment.enabled | options | The declared setting is the only user-facing way to turn the feature on and has zero coverage; Options.spec.ts covers only render/language/import/export/clear/reset. This is generic to every feature checkbox, so it belon… | src/features/hideTranslateComment/index.metadata.ts:5-13 (settings entry); src/pages/options/Options.spec.ts:1-51; src/c… |

### keywordBlocklist

`src/features/__tests__/keywordBlocklist.spec.ts` — 17 cases, plus 2 in `src/pages/options/Options.spec.ts`, written on 2026-09-06 for the feature `dev` gained that day.

keywordBlocklist redacts rather than hides: a video whose title contains a blocked keyword (case-insensitive, whitespace-collapsed, substring, one keyword per line of the `keywords` setting) gets its title text replaced by the "Blocked keyword" label, its thumbnail and avatar images swapped for a generated placeholder (the srcset removed), its `title` and `aria-label` attributes removed and its container marked `data-yte-keyword-blocked`; a MutationObserver plus a 1.5 s fallback scan keep newly rendered and rewritten cards covered, and a capture-phase mouseover handler puts `yte-hover-blocked` on the body over a masked card so YouTube's hover preview stays off. The feature declares no includePages. The spec reads real cards (search results, watch related lockups, the channel grid, the signed-in home feed), takes the first card's whole title as the keyword and a card without it as the control, and identifies cards across reads by a test-only attribute. The channel videos page is the fixture for the single-page cases because its grid is the same on every load. Markup families the fixtures cannot be relied on to show (channel results, sponsored lockups, shorts lockups, the end-screen video wall) are injected; YouTube's Polymer elements are connected first and filled afterwards, as the hide specs do.

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| masks the title and thumbnail of a video whose title carries a blocked keyword (keyword stored upper-cased with doubled spaces; control card untouched) | search, watch, channel_videos, home | 4 |
| masks a playlist panel entry | watch | 1 |
| leaves the page alone while disabled, whatever the keyword list says (the defect in 3.10) | channel_videos | 1 |
| follows the keyword list while enabled: empty list, one keyword, swapped keyword, two lines, the tail of a title as a substring, blank and whitespace-only lines | channel_videos | 1 |
| restores titles, thumbnails and attributes on disable, masks again on re-enable | channel_videos | 1 |
| follows title rewrites the page makes to a card: a masked card rewritten to a harmless title is released, a clean card rewritten to carry the keyword is masked | channel_videos | 1 |
| masks a card rendered after enabling (injected video-wall still), re-masks a thumbnail whose source arrives late and gives the new source back, leaves the excluded mini-game image alone, drops the srcset, and restores the multi-node title and the background image on disable | channel_videos | 1 |
| masks a channel result's name, tooltip, handle and description but not its subscriber count; the avatar gets the square placeholder | channel_videos | 1 |
| masks a sponsored lockup's headline and thumbnail but not its plain description or its advertiser line | channel_videos | 1 |
| masks a shorts lockup's title and strips the link's title attribute | channel_videos | 1 |
| keeps masking across in-page navigation to home and back | channel_videos | 1 |
| masks again after a full page reload | channel_videos | 1 |
| holds back the hover preview of a masked card: the body class follows the pointer, no inline preview starts | channel_videos | 1 |
| still opens a masked card's video on click | channel_videos | 1 |
| (Options) persists keyword blocklist rows added, edited and removed: the list is disabled with the parent's reason until the toggle is on, every keystroke commits one keyword per line, rows survive a reload | options | 1 |
| (Options) caps the list at the metadata's max of 100 from a storage seed of 120, writes the cap back on the first edit, and holds the add button while a row is blank | options | 1 |

**Not needed**: none. **Incorrect**: none. **Missing**: notification entries (`yt-formatted-string.message`), because that element renders itself from its own data and keeps no injected text, and the in-player end-screen cards of a real video, because the signed-in profile cannot seek to a video's end (see the status file). Two surfaces are feature gaps rather than test gaps and are not asserted either way: playlist page rows (`ytd-playlist-video-renderer`) and the Shorts player page are not among the feature's containers.

### loopButton

`src/features/__tests__/loopButton.spec.ts` — 13 generated cases today, about 12 after the recommendations below.

loopButton.spec.ts generates 13 cases (includePages is ["watch"], so the page loop expands to one page) and spends most of them re-asserting that the button exists. Five are redundant: two fullscreen tests (loopButton.spec.ts:107, :119) are line-for-line duplicates of buttonController.spec.ts:78 and :100, which already drive loopButton's own config keys; "loop button should be enabled" (:21) is a …

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| loop button should be enabled | — | 1 |
| loop button should be disabled | — | 1 |
| loop should be enabled when clicking the loop button | — | 1 |
| loop should be disabled when disabled | — | 1 |
| loop should toggle off when clicking the loop button again | — | 1 |
| loop should persist after navigation | — | 1 |
| loop button should persist after full page reload | — | 1 |
| should not create loop button on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| loop button should be enabled | 21 | remove | 1 | Identical setup and ordering (setOption placement=player_controls_left, then enableFeature) on the same page - the loop over testPages expands to watch only because includePages is ['watch'] - and a strictly weaker asser… |
| loop should be enabled when clicking the loop button | 32 | remove | 1 | Lines 47-53 of the toggle-off test are a line-for-line copy of lines 33-38 including the same toHaveJSProperty('loop', true) assertion before the second click, so this test is a strict prefix. Removing it loses nothing; … |
| should move button from left to right on fullscreen enter/exit | 107 | remove | 1 | Verified line-for-line duplicate: same feature, same loopButton.button.placement/fullscreenPlacement values, same three expectFeatureButtonToBeIn assertions on the same id. The only difference is that buttonController.sp… |
| should not move button when fullscreenPlacement is same | 119 | remove | 1 | Same line-for-line duplication as above (placement right + fullscreenPlacement 'same', three identical assertions), again driven through loopButton's own config keys, so keeping the loopButton copy adds no loopButton-spe… |
| should render button in feature menu | 98 | merge-into: loop should toggle when clicking the feature menu item | 1 | Attachment-only assertion. clickFeatureMenuItem waits for #yte-feature-loopButton-menuitem to be visible before clicking it, so the proposed click test strictly subsumes this one while also covering featureMenuClickListe… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| loop should persist after navigation | 58 | high | After the home->watch round trip the test calls disableFeature + enableFeature + setOption (lines 65-67), which re-runs the button add path, so the final expectFeatureButtonToBeTruthy (line 68) passes even if the navigat… | Delete lines 65-67 and assert expectFeatureButtonToBeTruthy right after returning to watch, matching src/features/__tests__/copyTimestampUrlButton.spec.ts:77-85 and src/features/__tests__/openTranscriptButton.spec.ts:54-… |
| loop should be disabled when disabled | 40 | medium | loopButton.button.enabled defaults to false (buttonField, defineConfig.ts:58), so disableFeature at line 42 is a no-op and the button never existed; line 43 therefore duplicates 'loop button should be disabled' (line 27)… | Make it test what remove() actually does: enable the button (placement left), click it, assert loop === true, then disableFeature('loopButton.button.enabled') and assert expectFeatureButtonToBeFalsy while 'div#movie_play… |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | loop button icon syncs when the loop attribute is changed outside the extension | watch | setupLoopObserver is the largest block of the feature and no spec touches it (grep of src/features/__tests__ + Options.spec.ts shows loopButton is referenced only by loopButton.spec.ts and by the two fullscreen tests in … | src/features/loopButton/index.ts:10-55 (observer), :76 (registered from add()); src/icons.ts:34-51 loopOnSVG = 2 paths, … |
| high | loop should toggle when clicking the feature menu item | watch | feature_menu is the default placement (buttonField placement default 'feature_menu' and loopButton re-declares it), yet loopButton.spec.ts:98 only asserts the item is attached. featureMenuClickListener (toggle of the men… | src/features/loopButton/index.metadata.ts:11 and src/features/_registry/defineConfig.ts:57-62; src/features/loopButton/i… |
| medium | clicking the loop button updates its checked state and tooltip title | watch | Only the video's loop property is asserted today, so a regression in setChecked or in updateFeatureButtonTitle (button.dataset.title + the tooltip element text) would go unnoticed. Adds no new test case, only assertions … | src/features/buttonController/ButtonController.ts:709-711 (setChecked + updateFeatureButtonIcon), :652-659 updateFeature… |
| medium | loop button is not created on a live stream | live | getCurrentPageType returns 'live' for a /watch URL whose player reports isLive, and loopButton declares includePages ['watch'], so areDependenciesMet is false and the button must stay away even though the page has a full… | src/utils/url/index.ts:41-49 (watch + isLive -> 'live'); src/features/loopButton/index.metadata.ts:12; src/features/_reg… |

### maximizePlayerButton

`src/features/__tests__/maximizePlayerButton.spec.ts` — 25 generated cases today, about 21 after the recommendations below.

The spec is button-shaped: it exhaustively re-tests generic buttonController placement/fullscreen mechanics across watch and live while leaving most of the feature's own logic in src/features/maximizePlayerButton/utils.ts untested. Zero coverage for the keyboard exits (Escape / 't'), the player size/pip/miniplayer click exit, the masthead auto-hide sub-feature, the yt-navigate-start exit, body[yte…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| maximize player button should be enabled | watch, live | 2 |
| maximize player button should be disabled | watch, live | 2 |
| player should be maximized | watch, live | 2 |
| player shouldn't be maximized | watch, live | 2 |
| clicking maximize button again should un-maximize player | watch, live | 2 |
| maximize player button should re-appear after disable then re-enable | watch, live | 2 |
| maximize player button should persist after navigation | watch, live | 2 |
| maximize player button should persist after full page reload | — | 1 |
| should not create maximize player button on non-target page | — | 1 |
| feature conflicts › automaticallyMaximizePlayer vs automaticTheaterMode › maximize is active when enabled after theater | watch | 1 |
| feature conflicts › automaticallyMaximizePlayer vs automaticTheaterMode › theater mode is active when enabled after maximize | watch | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |
| automatic maximize state sync › reflects automatic maximization in the button state | watch | 1 |
| automatic maximize state sync › keeps the cued thumbnail overlay above the maximized video | watch | 1 |

**Not needed** (8)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| maximize player button should be disabled on ${pageType} | 27 | remove | 2 | CONFIRMED vacuous. Placement is never set, so it stays at the default "feature_menu" (defineConfig.ts:62, index.metadata.ts:9), and makeFeatureButton throws for feature_menu (ButtonController.ts:874) — addButton routes f… |
| player shouldn't be maximized on ${pageType} | 40 | remove | 2 | CONFIRMED vacuous twice over: the first assertion is the same never-creatable button id as spec:27, and `not.toHaveAttribute("yte-maximized")` cannot fail because nothing in the test maximizes and automaticallyMaximizePl… |
| should render button in ${placement} | 124 | remove | 2 | addButton's left/right placement path is entirely feature-agnostic (ButtonController.ts:259-274) and is already asserted for left, right and below by the screenshot loop. Nothing maximize-specific (toggle icon, on/off la… |
| should move button from left to right on fullscreen enter/exit | 142 | remove | 1 | Body is line-for-line the loopButton test with the feature name swapped; the relocation is driven by tracked-button state in ButtonController with no maximize-specific input. Verified no distinct branch: the test never m… |
| should not move button when fullscreenPlacement is same | 154 | remove | 1 | Same assertions and same getEffectivePlacement path as the loopButton 'same' test; feature-agnostic. |
| should render button in feature menu | 133 | merge-into:clicking the maximize feature menu item toggles the player | 1 | Only asserts the menu item is attached, which addFeatureItemToMenu already gets generically from buttonController.spec.ts:34. The proposed click test asserts attachment plus the untested toggle effect, so merging loses n… |
| clicking maximize button again should un-maximize player on ${pageType} | 46 | reduce-pages:watch | 1 | Verified there is no live-vs-VOD branch anywhere in maximizePlayerButton/index.ts or utils.ts — maximizePlayer/minimizePlayer only branch on theater mode and on isNewYouTubeVideoLayout(). The live iteration repeats ident… |
| maximize player button should re-appear after disable then re-enable on ${pageType} | 56 | reduce-pages:watch | 1 | The enable/disable transition goes through featureButtonManager and removeFeatureButton with no page-dependent code; the live run adds only navigation cost. Live coverage is retained by spec:21, spec:32 and spec:67. |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should not create maximize player button on non-target page | 88 | medium | CONFIRMED cannot fail. Placement is never set, so it stays at the default "feature_menu"; addButton then routes to addFeatureItemToMenu, and makeFeatureButton (the only creator of #yte-feature-maximizePlayerButton-button… | setOption(page, "maximizePlayerButton.button.placement", left) before enableFeature, and additionally assert expectFeatureMenuItemToBeFalsy(page, "yte-feature-maximizePlayerButton-menuitem"). Note the test stays weaker t… |
| maximize is active when enabled after theater on watch | 100 | medium | CONFIRMED. This expect.poll has no timeout option, so it uses Playwright's default expect timeout of 5 s (playwright.config.ts declares no `expect` block). automaticallyMaximizePlayer retries maximization with maxAttempt… | Pass { timeout: 20000 } to the poll so it covers automaticallyMaximizePlayer's overallTimeout. |
| theater mode is active when enabled after maximize on watch | 103 | medium | CONFIRMED, and the mechanism is worse than the auditor described. maximizePlayer itself clicks the size button when not already in theater (utils.ts:196), so [theater] is already set by the maximize step; automaticTheate… | After the theater poll succeeds, assert body no longer has yte-maximized and no longer has yte-size-button-state. This also gives the size-button exit path (handleUserClick, utils.ts:70-74) its first real assertion. |

**Missing** (9; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | clicking the maximize feature menu item toggles the player | watch | feature_menu is the DEFAULT placement (buttonField.placement = "feature_menu", defineConfig.ts:62, re-declared at index.metadata.ts:9) and its click path is completely unexercised: featureMenuClickListener (ButtonControl… | Confirmed uncovered: `grep -rn "clickFeatureMenuItem" src/` matches only its definition at src/utils/_tests/features.ts:… |
| high | Escape and 't' restore the player while maximized | watch | onKeyDown is a user-facing exit path with zero coverage, including its input/textarea/contenteditable guard and its listenersAttached guard. | src/features/maximizePlayerButton/utils.ts:176-182 (handler), :244 (registered in attachRuntimeListeners with capture), … |
| medium | clicking the player size button while maximized restores the player and un-checks the feature button | watch | handleUserClick + attachRuntimeListeners (pip/size/miniplayer) is a whole exit path. Note it IS triggered incidentally at spec:103 (automaticTheaterMode's clickSizeButton fires handleUserClick), so the incorrect-finding … | src/features/maximizePlayerButton/utils.ts:70-74, 234-249 (listeners), 208-220 (minimizePlayer), 22-34 (changeMaximizeBu… |
| medium | SPA navigating away from watch while maximized un-maximizes the player | watch | navigateStartHandler only fires on real yt-navigate-start events; no test ever maximizes and then navigates in-page, so this exit branch and the destroyPlayerController teardown it triggers are unobserved. | src/features/maximizePlayerButton/utils.ts:172-175, registered at :205, teardown at :56-65. spec:67 never maximizes, so … |
| medium | masthead hides while maximized and reappears when the pointer reaches the top | watch | The header auto-hide/reveal sub-feature (mousemove handler with a 300 ms show delay, plus the CSS transform) is an entire user-facing behaviour with no coverage anywhere in the suite. | src/features/maximizePlayerButton/utils.ts:75-82 (hideHeader), 127-136 (showHeader), 137-157 (headerMouseMoveHandler), r… |
| medium | button is added in the checked state when enabled while the player is already maximized | watch | The isPlayerMaximized -> initialChecked branch in the add hook is never hit because every existing test enables the button before anything maximizes. spec:167 covers the opposite order (button first, then automatic maxim… | src/features/maximizePlayerButton/index.ts:17 (isPlayerMaximized), :24 (on/off label branch), :52 (passed as initialChec… |
| medium | maximizing from theater mode does not re-toggle theater on restore | watch | CORRECTED from the original finding: minimizePlayer's automaticTheaterMode config read (utils.ts:212-213) is nested inside `lastState === "default"`, so enabling automaticTheaterMode up front does NOT reach it — it reach… | src/features/maximizePlayerButton/utils.ts:194-200 (inTheaterMode / yte-size-button-state), 209-214 (restore branch). sp… |
| medium | maximize records the size-button state and the layout CSS vars, and clears them on restore | watch | yte-size-button-state and the two CSS custom properties are the state that the entire index.css layout (heights, negative header margin) depends on, and destroyPlayerController's teardown of them is what a leaked-state r… | src/features/maximizePlayerButton/utils.ts:200-202 (set), :57-59 (removed in destroyPlayerController); consumed by src/f… |
| low | video height variable follows viewport resize while maximized | watch | handleResize is registered on maximize and removed on restore; neither the update nor the listener removal is observed. | src/features/maximizePlayerButton/utils.ts:159-161 (handler), :203 (addEventListener), :60 (removeEventListener); index.… |

### miniPlayer

`src/features/__tests__/miniPlayer.spec.ts` — 17 generated cases today, about 18 after the recommendations below.

miniPlayer.spec.ts checks one thing 16 of 17 times: that the invisible 1x1 div #yte-mini-player-sentinel is attached (src/features/__tests__/miniPlayer.spec.ts:20-89). Nothing in the spec ever activates a mini player, so the feature's actual behaviour - auto-activation when the player scrolls out of view while comments are visible, the overlay, the drag/resize/close chrome, the mini seek bar, and …

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should create sentinel element | watch, live | 2 |
| should remove sentinel element when disabled | watch, live | 2 |
| should create sentinel element after navigation | watch, live | 2 |
| should re-create sentinel after disable then re-enable | watch, live | 2 |
| should persist sentinel after full page reload | watch, live | 2 |
| should handle config change for defaultPosition | watch, live | 2 |
| should handle config change for defaultSize | watch, live | 2 |
| should not create sentinel element on non-target page | — | 1 |
| should not leak sentinel when navigating from target to non-target page | — | 1 |
| state persistence › miniPlayer state is stored in extension storage | — | 1 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should handle config change for defaultPosition on ${pageType} | 56 | remove | 2 | Confirmed vacuous. onConfigChange only calls setCommentsMiniPlayerDefaults -> setDefaults, which returns at controller.ts:58 because isActiveState is false (nothing in this spec ever activates the mini player), and notif… |
| should handle config change for defaultSize on ${pageType} | 63 | remove | 2 | Identical vacuous pattern: setDefaults is a no-op while inactive and the trailing assertion is the unchanged sentinel. Replace with the resize test. |
| should remove sentinel element when disabled on ${pageType} | 22 | merge-into:should re-create sentinel after disable then re-enable on ${pageType} | 2 | Confirmed strict subset: lines 39-47 perform enable -> attached -> disable -> not attached -> enable -> attached, which contains every assertion of lines 22-28 in the same order and on the same page. No distinct lifecycl… |
| should persist sentinel after full page reload on ${pageType} | 48 | reduce-pages:watch | 1 | Confirmed page-dependent harness behaviour: on watch, navigateToPageType after page.reload() skips the goto (navigation.ts:216-217 compares normalized URLs) so the assertion really follows the reload. On live, navigateTo… |
| should re-create sentinel after disable then re-enable on ${pageType} | 39 | reduce-pages:watch | 1 | onEnable/onDisable have no live-vs-watch branch: the sentinel is inserted before any page-dependent lookup (comments) at index.ts:75-77, and onDisable is pure teardown. Live stays covered by the create-sentinel smoke tes… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should handle config change for defaultPosition on ${pageType} | 56 | high | The title promises config-change handling but the body only re-asserts #yte-mini-player-sentinel, which was already asserted at line 59 before setOption. MiniPlayerController.setDefaults returns at controller.ts:58 while… | Activate the mini player first (miniPlayerButton click, or scroll the comments into view), then assert the inline style.transform of #yte-mini-player-overlay is translate(16px, 16px) after setting defaultPosition to top_… |
| should handle config change for defaultSize on ${pageType} | 63 | high | Same mismatch: the post-setOption assertion is the unchanged sentinel, and setDefaults (via setCommentsMiniPlayerDefaults forceApply) is a no-op while isActiveState is false, so any defaultSize regression passes. | Activate the mini player, then assert the inline width/height of #yte-mini-player-overlay are 480px/270px after setting defaultSize to 480x270. |
| should create sentinel element after navigation on ${pageType} | 29 | medium | Lines 35-36 disable then re-enable the feature immediately before the assertion, so onEnable re-creates the sentinel and a completely broken onNavigate still passes. On watch the test is additionally not a navigation tes… | Drop lines 35-36 so the assertion depends on the navigation itself, and for watch perform a real in-page navigation (click a related-video link, await page.waitForURL) instead of the two page.goto hops. |
| should not leak sentinel when navigating from target to non-target page | 77 | medium | The title promises leak detection across a navigation, but navigateToPageType(nonTargetPage) is a page.goto that destroys the document, so the sentinel's absence proves nothing about onDisable or about cleanup on navigat… | Either retitle it to what it checks ("should not create sentinel when the feature is already enabled and the page is a non-target page") or make it a real SPA navigation (click the channel link on the watch page, await p… |
| miniPlayer state is stored in extension storage | 86 | low | The assertions are type-only: expect(typeof manualOverride).toBe("boolean") passes for either value, so it cannot detect that onEnable calls setManualOverride(false) (index.ts:182) or that manual activation flips it to t… | Assert miniPlayerState.manualOverride === false right after enable, then activate the mini player and assert it becomes true and that rect is an object with finite x/y/width/height. |

**Missing** (12; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should activate the mini player when the comments are scrolled into view | watch | setAutoActive via the IntersectionObserver is the entire point of miniPlayer.enabled and nothing observes it. miniPlayerButton.spec.ts:34-41 only reaches enable() through toggleManual (a different entry point) and never … | src/features/miniPlayer/index.ts:80-97 (evaluateVisibility -> setAutoActive); src/features/miniPlayer/controller.ts:48-5… |
| high | should reposition the active mini player when defaultPosition changes | watch | defaultPosition has six branches and zero observed effect; the existing test at line 56 cannot observe it because setDefaults returns early while inactive. onConfigChange -> setCommentsMiniPlayerDefaults passes forceAppl… | src/features/miniPlayer/index.ts:168-170, 69-72; src/features/miniPlayer/controller.ts:53-64 (early return at :58), 78-1… |
| high | should resize the active mini player when defaultSize changes | watch | defaultSize is a user-facing config field with no observed effect anywhere; both values are legal presets (miniPlayerSizes) and survive setRect's 16px/9px snapping unchanged, so the assertion is exact. | src/features/miniPlayer/types.ts:3; src/features/miniPlayer/controller.ts:61-63, 78-84, 381-405; src/features/miniPlayer… |
| medium | should restore the player into the page when the mini player deactivates automatically | watch | restorePlayer is only reachable today through the manual toggle in miniPlayerButton.spec.ts:42-51, which asserts nothing beyond the html class - a broken restore that leaves the page without a player would still pass. Th… | src/features/miniPlayer/index.ts:84-91; src/features/miniPlayer/controller.ts:220-226, 349-380; src/features/__tests__/m… |
| medium | should restore the player when the feature is disabled while the mini player is active | watch | ADDED. Every existing disable test (lines 22-28, 39-47) disables while the mini player is inactive, so onDisable's destroy() path - eventManager teardown, disable()/restorePlayer, overlay removal - is never executed. A r… | src/features/miniPlayer/index.ts:171-180; src/features/miniPlayer/controller.ts:38-44, 220-226, 349-380; src/features/__… |
| medium | should not auto-activate or auto-deactivate while the manual override is set | watch | readManualOverride() short-circuits setAutoActive on the very first line - an explicit branch with no coverage in either spec, and the observable consequence (a manually opened mini player must survive scrolling) is user… | src/features/miniPlayer/controller.ts:48-52, 69-77, 414-420; src/features/miniPlayer/index.ts:182. |
| medium | should keep a manually opened mini player active across an in-page navigation | watch | onNavigate's wasManualActive restore branch (destroy controller, re-create, toggleManual) is never executed: on watch every navigateToPageType is a page.goto, and no spec in src/features/__tests__ performs an SPA navigat… | src/features/miniPlayer/index.ts:185-206; src/features/_registry/featureOrchestrator.ts:169-186 (navigateFeature only ru… |
| medium | should close the mini player when the close button is clicked | watch | close() is a distinct code path from toggleManual (it force-clears manualOverride) and the close button is user-facing chrome that no test ever clicks. | src/features/miniPlayer/controller.ts:34-37, 271-284; src/features/miniPlayer/index.css:10-24 (controls opacity 0 until … |
| medium | should persist the mini player rect after dragging | watch | state.rect is a persisted surface written on every setRect and read back on activation; the existing state test declares rect in its type and never asserts it. | src/features/miniPlayer/controller.ts:132-168, 381-405, 425-441; src/features/__tests__/miniPlayer.spec.ts:91-94. |
| medium | should render the mini seek bar while the mini player is active and remove it on deactivate | watch | attachMiniSeekBar/destroy has zero coverage; its disposers also un-hide YouTube's native progress bar, so a destroy regression permanently breaks the normal player UI. Reframed from the auditor's live-only version: compu… | src/features/miniPlayer/controller.ts:345-346, 374-375; src/features/miniPlayer/seekBar/index.ts:190-200, 225-232, 237-2… |
| low | should keep 16:9 and clamp to the minimum width when the mini player is resized | watch | The clamp plus aspect-ratio maths in setRect is pure logic with an exactly predictable DOM output (clamp(240) -> 240x135) and no coverage. | src/features/miniPlayer/controller.ts:193-209, 384-400. |
| low | should hide the mini player overlay while timestamp peek borrows the video | watch | suspendMiniPlayerOverlay is the only declared cross-feature conflict for miniPlayer and neither miniPlayer.spec.ts nor timestampPeek.spec.ts exercises it (timestampPeek.spec.ts has 16 tests, none enabling miniPlayer). | src/features/miniPlayer/index.ts:151-155; src/features/timestampPeek/utils.ts:315; src/features/__tests__/timestampPeek.… |

### miniPlayerButton

`src/features/__tests__/miniPlayerButton.spec.ts` — 19 generated cases today, about 16 after the recommendations below.

The spec exercises presence/absence, click-to-toggle and placement plumbing well, but it never observes the only logic miniPlayerButton actually owns: syncMiniPlayerButtonUI (aria-checked, data-title, on/off icon) and the initialChecked seed from isMiniPlayerActive(). Both feature defaults (placement below_player, fullscreenPlacement player_controls_right) are overwritten by every test, and the fe…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| mini player button should be present | watch, live | 2 |
| mini player button should not be present when disabled | watch, live | 2 |
| clicking mini player button should activate mini player | watch, live | 2 |
| clicking mini player button again should deactivate mini player | watch, live | 2 |
| mini player button should persist after navigation | watch, live | 2 |
| mini player button should re-appear after disable then re-enable | watch, live | 2 |
| mini player button should persist after full page reload | — | 1 |
| should not create mini player button on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| mini player button should not be present when disabled on ${pageType} | 29 | merge-into:mini player button should re-appear after disable then re-enable on ${pageType} | 2 | Confirmed: miniPlayerButton.button.enabled inherits the buttonField default false (defineConfig.ts:58-59; the metadata only overrides placement/fullscreenPlacement, index.metadata.ts:9-14), so on a fresh context disableF… |
| clicking mini player button should activate mini player on ${pageType} | 34 | merge-into:clicking mini player button again should deactivate mini player on ${pageType} | 2 | Verified line-by-line: spec lines 43-48 of the deactivate test are byte-identical to lines 35-40 of this test (same navigate, enable, placement right, truthy assert, clickFeatureButton, yte-mini-player-active assert) bef… |
| should not move button when fullscreenPlacement is same | 125 | remove | 1 | Confirmed generic: handleFullscreenChange decides purely from the tracked placement/fullscreenPlacement record and rebuilds via makeFeatureButton, with no per-feature code (ButtonController.ts:815-853). buttonController.… |
| should move button from left to right on fullscreen enter/exit | 113 | remove | 1 | Same left -> right -> left assertions as buttonController.spec.ts:78-88 (loopButton) and maximizePlayerButton.spec.ts:142-152, using placements this feature does not default to; the move itself is feature-agnostic (Butto… |
| should render button in ${placement} | 95 | simplify | 1 | Keep only the left iteration. clickFeatureButton calls expectFeatureButtonToBeIn(page, id, right) as its first step (features.ts:11-17), so player_controls_right attachment is still asserted by the surviving deactivate t… |
| mini player button should persist after navigation on ${pageType} | 52 | reduce-pages:watch | 1 | Applies after the incorrect-finding fix. Neither the button feature nor the button manager branches on live vs VOD (no live/isLive reference in src/features/miniPlayerButton/ or src/features/miniPlayer/), so the live run… |
| mini player button should re-appear after disable then re-enable on ${pageType} | 64 | reduce-pages:watch | 1 | The enable/disable lifecycle runs through featureButtonManager.handleButtonPlacement with no page-specific code, and presence on live stays covered by the per-page presence test (line 23). Live retains meaningful coverag… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| mini player button should persist after navigation on ${pageType} | 52 | high | Confirmed: after navigating home and back the test calls disableFeature, enableFeature and setOption placement (lines 59-61) before asserting at line 62. That force-recreates the button through the enable path, so a butt… | Delete lines 59-61 and assert expectFeatureButtonToBeTruthy right after navigating back to ${pageType} (config, including placement, persists across the navigation, so no re-set is needed). If that then fails, it is expo… |
| mini player button should not be present when disabled on ${pageType} | 29 | medium | The title promises the disabled state, but miniPlayerButton.button.enabled defaults to false (buttonField, defineConfig.ts:58-59; the feature metadata overrides only placement and fullscreenPlacement, index.metadata.ts:9… | Enable the button, assert it is attached, then disable and assert it is gone. That is exactly the first half of the line 64 test, so merge the two rather than keeping both. |

**Missing** (7; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | mini player button title (data-title) follows the toggle state | watch | syncMiniPlayerButtonUI is the only logic this feature owns beyond wiring and nothing in the spec reads data-title. Verified caveat that the auditor missed: aria-checked after a direct click is set by the generic buttonCl… | src/features/miniPlayerButton/index.ts:17-36, 37-40, 58-61; src/features/buttonController/ButtonController.ts:652-659, 7… |
| high | clicking the mini player feature menu item toggles the mini player | watch | The feature_menu placement has its own label and its own aria-sync branch, and the only menu test (spec line 104) asserts attachment. Confirmed by grep: clickFeatureMenuItem (src/utils/_tests/features.ts:28-38) is used b… | src/features/miniPlayerButton/index.ts:32-35, 52-56; src/features/buttonController/ButtonController.ts:437-439, 743-748;… |
| high | closing the overlay with its close button unchecks the mini player button | watch | Raised from medium: this looks like a live bug, not just a coverage gap. controller.close() (controller.ts:34-37, invoked by the overlay close button at controller.ts:280-283) removes the html class without ever calling … | src/features/miniPlayer/controller.ts:34-37, 220-226, 271-284; src/features/miniPlayer/index.ts:29-33, 80-97, 135-144, 1… |
| medium | mini player button uses its own default placement and fullscreen placement | watch | Confirmed real: this feature overrides the shared buttonField defaults (feature_menu / same) with below_player / player_controls_right, and every test in the spec calls setOption for placement, so a bad default ships unt… | src/features/miniPlayerButton/index.metadata.ts:12-13 vs src/features/_registry/defineConfig.ts:58-62; src/features/__te… |
| medium | button stays checked when placement changes while the mini player is active | watch | Verified reachable: a placement change makes featureButtonManager call btn.remove(prevPlacement) then btn.add(config) (featureButtonManager.ts:100-124), and add() re-seeds initialChecked/label from isMiniPlayerActive(). … | src/features/miniPlayerButton/index.ts:46-48, 52-56, 63; src/features/_registry/featureButtonManager.ts:96-132; src/feat… |
| medium | mini player button is removed when navigating from a target page to a non-target page | watch then channel_home | Only the cold non-target load is tested (spec line 87), so a button leaked on target -> non-target navigation would pass today. Confirmed the sibling feature has exactly this parity test for its sentinel, and resolveNonT… | src/features/__tests__/miniPlayer.spec.ts:77-83; src/features/__tests__/miniPlayerButton.spec.ts:87-91; src/utils/_tests… |
| low | auto-activated mini player checks the button | watch | Confirmed the yte-mini-player-state document listener exists only for externally driven state and nothing in the suite drives it: miniPlayer.spec.ts never asserts yte-mini-player-active at all (grep over src/features/__t… | src/features/miniPlayer/index.ts:73-98, 157-164; src/features/miniPlayerButton/index.ts:37-40, 66; src/features/__tests_… |

### monoToStereo

`src/features/__tests__/monoToStereo.spec.ts` — 19 generated cases today, about 13 after the recommendations below.

The spec is button-mechanics-heavy and feature-behaviour-light. Of 19 generated cases (12 static calls x the 2 includePages), 5 duplicate buttonController.spec.ts placement/fullscreen/menu mechanics verbatim, 4 are vacuous or near-vacuous (spec:34 and spec:36-40 cannot fail; spec:49-56 passes when both clicks are no-ops), and the live loop repeats page-agnostic behaviour at ~120 s per navigation e…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| button should be enabled | watch, live | 2 |
| button should be disabled | watch, live | 2 |
| audio should switch to stereo on click | watch, live | 2 |
| audio should toggle back to mono on second click | watch, live | 2 |
| button should persist after navigation | watch, live | 2 |
| button should re-appear after disable then re-enable | watch, live | 2 |
| button should persist after full page reload | — | 1 |
| should not create mono to stereo button on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (9)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| button should be enabled on ${pageType} | 29 | merge-into:audio should switch to stereo on click on ${pageType} | 2 | The click test performs the identical setup (same fixture requirement, enableFeature, placement right) and already asserts the button is attached at spec:45 before clicking. The only extra assertion here, expect.poll(isM… |
| button should be disabled on ${pageType} | 36 | remove | 2 | buttonField defaults enabled to false (src/features/_registry/defineConfig.ts:59), so the test disables an already-disabled button and asserts a button that was never created is absent - it cannot fail. The real enable-t… |
| audio should toggle back to mono on second click on ${pageType} | 49 | reduce-pages:["watch"] | 1 | Neither index.ts nor utils.ts has a live/VOD branch, and getAudioEngine resolves the media element with document.querySelector("video") (src/utils/audioEngine.ts:25), so the live run repeats identical behaviour while pay… |
| button should persist after navigation on ${pageType} | 57 | merge-into:button should persist after full page reload | 2 | Every hop is a full document load - navigateToYoutubePage calls page.goto whenever the URL differs (navigation.ts:143-146) - so watch -> home -> watch exercises exactly the startup path the reload test already covers, pl… |
| button should re-appear after disable then re-enable on ${pageType} | 66 | reduce-pages:["watch"] | 1 | The disable/re-enable path is page-agnostic (src/features/_registry/featureButtonManager.ts:100-124); the live copy adds a second live-stream hunt for no new branch. Live page wiring is still proven by the click test tha… |
| should render button in ${placement} | 97 | remove | 2 | Placement is pure ButtonController logic already covered for left, right and below_player by buttonController.spec.ts:138. The feature contributes no placement branch other than feature_menu, and getFeatureIcon collapses… |
| should render button in feature menu | 106 | merge-into:feature menu item toggles mono to stereo on watch | 1 | It asserts only that the menu item is attached, which buttonController.spec.ts:34 already proves generically. Replacing it with the proposed menu-toggle test keeps attachment coverage and adds the only untested click pat… |
| should move button from left to right on fullscreen enter/exit | 115 | remove | 1 | Line-for-line the same scenario as the generic loop-button test with a different id; fullscreen relocation lives entirely in ButtonController.handleFullscreenChange and monoToStereo only forwards fullscreenPlacement (ind… |
| should not move button when fullscreenPlacement is same | 127 | remove | 1 | Copy of the generic "same" fullscreen test with a different button id; the feature adds no fullscreen behaviour of its own. |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| audio should toggle back to mono on second click on ${pageType} | 49 | high | Nothing asserts that the first click turned conversion on, so the final toBeFalsy poll is satisfied by two no-op clicks. This is not hypothetical: getAudioEngine destructures `const { engine } = window` at the top and re… | Insert `await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();` between the two clickFeatureButton calls (spec:53-54), and ideally also assert aria-checked flips, so the test fails when the enable half is… |
| button should be disabled on ${pageType} | 36 | high | monoToStereoButton.button.enabled defaults to false (src/features/_registry/defineConfig.ts:59), so the test disables a feature that is already off and then asserts a button that was never created is not attached. The as… | Enable the button and assert it is attached before calling disableFeature, or delete the test - spec:70-72 already makes exactly that enabled-then-disabled assertion. |
| button should be enabled on ${pageType} | 34 | low | `await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy()` evaluates `!!window.engine?.monoEnabled`, which is false when no AudioEngine exists (the default state, since only volumeBoost otherwise constructs o… | Delete the poll together with the test when merging it into the click test, or replace it with the observable initial UI state: `await expect(page.locator("#yte-feature-monoToStereoButton-button")).toHaveAttribute("aria-… |
| button should be enabled on ${pageType} | 30 | low | The ["monoAudio"] requirement is silently ignored on the live page: navigateToPageType routes live through navigateToLiveVideo, whose videoMeetsCapabilities only implements the "captions" case and returns true for everyt… | Drop the requirement on live (it is irrelevant anyway - createChannelSplitter(1) reads channel 0 whatever the source is, utils.ts:37,46-48) or add a monoAudio case to videoMeetsCapabilities so the requirement means somet… |

**Missing** (5; 4 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | button title and aria-checked follow the toggle on watch | watch | The on/off label swap is the only bespoke UI code the feature owns and nothing in the suite asserts it; it is also the only observable proof that the listener's isMonoStereoEnabled() branch ran, so a silently no-op enabl… | src/features/monoToStereo/index.ts:19,25-28 (label chosen from toggle.on/off via isMonoStereoEnabled); src/features/butt… |
| high | feature menu item toggles mono to stereo on watch | watch | featureMenuClickListener is a second, independent toggle path with its own checked-state bookkeeping, and no spec in the repository ever clicks a feature menu item - clickFeatureMenuItem has zero call sites. The existing… | src/features/buttonController/ButtonController.ts:743-748 (featureMenuClickListener), :330-335 and :960-963 (setMenuItem… |
| high | re-enabling the button after disabling it while conversion is active restores the on state | watch | remove() deliberately never calls disableMonoToStereo, so audio stays converted with no UI; every re-add reads initialChecked = isMonoStereoEnabled(), and that true branch is never executed by any test because every test… | src/features/monoToStereo/index.ts:19,31,36-39; src/features/monoToStereo/utils.ts:11-13 (disable is only reachable from… |
| high | toggle state and title survive fullscreen relocation on watch | watch | handleFullscreenChange rebuilds the button from the tracked info.initialChecked/info.label captured at add() time, and buttonClickListener never updates that record, so a checked toggle button is recreated unchecked with… | src/features/buttonController/ButtonController.ts:815-852 (handleFullscreenChange -> makeFeatureButton with info.label, … |
| low | click routes audio through the channel merger on watch | watch | Only the monoEnabled boolean is read today; the merger/splitter graph is the actual feature and is separately inspectable through window.engine, which the spec already uses. Low rather than medium because the added asser… | src/features/monoToStereo/utils.ts:42-53 (input -> splitter -> gainL/gainR -> merger -> volumeGain, engine.input = merge… |

### onScreenDisplay

`src/features/__tests__/onScreenDisplay.spec.ts` — 3 generated cases today, about 8 after the recommendations below.

The spec is small and mostly sound: it genuinely covers the live-broadcast path for two of six OSD fields (position at spec:43-51, hideTime at spec:52-63) and incidentally guards the fresh-canvas rule from src/ui/OnScreenDisplayManager/index.ts:88-90. But four config fields are untested: type, color and opacity have zero coverage, and padding is only ever 0 (spec:28). type is the worst gap — "no_d…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| shows the display when the volume changes | watch | 1 |
| applies a position change without reloading | watch | 1 |
| applies a hide time change without reloading | watch | 1 |

**Not needed** (1)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| shows the display when the volume changes on watch | 38 | remove | 1 | Its entire body (setupVolumeControl, one wheel notch, expect(OSD).toBeAttached({timeout:5000})) is reproduced verbatim as spec:44-46 inside "applies a position change without reloading on watch" and again as spec:53-56 i… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| applies a hide time change without reloading on watch | 57 | medium | After shortening hideTime to 1000 (spec:54), removal is checked with not.toBeAttached({timeout:5000}). The poll window opens when line 56 resolves, which is within roughly 0-100 ms of the canvas being appended, so a regr… | Drop the not-attached timeout well below the setup value (e.g. not.toBeAttached({timeout:2500}) for the 1000 ms phase), or better, instrument the lifetime in-page: record Date.now() when a MutationObserver on the player … |
| applies a position change without reloading on watch | 47 | low | The top_left check is toMatchObject({ left: "0px", right: "" }), which does not pin the vertical axis. With padding 0 the bottom_left branch produces left "0px" and right "" as well (style/index.ts:10-11), so swapping to… | Assert the full shape returned by readDisplayPosition: { bottom: "", left: "0px", right: "", top: "0px" }. Correspondingly extend the bottom_right assertion at spec:50 to require a non-empty bottom matching the measured … |

**Missing** (6; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | applies the display type without reloading on watch | watch | setupVolumeControl pins the type to "text" (spec:26) and no test ever changes it, so all four arms of the switch at index.ts:112 plus the onScreenDisplay.type broadcast leaf (content/index.ts:273) could be broken with ev… | src/ui/OnScreenDisplayManager/index.ts:112 (switch), :116-119 circle 95x95, :141-143 line 30 high, :157 no_display no-op… |
| high | applies the display color and opacity on watch | watch | Two user-facing config fields with zero coverage; displayColor feeds fillStyle/strokeStyle (index.ts:130, 145, 187) and displayOpacity feeds globalAlpha (index.ts:144, 186), and their broadcast leaves (content/index.ts:2… | src/ui/OnScreenDisplayManager/index.ts:186-187 (globalAlpha + fillStyle in the text branch). |
| high | offsets the display by the configured padding on watch | watch | Padding is pinned to 0 for the whole spec (spec:28), so the only padding assertion (left "0px", spec:47) still passes if the displayPadding term were dropped from calculateCanvasPosition entirely. The clamp branch is rea… | src/utils/style/index.ts:11-23 (padding term on every branch); src/ui/OnScreenDisplayManager/index.ts:236-239 (clamp). |
| medium | positions the display in the center and above the player chrome on watch | watch | Only top_left (spec:47) and bottom_right (spec:50) are exercised. "center" is the shipped default (defaults.ts:8) and the only branch that emits a transform, and the paddingBottom term computed from .ytp-chrome-bottom (i… | src/utils/config/defaults.ts:8 (position: "center"); src/utils/style/index.ts:16-17 (transform branch); src/ui/OnScreenD… |
| medium (written 2026-09-04; rewritten 2026-09-06 as "offsets a top display below the shorts player's control bar" and "keeps a bottom display clear of the title block when it lies over the video", against the current shorts layout, after the original skipped on a dead selector) | offsets the display below the shorts player controls on shorts | shorts | The isShortsPage branches at index.ts:249-252 (paddingTop) and index.ts:266 (horizontallyOverlaps paddingBottom) have zero coverage, yet the OSD renders there in production: scrollWheelVolumeControl declares includePages… | src/ui/OnScreenDisplayManager/index.ts:249-252 and :266. |
| medium | keeps the newest display when a previous display's hide timer fires | watch | index.ts:87-90 documents the fresh-element rule specifically so the previous display's removal timer cannot cut the new display short (scheduleRemoval closes over this.canvas, index.ts:214-217, and updateExistingCanvas r… | src/ui/OnScreenDisplayManager/index.ts:88-90 (comment), :214-217 (scheduleRemoval), :275-277 (updateExistingCanvas). |

### openTranscriptButton

`src/features/__tests__/openTranscriptButton.spec.ts` — 13 generated cases today, about 8 after the recommendations below.

The spec is broadly sound but weighted toward generic button plumbing. Of 13 generated cases, 7 duplicate buttonController.spec.ts (placement, fullscreen) or assert states that cannot regress (disabled-at-default, non-target page, default panel visibility). Two tests are defective: "transcript should not be shown when disabled" (spec:46) uses a stale engagement-panel target-id inconsistent with sp…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| open transcript button should be enabled | — | 1 |
| open transcript button should be disabled | — | 1 |
| transcript should be shown when clicking the transcript button | — | 1 |
| transcript should not be shown when disabled | — | 1 |
| transcript button should persist after navigation | — | 1 |
| transcript button should re-appear after disable then re-enable | — | 1 |
| transcript button should persist after full page reload | — | 1 |
| should not create transcript button on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should render button in ${placement} | 94 | merge-into: open transcript button should be enabled | 2 | Placement wiring is entirely generic and already asserted for left/right/below_player in buttonController.spec.ts:137-144 with screenshotButton; openTranscriptButton contributes no placement branch (index.ts just forward… |
| should move button from left to right on fullscreen enter/exit | 112 | remove | 1 | Fullscreen relocation is handled entirely by shared code that never calls back into the feature: handleFullscreenChange (ButtonController.ts:815-853) rebuilds the button from trackedButtons, and getEffectivePlacement (Bu… |
| should not move button when fullscreenPlacement is same | 124 | remove | 1 | Identical in structure to the loopButton version in the shared spec; the "same" path is one comparison in shared code (ButtonController.ts:433-435, featureButtonManager.ts:98) and openTranscriptButton adds no fullscreen … |
| transcript should not be shown when disabled | 46 | remove | 1 | Nothing is ever clicked, and no code path in the extension opens the transcript panel by itself, so the assertion only observes YouTube's own default panel state - it holds with the extension present or absent and cannot… |
| should not create transcript button on non-target page | 86 | remove | 1 | nonTargetPage resolves to channel_home (utils.ts:3-5 over pageTypes at types.ts:282-294), which has no ytd-video-description-transcript-section-renderer, so shouldRender (index.ts:43-46) is false there and add() would ea… |
| open transcript button should be disabled | 28 | merge-into: transcript button should re-appear after disable then re-enable | 1 | openTranscriptButton.button.enabled defaults to false (defineConfig.ts:59) and every test gets a brand-new persistent profile (playwright.config.ts:29-33 mkdtemp per context, removed in the fixture teardown), so disableF… |

**Incorrect** (1)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| transcript should not be shown when disabled | 46 | medium | Line 49 queries target-id=engagement-panel-searchable-transcript while line 40 - the assertion that actually has to match a real panel - queries target-id=PAmodern_transcript_view. Git history shows the migration commit … | Delete the test (spec:28/spec:63 already cover the disabled state). If it is kept for any reason, change line 49 to target-id=PAmodern_transcript_view so both assertions use the same panel id, and make it click the butto… |

**Missing** (3; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | transcript should open when clicking the feature menu item | watch | feature_menu is the default placement (defineConfig.ts:59-62), and menu items dispatch through a different code path than player-control buttons: featureMenuClickListener (ButtonController.ts:743) registered via eventMan… | spec:103-108 asserts existence only; index.ts:27-36 (listener passed to addFeatureButton); features.ts:28-38 (clickFeatu… |
| high | transcript button is re-added after in-page (SPA) navigation back to watch | watch -> home -> back to watch (history/popstate) | navigateToPageType only navigates when the URL differs and then does a full page.goto (navigation.ts:215-226), so every navigation in the suite is a document load; grep for goBack/popstate/pushState/yt-navigate across sr… | navigation.ts:215-226; featureOrchestrator.ts:172-188; featureNavigationManager.ts:258-265 (popstate / yt-navigate-start… |
| medium | no transcript button on a video without a transcript | watch (needs a new no-transcript entry in pageFixtures.watch, navigation.ts:97-122, and a capability flag in fixtureCapabilities, navigation.ts:9-20) | shouldRender is the only feature-specific logic in openTranscriptButton and only its positive branch is exercised; every test in the spec uses the default watch fixture (navigation.ts:99-100), which has a transcript. Dow… | index.ts:43-46 (shouldRender); index.ts:20-25 (add() re-check and stale menu-item removal); featureButtonManager.ts:44-5… |

### openYouTubeSettingsOnHover

`src/features/__tests__/openYouTubeSettingsOnHover.spec.ts` — 16 generated cases today, about 11 after the recommendations below.

The spec covers the happy path well (enable live, hover opens, leave closes, disable/re-enable, full reload) but three of its eight tests do not assert what their titles claim. The stay-open test (spec.ts:60-73) can never fail: onMouseLeave ignores relatedTarget, the menu never receives mouseenter, and toBeVisible resolves before the 50 ms hideSettings timer. The close-on-menu-leave test (spec.ts:…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| youtube settings should open on hover when enabled | watch, live | 2 |
| youtube settings should not open on hover when disabled | watch, live | 2 |
| youtube settings should close when leaving the settings button | watch, live | 2 |
| youtube settings should stay open when moving from button to settings menu | watch, live | 2 |
| youtube settings should close when leaving the settings menu | watch, live | 2 |
| youtube settings should open on hover after navigation | watch, live | 2 |
| re-applies after disable then re-enable | watch, live | 2 |
| persists after full page reload | watch, live | 2 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| youtube settings should stay open when moving from button to settings menu on ${pageType} | 60 | merge-into:youtube settings should close when leaving the settings menu on ${pageType} | 2 | Lines 61-71 are byte-for-byte the prefix of spec.ts:75-85, and its only extra assertion (line 72) is decided by a race with the 50 ms hideSettings timer rather than by the stay-open handler (see incorrect finding). Remov… |
| youtube settings should not open on hover when disabled on ${pageType} | 35 | reduce-pages:watch | 1 | index.ts has no live-vs-VOD branch: isLivePage() only matches /live/ URLs (url/index.ts:83-86) and the live fixture is opened as /watch?v=..., so isWatchPage() is true and the identical #player-container lookup runs. The… |
| youtube settings should close when leaving the settings button on ${pageType} | 43 | reduce-pages:watch | 1 | Pure mouse-event bookkeeping in index.ts:47-60 with no page-specific code path; the live iteration exercises the same closures for a 120 s navigation. |
| youtube settings should close when leaving the settings menu on ${pageType} | 74 | reduce-pages:watch | 1 | Same handlers on both pages (no live branch in index.ts); only the initial open-on-hover is worth proving on live to cover the includePages "live" gating. |
| youtube settings should open on hover after navigation on ${pageType} | 95 | reduce-pages:watch | 1 | On live the round trip re-runs navigateToLiveVideo, which walks the channel page and can land on a different stream, so it is not a navigate-away-and-back scenario; it is also two live searches inside one test whose budg… |
| re-applies after disable then re-enable on ${pageType} | 110 | reduce-pages:watch | 1 | Enable/disable is page-agnostic config plumbing through featureOrchestrator.updateFeatureEnabledState; the live iteration adds a second expensive live navigation for identical assertions. |
| persists after full page reload on ${pageType} | 123 | reduce-pages:watch | 1 | On live the post-reload navigateToPageType goes back to the channel and picks a fresh live video, so it is no longer the reloaded page. Also simplify on watch: the pre-reload hover check at 127-129 duplicates the open-on… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| youtube settings should stay open when moving from button to settings menu on ${pageType} | 72 | high | The test never exercises the behaviour in its title and passes only by winning a race. onMouseLeave ignores relatedTarget (index.ts:56-60), so the mouseleave at line 69 sets isHoveringButtonOrMenu = false and schedules h… | Dispatch the button mouseleave and the menu mouseenter inside a single page.evaluate so both land within the 50 ms window, then assert the menu is still visible and .ytp-settings-button keeps aria-expanded="true" after ~… |
| youtube settings should open on hover after navigation on ${pageType} | 104 | medium | The title promises the navigation path, but lines 104-105 disable and re-enable the feature after navigating, tearing down and re-adding the listeners, so the final assertion is produced by onEnable and the test duplicat… | Do not just delete lines 104-105 (that turns the test into a copy of "persists after full page reload"). Replace the goto round trip with an in-document SPA navigation - click a video anchor / trigger history.pushState s… |
| youtube settings should close when leaving the settings menu on ${pageType} | 93 | medium | The final not-visible expectation is already satisfied before the menu mouseleave is dispatched: onMouseLeave ignores relatedTarget, so the button mouseleave at line 83 sets isHoveringButtonOrMenu = false and hideSetting… | After the button mouseleave, dispatch mouseenter on the menu in the same page.evaluate and assert the menu is still visible (aria-expanded still true), then move the mouse away and dispatch the menu mouseleave and assert… |
| youtube settings should close when leaving the settings button on ${pageType} | 51 | low | page.waitForTimeout(500) at lines 51, 68, 82 and 86 stands in for a directly observable condition; at line 51 the preceding toBeVisible has already proved the menu is open, so the sleep is pure cost repeated across 8 tes… | Replace the 500 ms settles with await expect(page.locator(".ytp-settings-button")).toHaveAttribute("aria-expanded", "true") - the attribute the feature itself reads at index.ts:34 - and keep only the short 100 ms settle … |

**Missing** (5; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | youtube settings should stop opening on hover after the feature is disabled on watch | watch | onDisable is the only path that removes the hover listeners and nothing observes it. spec.ts:35-42 starts from the default-off state (config enabled defaults to false at index.metadata.ts:7), so test_setConfigValue write… | src/features/openYouTubeSettingsOnHover/index.ts:13 (onDisable -> eventManager.removeEventListeners("openYouTubeSettings… |
| medium | youtube settings should open on hover after an in-document SPA navigation on watch | watch | onNavigate -> setupHoverListeners has zero coverage: every navigateToPageType call is a full page.goto (navigation.ts:136), so the document is torn down and only onEnable ever runs. On a real SPA navigation featureOrches… | src/features/openYouTubeSettingsOnHover/index.ts:14-19; src/features/_registry/featureOrchestrator.ts:172-190; src/event… |
| medium | hovering should not close a settings menu that was opened by clicking the button on watch | watch | showSettings returns early when the menu is already open (index.ts:37-40); without this test a regression that always clicks would close a user-opened menu on hover. Use an evaluate-click, not page.click: a real click mo… | src/features/openYouTubeSettingsOnHover/index.ts:34,37-40,52-55; no test in src/features/__tests__ opens the menu by cli… |
| medium | settings menu should stay open while the pointer is over the menu, then close on leaving it on watch | watch | The settingsMenu mouseenter/mouseleave pair (index.ts:63-72) is the feature's core usability guarantee and neither existing test attributes an assertion to it: spec.ts:60-73 never dispatches mouseenter on the menu, and s… | src/features/openYouTubeSettingsOnHover/index.ts:56-60,63-72; spec.ts:60-94 |
| low | hover should not open settings on a page outside includePages | channel_home | Page gating (areDependenciesMet) and the playerContainer early return are the only things stopping the feature outside watch/live, and neither is observed here; 64 non-target-page assertions across the other feature spec… | src/features/_registry/featureNavigationManager.ts:27-35; src/features/openYouTubeSettingsOnHover/index.ts:28-33; src/ut… |

### pauseBackgroundPlayers

`src/features/__tests__/pauseBackgroundPlayers.spec.ts` — 11 generated cases today, about 9 after the recommendations below.

pauseBackgroundPlayers has one boolean config field and two declared pages, yet the spec's 11 generated cases mostly re-prove the same path. The decisive fact (background/index.ts:93-118) is that the background handler pauses every other youtube.com tab without reading config, so whether a tab gets paused depends solely on the sender tab. Every existing assertion looks at the receiver tab, which m…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| pauses background players | watch, live | 2 |
| should not pause background players when disabled | watch, live | 2 |
| should toggle background player pausing | watch, live | 2 |
| should persist background player pausing after navigation | watch, live | 2 |
| should persist background player pausing after full page reload | watch, live | 2 |
| should not affect non-target page | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist background player pausing after full page reload on ${pageType} | 100 | remove | 2 | Assertions are identical to `pauses background players on ${pageType}` (spec:48-57). The reloaded tab (pageA) is only the receiver, and the background handler pauses receivers without reading config at all (src/pages/bac… |
| should toggle background player pausing on ${pageType} | 69 | merge-into:should stop pausing other tabs after being disabled | 2 | Lines 73-78 are a byte-for-byte repeat of spec:48-57. Lines 79-85 repeat spec:58-68: pageC is a fresh tab and its own config alone decides whether pageA pauses, so pageA's disable is never observed (at line 80-81 pageA p… |
| should not pause background players when disabled on ${pageType} | 58 | reduce-pages:watch | 1 | index.ts contains no live/VOD branch: 'live' is a /watch URL that url/index.ts:38-49 flags via `getVideoData().isLive`, and the feature never inspects it. Live-page dependency gating is still proven once by `pauses backg… |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should not affect non-target page | 115 | high | The only assertion is `await expect(pageA.locator("body")).toBeAttached()` (spec:121) — tautological on a loaded page, so the test can never fail and the title's claim (a non-target page does not pause other tabs) is nev… | Make the non-target page an actual sender on a page type that has a player: navigate pageA to a watch page, enable the feature and play it, then open pageB on shorts (outside includePages ['watch','live'], index.metadata… |
| should persist background player pausing after navigation on ${pageType} | 87 | high | After navigating pageA home and back (spec:96-97) the body only calls `ensureVideoIsPlaying` (spec:98), and that helper itself forces playback (spec:21-29) then polls for PLAYING — so it asserts nothing about pausing and… | Make the navigated tab the sender: keep pageB open and playing, navigate pageA to home and back to the watch page, play pageA, then assert pageB reaches PlayerStates.PAUSED (and pageA stays PLAYING). Run on watch only — … |

**Missing** (5; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should not pause the tab that started playing | watch | The sender skip is what separates 'pause other tabs' from 'pause every tab, including the one you are watching'. No assertion in the spec ever looks at the sender tab, so deleting the skip would still pass the whole suit… | src/pages/background/index.ts:97 `if (tab.id === senderTabId) continue;` (senderTabId read at :94); the injected pause f… |
| high | should stop pausing other tabs after being disabled | watch | onDisable's removeEventListener has zero coverage. Whether a tab gets paused is decided entirely by the SENDER's listener (the background handler at src/pages/background/index.ts:93-118 never reads config), so a leaked '… | src/features/pauseBackgroundPlayers/index.ts:23-29 (onDisable removes the listener only when `.html5-main-video` exists)… |
| medium | should not pause other tabs when playback starts in a hidden tab | watch | The document.hidden early return is what stops a background tab's autoplay from stealing playback from the foreground tab; nothing exercises it and a regression there is user-visible (foreground video randomly pauses). | src/features/pauseBackgroundPlayers/index.ts:10-16 returns early when `document.hidden` and neither PiP mode is active. |
| low | should pause audio elements in background tabs | watch | The injected background handler explicitly pauses `<audio>` in addition to `<video>`; that half of the handler is never observed, and it is cheap to bolt onto an existing watch case rather than a new test. | src/pages/background/index.ts:113-118 iterates `document.querySelectorAll("audio")` and pauses each unpaused element. |
| low | should not pause a background tab that is in picture-in-picture | watch | PiP is the one documented exemption and it is implemented on both the sender and receiver sides with no coverage at all. Caveat: CI runs `--headless=chrome` (playwright.config.ts:35) where PiP will likely be unavailable,… | src/features/pauseBackgroundPlayers/index.ts:11-15 (sender bails out unless in video/document PiP when hidden) and src/p… |

### playbackSpeedButtons

`src/features/__tests__/playbackSpeedButtons.spec.ts` — 16 generated cases today, about 18 after the recommendations below.

playbackSpeedButtons.spec.ts generates 16 cases (includePages is ["watch"], so the page loop does not multiply) and spends half of them on placement/fullscreen mechanics that buttonController.spec.ts already proves generically with the loop and screenshot buttons, plus two assertions that cannot fail (the "fullscreenPlacement is same" pair) and one disabled-state test that disables an already-disa…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| increase speed button should increase playback speed | watch | 1 |
| decrease speed button should decrease playback speed | watch | 1 |
| speed buttons should not be present when disabled | watch | 1 |
| speed buttons should persist after navigation | watch | 1 |
| speed buttons should re-appear after disable then re-enable | watch | 1 |
| speed buttons should persist after full page reload | — | 1 |
| should not create speed buttons on non-target page | — | 1 |
| feature conflicts › playerSpeed vs playbackSpeedButtons › playerSpeed default is applied and speed buttons are present when both enabled | watch | 1 |
| button placement › increase speed button should render in player_controls_left | — | 1 |
| button placement › decrease speed button should render in player_controls_left | — | 1 |
| button placement › increase speed button should render in player_controls_right | — | 1 |
| button placement › decrease speed button should render in player_controls_right | — | 1 |
| fullscreen transition › increase speed button should move from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › decrease speed button should move from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › increase speed button should not move when fullscreenPlacement is same | — | 1 |
| fullscreen transition › decrease speed button should not move when fullscreenPlacement is same | — | 1 |

**Not needed** (8)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| speed buttons should not be present when disabled on watch | 40 | remove | 1 | playbackSpeedButtons.button.enabled defaults to false and every test gets a fresh context, so this disables an already-disabled feature (a same-value write that emits no change event) and asserts not.toBeAttached on a bu… |
| speed buttons should persist after navigation on watch | 45 | remove | 1 | navigateToPageType always performs page.goto for a different URL, so watch -> home -> watch is three fresh document loads; the extension state is rebuilt from storage on the final load exactly as in the reload test. No i… |
| increase speed button should render in player_controls_left | 108 | remove | 1 | clickFeatureButton calls expectFeatureButtonToBeIn(page, id, placement) before clicking (features.ts:17), and the increase click test sets placement left and clicks through that helper, so this exact assertion already ru… |
| decrease speed button should render in player_controls_left | 115 | remove | 1 | Same as the increase variant: the decrease click test sets placement left and goes through clickFeatureButton, which asserts the button is inside .ytp-left-controls first (features.ts:17). |
| decrease speed button should render in player_controls_right | 115 | merge-into:increase speed button should render in player_controls_right | 1 | Both buttons are driven by the same single button.placement config value and the same generic placement code (buttonController.spec.ts:137-144 already proves the mechanics); one test can assert both ids in the right cont… |
| decrease speed button should move from left to right on fullscreen enter/exit | 138 | merge-into:increase speed button should move from left to right on fullscreen enter/exit | 1 | Identical steps with a different id; both buttons share one fullscreenPlacement value and the same buttonController move path, so asserting both ids inside the increase test preserves the coverage at half the wall-clock … |
| increase speed button should not move when fullscreenPlacement is same | 150 | remove | 1 | Pure buttonController generics: the identical scenario is already proven with the loop button, and any feature-specific mis-wiring of fullscreenPlacement is caught by the left->right test that is kept. |
| decrease speed button should not move when fullscreenPlacement is same | 162 | remove | 1 | Duplicate of the increase variant (same config, same code path) and of buttonController.spec.ts:100; removing both loses no distinct regression signal. |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| playerSpeed default is applied and speed buttons are present when both enabled on watch | 85 | medium | Uses a fixed page.waitForTimeout(2000) followed by a single raw page.evaluate read of document.querySelector("video").playbackRate. playerSpeed applies the speed through a retry executor (executeWithRetries, maxAttempts … | Delete the waitForTimeout and replace the evaluate with await expect.poll(() => getCurrentSpeed(page, watch), { timeout: 10000 }).toBe(2) (getCurrentSpeed is already imported at spec line 9). |
| speed buttons should re-appear after disable then re-enable on watch | 54 | medium | The title says "speed buttons" (plural) but only yte-feature-increasePlaybackSpeedButton-button is asserted at all three checkpoints, so the decrease button's own add/remove entry (index.ts:183-192) is never observed thr… | Assert both yte-feature-increasePlaybackSpeedButton-button and yte-feature-decreasePlaybackSpeedButton-button at each of the three checkpoints and delete the setOption at line 62. |
| speed buttons should persist after full page reload | 67 | low | Same plural-title mismatch: only the increase button is asserted after the reload, and the non-target test at line 77 ("should not create speed buttons on non-target page") likewise only checks the increase id. After the… | Add expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button") after the reload (line 74) and expectFeatureButtonToBeFalsy for the decrease id at line 80. |

**Missing** (7; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | speed buttons are not added on a live stream | live | addPlaybackSpeedButton explicitly removes/blocks the buttons when getVideoData().isLive, and a live /watch URL is also classified as pageType "live" (outside includePages). No test in the suite loads a live page for this… | src/features/playbackSpeedButtons/index.ts:90-95; src/utils/url/index.ts:38-49; precedent: src/features/__tests__/videoH… |
| high | increase button steps by the configured speed value | watch | Both existing click tests write the default 0.25, and same-value writes are discarded by isValidChange/deepEqual before any featureConfigChange is emitted, so the step is only ever exercised at its default. The button's … | src/features/playbackSpeedButtons/index.metadata.ts:9 (default 0.25); src/pages/content/index.ts:220-223, 350; src/featu… |
| high | a speed button click overrides playerSpeed enforcement | watch | The click writes a rate that is not an own-write, so handleRateChange marks a manual override and makePlayerSpeedTask short-circuits from then on. The existing conflict test never clicks a button, so this interaction is … | src/features/playerSpeed/index.ts:66, 71, 150-158; src/features/playerSpeed/manualOverride.ts:16-36; src/features/playba… |
| medium | decrease button clamps at the minimum speed and shows the limit title | watch | The click guard (result < minSpeed / <= 0) and the getMinSpeed table have zero coverage; a regression there could drive the rate to 0 and stall playback. 0.25 is a rate the YouTube player reports, and the limit title is … | src/features/playbackSpeedButtons/index.ts:28-36, 108-125, 136-143; public/locales/en-US.json:104 ("Can't decrease furth… |
| medium | button titles update after a click | watch | updatePlaybackSpeedButtonTooltips is the only feedback for the next step and no test in the spec reads data-title, so a broken post-click refresh is invisible. Other specs already assert data-title this way, so it is obs… | src/features/playbackSpeedButtons/index.ts:37-75, 172; precedent: src/features/__tests__/copyTimestampUrlButton.spec.ts:… |
| medium | changing playbackSpeedButtons.speed live refreshes the button titles | watch | onConfigChange is the feature's only lifecycle hook and has no coverage; a stale or missing listener would leave the old step advertised after a settings change. | src/features/playbackSpeedButtons/index.ts:204-211; src/features/_registry/featureOrchestrator.ts:95-126; src/features/_… |
| medium | on-screen display appears when a speed button is clicked | watch | The click path constructs an OnScreenDisplayManager with type "speed" and a forced displayType "text"; onScreenDisplay.spec.ts drives the OSD exclusively through scrollWheelVolumeControl, so this second consumer is untes… | src/features/playbackSpeedButtons/index.ts:146-169; src/features/__tests__/onScreenDisplay.spec.ts:11, 23-41; src/utils/… |

### playerQuality

`src/features/__tests__/playerQuality.spec.ts` — 23 generated cases today, about 14 after the recommendations below.

playerQuality enforces a configured quality through the player manager, and the spec covers only the enabled/quality pair of its five config fields. fpsPreference and preferPremium (index.ts:31-73) have literally zero references, the "higher" fallback branch is never selected, onNavigate is never reached because every helper navigation is a page.goto full load (navigation.ts:215-218), and manual-o…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should set quality to closest | watch, shorts, live | 3 |
| quality should not be set to closest when disabled | watch, shorts, live | 3 |
| should persist quality setting after navigation | watch, shorts, live | 3 |
| should set quality with lower fallback strategy | watch, shorts | 2 |
| should set quality to hd720 | watch, shorts | 2 |
| re-applies quality after disable then re-enable | watch, shorts, live | 3 |
| persists quality after full page reload | watch, shorts, live | 3 |
| restores quality setting after disable | watch, shorts, live | 3 |
| suspends enforcement after a manual quality change | watch | 1 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist quality setting after navigation on ${pageType} | 36 | remove | 3 | Verified: the only assertion after the round trip (spec:49) runs after a disable/enable toggle at spec:45-46, so what it actually checks is the re-enable path already covered at spec:72-84. The round trip itself is two p… |
| should set quality with lower fallback strategy on ${pageType} | 53 | merge-into: should set quality to closest on ${pageType} | 2 | "lower" is already the config default (index.metadata.ts:25), and for the hd2160 target both strategies collapse to the same result on every real ladder: if hd2160 is present chooseClosestQuality returns it verbatim (src… |
| quality should not be set to closest when disabled on ${pageType} | 29 | reduce-pages: watch | 2 | With the feature disabled no feature code runs at all - getPlayer's per-page selector (index.ts:75-81) is never reached - so shorts and live re-run an identical no-op. On live the case can also return early at spec:33 an… |
| re-applies quality after disable then re-enable on ${pageType} | 72 | reduce-pages: watch | 2 | onEnable/onDisable contain no live or shorts branch (index.ts:197-217); the only page-dependent line is the getPlayer selector, which is already exercised on shorts and live by the retained closest test at spec:21-28. Li… |
| persists quality after full page reload on ${pageType} | 85 | reduce-pages: watch | 2 | Reload only replays the enable-at-load path. On live it is actively harmful: page.reload() lands on the live watch URL, and the following navigateToPageType(page, "live") re-enters navigateToLiveVideo from the channel pa… |
| restores quality setting after disable on ${pageType} | 100 | reduce-pages: watch | 2 | makeRestoreQualityTask is page agnostic apart from the getPlayer selector (index.ts:166-178); repeating it on shorts and live only re-runs that selector choice, which the closest test already covers on both pages. Fix th… |
| should set quality to hd720 on ${pageType} | 62 | reduce-pages: watch | 1 | hd720 is normally present, so this exercises the exact-match early return in chooseClosestQuality (src/utils/player/quality/index.ts:12), which is page independent; the shorts player branch is already exercised by the cl… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| restores quality setting after disable on ${pageType} | 100 | high | Confirmed: after disableFeature (spec:115) the test performs the restore itself via setPlaybackQualityRange/setPlaybackQuality inside page.evaluate (spec:118-128) and only then polls for that same value (spec:131), so th… | Delete the page.evaluate restore block. After disableFeature, poll div#movie_player[data-default-quality] (written by the restore task at index.ts:175) and/or getPlaybackQuality until it equals the quality captured at sp… |
| quality should not be set to closest when disabled on ${pageType} | 29 | medium | The test asserts that YouTube's own auto-selected quality differs from closest(hd2160) (spec:32-34). Nothing about the feature is observed: playerQuality.enabled defaults to false (index.metadata.ts:24), so on a fresh co… | Assert the absence of the feature's own signal instead: after enabling and then disabling, or with the feature left disabled, expect div#movie_player to have no data-default-quality attribute (index.ts:140). Optionally s… |
| should set quality to closest on ${pageType} | 25 | low | getClosestQuality is called without a fallbackStrategy, so the expectation is computed with the helper default "higher" (src/utils/_tests/player.ts:158-163) while the feature runs with the config default "lower" (index.m… | Pass the strategy the config actually uses, e.g. getClosestQuality(page, pageType, qualityLevel, "lower"), and set playerQuality.fallbackStrategy explicitly in the test so helper and feature cannot drift apart. |
| should persist quality setting after navigation on ${pageType} | 36 | low | The title promises persistence across navigation, but no assertion runs between returning to the page (spec:44) and the disable/enable toggle (spec:45-46); the only post-navigation assertion (spec:49) therefore measures … | Preferred: delete the test (see the unnecessary finding) and add the related-video SPA-navigation test that actually reaches onNavigate. Minimum: assert the enforced quality immediately after spec:44 and drop lines 45-46… |

**Missing** (6; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | applies the configured fps preference when several formats share a quality | watch | User-facing config field with literally zero references in the spec; the comparator in chooseBestFormat could be inverted or deleted and all 23 existing cases would still pass. | src/features/playerQuality/index.metadata.ts:26 (field default "default"); src/features/playerQuality/index.ts:54-63 (fp… |
| high | re-applies quality after an in-page navigation to another video | watch | onNavigate (resetEnforcementState + fresh apply/verify tasks) is never reached by any test: every helper navigation is a full document load, so only onEnable is exercised. | src/features/playerQuality/index.ts:218-227; onNavigate is dispatched from the yt-navigate-finish listener (src/features… |
| high | suspends enforcement when quality is changed from the player settings menu | watch | The only test for markManualOverride/hasForeignQuality is test.fixme'd, so the branch never runs. hasForeignQuality reads stats.fmt first (index.ts:86-88), which a real menu selection changes, unlike the scripted setPlay… | src/features/playerQuality/index.ts:83-93 (hasForeignQuality), 119-122 (suspension gate), 180-185 (markManualOverride + … |
| medium | prefers a premium format when preferPremium is enabled | watch | Second config field with zero references anywhere in the test tree, and premium outranks fps in the comparator so it silently changes which format is applied. | src/features/playerQuality/index.metadata.ts:27; src/features/playerQuality/index.ts:49-53; QualityDataEntry.paygatedQua… |
| medium | marks the player with data-default-quality and reverts it on disable | watch | A deterministic DOM marker written on both the apply and the restore path that no test reads (grep for "defaultQuality" across src/features/__tests__, src/utils/_tests and Options.spec.ts returns nothing); it makes the r… | src/features/playerQuality/index.ts:140 (apply) and 175 (restore). |
| low | leaves the player untouched when quality is set to auto | watch | The auto early return is reachable from the config schema ("auto" is part of youtubePlayerQualityLevels) and nothing covers it; only reachable in practice through imported/migrated settings since the options select filte… | src/features/playerQuality/index.ts:114; src/features/playerQuality/types.ts (youtubePlayerQualityLevels includes "auto"… |

### playerSpeed

`src/features/__tests__/playerSpeed.spec.ts` — 17 generated cases today, about 17 after the recommendations below.

The spec proves the basics on watch and shorts (enable, disable, re-enable, reload) but spends 8 of its 17 generated cases on repetition: three speed values with no branch behind them, a disabled-state test that cannot fail, and a restore test that duplicates the re-enable test. Two tests are wrong: "should persist playback speed after navigation" toggles the feature off/on before asserting and ne…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should set playback speed to 2 | watch, shorts | 2 |
| should set playback speed to 0.5 | watch, shorts | 2 |
| should set playback speed to 1.5 | watch, shorts | 2 |
| should not set playback speed when disabled | watch, shorts | 2 |
| should persist playback speed after navigation | watch, shorts | 2 |
| re-applies after disable then re-enable | watch, shorts | 2 |
| persists speed after full page reload | watch, shorts | 2 |
| restores normal speed when disabled after being enabled | watch, shorts | 2 |
| state persistence › playerSpeed state is stored in extension storage | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should not set playback speed when disabled on ${pageType} | 25 | remove | 2 | Confirmed vacuous: each test gets a fresh persistent context with a fresh userDataDir (playwright.config.ts:28-40), so playerSpeed.speed is its default 1 and playerSpeed.enabled its default false; disableFeature writes e… |
| restores normal speed when disabled after being enabled on ${pageType} | 65 | merge-into:re-applies after disable then re-enable on ${pageType} | 2 | Byte-for-byte the same setup (navigate, setOption 2, enable, poll 2, disable, poll) as lines 47-52 of the re-enable test; the only delta is the stronger `toBe(1)` vs `not.toBe(2)` after disable. Tightening line 52 to `.t… |
| should set playback speed to ${speed} on ${pageType} | 17 | simplify | 4 | The `speeds = [2, 0.5, 1.5]` loop triples one assertion per page. No code branches on the value: resolveEffectiveSpeed forwards it unchanged and setPlaybackRate/video.playbackRate take any number (index.ts:68-74). Keepin… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist playback speed after navigation on ${pageType} | 30 | high | The title promises navigation persistence, but lines 37-38 disable and re-enable the feature immediately before the final poll, so the asserted 2 is produced by onEnable, not by any navigation path. Independently, naviga… | Delete lines 37-38 so the assertion after the round trip actually measures the reload/navigate path, and add a real in-page navigation on watch: the default watch fixture carries &list=UUuAXFkgsw1L7xaCfnd5JJOw (navigatio… |
| playerSpeed state is stored in extension storage | 76 | medium | Two fixed `waitForTimeout(1000)` calls (lines 84, 91) stand in for awaiting the settings menu and the speed panel, and the state read on line 93 is a bare expect rather than a poll, so the test flakes whenever YouTube's … | Replace the sleeps with waits on the actual conditions: `await page.locator('.ytp-settings-menu, ' + settingsPanelMenuSelector).waitFor()` after clicking .ytp-settings-button, and `await page.locator('.ytp-variable-speed… |
| should set playback speed to ${speed} on ${pageType} | 21 | low | `await page.waitForTimeout(1000)` sits directly in front of an expect.poll that waits for exactly the same condition, adding a fixed second to every generated case (6 today) without changing what can be asserted. | Delete line 21; the poll on line 22 (5 s, 15 s on shorts) already is the awaited condition. |

**Missing** (6; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | applies the channel-specific speed from channelSpeeds instead of the global speed | watch | channelSpeeds is a shipped, user-editable config field with literally zero coverage anywhere in the suite (grep for "channelSpeeds" across src/features/__tests__ and src/pages/options/Options.spec.ts returns nothing); re… | src/features/playerSpeed/index.metadata.ts:8; src/features/playerSpeed/index.ts:68,77-82; src/features/playerSpeed/utils… |
| high | a manual speed change is not reverted while playerSpeed is enabled | watch | The entire manualOverride module and the re-enforcement path it guards are untested; a regression makes the extension fight the user on every state change. | src/features/playerSpeed/index.ts:66,150-158; src/features/playerSpeed/manualOverride.ts:16-36; src/features/_registry/f… |
| high | changing playerSpeed.speed while the feature is enabled applies immediately | watch | onConfigChange returns early unless enabled, and every existing test (playerSpeed.spec.ts:19,32,48,58,67,79 and playbackSpeedButtons.spec.ts:87) sets the option before enabling, so the live-apply path that the options pa… | src/features/playerSpeed/index.ts:189-198; src/features/_registry/featureOrchestrator.ts:118-126 |
| medium | disabling restores the manually chosen speed, not 1 | watch | onDisable restores state.playbackSpeed, but only the default branch (state still 1) is exercised today, so a break in recordExternalSpeed/ratechange recording would be invisible; appending this to the manual-override tes… | src/features/playerSpeed/index.ts:145-166,204-211; src/features/__tests__/playerSpeed.spec.ts:65-72 |
| medium | does not change playback speed on a live stream | live | Live is gated twice - includePages excludes it (areDependenciesMet) and makePlayerSpeedTask bails on playerVideoData.isLive - and neither guard is observed anywhere; forcing 2x on a live stream is a visible user bug. | src/features/playerSpeed/index.ts:29,59; src/features/playerSpeed/index.metadata.ts:9; src/features/_registry/featureNav… |
| low | playback speed buttons tooltips reflect the enforced playerSpeed | watch | playerSpeed pushes updateEffectivePlaybackSpeedButtons on enable/navigate/config-change/disable and the existing conflict test (playbackSpeedButtons.spec.ts:85) only checks the buttons exist and the rate is 2, never the … | src/features/playerSpeed/index.ts:178-185,197,211,224; src/features/playbackSpeedButtons/index.ts:37-73 |

### playlistLength

`src/features/__tests__/playlistLength.spec.ts` — 18 generated cases today, about 17 after the recommendations below.

The spec covers only one of three config fields. playlistLength.enabled is genuinely exercised (render, disable, re-enable), but lengthGetMethod is covered vacuously and watchTimeGetMethod (index.metadata.ts:12, utils.ts:50-58) has zero coverage. Both playlist/watch fixtures use the UU uploads playlist (navigation.ts:65-74, 97-101), so getDurationFromAPI always throws (utils.ts:150-152) and the "a…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should render UI when enabled | watch, playlist | 2 |
| should not render UI when disabled | watch, playlist | 2 |
| should support api method | watch, playlist | 2 |
| should support html method | watch, playlist | 2 |
| should toggle UI visibility | watch, playlist | 2 |
| should persist UI after navigation | watch, playlist | 2 |
| should re-enable UI after disable then re-enable | watch, playlist | 2 |
| should persist UI after full page reload | watch, playlist | 2 |
| should update UI when playback rate changes (watch only behavior) | — | 1 |
| should not render UI on non-target page | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should support api method on ${pageType} | 63 | remove | 2 | CONFIRMED duplicate. "api" is already the default lengthGetMethod (index.metadata.ts:11), so every other test in the spec runs this exact path, and the assertion here (root visible) is a strict subset of expectUIVisible … |
| should support html method on ${pageType} | 63 | remove | 2 | CONFIRMED: resolveTotalDuration's html branch (controller.ts:186-187) is already executed on every other test in the spec via the api->html fallback on these UU fixtures, and the only assertion is root visibility, which … |
| should toggle UI visibility on ${pageType} | 72 | merge-into:should re-enable UI after disable then re-enable on ${pageType} | 2 | CONFIRMED: its body (navigate -> enablePlaylistLength -> expectUIVisible -> disableFeature -> expectUIHidden) is a literal prefix of spec:88-96. Same page, same lifecycle path (onEnable then onDisable), same helpers; no … |
| should persist UI after navigation on ${pageType} | 79 | merge-into:should persist UI after full page reload on ${pageType} | 2 | CONFIRMED: navigateToPageType always performs a full page.goto when the URL differs (navigation.ts:215-226), so the round trip through home is just another cold load, and line 85 re-runs enablePlaylistLength (disable + e… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should update UI when playback rate changes (watch only behavior) | 115 | high | CONFIRMED: the assertion cannot fail. The controller never listens for ratechange (its triggers are the document MutationObserver, a ResizeObserver and the video's timeupdate - controller.ts:202-219), and on a playing wa… | Assert on the total, which is independent of playback position and only changes with playerSpeed: parse the total segment of #yte-playlist-length-ui-times, capture it, set video.playbackRate = 2 (keep the video playing s… |
| should persist UI after full page reload on ${pageType} | 103 | high | CONFIRMED: after page.reload(), line 102's navigateToPageType is a no-op navigation (navigation.ts:216 skips goto when the URL matches) but line 103 calls enablePlaylistLength, which does disableFeature + enableFeature. … | Delete line 103 only. Keep line 102 (it is the readiness/ads wait) and then assert expectUIVisible directly. |
| should render UI when enabled on ${pageType} | 46 | medium | CONFIRMED: waitForPlaylist swallows the selector timeout with .catch(() => {}) and then always sleeps a fixed 2000 ms, even when the playlist rendered immediately, and it silently proceeds when "yt-item-section-renderer"… | Await a condition instead: await expect(page.locator("ytd-playlist-video-list-renderer div#contents > *, yt-item-section-renderer div#contents > *").first()).toBeVisible({ timeout: 15000 }) - these are the exact containe… |
| should update UI when playback rate changes (watch only behavior) | 108 | low | CONFIRMED but low impact: navigateToPageType(page, watch) is called with no requirements, so getFixture returns pageFixtures.watch[0] purely by pool order. It happens to be the &list=UU... fixture today; reordering the p… | Call navigateToPageType(page, watch, ["playlistLength"]). |

**Missing** (7; 4 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should compute a larger watched time with watchTimeGetMethod="duration" than "youtube" | watch | CONFIRMED zero coverage: no spec in src/features/__tests__ and no case in src/pages/options/Options.spec.ts ever writes playlistLength.watchTimeGetMethod. The branch is real and observable: on watch, watched time sums vi… | src/features/playlistLength/index.metadata.ts:12; src/features/playlistLength/utils.ts:50-58 (ternary at line 54); no ma… |
| high | should use the InnerTube API for a non-uploads playlist | playlist | CONFIRMED: getDurationFromAPI throws immediately for any id starting with "UU", and every fixture used by this spec is list=UUuAXFkgsw1L7xaCfnd5JJOw (playlist pool[0] and watch pool[0]), so the success path of getDuratio… | src/utils/_tests/navigation.ts:65-74 and 97-101; src/features/playlistLength/utils.ts:149-152; src/features/playlistLeng… |
| high | should rebuild the UI after SPA navigation from playlist to watch | playlist -> watch | CONFIRMED: onNavigate is wired (featureLifecycleManager.navigateFeature <- featureOrchestrator.updateFeatureOnNavigation) and fires only when the navigation signature changes, which a full page.goto/reload never produces… | src/features/playlistLength/index.ts:41-44; src/features/_registry/featureOrchestrator.ts:170-190; src/features/_registr… |
| high | should show consistent times, percentage and progress-bar width | watch, playlist | CONFIRMED and raised from medium: expectUIVisible (spec:33-37) only asserts the times node is non-empty and the percent node contains "%". The degenerate output "0:00 / 0:00 (- 0:00)" + "0%" satisfies both, so a total fa… | src/features/playlistLength/utils.ts:133-140; src/features/playlistLength/utils.ts:186-197 (rich-grid -> []); src/featur… |
| medium | should not render the UI on a watch page without a playlist | watch | CONFIRMED: includePages contains "watch", so the feature runs on a plain watch page; getHeaderSelector returns "#page-manager > ytd-watch-flexy\|ytd-watch-grid #playlist #header-contents", which does not exist without a p… | src/features/playlistLength/controller.ts:147-159; src/utils/dom/wait/index.ts:66-70 (default timeout 2500) and 105-111;… |
| medium | should re-render the UI when lengthGetMethod changes while enabled | playlist | CONFIRMED: featureOrchestrator.notifyConfigChange calls lifecycleManager.configChange on any changed field, and playlistLength's onConfigChange performs a disable/enable round-trip. Every existing method test calls disab… | src/features/playlistLength/index.ts:32-36; src/features/_registry/featureOrchestrator.ts:94-101; src/features/_registry… |
| low | should remove the UI when SPA-navigating from a playlist page to a non-target page | watch -> channel_home | ADDED while verifying the orchestrator: on navigation, updateFeatureOnNavigation re-runs updateFeatureEnabledState, and when areDependenciesMet is false the feature is disabled (UI removed). The existing "should not rend… | src/features/_registry/featureOrchestrator.ts:170-176 and 158-164; src/features/_registry/featureNavigationManager.ts:27… |

### playlistManagementButtons

`src/features/__tests__/playlistManagementButtons.spec.ts` — 8 generated cases today, about 11 after the recommendations below.

The spec is 8 generated cases (includePages is ["playlist"], so no loop multiplication) and covers only two of the feature's three config fields. removeAllButton.enabled — the whole #yte-remove-all-watched-button surface at src/features/playlistManagementButtons/index.ts:141-219 — has literally zero coverage, and no test observes a click effect, the MutationObserver re-add path, or button visibili…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| toggling feature should not crash the page | playlist | 1 |
| remove button should appear on playlist items when enabled | playlist | 1 |
| reset button should appear on playlist items when enabled | playlist | 1 |
| remove and reset buttons should be removed when disabled | playlist | 1 |
| buttons should persist after navigation when enabled | playlist | 1 |
| buttons should re-appear after disable then re-enable | playlist | 1 |
| buttons should persist after full page reload | playlist | 1 |
| should not create buttons on non-target page | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| toggling feature should not crash the page on playlist | 34 | remove | 1 | Both assertions are expect(page.locator("body")).toBeAttached(), which cannot fail on a loaded page; the enable/disable pair it performs is a strict subset of the disable test at line 58 (which asserts real DOM effects).… |
| remove and reset buttons should be removed when disabled on playlist | 58 | merge-into:buttons should re-appear after disable then re-enable on playlist | 1 | Verified line-by-line: spec:60-69 is byte-for-byte the same sequence as spec:90-99 (navigate, enable both, expectRemoveButton, guarded expectResetButton, disable both, expectButtonsRemoved). The re-enable test then conti… |
| should not create buttons on non-target page | 126 | remove | 1 | Confirmed vacuous. resolveNonTargetPage (src/utils/_tests/utils.ts:3-5) returns the first entry of pageTypes (types.ts:282-294) not in includePages and not login-gated, i.e. channel_home -> https://www.youtube.com/@RickA… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| buttons should persist after navigation when enabled on playlist | 72 | high | Confirmed: no navigation happens. Both calls at spec:74 and spec:81 are navigateToPageType(page, "playlist", ["playlistManagementButtons"]) -> the same fixture URL (navigation.ts:71-73), and navigateToYoutubePage skips p… | Do a real SPA navigation, not another goto (a goto would only retest the page-load path already covered by the reload test at spec:108): after asserting the buttons exist, click a video link inside the playlist so YouTub… |
| remove button should appear on playlist items when enabled on playlist | 44 | medium | The title promises "items" but expectRemoveButton (spec:20-22) asserts only that .first() is attached. A regression that breaks out of the loop after one item, drops the :has(ytd-thumbnail-overlay-time-status-renderer) e… | Replace the .first() check with expect.poll comparing counts: poll until page.locator(".yte-remove-button").count() equals page.locator("ytd-playlist-video-list-renderer ytd-playlist-video-renderer:has(ytd-thumbnail-over… |
| reset button should appear on playlist items when enabled on playlist | 51 | medium | expectResetButton (spec:24-26) only polls for count > 0, so the hasWatchProgress branch (index.ts:82,108) is unverified in both directions: reset buttons wrongly added to unwatched items, or missing from all-but-one watc… | In page.evaluate, count items whose progress-bar width is > 0 using the same three selectors as getWatchedPercentage (src/utils/video/index.ts:3-7,19-27), assert that count > 0, then assert .yte-reset-button count equals… |
| buttons should re-appear after disable then re-enable on playlist | 88 | medium | Every reset-button assertion in the spec (spec:94,103 and the same pattern at 64,78,114,120) sits behind `if (await hasResumeOverlays(page))`, so it silently disappears rather than failing. Worse, the guard selector at s… | Derive the watched-item count in page.evaluate with the same progress-bar selectors the feature uses, assert it is > 0 (failing loudly if the ["playlistManagementButtons"] fixture has lost its watched items), and assert … |

**Missing** (5; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high (written 2026-09-04; on 2026-09-06 turned into a real Watch Later case that watches a short video to the end, clicks the button and checks the rows leave and stay gone) | remove all watched videos button should appear in the playlist header when enabled and disappear when disabled | playlist | removeAllButton.enabled is one of the feature's three config fields and its entire injection/label/cleanup path has zero coverage anywhere in the repo; the same test also pins sub-toggle independence, so no separate isol… | src/features/playlistManagementButtons/index.metadata.ts:8,32-34; src/features/playlistManagementButtons/index.ts:141-18… |
| medium | disabling only the remove button should keep the reset buttons | playlist | Confirmed distinct lifecycle path: resolveEnabled (featureRegistryCore.ts:44-54) stays true, so notifyConfigChange routes to onConfigChange -> cleanupPlaylistManagementButtons (which strips BOTH classes) + setup. Every c… | src/features/_registry/featureOrchestrator.ts:95-102; src/features/playlistManagementButtons/index.ts:50,252-255; spec l… |
| medium | buttons should be added to playlist items rendered after enabling | playlist | The MutationObserver installed on ytd-playlist-video-list-renderer is what keeps buttons on lazily rendered rows; a disconnected observer (or a stale-generation bug from setupGeneration) passes every current test since a… | src/features/playlistManagementButtons/index.ts:221-238 (observer), 71-78 (eligibility + #menu skip), 32,55-56,69 (gener… |
| low | buttons should be visible without hovering and expose the translated hover title | playlist | index.ts:135-137 exists specifically to force the item #menu children to display:inline-flex so the buttons are not hidden until hover; every current assertion is toBeAttached / count>0, so a button attached inside a sti… | src/features/playlistManagementButtons/index.ts:135-137; src/features/playlistManagementButtons/button.ts:40; public/loc… |
| low | reset button should mark the video as unwatched and remove itself | playlist | The only click effect that is both observable and non-destructive to the playlist (index.ts:114-120); today no click handler in this feature is exercised at all. Priority lowered from the auditor's medium because the act… | src/features/playlistManagementButtons/index.ts:114-120; src/features/playlistManagementButtons/button.ts:42-64; src/uti… |

### playlistReverseButton

`src/features/__tests__/playlistReverseButton.spec.ts` — 18 generated cases today, about 15 after the recommendations below.

The spec has solid coverage of the enable/disable/click/persist basics on both target pages (playlist and watch), but it spends 18 live-YouTube tests on it and misses the feature's riskiest branches. Its two "after navigation" tests never trigger onNavigate at all - navigateToPageType uses page.goto (src/utils/_tests/navigation.ts:216), so they duplicate the reload tests - and the watch variant ad…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| toggling reverse button should not crash the page | playlist, watch | 2 |
| reverse button should be present when enabled | playlist, watch | 2 |
| reverse button should not be present when disabled | playlist, watch | 2 |
| should reverse playlist order | playlist, watch | 2 |
| should restore original order when disabled | playlist, watch | 2 |
| should maintain reversed order after disable then re-enable | playlist, watch | 2 |
| should maintain reversed order after navigation | playlist, watch | 2 |
| should persist reversed order after full page reload | playlist, watch | 2 |
| reverse button should not be present on non-target page | — | 1 |
| state persistence › playlistReverseButton state is stored in extension storage | — | 1 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| toggling reverse button should not crash the page on ${pageType} | 46 | remove | 2 | Confirmed vacuous: div#yte-message-from-extension is appended to documentElement once by the content script at document-start and never removed (src/pages/content/index.ts:33-42), and waitForExtensionReady already assert… |
| reverse button should not be present when disabled on ${pageType} | 59 | merge-into:should restore original order when disabled on ${pageType} | 2 | The restore test already performs the identical navigate/enable/click/disable sequence (spec:81-98, 193-210); moving the two not-toBeAttached assertions there after the disableFeature call preserves every assertion (butt… |
| should restore original order when disabled on ${pageType} | 81 | merge-into:should maintain reversed order after disable then re-enable on ${pageType} | 2 | The re-enable test (spec:99-117, 211-229) repeats the identical enable/click/assert-reversed/disable prefix and then re-enables; asserting the restored order (and the button removal folded in above) between the disable a… |
| should maintain reversed order after navigation on ${pageType} | 118 | remove | 2 | navigateToPageType ends in page.goto for a different URL (navigation.ts:216-218 -> 133-144), so home-and-back is a full document load that re-runs onEnable, exactly the path the reload test already covers (spec:139-157, … |
| reverse button should not be present on non-target page | 271 | remove | 1 | nonTargetPage resolves to channel_home (pageTypes order in _registry/types.ts:282-294 with includePages playlist/watch and the login-gated pages skipped, utils.ts:3-5). Channel home has neither ytd-playlist-panel-rendere… |
| playlistReverseButton state is stored in extension storage | 278 | merge-into:should reverse playlist order on playlist | 1 | Identical setup to spec:179-192 (same playlist fixture, enable, wait for button, click); the readStoredState assertion is two lines and needs no extra browser context. Merge it there together with the proposed second-cli… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should maintain reversed order after navigation on watch | 131 | medium | After navigating home and back, the test calls disableFeature then enableFeature before reading the order (spec:131-132). onDisable un-reverses and onEnable re-applies the reversal from the persisted state (index.ts:25-4… | Delete spec:131-132 and assert the order directly with expect.poll after returning to the page (or, better, delete the test and add the proposed SPA-navigation test that actually reaches onNavigate). |
| should reverse playlist order on watch | 75 | medium | Every order/state read is gated on a fixed sleep instead of an awaited condition - 19 waitForTimeout calls at spec:75,89,93,107,112,126,133,147,152,187,201,205,219,224,238,243,257,262,284 - while applyReversal only pushe… | Replace each sleep with expect.poll(() => getPlaylistOrder(page)).toEqual(expected) and expect.poll on readStoredState; expect.poll is already used across the suite (e.g. copyTimestampUrlButton.spec.ts, automaticallyMaxi… |
| should reverse playlist order on ${pageType} | 78 | low | Only the length and the two endpoints are compared (spec:77-79 and the same pattern at 95-97, 114-116, 135-137, 154-156, 189-191, 207-209, 226-228, 245-247, 264-266), so a rotation, a partial reversal, or a swap of just … | Assert the whole array: expect(after).toEqual([...before].reverse()) (and expect(restored).toEqual(before) for the restore case). The existing length assertion shows no extra items are lazily added, so full-array equalit… |

**Missing** (9; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | reversal survives an in-page (SPA) navigation to the next playlist video | watch | onNavigate is the only path that captures prevIndex and awaits waitForDataRefresh before re-applying the reversal, and nothing in the suite reaches it. Verified: FeatureNavigationManager.initialize() only records the sig… | src/features/playlistReverseButton/index.ts:42-53; src/features/playlistReverseButton/setup.ts:69-81; src/features/playl… |
| high | reverse button is not injected on a watch page that has no playlist | watch (non-playlist fixture) | The plain watch page is the most common page in the feature's includePages, and the guard that keeps the button off it has zero coverage; a stray reverse button in every video's sidebar would be a user-visible regression… | src/features/playlistReverseButton/setup.ts:70-71 returns when ytd-playlist-panel-renderer is absent (plus setup.ts:73-7… |
| high | clicking the reverse button twice restores the original order and writes isReversed:false | playlist | The click handler's toggle-off half and the false state write are never exercised; the only un-reversal covered is the one onDisable performs, which is a different call site. | src/features/playlistReverseButton/button.ts:68-95 (newReversed = !currentReversed, setState, applyPlaylistPageReversal)… |
| medium | reverse button is placed inside the playlist header action row | watch and playlist | Both presence tests use a document-wide id locator, so a broken header selector that dropped the button anywhere in the page would still pass. No other spec asserts this feature's placement: expectFeatureButtonToBeIn onl… | src/features/playlistReverseButton/utils.ts:97-101 getHeaderSelector, utils.ts:148-160 findVisibleActionRow, src/feature… |
| medium | tooltip label toggles between the on and off strings | playlist | The label is the only feedback the button gives about its state (the icon never changes) and the i18n swap has zero coverage; grep shows no spec in src/features/__tests__ asserts any tooltip. | src/features/playlistReverseButton/button.ts:45-46 initial label, button.ts:83-86 label swap on click; src/utils/dom/too… |
| medium | a below_player feature button does not get adopted into the reverse button's container | watch | getOrCreateButtonContainer returns ANY existing #yte-button-container, and the reverse button creates one with that exact id inside the playlist header, so a below_player button can be rendered into the sidebar. expectFe… | src/features/playlistReverseButton/button.ts:49-50; src/features/buttonController/constants.ts:1; src/features/buttonCon… |
| medium | reversing keeps the currently playing video selected in the panel at the mirrored position | watch | currentIndex/localCurrentIndex recomputation plus the autoplay next/prev swap is what keeps YouTube's next/previous correct after a reversal; today only raw anchor order is compared, so an index off-by-one would go unnot… | src/features/playlistReverseButton/reversal.ts:151-160 (index recompute + autoplay set swap) and 165-183 (pushes playlis… |
| low | reverse button and reversed order survive a header row swap on the playlist page | playlist | The ResizeObserver re-injection/re-reversal branch has zero coverage. Downgraded from medium: it only fires when YouTube actually swaps to a different visible action row, so the test depends on YouTube's responsive layou… | src/features/playlistReverseButton/setup.ts:55-66 re-injects when #yte-button-container is no longer inside the visible … |
| low | reversal is re-applied after toggling YouTube's native mini player | watch | The mini player click listener and the 500 ms re-check interval are dead code as far as the suite is concerned; low because the interaction is inherently flaky against live YouTube. | src/features/playlistReverseButton/setup.ts:21-32 registers the listener on button.ytp-miniplayer-button, setup.ts:93-10… |

### remainingTime

`src/features/__tests__/remainingTime.spec.ts` — 4 generated cases today, about 7 after the recommendations below.

The spec has 4 static cases (testPages resolves to ["watch"] only, so no loop multiplication) and covers little of the feature. Existence-on-enable is the only meaningful assertion: the whole live-update path (timeupdate listener, index.ts:75 / 10-26), the playbackRate division (utils.ts:15), the formatTime output, the isLive guard (index.ts:62-65), onNavigate/span-reuse (index.ts:39-41, 66-73) an…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| remaining time should be displayed | watch | 1 |
| remaining time shouldn't be displayed | watch | 1 |
| remaining time should persist after navigation | watch | 1 |
| should not display remaining time on non-target page | — | 1 |

**Not needed:** none.

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| remaining time should persist after navigation on ${pageType} | 28 | high | The title promises persistence across a reload back to watch, but lines 34-35 disable and immediately re-enable the feature before the only post-navigation assertion (line 36). The assertion therefore observes a live onE… | Delete lines 34-35 and assert expect(page.locator("span#ytp-time-remaining")).toBeAttached({ timeout: 10000 }) directly after the second navigateToPageType(page, pageType). This is valid because test_setConfigValue write… |
| remaining time should be displayed on ${pageType} | 20 | low | expect(textContent).toBeTruthy() cannot realistically fail: the span only ever exists because index.ts:74 assigned it a non-empty ' (-...)' string, so any formatting or arithmetic regression (including ' (-0)') still pas… | Scope the locator to the insertion point the feature actually uses - page.locator(".ytp-time-display > .ytp-time-wrapper > .ytp-time-contents > span#ytp-time-remaining") (index.ts:56, 71) - and assert the text against /^… |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | remaining time should update while the video plays | watch | The timeupdate listener is the only thing that keeps the displayed value current; with zero coverage, deleting src/features/remainingTime/index.ts:75 leaves all 4 tests green while users see a value frozen at the moment … | src/features/remainingTime/index.ts:75 registers eventManager.addEventListener(videoElement, "timeupdate", playerTimeUpd… |
| high | remaining time should be removed when the feature is disabled | watch | onDisable is the feature's teardown path (removes the span and drops the timeupdate listeners) and nothing observes it: the existing "remaining time shouldn't be displayed on ${pageType}" disables a feature that is alrea… | src/features/remainingTime/index.ts:30-35 (onDisable removes span#ytp-time-remaining and calls eventManager.removeEventL… |
| medium | remaining time should halve when the playback rate doubles | watch | calculateRemainingTime divides by playbackRate so the value is remaining wall-clock time, not remaining media time; a regression to plain duration - currentTime would go unnoticed. Can be folded into the playback-update … | src/features/remainingTime/utils.ts:10-17 reads videoElement.playbackRate and divides by it; no spec touches playbackRat… |
| medium | remaining time should not duplicate after SPA navigation to the next playlist video | watch | onNavigate and the 'reuse the existing span' branch never execute in this spec, so a regression that appends a new span per navigation (or leaves a stale value from the previous video) would ship unnoticed. | src/features/remainingTime/index.ts:39-41 (onNavigate -> setupRemainingTime) and index.ts:66-73 (remainingTimeElement ??… |

### rememberVolume

`src/features/__tests__/rememberVolume.spec.ts` — 21 generated cases today, about 13 after the recommendations below.

rememberVolume has exactly one config field and two state keys, and the spec spends 21 generated cases (6 tests x 3 pages + 3) on them, mostly re-testing the same enable-restore path. Four of the six loop tests toggle the feature off and on right before asserting (spec:23-24,54-55,100-101,119-120), which means onEnable - not navigation - performs the restore, and the disable/re-enable test at spec…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| video volume should be remembered | watch, live, shorts | 3 |
| video volume shouldn't be remembered when disabled | watch, live, shorts | 3 |
| video volume should be remembered at different levels | watch, live, shorts | 3 |
| persists remembered volume after full page reload | watch, live, shorts | 3 |
| restores original volume when disabled after being enabled | watch, live, shorts | 3 |
| re-applies volume after disable then re-enable | watch, live, shorts | 3 |
| video volume should be remembered across multiple navigations | — | 1 |
| state persistence › rememberVolume state is stored in extension storage | — | 1 |
| state persistence › rememberVolume stores independent volumes per page type | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| video volume should be remembered at different levels on ${pageType} | 47 | remove | 3 | Structurally identical to the test at spec:15 with 50 substituted for the shared constant volume=10 (src/utils/_tests/constants.ts:23): same navigate/enable/setVolume/home-hop/toggle/poll sequence. restoreVolume has no v… |
| video volume should be remembered on ${pageType} | 15 | merge-into:persists remembered volume after full page reload on ${pageType} | 3 | The home hop is a full page.goto in both directions (navigation.ts:136,216), so after the hop this is exactly the reload test - except that lines 23-24 disable and re-enable the feature, meaning the final poll is satisfi… |
| video volume should be remembered across multiple navigations | 110 | merge-into:rememberVolume stores independent volumes per page type | 1 | watch -> home -> shorts -> watch, then a disable/enable toggle at 119-120 before asserting 50, so the restore is again performed by onEnable, not by the multi-hop navigation. Its only unique value today is that it assert… |
| loop expansion over the live page (all tests inside `for (const pageType of testPages)`) | 14 | reduce-pages:watch,shorts | 4 | On the live fixture the URL is a /watch?v= page (navigation.ts:235), so isWatchPage() is true and isLivePage() is false (src/utils/url/index.ts:83-86,112-115): restoreVolume and setupVolumeChangeListener execute the iden… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| re-applies volume after disable then re-enable on ${pageType} | 95 | high | The assertion cannot fail. Line 98 sets the volume to `volume` and line 99 confirms it; disableFeature only removes the volumechange listener (index.ts:36) and enableFeature's restore writes back the same stored `volume`… | After disableFeature (line 100) add `await setVolume(page, 80, pageType)` and assert 80 (safe: with the listener removed the stored value stays at `volume`), then enableFeature and poll for `volume`. Only a real onEnable… |
| restores original volume when disabled after being enabled on ${pageType} | 78 | medium | The title promises a restoration that the feature never performs - onDisable only calls eventManager.removeEventListeners("rememberVolume") (index.ts:36). The body never observes any restoration; it ends on the same weak… | Rename to "stops recording volume changes after disable on ${pageType}" and replace the negative volume poll with a state assertion: after disabling and setting 50, poll readStoredState(page) and assert rememberVolume[pa… |
| video volume shouldn't be remembered when disabled on ${pageType} | 33 | medium | The negative poll at 40-45 is near-vacuous and its premise fights YouTube: the player persists volume natively, so after the home hop the volume is very likely 10 again, and the test only passes because expect.poll(...).… | Assert the extension-side contract instead: after setting the volume with the feature disabled, assert via readStoredState(page) that state.rememberVolume is undefined / not equal to the set value (no volumechange listen… |
| rememberVolume stores independent volumes per page type | 148 | medium | Lines 159 and 162 assert only `.not.toBe(80)` / `.not.toBe(50)`, which pass on the first differing sample and would also pass if the restore were broken entirely (e.g. YouTube's own default value). The test never verifie… | Poll for the exact values: `.toBe(50)` after returning to watch (line 159) and `.toBe(80)` after returning to shorts (line 162). Both are guaranteed by index.ts:26-29 since the feature stays enabled across the full page … |
| rememberVolume state is stored in extension storage | 131 | low | readStoredState is called once at line 141, immediately after the volume poll, but the write path is asynchronous: volumechange handler -> stateAPI.setState -> sendContentOnlyMessage("featureStateUpdate") -> content scri… | Wrap the read in a poll: `await expect.poll(async () => (await readStoredState(page)).rememberVolume).toMatchObject({ shortsPageVolume: volume, watchPageVolume: volume })`. |

**Missing** (4; 0 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| medium | restores the per-page remembered volume across an in-page (SPA) navigation | watch | onNavigate (src/features/rememberVolume/index.ts:40-42) is never distinctly observed: every navigateToPageType for watch/shorts is a full page.goto (src/utils/_tests/navigation.ts:136,216-220), so the restore in every cu… | src/features/rememberVolume/index.ts:40-42; src/features/_registry/featureOrchestrator.ts:171-190; src/utils/_tests/navi… |
| medium | remembered volume works on the live page type | live | Required as the replacement for dropping live from the loop (see the reduce-pages finding). What it actually protects is dependency gating: getCurrentPageType returns "live" for a live /watch URL (src/utils/url/index.ts:… | src/features/rememberVolume/index.metadata.ts:8; src/features/rememberVolume/index.ts:19,26; src/utils/url/index.ts:40-4… |
| medium | applies the built-in default remembered volume when nothing is stored | watch | With no state:rememberVolume key in storage, hydrateState merges the feature defaults (25) with an undefined stored value (src/features/_registry/featureStateManager.ts:42-57 via featureRegistry.ts:65), so a first-time u… | src/features/rememberVolume/index.ts:44-47; src/features/rememberVolume/index.metadata.ts:20; src/features/_registry/fea… |
| medium | a stored volume of 0 is recorded but never restored | shorts | index.ts:26,28 guard the restore with `watchPageVolume`/`shortsPageVolume` truthiness, so a user who mutes to 0 silently loses the preference; the branch has zero coverage. The intermediate watch visit is what makes it o… | src/features/rememberVolume/index.ts:26,28; src/features/rememberVolume/utils.ts:26-31 |

### removeRedirect

`src/features/__tests__/removeRedirect.spec.ts` — 66 generated cases today, about 9 after the recommendations below.

The spec generates 66 cases per project (6 tests x 11 page types, doubled to 132 across chromium and firefox) yet meaningfully exercises very little. removeRedirect has zero page-specific code (src/features/removeRedirect/index.ts), so the page loop is pure multiplication, and five of the six tests bail out via `if (before.length === 0) return;` on the ~7 page types with no real redirect links, pr…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should remove redirect links when enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should not remove redirect links when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should persist redirect removal after navigation | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should clean dynamically added redirect links | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should re-enable redirect removal after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should persist redirect removal after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should re-enable redirect removal after disable then re-enable on ${pageType} | 68 | remove | 11 | Cannot fail. onDisable is a no-op (index.ts:9) and no cleanup is registered, so disabling restores no href and leaves the observer connected; the closing expectNoRedirects (spec:76) holds even if re-enable does nothing a… |
| should persist redirect removal after navigation on ${pageType} | 45 | merge-into:should persist redirect removal after full page reload on ${pageType} | 11 | navigateToPageType resolves to page.goto (navigation.ts:215-226 -> :130-140), so both tests assert exactly the same thing: the feature is applied at document load from stored config. Neither touches an SPA transition. On… |
| should clean dynamically added redirect links on ${pageType} | 55 | reduce-pages:watch | 10 | index.ts contains no page-type branch and the injected anchor is identical on every page, so the observer path is re-verified 11x. The live run additionally pays navigateToLiveVideo's 120 s hunt (navigation.ts:143-159, :… |
| should not remove redirect links when disabled on ${pageType} | 38 | reduce-pages:watch | 10 | Same default-off no-op on every page (no page branch in index.ts), and on any page whose DOM carries no real redirect links the test returns at spec:41 without asserting anything. |
| should persist redirect removal after full page reload on ${pageType} | 78 | reduce-pages:watch | 10 | Enabled-at-load is page-independent. On live the post-reload navigateToPageType at spec:85 takes the live branch (navigation.ts:143-161) and re-hunts a live video from the channel, so the final assertion at spec:86 can r… |
| should remove redirect links when enabled on ${pageType} | 31 | reduce-pages:watch,channel_home | 9 | Keep watch (description links) plus one channel_home smoke run against real YouTube markup; the remaining 9 runs hit the `if (before.length === 0) return;` guard at spec:34 whenever the page carries no redirect links and… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should remove redirect links when enabled on ${pageType} | 34 | high | `if (before.length === 0) return;` (repeated at spec:41, :48, :71, :81 - five of the six tests) turns the test into a silent pass on every page whose DOM happens to contain no redirect link. The subject of the test is wh… | Inject a known redirect anchor (id + href https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com) before reading `before`, drop the early return, and assert the injected anchor's href attribute becomes https://exam… |
| should re-enable redirect removal after disable then re-enable on ${pageType} | 68 | high | The title promises that re-enabling works, but the body cannot observe it: onDisable is a no-op (index.ts:9), nothing is registered with cleanupRegistry so the observer from the first onEnable stays connected (index.ts:3… | Delete the test and cover the transition with a disable-then-inject test that asserts the fresh anchor is NOT unwrapped (see missing), then a re-enable step that asserts a further injected anchor IS unwrapped to its targ… |
| should not remove redirect links when disabled on ${pageType} | 42 | low | removeRedirect defaults to false (index.metadata.ts:7, surfaced through metadataRegistry.getDefaults in src/utils/config/defaults.ts), and every test gets a fresh profile, so disableFeature at spec:42 hits featureOrchest… | Leave the feature off, inject a known redirect anchor, and assert its href attribute still starts with https://www.youtube.com/redirect? after the poll window, instead of comparing whole-page link counts. |
| should clean dynamically added redirect links on ${pageType} | 66 | medium | expectNoRedirects (spec:15-17) only asserts that no href starts with the redirect prefix. Since the injected anchor is anonymous, the assertion passes if the extension removed the anchor, blanked its href, or rewrote it … | Give the injected anchor an id and assert `page.locator('#yte-test').getAttribute('href')` resolves to "https://example.com", keeping expectNoRedirects only as a secondary check. |
| should clean dynamically added redirect links on ${pageType} | 65 | low | `await page.waitForTimeout(1000)` is a fixed sleep placed immediately before expectNoRedirects, which already polls for up to 15 s (spec:16). It cannot make a passing case pass sooner and only masks the settling conditio… | Delete the waitForTimeout and rely on the polling assertion (or on an expect.poll over the injected anchor's href). |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should rewrite a redirect link to its target URL on watch | watch | The feature's contract is rewriting href to the decoded q parameter (index.ts:14-19, reached from processDocument at index.ts:29-34). Every existing assertion goes through expectNoRedirects (spec:15-17), which only count… | src/features/removeRedirect/index.ts:14-19 and :29-34; src/features/__tests__/removeRedirect.spec.ts:15-17, :31-37 |
| high | should stop unwrapping newly added redirect links after the feature is disabled on watch | watch | onDisable is `() => void 0` and onEnable never calls cleanupRegistry.add, while featureLifecycleManager.disableFeature only runs cleanupRegistry.run(feature.id) (line 44) - so the MutationObserver registered at index.ts:… | src/features/removeRedirect/index.ts:9 and :35-46; src/features/_registry/featureLifecycleManager.ts:44; src/features/_r… |
| medium | should unwrap redirect links rendered after SPA navigation on watch | watch | Every existing navigation/reload test goes through navigateToPageType -> navigateToPage -> page.goto (navigation.ts:130-140, :215-226), i.e. fresh documents where onEnable re-runs from stored config. removeRedirect decla… | src/utils/_tests/navigation.ts:130-140 and :215-226; src/features/_registry/featureOrchestrator.ts:171-186; src/features… |
| medium | should unwrap redirect links nested inside a dynamically added subtree on watch | watch | processNode has two branches: the added node itself carrying href (index.ts:26) and querySelectorAll over its descendants (index.ts:27). The existing dynamic test appends a bare anchor (spec:59-64), so only line 26 runs;… | src/features/removeRedirect/index.ts:24-28; src/features/__tests__/removeRedirect.spec.ts:59-64 |

### restoreFullscreenScrolling

`src/features/__tests__/restoreFullscreenScrolling.spec.ts` — 11 generated cases today, about 7 after the recommendations below.

The spec only verifies that two marker classes are added and removed; it never verifies the feature's actual effect, because every rule in index.css is scoped to [fullscreen] and no test enters fullscreen - that is the biggest gap. Three of the five looped tests are subsets of "re-applies after disable then re-enable", and one of them (spec:21) never enables the feature first, so its title is fals…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should add restore fullscreen scrolling classes | watch, live | 2 |
| should remove restore fullscreen scrolling classes when disabled | watch, live | 2 |
| should restore fullscreen scrolling classes after navigation | watch, live | 2 |
| restores original state when disabled after being enabled | watch, live | 2 |
| re-applies after disable then re-enable | watch, live | 2 |
| should not add restore fullscreen scrolling classes on non-target page | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should add restore fullscreen scrolling classes on ${pageType} | 15 | merge-into:re-applies after disable then re-enable on ${pageType} | 2 | Lines 16-19 are character-for-character the first four statements of the re-enable test (spec:51-54) and of the enable/disable test (spec:42-45). Same lifecycle path (fresh load -> config write -> onEnable), same page, s… |
| should remove restore fullscreen scrolling classes when disabled on ${pageType} | 21 | remove | 2 | The body never enables the feature first and the default is false (index.metadata.ts:46), so updateFeatureEnabledState returns early at featureOrchestrator.ts:152 (hasEnabledChanged false, hasConfigChanged false) and onD… |
| restores original state when disabled after being enabled on ${pageType} | 41 | merge-into:re-applies after disable then re-enable on ${pageType} | 2 | Strict prefix: spec:51-57 repeats spec:42-48 verbatim (navigate, enable, assert both classes, disable, assert both absent) and then adds the re-enable step. Deleting it loses no assertion and no code path. |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should restore fullscreen scrolling classes after navigation on ${pageType} | 27 | high | After navigating away to home and back (spec:33-34) the test disables and re-enables the feature (spec:35-36) before asserting, so the closing assertions at spec:37-38 only re-prove that onEnable works; the state produce… | Delete spec:35-36 and assert both classes immediately after the second navigateToPageType (spec:34). Keep the test on both watch and live, since the two variants cover different paths (watch = full reload with the featur… |
| should not add restore fullscreen scrolling classes on non-target page | 67 | medium | nonTargetPage resolves to channel_home (resolveNonTargetPage in src/utils/_tests/utils.ts:3-5 over the pageTypes order in _registry/types.ts:282-294, minus includePages watch/live and the login pages), whose fixture is h… | Replace spec:67 with `await expect(page.locator("ytd-watch-flexy.yte-ytd-watch-flexy-restore-fullscreen-scrolling")).toHaveCount(0);` (toHaveCount is an array expression and is satisfied by zero elements); leave the ytd-… |
| should remove restore fullscreen scrolling classes when disabled on ${pageType} | 21 | medium | The title promises that disabling removes the classes, but the body never enables the feature. The default is false (src/features/restoreFullscreenScrolling/index.metadata.ts:46), so the disable write changes nothing: in… | Delete the test - the real enable-then-disable transition is already asserted at spec:42-48 and spec:51-57. If kept, add `await enableFeature(page, "restoreFullscreenScrolling.enabled")` plus a positive class assertion b… |

**Missing** (1; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | restores page scrolling while in fullscreen on watch | watch | Every rule in index.css is scoped to [fullscreen], and no test in the repo ever enters fullscreen with this feature on (grep for "restoreFullscreenScrolling" hits only its own metadata, index.ts and this spec). All 11 ex… | src/features/restoreFullscreenScrolling/index.css:1-8 (both rules require [fullscreen]); spec asserts only class strings… |

### saveToWatchLaterButton

`src/features/__tests__/saveToWatchLaterButton.spec.ts` — 21 generated cases today, about 21 after the recommendations below.

The spec is presence-only: nine tests all check that .yte-save-to-watch-later-button attaches or detaches. Every behaviour that makes the feature useful is untested - the actions-row toggle click, the card-button save-and-remove, the Watch Later membership check that picks the initial icon, the lockup placement plus index.css that makes the card button visible, the mix/playlist filter, and the Mut…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| toggling feature should not crash the page | home, subscriptions, watch | 3 |
| save button should appear when enabled | home, subscriptions, watch | 3 |
| save button should be removed when disabled | home, subscriptions, watch | 3 |
| save button should persist after navigation when enabled | home, subscriptions, watch | 3 |
| save button should re-appear after disable then re-enable | home, subscriptions, watch | 3 |
| save button should persist after full page reload | home, subscriptions, watch | 3 |
| should not create save button on non-target page | — | 1 |
| watch page actions row › renders a native toggle button in the actions row | — | 1 |
| watch page actions row › removes the actions row button when disabled | — | 1 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| toggling feature should not crash the page on ${pageType} | 19 | remove | 3 | Tautological: it only asserts `body` is attached after enable and after disable, which holds even if setupSaveToWatchLaterButtons throws, and it burns 1.5 s of fixed sleeps per page. Both lifecycle paths it nominally exe… |
| save button should be removed when disabled on ${pageType} | 37 | remove | 3 | Its body is a byte-for-byte prefix of the re-enable test (spec:55-64), which already navigates, enables, asserts attachment, disables and asserts `not.toBeAttached()` before continuing. Nothing needs to be merged - the s… |
| removes the actions row button when disabled | 93 | remove | 1 | onDisable removes every element matching `.yte-save-to-watch-later-button` in one loop (index.ts:126-133); the watch instance of the re-enable test already asserts that *no* element with that class is attached after disa… |
| save button should persist after full page reload on ${pageType} | 66 | reduce-pages:home, watch | 1 | The load-time (enabled-at-startup) path branches only on `onWatchPage`; home and subscriptions differ solely by the page type interpolated into the container selector, and the subscriptions interpolation is already prove… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| save button should persist after navigation when enabled on ${pageType} | 46 | high | No navigation happens. `getFixture` deterministically returns the first fixture for a page type (navigation.ts:125-132), so the second `navigateToPageType(page, pageType)` resolves to the same URL, and `navigateToYoutube… | Do a real in-page navigation: on watch click a sidebar lockup title (or navigate then `page.goBack()`), wait for `html[yte-ready]`, then assert the button is attached and, on watch, that exactly one `.yte-save-to-watch-l… |
| should not create save button on non-target page | 77 | medium | The assertion cannot fail. `resolveNonTargetPage` returns the first non-included, non-login page in `pageTypes`, i.e. `channel_home` (utils.ts:3-5, types.ts:282-294). Even if the includePages gate at featureNavigationMan… | Replace the cold load with a live transition that can actually fail: enable the feature on home, assert buttons attach, navigate in-page to the channel page, and assert `.yte-save-to-watch-later-button` is not attached, … |
| renders a native toggle button in the actions row | 90 | low | `expect(await actionsRowButton.evaluate((el) => el.tagName.toLowerCase())).toBe("yt-button-view-model")` cannot fail: `BUTTON_CLASS` is only ever set by createSaveButton -> createNativeButton, which creates a `yt-button-… | Drop the tagName assertion and assert something YouTube's renderer actually produced - e.g. `rawProps.data.iconName === "WATCH_LATER"` on the host plus the inner control's accessible name being `Save to Watch Later` (but… |

**Missing** (7; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | clicking the actions row button toggles between the save and saved states | watch | The toggle is the feature's primary action and has zero coverage; a broken delegated click listener, a broken rowSaved bookkeeping or a broken swapButton still passes all 21 current cases, which only assert attachment. | index.ts:49-59 (delegated capture listener, lockup-vs-row branch), buttons.ts:110-131 (toggle -> performPlaylistEdit -> … |
| high | SPA navigating to another video rebuilds exactly one actions row button | watch | onNavigate is the only lifecycle hook with literally zero execution in this spec: the existing navigation test performs no navigation (see incorrect finding). onNavigate tears down, removes just the stale actions-row but… | index.ts:138-146, buttons.ts:32 (dedupe selector), buttons.ts:83-84 (ensureButton early-return guard), navigation.ts:215… |
| high | clicking a card save button saves the video and removes that card's button for good | home | Covers performPlaylistEdit success plus markLockupSaved - the skippedLockups guard is the only thing stopping the very next MutationObserver pass from re-adding the button it just removed, and nothing observes it. | index.ts:61-74, buttons.ts:34 (skippedLockups skip), buttons.ts:158-160 (markLockupSaved) |
| medium | actions row button shows the saved state for a video already in Watch Later | watch | ensureButton inserts optimistically in the unsaved state and only corrects itself after `isVideoInPlaylist(videoId, "WL")` resolves; that corrective swapButton(true) path has no coverage, so a broken membership check ren… | buttons.ts:91-104, src/utils/youtube/index.ts:15-19 |
| medium | card save button is placed in the lockup menu wrapper and keeps that wrapper visible | home | Placement plus index.css are what make the card button reachable; today a button appended anywhere in the document satisfies every assertion, and the CSS (which is what stops the button from being clipped/hidden) is comp… | buttons.ts:42-50 (menuWrapper.insertBefore(host, nativeMenuButton)), constants.ts:4, index.css:3-10 |
| medium | no save button is added to mix, playlist or album lockups | home | isSaveableVideoData is a real branch with zero coverage - saving a mix to WL would fail - and readLockupData exposes contentType to page.evaluate, so the filter is directly observable. | buttons.ts:37-40, buttons.ts:168-172, nativeComponents.ts:101-105 |
| medium | lazily loaded feed cards receive a save button | home | The MutationObserver pass (with its IGNORED_MUTATION_ROOTS filter and rAF coalescing) is what keeps the feature working on an infinite feed, and nothing exercises it. injectDynamicContent genuinely cannot substitute: a c… | index.ts:88-105, constants.ts:7, nativeComponents.ts:101-105 |

### screenshotButton

`src/features/__tests__/screenshotButton.spec.ts` — 19 generated cases today, about 15 after the recommendations below.

screenshotButton.spec.ts spends 19 generated cases proving the button exists in every container and moves on fullscreen — behaviour buttonController.spec.ts already proves with this exact button — while the feature's own logic is largely unverified. Five of the nine config fields (format, filename, dateFormat, timestampFormat, timestampSeparator) have zero coverage anywhere in the repo: no spec ev…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should take a screenshot and save as file | watch, live | 2 |
| should take a screenshot and copy it to the clipboard | watch, live | 2 |
| should take a screenshot and save as file and copy to clipboard | watch, live | 2 |
| screenshot button should not be present when disabled | watch, live | 2 |
| screenshot button should persist after navigation | watch, live | 2 |
| screenshot button should re-appear after disable then re-enable | watch, live | 2 |
| screenshot button should persist after full page reload | — | 1 |
| should not create screenshot button on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |

**Not needed** (10)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should render button in ${placement} | 123 | remove | 2 | Confirmed byte-for-byte duplicate: buttonController.spec.ts:137-144 loops left/right/below on watch with the same setOption-then-enable order, the same id 'yte-feature-screenshotButton-button' and the same expectFeatureB… |
| should move button from left to right on fullscreen enter/exit | 141 | remove | 1 | No screenshotButton-specific code exists on this path (featureButtonManager.updateButtonPlacement / buttonController handle it generically). buttonController.spec.ts already proves screenshotButton moves right->left (:89… |
| should not move button when fullscreenPlacement is same | 153 | remove | 1 | Identical body to buttonController.spec.ts:100-110 with loopButton substituted (same placement right, same 'same' value, same three assertions). The 'same' short-circuit lives in featureButtonManager, not in screenshotBu… |
| screenshot button should not be present when disabled on ${pageType} | 78 | remove | 2 | screenshotButton.button.enabled defaults to false (buttonField in src/features/_registry/defineConfig.ts), so the button was never added and disableFeature changes nothing - the assertion holds with the disable path comp… |
| should render button in feature menu | 132 | remove | 1 | buttonController.spec.ts:34-39 asserts exactly the same locator (expectFeatureMenuItemToBeTruthy on 'yte-feature-screenshotButton-menuitem') after the same feature_menu placement change on watch. Spend the slot on the mi… |
| screenshot button should persist after full page reload | 105 | merge-into:screenshot button should persist after navigation on watch | 1 | Verified in the helper: navigateToPageType -> navigateToYoutubePage -> navigateToPage uses page.goto whenever the URL differs (navigation.ts:216), so the navigation test already tears down and re-initialises the extensio… |
| should take a screenshot and copy it to the clipboard on ${pageType} | 32 | reduce-pages:watch | 1 | copyToClipboard is page-agnostic (canvas -> ClipboardItem, no live/VOD branch anywhere in index.ts). Live costs a channel crawl with a 120 s test timeout (navigation.ts:146-160,187-214); one live smoke case ('save as fil… |
| should take a screenshot and save as file and copy to clipboard on ${pageType} | 55 | reduce-pages:watch | 1 | saveAs 'both' is the two page-agnostic ifs at index.ts:97-102; the live copy re-runs live discovery to assert the union of the two watch cases. |
| screenshot button should persist after navigation on ${pageType} | 83 | reduce-pages:watch | 1 | On live this triggers navigateToLiveVideo twice (once per navigateToPageType call) to assert a page-agnostic re-add after a document load; the watch case asserts the identical thing. |
| screenshot button should re-appear after disable then re-enable on ${pageType} | 92 | reduce-pages:watch | 1 | The enable/disable/enable cycle is handled entirely by featureButtonManager.updateButtonPlacement with no page-type branch, and buttonController.spec.ts:145 already covers the disable half on watch; the live copy only pa… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| screenshot button should not be present when disabled on ${pageType} | 78 | medium | The title promises a disable behaviour the body never triggers. button.enabled defaults to false (buttonField, src/features/_registry/defineConfig.ts), so at spec:80 disableFeature writes the value it already has; the bu… | Delete it (buttonController.spec.ts:145-152 and spec:92 both cover the real enable->disable transition), or enable + assert attached first, then disable and assert removal. |
| should take a screenshot and copy it to the clipboard on ${pageType} | 42 | low | The test parameterises on screenshotButton.format, but copyToClipboard hardcodes `const mimeType = "image/png"` (index.ts:54) and never reads the format config; the options page even disables the format select when saveA… | Drop the format setOption, assert the literal 'image/png', and cover format in a saveAs 'file' test that checks download.suggestedFilename() (and the file's magic bytes). |
| should take a screenshot and save as file on ${pageType} | 30 | low | `expect(download).toBeTruthy()` can never fail: page.waitForEvent("download") either resolves with a Download object or throws on timeout. The only real assertion is the implicit wait; name, extension and format go unche… | Replace with an assertion on download.suggestedFilename() matching the configured template and extension (e.g. /^Screenshot-dQw4w9WgXcQ-.+\.png$/ for the defaults). |
| should take a screenshot and save as file and copy to clipboard on ${pageType} | 71 | low | Ordering bug: the tooltip assertion runs only after `await downloadPromise`, but index.ts:97-102 awaits copyToClipboard first and schedules remove() 1200 ms after the clipboard write, then runs saveToFile (a full-resolut… | Assert the tooltip immediately after clickFeatureButton (or start the toBeVisible check before awaiting the download) and await the download afterwards. |
| should take a screenshot and copy it to the clipboard on ${pageType} | 47 | low | Lines 47-48 re-declare and re-assert the exact getByText check already made on line 46, and line 53's `expect(screenshotCopied).toBeTruthy()` asserts a JSHandle, which is always truthy - waitForFunction only resolves whe… | Delete lines 47-48 and replace line 53 with `expect(await screenshotCopied.jsonValue()).toBe(true)`, as the 'both' test does at line 76. |

**Missing** (8; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should name the downloaded file from the filename template and date format | watch | filename and dateFormat are user-facing config fields with literally zero coverage in the repo: grep for suggestedFilename over src returns only the two waitForEvent("download") lines in this spec and no filename asserti… | src/features/screenshotButton/index.ts:73-90 (videoId from ?v=, resolveFilenameTemplate, downloadName); src/utils/format… |
| high | should save the screenshot in the selected format | watch | Only the png default is ever produced (the clipboard test's format setOption is inert, see below). The extension is taken straight from the config string at index.ts:90 while the encoding comes from canvas.toBlob(`image/… | src/features/screenshotButton/index.ts:70-71,90; src/features/screenshotButton/types.ts:3 (png\|jpeg\|webp); no format ass… |
| medium | should fall back to the default filename template when the template resolves to empty | watch | resolveFilenameTemplate returns null for an empty result and index.ts:87-89 falls back to the default template; a user-supplied template made only of unresolvable/empty placeholders is a real path and produces a nameless… | src/features/screenshotButton/index.ts:86-89; src/utils/format/filenameTemplate.ts:105-124 (removeInvalidPlaceholders ->… |
| medium | should not copy to the clipboard when saveAs is file (and should not download when saveAs is clipboard) | watch | Every saveAs case is asserted only positively, so an implementation that always ran both branches would pass all six existing click tests. Both negatives are observable (tooltip id exists only in copyToClipboard; the dow… | src/features/screenshotButton/index.ts:97-102 (the two ifs); index.ts:45-51 (tooltip created only in copyToClipboard) |
| medium | should take a screenshot from the feature menu item | watch | feature_menu is only ever checked for existence (spec:132-137 and buttonController.spec.ts:34-39). clickFeatureMenuItem exists but is dead: grep over src/features/__tests__ finds the helper only at its definition, and no… | src/utils/_tests/features.ts:28-38 (helper, zero call sites); spec:132-137; src/features/screenshotButton/index.ts:112-1… |
| medium | should resolve the resolution and video timestamp placeholders in the filename | watch | timestampFormat and timestampSeparator have zero coverage anywhere, and this is the only way to observe the videoWidth/offsetWidth/640 dimension fallback that sizes the canvas. 'hyphen' is the right choice because saniti… | src/features/screenshotButton/index.ts:19-22,80-85; src/features/screenshotButton/utils.ts:42-67; src/utils/format/filen… |
| low | should not append a duplicate extension when the template already ends with the format | watch | Explicit case-insensitive de-duplication branch with no coverage; cheap to fold into another download test. | src/features/screenshotButton/index.ts:90 |
| low | should remove the clipboard tooltip after the copy completes | watch | ADDED while verifying: the 1200 ms tooltip teardown is real, observable by id, and asserted by nothing - the id #yte-feature-screenshotButton-tooltip appears nowhere in any spec (only the visible text is matched), so a l… | src/features/screenshotButton/index.ts:45-62 (createTooltip + setTimeout(remove, 1200)); src/utils/dom/tooltip.ts:15-67 … |

### scrollWheelSpeedControl

`src/features/__tests__/scrollWheelSpeedControl.spec.ts` — 16 generated cases today, about 19 after the recommendations below.

The spec exercises the happy path well (increase/decrease on watch and shorts, three modifier keys, the stepper burst and the disabled state) but has three structural holes. (1) The two "should persist scroll wheel speed control after navigation" tests are self-defeating: spec:31 disables the feature and adjustWithScrollWheel then re-navigates and re-enables it (src/utils/_tests/player.ts:44,53), …

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should increase speed | watch, shorts | 2 |
| should decrease speed | watch, shorts | 2 |
| should persist scroll wheel speed control after navigation | watch, shorts | 2 |
| re-applies speed control after disable then re-enable | watch, shorts | 2 |
| should increase speed when holding 'Alt' modifier key | — | 1 |
| should decrease speed when holding 'Alt' modifier key | — | 1 |
| should increase speed when holding 'Ctrl' modifier key | — | 1 |
| should decrease speed when holding 'Ctrl' modifier key | — | 1 |
| should increase speed when holding 'Shift' modifier key | — | 1 |
| should decrease speed when holding 'Shift' modifier key | — | 1 |
| stepper › applies every notch of a rapid wheel burst | watch | 1 |
| stepper › stops adjusting speed once disabled | watch | 1 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should increase speed when holding 'Alt' modifier key | 41 | remove | 1 | adjustWithScrollWheel defaults modifierKey to "altKey" and pageType to "watch" (player.ts:27-29), so this call is argument-for-argument identical to "should increase speed on watch" (spec:22 vs spec:46: same controlType,… |
| should decrease speed when holding 'Alt' modifier key | 48 | remove | 1 | Identical to "should decrease speed on watch" for the same reason (helper defaults altKey/watch). |
| should decrease speed when holding 'Ctrl' modifier key | 48 | remove | 1 | The gate is a single boolean lookup event[speedModifierKey] (index.ts:216) and direction is handled independently by the stepper sign and queueSteps' negation (stepper.ts:58-76, index.ts:240); there is no modifier x dire… |
| should decrease speed when holding 'Shift' modifier key | 48 | remove | 1 | Same argument: only the modifier differs, and the decrease path is already covered by "should decrease speed on watch" plus the shift increase case. |
| re-applies speed control after disable then re-enable on shorts | 34 | reduce-pages:watch | 1 | The disable/re-enable transition has no shorts branch (scrollWheelSpeedControl/index.ts:9-15; disableScrollWheelControl only special-cases "volume", index.ts:70-75). The shorts-specific parts of re-enabling (findPlayerCo… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist scroll wheel speed control after navigation on watch | 27 | high | The test cannot fail for the reason its title claims. After navigating home and back, spec:31 disables the feature and the final adjustWithScrollWheel call re-enables it (src/utils/_tests/player.ts:53) before scrolling, … | Drop the disableFeature call at spec:31 and stop calling adjustWithScrollWheel after the navigation: after navigateToPageType(page, watch), set the rate with setValueOnYouTubePlayer, dispatch one notch via dispatchWheelN… |
| should persist scroll wheel speed control after navigation on shorts | 27 | high | Same body on shorts: the disable at spec:31 plus the helper's re-enable (player.ts:53) means the post-navigation shorts path (findPlayerContainer -> div#shorts-player at index.ts:179, attachWheelListeners' shorts contain… | Same fix: after navigateToPageType(page, "shorts"), assert with setValueOnYouTubePlayer + dispatchWheelNotches + getCurrentSpeed only, without disabling or re-enabling. |
| should increase speed on watch | 21 | medium | The helper fires its single wheel notch (player.ts:68) after nothing but enableFeature's fixed 500 ms wait (features.ts:70). Unlike the volume path, which awaits waitForScrollWheelVolumeControl (player.ts:54), the speed … | Give the speed control a body marker mirroring the volume control's yte-scroll-wheel-volume-control (scrollWheelController/index.ts:99-103) and await it with a waitForScrollWheelSpeedControl helper. Do not simply re-disp… |
| applies every notch of a rapid wheel burst on watch | 69 | low | enableSpeedControl guesses at listener attachment with a hard-coded page.waitForTimeout(1000) (spec:64-65) instead of awaiting a condition. On a slow enable the burst is dropped and the test fails; on a fast one it burns… | Same root fix: expose a body class when the speed control attaches and await it, so both stepper tests can drop the fixed sleep. |

**Missing** (7; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | applies an updated step size without reloading on watch | watch | steps has zero real coverage: adjustWithScrollWheel writes 0.25 (player.ts:45) and the spec passes 0.25 everywhere (spec:15, spec:28, spec:61), which is exactly the metadata default, so hard-coding the step in applySpeed… | src/features/scrollWheelSpeedControl/index.metadata.ts:8 (steps default 0.25; min 0.05/max 1 at :48-49); src/features/sc… |
| high | does not change speed when scrolling without the configured modifier key on watch | watch | onWheel gates on event[speedModifierKey] and every existing test holds the configured key, so a build that dropped the gate (hijacking plain page scrolling over the player) passes the whole spec. The only negative test, … | src/features/scrollWheelController/index.ts:216 and :220-223; spec:40-54 always passes withModifierKey: true with the sa… |
| medium | shows the on-screen display when the speed changes on watch | watch | applySpeedSteps' showOnScreenDisplay call and the OSD manager's type==="speed" text branch (`${value.toFixed(2)}x`) have zero coverage; onScreenDisplay.spec.ts drives the display exclusively through the volume control, s… | src/features/scrollWheelController/index.ts:128; src/ui/OnScreenDisplayManager/index.ts:164 (speed text branch); src/fea… |
| medium | speed control takes the wheel event when the volume control is also enabled on watch | watch | The "volume always yields to the speed modifier" rule is an explicit commented branch, and no spec enables both controls in one context. If the else-if at :220 became a second if, an alt+scroll would move both speed and … | src/features/scrollWheelController/index.ts:216-222; src/features/scrollWheelVolumeControl/index.metadata.ts:10 (holdMod… |
| low | applies an updated modifier key without reloading on watch | watch | Distinct from the steps test: steps is read from controlConfigs at apply time while the modifier is read from the derived dispatchConfig, so a change that stopped calling rebuildDispatchConfig on config change would pass… | src/features/scrollWheelSpeedControl/index.ts:8; src/features/scrollWheelController/index.ts:106-109 and :261-275; spec:… |
| low | does not adjust speed on live | live | findPlayerContainer admits live only for the volume control, so the speed control must find no container and disable itself; nothing verifies that. Priority lowered from medium and the assertion changed because the audit… | src/features/scrollWheelController/index.ts:178 and :186 (pageTypes ["watch","shorts"] for speed); src/features/playerSp… |
| low | scroll wheel speed change updates the playback speed button tooltips on watch | watch | applySpeedSteps calls updatePlaybackSpeedButtonTooltips after every step and neither spec covers it; playbackSpeedButtons.spec.ts never scrolls. Assertion corrected: the function writes button.dataset.title, not title/ar… | src/features/scrollWheelController/index.ts:127; src/features/playbackSpeedButtons/index.ts:36-45 and :72 (button.datase… |

### scrollWheelVolumeControl

`src/features/__tests__/scrollWheelVolumeControl.spec.ts` — 29 generated cases today, about 24 after the recommendations below.

The spec proves the happy path well (all three declared pages, live step-size change, burst flushing, disable) but never proves a single negative: every gate in onWheel (scrollWheelController/index.ts:216-231) is only ever exercised with the gate satisfied, so holdModifierKey, holdRightClick, modifierKey selection, the speed-control precedence rule, the volume-boost-button and settings-panel exclu…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should increase volume | watch, live, shorts | 3 |
| should decrease volume | watch, live, shorts | 3 |
| should persist volume control after navigation | watch, live, shorts | 3 |
| re-applies volume control after disable then re-enable | watch, live, shorts | 3 |
| should increase volume when holding 'Alt' modifier key | — | 1 |
| should decrease volume when holding 'Alt' modifier key | — | 1 |
| should increase volume when holding 'Alt' modifier key and holding 'Right' click | — | 1 |
| should decrease volume when holding 'Alt' modifier key and holding 'Right' click | — | 1 |
| should increase volume when holding 'Ctrl' modifier key | — | 1 |
| should decrease volume when holding 'Ctrl' modifier key | — | 1 |
| should increase volume when holding 'Ctrl' modifier key and holding 'Right' click | — | 1 |
| should decrease volume when holding 'Ctrl' modifier key and holding 'Right' click | — | 1 |
| should increase volume when holding 'Shift' modifier key | — | 1 |
| should decrease volume when holding 'Shift' modifier key | — | 1 |
| should increase volume when holding 'Shift' modifier key and holding 'Right' click | — | 1 |
| should decrease volume when holding 'Shift' modifier key and holding 'Right' click | — | 1 |
| should increase volume when holding 'Right' click | — | 1 |
| should decrease volume when holding 'Right' click | — | 1 |
| stepper › applies every notch of a rapid wheel burst | watch | 1 |
| stepper › applies an updated step size without reloading | watch | 1 |
| stepper › stops adjusting volume once disabled | watch | 1 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| re-applies volume control after disable then re-enable on ${pageType} | 30 | merge-into:stops adjusting volume once disabled on watch | 3 | The second adjustWithScrollWheel call re-navigates (player.ts:44) before it re-enables, so on every page type - not just live - the disable/re-enable transition happens across a full reload and is identical to the plain … |
| should increase/decrease volume when holding '<Alt\|Ctrl\|Shift>' modifier key and holding 'Right' click | 37 | remove | 5 | onWheel evaluates the modifier gate and the right-click gate as independent conjuncts (index.ts:220) and neither combo test asserts the extra effect of holdRightClick (the context-menu class), so five of the six are pure… |
| should decrease volume when holding 'Alt' modifier key | 55 | remove | 2 | Direction is decided by deltaY sign in the stepper and queueSteps, with no modifier-dependent branch; the Alt and Shift decrease cases repeat "should decrease volume when holding 'Ctrl' modifier key" exactly (the same ap… |
| should decrease volume on ${pageType} | 20 | reduce-pages:watch | 2 | The only page-specific branch is the container lookup in findPlayerContainer (index.ts:174-190) plus the shorts video.volume sync, and the increase tests already exercise all three pages; direction adds no page-specific … |
| should persist volume control after navigation on ${pageType} | 23 | reduce-pages:watch | 2 | Reload persistence goes through the same onEnable path on every page; keeping the live and shorts copies re-runs navigateToLiveVideo twice more for no extra branch. (Fix the watch copy per the incorrect finding so it act… |
| should decrease volume when holding 'Right' click | 76 | remove | 1 | The right-click gate is direction-agnostic (index.ts:220 only inspects event.buttons); the decrease direction is already asserted by "should decrease volume on watch" and by the Ctrl decrease test. |

**Incorrect** (2)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist volume control after navigation on ${pageType} | 23 | high | Nothing about persistence is asserted. Line 27 disables the feature and the second adjustWithScrollWheel then navigates again (player.ts:44), re-writes steps, re-enables the feature (player.ts:53) and waits for the body … | Drop the disableFeature call and do not reuse adjustWithScrollWheel for the second half: after navigateToPageType(page, pageType), call waitForScrollWheelVolumeControl(page, true), setVolume(page, volume, pageType), then… |
| re-applies volume control after disable then re-enable on ${pageType} | 30 | medium | The test never observes the disabled state (no assertion between line 32 and line 33), and the re-enable never happens on the disabled page: adjustWithScrollWheel starts with navigateToPageType (player.ts:44), which is a… | Delete the three generated cases and extend "stops adjusting volume once disabled on watch": after the no-op assertion, enableFeature, waitForScrollWheelVolumeControl(page, true), dispatch one notch and expect volume + 2… |

**Missing** (10; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | ignores a wheel notch with the wrong modifier when 'holdModifierKey' is on on watch | watch | All six modifier tests dispatch exactly the configured key (spec:36-72, player.ts:46-49,61-64), so both the `!volumeHoldModifierKey \|\| event[volumeModifierKey]` gate and the modifierKey selection could be deleted from on… | src/features/scrollWheelController/index.ts:220 (`(!volumeHoldModifierKey \|\| event[volumeModifierKey])`); spec lines 36-… |
| high | does not change the volume when 'holdRightClick' is on and no button is held on watch | watch | spec:73-78 and the six combo tests only ever dispatch buttons:2 while holdRightClick is on, so the `!volumeHoldRightClick \|\| event.buttons === 2` conjunct is never observed rejecting anything. | src/features/scrollWheelController/index.ts:220; src/utils/_tests/player.ts:50-52,65-67 |
| high | hides the YouTube context menu while right-click scrolling and restores it on watch | watch | The class add (onWheel), the contextmenu teardown and the CSS rule that actually hides the native menu are the visible half of holdRightClick and nothing in src/features/__tests__ references `yte-context-menu-visible` or… | src/features/scrollWheelController/index.ts:228-231 (add), 192-200 (onContextMenu removes it), 202-210 (mouseup path); s… |
| medium | clamps and snaps the volume to a multiple of the step size on watch | watch | Every existing test starts from volume 10 with steps 5 (constants.ts:23, spec:18-104), a multiple of the step, so neither `toDivisible` nor `clamp(…,0,100)` is exercised. | src/features/scrollWheelController/index.ts:138; src/utils/math/index.ts:4 `toDivisible = Math.ceil(value / divider) * d… |
| medium | unmutes the player when the volume is scrolled while muted on watch | watch | The unmute branch is user-facing (scrolling should restore audio) and no spec mutes the player before scrolling. | src/features/scrollWheelController/index.ts:143-146; note isMuted is not a get* key so getValueFromYouTubePlayer cannot … |
| medium | yields to the speed control when its modifier is held on watch | watch | The precedence rule has no test here and none in scrollWheelSpeedControl.spec.ts (which never enables the volume control); onWheel dedupes to a single listener via eventManager (EventManager.ts:46-60), so the assertion i… | src/features/scrollWheelController/index.ts:216-219; src/features/__tests__/scrollWheelSpeedControl.spec.ts (no volume-c… |
| medium | ignores wheel events over the volume boost button on watch | watch | The exclusion is a named conflict with the boost button's own wheel handler and neither spec dispatches a wheel over the button; without the exclusion the player volume would move as well. | src/features/scrollWheelController/index.ts:225 with getFeatureButtonId -> `yte-feature-volumeBoostButton-button` (Butto… |
| medium | ignores wheel events over the YouTube settings panel on watch | watch | The settings-panel exclusion protects menu scrolling and no spec dispatches a wheel inside the panel (openYouTubeSettingsOnHover.spec.ts only asserts visibility). | src/features/scrollWheelController/index.ts:226-227; src/utils/dom/selectors/index.ts:31 |
| medium | keeps adjusting the volume after an in-page navigation that swaps the player container | watch -> shorts | onNavigate is never observed: navigateToPageType is page.goto (navigation.ts:136), a full reload that runs onEnable instead. Note the audited draft's watch -> watch variant would prove nothing, because div#player/#movie_… | src/features/scrollWheelVolumeControl/index.ts:17-19; src/features/scrollWheelController/index.ts:87-98,150-157; src/uti… |
| low | treats a line-mode wheel event as a single notch on watch | watch | The line/page normalisation branch (Firefox reports lines) never runs because the helper always sends deltaMode 0 pixel deltas. | src/features/scrollWheelController/stepper.ts:80-89; src/utils/_tests/player.ts:94-100 |

### shareShortener

`src/features/__tests__/shareShortener.spec.ts` — 24 generated cases today, about 14 after the recommendations below.

shareShortener has two mechanisms: the #share-url MutationObserver plus its 50 ms re-clean interval (shareShortener/utils.ts:18-57), and cleanSearchPage's href rewrite on results pages (utils.ts:7-16). The spec exercises only the first, multiplied 6 x 4 pages where no page-specific branch exists, and spec:54 duplicates spec:76 while its body contradicts its title. Two structural defects weaken wha…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should remove share params when enabled | watch, shorts, live, search | 4 |
| should preserve share params when disabled | watch, shorts, live, search | 4 |
| should persist share params cleanup after navigation | watch, shorts, live, search | 4 |
| re-applies after disable then re-enable | watch, shorts, live, search | 4 |
| persists after full page reload | watch, shorts, live, search | 4 |
| restores share params when disabled after being enabled | watch, shorts, live, search | 4 |

**Not needed** (6)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist share params cleanup after navigation on ${pageType} | 54 | remove | 4 | navigateToPageType(home) then navigateToPageType(pageType) are two page.goto calls (navigation.ts:136), so "away and back" is exactly the enabled-at-document-load path already asserted by `persists after full page reload… |
| re-applies after disable then re-enable on ${pageType} | 66 | reduce-pages:watch | 3 | The disable/re-enable cycle only runs removeObserver + setupShareShortener (index.ts:13-14). removeObserver clears an interval (utils.ts:31-40) and observeShareURLInput observes document.body (utils.ts:18-29) — neither h… |
| persists after full page reload on ${pageType} | 76 | reduce-pages:watch | 3 | Enabled-at-load init is page-agnostic (index.ts:6-9,11-19). Additionally the live case never asserts the reloaded document at all: navigateToPageType("live") at spec:82 re-enters navigateToLiveVideo, which goes back to t… |
| restores share params when disabled after being enabled on ${pageType} | 86 | reduce-pages:watch | 3 | onDisable is removeObserver, which only clears the interval (index.ts:13; utils.ts:31-40) — no page-specific behaviour, so three of the four cases repeat the identical transition. (The remaining watch case still needs th… |
| should remove share params when enabled on ${pageType} | 42 | reduce-pages:watch,shorts,search | 1 | A live stream is a /watch document and neither index.ts nor utils.ts has a live/VOD branch, so the live case duplicates watch while navigateToPageType raises the test budget to 120 s and burns a channel crawl plus a .ytp… |
| should preserve share params when disabled on ${pageType} | 48 | reduce-pages:watch,shorts,search | 1 | Same live/watch duplication with the same 120 s cost. The watch, shorts and search cases stay: each is the per-page control proving YouTube actually emits si/pp in that dialog, which is what keeps the enabled test non-va… |

**Incorrect** (5)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should remove share params when enabled on ${pageType} | 46 | high | expect.poll(...).not.toMatch passes on its first sample. openShareDialog only awaits toBeVisible on #share-url (spec:37), which an input with an empty value satisfies, so an empty or not-yet-populated field satisfies `.n… | Poll until the value is a real share URL first (e.g. expect.poll(getShareUrl).toMatch(/^https:\/\/(youtu\.be\|(www\.)?youtube\.com)\//)), then assert that populated value does not match SHARE_PARAM_REGEXP. Apply at spec:4… |
| re-applies after disable then re-enable on ${pageType} | 73 | high | The dialog opened at spec:69 is never closed, so openShareDialog at spec:73 clicks into an open modal: the page-level Share button sits under the dialog backdrop, so the click either fails Playwright's hit-target check u… | Close the dialog before reopening: press Escape, await expect(page.locator('#share-url')).toBeHidden(), then call openShareDialog again (and the search branch needs the action menu closed too). |
| restores share params when disabled after being enabled on ${pageType} | 92 | high | Same un-closed dialog. Beyond the blocked click, the assertion is not a valid observation of onDisable: a reused share panel keeps the value that was cleaned at spec:90, so spec:93 can fail even when disabling worked cor… | Press Escape and wait for the dialog to be hidden, disable the feature, reopen the dialog so YouTube regenerates the URL, then assert the freshly generated value matches SHARE_PARAM_REGEXP. |
| should persist share params cleanup after navigation on ${pageType} | 61 | medium | The title promises persistence across navigation, but spec:61-62 disable and re-enable the feature before the final assertion, so the clean URL at spec:64 comes from a brand-new onEnable. A completely broken navigation/i… | Delete spec:61-62 and assert immediately after navigating back, as removeRedirect.spec.ts:51-53 does. Once fixed the test is identical to `persists after full page reload on ${pageType}`, which is why the UNNECESSARY ent… |
| persists after full page reload on ${pageType} | 82 | medium | For pageType "live", navigateToPageType after page.reload() re-enters navigateToLiveVideo, which navigates to the channel URL and clicks a (possibly different) live stream, so the reloaded document is never the one asser… | Restrict this test to watch (see the reduce-pages verdict); if the live case is kept, replace the post-reload navigateToPageType with waitForExtensionReady(page) (navigation.ts:172-176). |

**Missing** (4; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should strip tracking params from search result links when enabled | search | cleanSearchPage is an entire exported branch with zero coverage: it rewrites result hrefs and is completely independent of the #share-url dialog path the spec exercises. No other spec touches shareShortener (grep over sr… | src/features/shareShortener/utils.ts:7-16 (URL guard + href rewrite); called from setupShareShortener at src/features/sh… |
| high | should keep the share URL clean when the dialog is opened for a second video | search | The MutationObserver disconnects after its first hit, so every later dialog depends solely on the 50 ms interval, which caches `input` and never re-queries once it is non-null. If YouTube renders a new #share-url node fo… | src/features/shareShortener/utils.ts:23 observer.disconnect(); utils.ts:42-57 cleanAndUpdateUrl caches `input` behind `i… |
| medium | should clean the share URL after in-page (SPA) navigation from search to watch | watch, entered by SPA click from search | onNavigate is the only lifecycle hook with zero coverage anywhere in the suite. Every helper navigation is a full document load, and handleNavigation early-returns when the signature is unchanged, so the callback never f… | src/features/shareShortener/index.ts:15-18; dispatch at src/features/_registry/featureLifecycleManager.ts:77-81; dedup a… |
| low | should not clean the share URL on a non-target page | channel_home | Nothing in this spec verifies the includePages gate, so widening or deleting metadata.dependencies.includePages would leave all 24 cases green. Priority lowered from the auditor's medium because the gate itself is generi… | src/features/shareShortener/index.metadata.ts:8; gate at src/features/_registry/featureNavigationManager.ts:32 (called f… |

### shortsAutoScroll

`src/features/__tests__/shortsAutoScroll.spec.ts` — 7 generated cases today, about 8 after the recommendations below.

shortsAutoScroll has one boolean config field, one page type and no buttons, yet the spec spends 7 cases on it while leaving the feature's actual logic untested. Positive coverage (feature on, simulated end -> next short) is real and repeated five times; every negative and lifecycle case is weak: expectNoAutoScroll (spec:24-30) passes on its first poll so the "disabled" assertion cannot fail, the …

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should automatically scroll when enabled | shorts | 1 |
| should not automatically scroll when disabled | shorts | 1 |
| should toggle auto-scroll | shorts | 1 |
| should persist auto-scroll after navigation | shorts | 1 |
| should re-enable auto-scroll after disable then re-enable | shorts | 1 |
| should persist auto-scroll after full page reload | shorts | 1 |
| should not auto-scroll on non-target page | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist auto-scroll after navigation on shorts | 93 | remove | 1 | navigateToYoutubePage only goto()s when the URL differs, and after the first advance the URL is the new short, so shorts -> home -> shorts is just two full document loads. Its remaining coverage is 'feature already enabl… |
| should re-enable auto-scroll after disable then re-enable on shorts | 105 | merge-into:should toggle auto-scroll on shorts | 1 | Line 112 re-navigates between disableFeature and enableFeature, so the disable/re-enable never happens within one document: the second half degrades into 'load shorts with the feature off, enable it live, advance', which… |
| should not auto-scroll on non-target page | 132 | remove | 1 | resolveNonTargetPage returns channel_home (first non-login page not in includePages), and spec:135 only asserts that a channel_home URL contains no /shorts/ id. That passes with the extension uninstalled - it tests the l… |

**Incorrect** (3)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should not automatically scroll when disabled on shorts | 80 | high | expectNoAutoScroll (spec:24-30) uses expect.poll(...).toBe(initialId). expect.poll evaluates immediately and stops at the first pass, and the URL is necessarily still the initial one the moment page.evaluate returns, so … | Hold a window instead of polling, inside expectNoAutoScroll so both callers benefit: await page.waitForTimeout(3000); expect(getShortId(page.url())).toBe(initialId). |
| should toggle auto-scroll on shorts | 91 | high | The disabled half never calls seekToEnd (contrast spec:86), so no end-of-video is simulated and nothing can observe that onDisable removed the timeupdate listener; combined with the expect.poll defect above, the assertio… | Drop line 88; after expectAutoScroll call disableFeature in place, then seekToEnd, then assert the short id is unchanged over a held ~3 s window; optionally re-enable, seekToEnd and assert the id advances (which absorbs … |
| should persist auto-scroll after full page reload on shorts | 125 | medium | After page.reload() the URL is the advanced short, so navigateToPageType at spec:125 sees a URL different from the fixture and page.goto()s it (src/utils/_tests/navigation.ts:214-219). The reloaded document is discarded … | After page.reload(), await waitForExtensionReady(page) (src/utils/_tests/navigation.ts:172) and waitForYoutubePlayerReady(page, "shorts") (src/utils/_tests/player.ts:273), then seekToEnd on the reloaded short and assert … |

**Missing** (4; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should keep auto-scrolling on the next short after an advance | shorts | onNavigate (remove listeners + re-run setupShortsAutoScroll) has zero coverage: every test stops after one advance, so a regression that drops the re-attach would leave the feature scrolling exactly once and all existing… | src/features/shortsAutoScroll/index.ts:16-19 (onNavigate removes then re-adds); shorts signature includes the id so shor… |
| medium | should resume auto-scroll after SPA navigation away from and back to shorts | shorts | The dependency re-gate is a distinct lifecycle path from onEnable/onNavigate: leaving shorts makes areDependenciesMet false so updateFeatureEnabledState calls disableFeature, and returning calls enableFeature. It is only… | src/features/_registry/featureNavigationManager.ts:32; src/features/_registry/featureOrchestrator.ts:141-166 (canEnable … |
| medium | should not auto-scroll when the video restarts without reaching the end | shorts | Exercises the negative side of the near-end threshold - the only guard against skipping a short the user is still watching. seekToEnd always feeds 0.995 * duration, so wasNearEnd is set in every existing test and a broke… | src/features/shortsAutoScroll/utils.ts:21-24; src/features/__tests__/shortsAutoScroll.spec.ts:55 |
| low | should not navigate or throw when the next-short button is missing | shorts | Covers the null-button early return. eventManager.addEventListener attaches the handler raw (no try/catch), so dropping the guard produces an uncaught TypeError in page context - genuinely observable. I removed the audit… | src/features/shortsAutoScroll/utils.ts:25-31 (hasTriggered = true at :25, guard at :28); src/events/EventManager.ts:39-6… |

### skipContinueWatching

`src/features/__tests__/skipContinueWatching.spec.ts` — 7 generated cases today, about 5 after the recommendations below.

The spec only ever asserts one thing - whether ytd-watch-flexy/grid's youthereDataChanged_ differs from the handler captured before enabling - and it asserts it seven times. Three of the seven cases add nothing over "should re-patch after disable then re-enable on watch" (spec:83), and "should not patch when disabled on watch" (spec:77) cannot fail at all because the feature's default is already f…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| replaces handler | watch | 1 |
| restores handler | watch | 1 |
| replaces handler after navigation | watch | 1 |
| should not patch when disabled | watch | 1 |
| should re-patch after disable then re-enable | watch | 1 |
| should persist after full page reload | watch | 1 |
| should not patch on non-target page | — | 1 |

**Not needed** (3)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| replaces handler on watch | 52 | merge-into:should re-patch after disable then re-enable on watch | 1 | Its whole body (navigate, capture original, enableFeature, expectHandlerReplaced) is character-for-character the first four statements of spec:84-87. Same page, same lifecycle path (config-driven onEnable), same config v… |
| restores handler on watch | 58 | merge-into:should re-patch after disable then re-enable on watch | 1 | enable -> disable -> expectHandlerRestored is a strict subset of spec:84-89, which runs the same sequence with the same helpers plus an intermediate assertion. No distinct branch of index.ts:20-26 is reached. |
| replaces handler after navigation on watch | 65 | merge-into:should persist after full page reload on watch | 1 | navigateToPageType issues page.goto (navigation.ts:136), so the home->watch hop is two full document loads, i.e. the same content-script re-init path as page.reload() in spec:93; and it ends with the identical disable/en… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist after full page reload on watch | 101 | high | After page.reload() (spec:99) and the readiness wait (spec:100) the test calls disableFeature then enableFeature, so the assertion at spec:103 observes a fresh live re-enable, not the reload. If the enableAll -> onEnable… | Delete spec:101-102 and call expectHandlerReplaced(page, original) directly after spec:100. This stays falsifiable: after a reload YouTube reinstalls its own handler, so current === original unless the feature re-patched… |
| should not patch on non-target page | 112 | high | resolveNonTargetPage walks pageTypes in declaration order and returns the first non-included, non-login page, which is channel_home (utils.ts:3-5, types.ts:282-294). A cold page.goto to https://www.youtube.com/@RickAstle… | Point the test at pageTypeRecord.live: navigateToLiveVideo guarantees an attached ytd-watch-flexy (navigation.ts:243-249) while getCurrentPageType returns "live" for an isLive watch URL (src/utils/url/index.ts:41-48), so… |
| replaces handler after navigation on watch | 73 | medium | The title promises the handler is still patched after navigation, but spec:73-74 disable and re-enable the feature before the assertion at spec:75, so the post-navigation state is discarded and never observed. On top of … | If the test is kept rather than merged into the reload test, drop spec:73-74 and assert expectHandlerReplaced immediately after returning to watch; real onNavigate coverage needs a click-driven in-page navigation (see mi… |
| expectHandlerReplaced helper | 19 | low | The poll only requires current !== null && current !== original, so it never checks the installed patch is the feature's no-op - any unrelated reassignment of youthereDataChanged_ satisfies it. Worse, if the property is … | Assert the source matches an empty-body function (index.ts:15 installs `function () {}`), e.g. /^function\s*\w*\s*\(\s*\)\s*\{\s*\}$/, in addition to differing from original; and fail fast when the captured original is n… |

**Missing** (3; 0 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| medium | should keep the handler patched after in-page navigation to another video | watch | onNavigate is feature-owned code with literally zero coverage: every navigation in this spec is a full page.goto, and on a cold load featureNavigationManager.initialize() only records the signature without firing the cal… | src/features/skipContinueWatching/index.ts:35-37 (onNavigate -> patchContinueWatching); src/utils/_tests/navigation.ts:1… |
| low | should restore the handler when navigating away from watch in-page | watch | The deps-not-met disable path (updateFeatureOnNavigation -> updateFeatureEnabledState with depsMet false -> onDisable) is never exercised; only the config-driven disable is. Downgraded from medium because the feature-lev… | src/features/_registry/featureOrchestrator.ts:172-178 -> 142-146 -> 162-166; src/features/_registry/featureNavigationMan… |
| low | options checkbox toggles skipContinueWatching.enabled | options | The declared settings entry has no coverage anywhere; Options.spec.ts covers only page-level actions (render, language select, import, export, clear, reset). Confirmed observable: the settings id is used verbatim as the … | src/features/skipContinueWatching/index.metadata.ts:10-17; src/components/Inputs/CheckBox/CheckBox.tsx:26 (id={id}); src… |

### timestampPeek

`src/features/__tests__/timestampPeek.spec.ts` — 16 generated cases today, about 12 after the recommendations below.

timestampPeek declares includePages ["watch"] and one config field (enabled), so the 16 static tests expand to 16 cases, but roughly half of them are duplicates: the four comment-timestamp tests re-run description tests through code paths with no comment-specific branch, "should show preview overlay after disable then re-enable on ${pageType}" is byte-identical to the toggle test, and two restore/…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should show preview overlay when hovering a timestamp in the description | watch | 1 |
| should seek to timestamp when clicking the preview overlay | watch | 1 |
| should restore video time when leaving the preview overlay | watch | 1 |
| should clean up overlay elements when disabled | watch | 1 |
| should toggle overlay on and off | watch | 1 |
| should show preview overlay after navigation | watch | 1 |
| should show preview overlay after full page reload | watch | 1 |
| should show preview overlay after disable then re-enable | watch | 1 |
| should show preview overlay when hovering a timestamp in a comment | watch | 1 |
| should seek to timestamp when clicking the preview overlay on a comment timestamp | watch | 1 |
| should restore video time when leaving the preview overlay on a comment timestamp | watch | 1 |
| should stay paused when restoring video time | watch | 1 |
| should play from timestamp when clicking preview overlay while paused | watch | 1 |
| should stay paused when restoring video time on a comment timestamp | watch | 1 |
| should play from timestamp when clicking preview overlay while paused on a comment timestamp | watch | 1 |
| should not create preview overlay on non-target page | — | 1 |

**Not needed** (7)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should show preview overlay after disable then re-enable on ${pageType} | 219 | remove | 1 | CONFIRMED by diff: `diff <(sed -n '176,189p') <(sed -n '220,233p')` on the spec reports no differences - the body is byte-identical to "should toggle overlay on and off on ${pageType}" (spec:175-189), same setup/enable/h… |
| should restore video time when leaving the preview overlay on ${pageType} | 126 | remove | 1 | Strict subset of "should stay paused when restoring video time on ${pageType}" (spec:332-384): identical pause -> hover -> overlay mouseleave -> poll currentTime toBeCloseTo(preHoverTime) sequence, and the other test add… |
| should seek to timestamp when clicking the preview overlay on ${pageType} | 81 | remove | 1 | Same code path and identical assertions as "should play from timestamp when clicking preview overlay while paused on ${pageType}" (spec:386-434). The only difference is that the other test pauses the video before hoverin… |
| should restore video time when leaving the preview overlay on a comment timestamp on ${pageType} | 290 | remove | 1 | hideAndRestore has no comment-specific branch (utils.ts:78-89); the element's location only affects how the listener got attached, which "should show preview overlay when hovering a timestamp in a comment on ${pageType}"… |
| should stay paused when restoring video time on a comment timestamp on ${pageType} | 436 | remove | 1 | Assertion-for-assertion identical to the description version (spec:332-384) with only the hover target changed; the restore path is shared and has no comment branch (utils.ts:78-89, 285-340). The comment attach path stay… |
| should play from timestamp when clicking preview overlay while paused on a comment timestamp on ${pageType} | 490 | remove | 1 | Duplicate of the retained comment click test (spec:243-288) - same overlay click handler, same time and isPlaying assertions; the only delta is the pre-hover pause, which the description pair already showed makes no diff… |
| should not create preview overlay on non-target page | 543 | remove | 1 | Vacuous. nonTargetPage resolves to channel_home (pageTypes order, utils.ts:3-5), where areDependenciesMet returns false for includePages ['watch'] so onEnable never runs (featureNavigationManager.ts:28-35, featureOrchest… |

**Incorrect** (6)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should show preview overlay when hovering a timestamp in the description on ${pageType} | 46 | high | expectOverlayVisible asserts only toBeAttached. getOrCreateOverlay appends the div with display:none (utils.ts:220-239) and is called from both the mouseenter and the mouseleave handler (utils.ts:98, 152), so the overlay… | Make the helper assert the visible state: expect(page.locator(OVERLAY)).toBeVisible() plus expect(page.locator('#yte-timestamp-peek-overlay video.html5-main-video')).toBeAttached() and expect(page.locator('#yte-timestamp… |
| should clean up overlay elements when disabled on ${pageType} | 168 | high | The body is setup -> enable -> disable -> expectCleanSlate; it never hovers a timestamp, so no overlay, placeholder or shield is ever created (all three are created lazily on hover: utils.ts:98, 152, 264, 300). expectCle… | Hover a timestamp, move the pointer off it so the shield is created, assert all three elements exist, then disableFeature and assert removal; finish by hovering the same timestamp again and asserting the overlay stays de… |
| should seek to timestamp when clicking the preview overlay on ${pageType} | 105 | high | The click handler deliberately re-applies the preview's *current* time, not the link timestamp: it reads const { currentTime } = video, restores the video, then sets video.currentTime = currentTime and plays (utils.ts:12… | Read video.currentTime immediately before dispatching the click and assert the resumed time is >= that value and >= expectedTime (or within a tolerance of it), and wrap the isPlaying check (spec:119-123) in expect.poll i… |
| should show preview overlay after navigation on ${pageType} | 191 | medium | The title promises navigation coverage, but both hops go through navigateToPageType -> navigateToYoutubePage -> navigateToPage -> page.goto (navigation.ts:133-144, 163, 214-219), i.e. two full document loads. onNavigate … | Rewrite as a real SPA navigation: hover a timestamp so the preview is open (video living inside the overlay), then click a sidebar video link and await page.waitForURL; assert no stale #yte-timestamp-peek-overlay/-placeh… |
| should show preview overlay when hovering a timestamp in the description on ${pageType} | 51 | medium | hoverFirstTimestamp targets the first "yt-attributed-string a[href*='&t=']" (or the comment-scoped variant) anywhere on the page, while the feature only attaches listeners to `yt-attributed-string a[href^='/watch?v=<curr… | Derive the video id from page.url() and scope both locators, e.g. `#description-inline-expander a[href^='/watch?v=${id}'][href*='&t=']` and `ytd-comment-thread-renderer a[href^='/watch?v=${id}'][href*='&t=']`, so the tes… |
| should show preview overlay when hovering a timestamp in the description on ${pageType} | 33 | medium | Fixed sleeps stand in for awaitable conditions: expandDescription ends with waitForTimeout(1000) (spec:33), hoverFirstTimestamp waits 500 ms before hovering (spec:55), and every click/mouseleave test waits a further 500 … | Await conditions instead of sleeping: after hover, await expect(page.locator('#yte-timestamp-peek-overlay video.html5-main-video')).toBeAttached() and expect(page.locator('#yte-timestamp-peek-placeholder')).toBeAttached(… |

**Missing** (6; 1 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should return the video element to the player and remove the placeholder after leaving the preview | watch | CONFIRMED. previewTimestamp(show=true) re-parents YouTube's real <video> into the overlay behind a placeholder; the else branch puts it back. Nothing in the whole __tests__ directory asserts the video's parent (grep for … | src/features/timestampPeek/utils.ts:296-312 (placeholder insert + overlay.appendChild(video)), utils.ts:326-336 (restore… |
| medium | should keep the preview open while the pointer travels from the timestamp into the overlay | watch | CONFIRMED. The grace timer (utils.ts:9, 154), the overlay mouseenter cancelHideTimer (utils.ts:99) and positionShieldBetween (utils.ts:263-283) are the feature's core UX and have zero coverage: every test reaches the ove… | src/features/timestampPeek/utils.ts:9, 99, 151-155, 201-218, 263-283; spec lines 103, 148, 312, 354, 458 |
| medium | should keep the seek and not restore the time when clicking the timestamp link itself | watch | CONFIRMED. commitHandler is bound to pointerdown on the link (utils.ts:158) and is the only thing that stops the scheduled hideAndRestore from undoing YouTube's own seek (utils.ts:82-85). No test dispatches pointerdown/c… | src/features/timestampPeek/utils.ts:143-150, 158, 78-88 |
| medium | should ignore timestamps beyond the video duration and links to other videos | watch | CONFIRMED. isValidTimestamp (utils.ts:246-248) and the [href^='/watch?v=<id>'] filter (utils.ts:55, 172, 343) both guard against hijacking unrelated links, and neither branch is exercised. Injection also drives the obser… | src/features/timestampPeek/utils.ts:55, 171-172, 246-248, 342-347 |
| medium | should scroll the page to the top when clicking the preview overlay | watch | CONFIRMED. window.scrollTo({top:0}) in the overlay click handler is a user-visible side effect with no assertion anywhere. Fold into the retained "should seek to timestamp when clicking the preview overlay on a comment t… | src/features/timestampPeek/utils.ts:125-128; spec:243-288 (scrollToComments at spec:59-65) |
| medium | should hide and restore the mini player overlay while previewing | watch | CONFIRMED, priority raised from low. The mini player moves the whole #movie_player into #yte-mini-player-content (controller.ts:305-347) while timestampPeek moves the <video> out of it into its own overlay, which is exac… | src/features/timestampPeek/utils.ts:4, 315, 337-338; src/features/miniPlayer/index.ts:151-156; src/features/miniPlayer/c… |

### videoHistory

`src/features/__tests__/videoHistory.spec.ts` — 9 generated cases today, about 8 after the recommendations below.

The spec's real coverage is narrower than its 9 tests suggest. Four tests assert the same thing (#resume-prompt attached after returning to the watch page), two more (live, non-target page) cannot fail because no history is ever seeded and the pages have no player, and the "toggle" test only checks the extension bridge div. Three tests wrap their assertion in a disableFeature/enableFeature pair th…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| toggling video history should not crash the page | — | 1 |
| video history resume prompt should appear when navigating back | — | 1 |
| video history resume prompt button should resume playback when clicked | — | 1 |
| video history close button should hide the resume prompt | — | 1 |
| video history should automatically resume when navigating back | — | 1 |
| video history resume prompt should not appear when disabled | — | 1 |
| video history should persist after full page reload | — | 1 |
| video history should not create resume prompt video | live | 1 |
| should not create resume prompt on non-target page | — | 1 |

**Not needed** (5)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| toggling video history should not crash the page | 19 | remove | 1 | Its only assertion is div#yte-message-from-extension, which the content script creates at injection and which waitForExtensionReady already asserted during navigateToPageType (navigation.ts:172-176); no videoHistory code… |
| video history resume prompt should appear when navigating back | 27 | merge-into:video history resume prompt button should resume playback when clicked | 1 | Setup is byte-for-byte the same as the click test (enable, resumeType prompt, poll currentTime, home, watch, disable/enable) and its single assertion `expect(resumePrompt).toBeAttached()` (line 37) is repeated at lines 5… |
| video history should persist after full page reload | 110 | remove | 1 | page.reload() at line 116 runs while the page is the home feed (line 115), not the watch page, and the following navigateToPageType(watch) is an ordinary goto - navigateToYoutubePage only skips the goto when the URL alre… |
| video history should not create resume prompt on live video | 121 | remove | 1 | Cannot fail on two independent counts: (a) a live /watch URL resolves to pageType "live" (src/utils/url/index.ts:41-47), so areDependenciesMet is false for includePages ["watch"] (featureNavigationManager.ts:32) and upda… |
| should not create resume prompt on non-target page | 126 | remove | 1 | nonTargetPage resolves to channel_home (pageTypes order, types.ts:282-294; resolveNonTargetPage, utils.ts:3-5). On a non-target page canEnable is false so onEnable never runs, and even if page gating regressed the test s… |

**Incorrect** (6)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| video history resume prompt button should resume playback when clicked | 50 | high | The disableFeature/enableFeature pair actively destroys the setup. After the goto at line 49 the feature is already enabled from storage, so load-time onEnable -> handleVideoChange creates #resume-prompt and sets current… | Delete lines 50-51. The prompt is already created at load after the full navigation; assert on that one directly. |
| video history close button should hide the resume prompt | 72 | high | Same self-defeating disable/enable pair as line 50: onDisable removes #resume-prompt (index.ts:172) and the re-enable cannot rebuild it because currentVideoId is never reset, so the 10 s toBeAttached at line 75 depends o… | Delete lines 72-73 and assert on the prompt created at load. |
| video history resume prompt should not appear when disabled | 102 | high | The assertion can never fail. videoHistory.enabled defaults to false (index.metadata.ts:8), so disableFeature is a no-op: updateFeatureEnabledState sees prevEnabled=false, canEnable=false and an unchanged config, and ret… | Enable the feature, poll readStoredState until videoHistory.storage contains the video id, then disable, navigate away and back, and assert both that no #resume-prompt appears and that the stored timestamp does not advan… |
| video history resume prompt button should resume playback when clicked | 62 | high | The bounds are satisfied by ordinary playback. watchedTime is only guaranteed > 1 (poll at line 45), so `resumedTime > watchedTime - 2` has a bound below ~0 and `< watchedTime + 10` is satisfied by a video that simply st… | Seek the player to a point far from the natural start (e.g. via setValueOnYouTubePlayer to ~60 s or 25 % of duration), poll readStoredState until the stored timestamp matches, then after the click assert currentTime jump… |
| video history should automatically resume when navigating back | 97 | high | Same trivially-satisfiable bound (watchedTime may be < 2, making `watchedTime - 2` negative), and currentTime is sampled once as soon as readyState >= 2 (lines 92-96), which races the extension's asynchronous seekTo (ind… | Build a stored entry far from 0 (seek + poll readStoredState), then `await expect.poll(() => getCurrentTime(page)).toBeGreaterThan(<stored - 2>)` instead of a single read, and add the not.toBeAttached() assertion for #re… |
| video history close button should hide the resume prompt | 69 | medium | `expect.poll(getCurrentTime).toBeGreaterThan(0)` does not guarantee a history entry exists before the navigation at line 70: the timeupdate handler returns early while currentTime < 1 (index.ts:236), so the poll can reso… | Poll readStoredState until videoHistory.storage contains the video id instead of polling currentTime (the same weak poll appears at line 31 and line 114, both in tests slated for removal). |

**Missing** (8; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | videoHistory stores the watched timestamp in extension state | watch | setVideoHistory is the feature's only persisted output and no test reads it; every current test only infers it from the prompt. The observation channel is proven to work: the content script answers request_data/"state" w… | src/features/videoHistory/index.ts:232-243; src/features/videoHistory/utils.ts:9-16; src/utils/_tests/storage.ts:3-42; s… |
| high | SPA navigation to another video clears the old prompt and tracks the new video | watch | onNavigate "start" (index.ts:187) and the whole currentVideoId-set branch (index.ts:204-211 plus waitForVideoChange, index.ts:283-299, ~20 lines) are unreachable from this spec because navigateToYoutubePage always does a… | src/features/videoHistory/index.ts:185-188,204-213,283-299; src/utils/_tests/navigation.ts:215-226 |
| medium | disabling videoHistory removes the visible resume prompt | watch | onDisable removes the prompt element and all listeners (index.ts:170-174) and is invoked by the orchestrator on a true->false transition (featureOrchestrator.ts:162-166), but the only test that toggles the feature assert… | src/features/videoHistory/index.ts:170-174; src/features/_registry/featureOrchestrator.ts:162-166; spec lines 19-26 |
| medium | no resume prompt for a video already marked watched | watch | The END_TOLERANCE watched write (index.ts:240-242) and the watched short-circuit that suppresses both the prompt and the automatic seek (index.ts:221,229-231) have no coverage; a regression there would silently re-prompt… | src/features/videoHistory/index.ts:221,229-231,240-242 |
| medium | automatic resume does not show the resume prompt | watch | createResumePrompt and the automatic seek are mutually exclusive arms of one if/else (index.ts:223-228); nothing asserts that automatic mode suppresses the prompt. Costs 0 new test cases. | src/features/videoHistory/index.ts:223-228; spec lines 81-99 |
| low | clicking resume hides the prompt as well as seeking | watch | resumeButtonClickListener calls hidePrompt() before seeking (index.ts:126-127); if that call were dropped the prompt would stay on screen over the resumed video and no assertion would notice. Costs 0 new test cases. (Add… | src/features/videoHistory/index.ts:117-127 |
| low | resume prompt counts down and hides itself | watch | The 15 s countdown, the progress bar animation and the auto-hide (index.ts:101-116,28) are user-visible and completely untested; #resume-prompt-progress-bar is never referenced by the spec. | src/features/videoHistory/index.ts:28,101-116 |
| low | videoHistory does not record official artist / " - Topic" videos | watch | isOfficialArtist aborts tracking entirely (index.ts:218-219,249-273); a regression would start recording music-channel videos with no test noticing. Needs a new entry in pageFixtures.watch. | src/features/videoHistory/index.ts:218-219,249-273; src/utils/_tests/navigation.ts:97-122 |

### videosPerRow

`src/features/__tests__/videosPerRow.spec.ts` — 77 generated cases today, about 11 after the recommendations below.

videosPerRow has exactly two runtime effects: the body class `yte-videos-per-row` and the CSS variable `--yte-videos-per-row-count` (src/features/videosPerRow/index.ts:10-26). All 7 tests assert only the first, so the config field, the rich-grid overrides and the five responsive clamps in index.css are entirely unverified. Worse, the harness viewport is 1280x720 (playwright.config.ts:173-176), so …

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| should set videos per row | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should remove videos per row when disabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should update videos per row count | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| persists videos per row after full page reload | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| restores original state when disabled after being enabled | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| re-applies after disable then re-enable | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |
| should update on config change | channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch | 11 |

**Not needed** (4)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should remove videos per row when disabled on ${pageType} | 19 | remove | 11 | Lines 20-25 are character-for-character identical to lines 43-48 of `restores original state when disabled after being enabled on ${pageType}`, and the whole sequence is a prefix of `re-applies after disable then re-enab… |
| restores original state when disabled after being enabled on ${pageType} | 42 | merge-into:re-applies after disable then re-enable on ${pageType} | 11 | Byte-identical to the test at lines 19-26 and fully contained in the re-enable test, which already asserts class present -> absent after disable -> present again. Merge the proposed '--yte-videos-per-row-count' === "" as… |
| should update videos per row count on ${pageType} | 27 | merge-into:should update on config change on ${pageType} | 11 | Same scenario as lines 60-67 (navigate, enable, change the count) but it stops at setOption with no post-change assertion, so it can only fail where the other test already fails. Its one difference - no initial setOption… |
| should set videos per row on ${pageType} | 12 | reduce-pages:channel_videos,watch | 36 | Applies to the whole `for (const pageType of testPages)` loop: metadata declares no dependencies (index.metadata.ts has no dependencies key), so resolvePageTypes returns all 11 page types (src/utils/_tests/utils.ts:6-8),… |

**Incorrect** (4)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should update videos per row count on ${pageType} | 27 | high | setOption(page, "videosPerRow.videosPerRow", 8) at line 31 is the last statement: nothing is asserted after the change. The only assertion (line 30) is the body class, which already existed before the change and which on… | Delete this test and fold its intent into `should update on config change on ${pageType}`: after setOption to 8, poll page.evaluate(() => document.documentElement.style.getPropertyValue('--yte-videos-per-row-count')) unt… |
| should update on config change on ${pageType} | 60 | high | The post-change assertion at line 66 is a second expectBodyWithClass. A config change routes through featureConfigChange -> notifyConfigChange -> lifecycleManager.configChange only (featureOrchestrator.ts:95-127); update… | Replace line 66 with expect.poll on document.documentElement.style.getPropertyValue('--yte-videos-per-row-count') expecting '6' before the change and '8' after, and on channel_videos at a >1700px viewport also assert the… |
| should set videos per row on ${pageType} | 13 | medium | The title promises videos-per-row is set, but the body only checks the yte-videos-per-row class. The count written at line 15 is never observed, so onEnable's setProperty (index.ts:25) could be deleted and the test would… | After enableFeature, assert '--yte-videos-per-row-count' is '6' via document.documentElement.style.getPropertyValue, and on channel_videos set the viewport to 1920x1080 and assert the first full grid row renders 6 items. |
| persists videos per row after full page reload on ${pageType} | 33 | medium | For pageType 'live', navigateToPageType at line 39 does not re-check the current URL: it always calls navigateToLiveVideo, which goes back to the channel and opens another live stream (src/utils/_tests/navigation.ts:146-… | Keep this test only on a static page (channel_videos per the reduce-pages verdict) and replace the navigateToPageType call after page.reload() with waitForExtensionReady(page), which navigation.ts:172 already exports. |

**Missing** (6; 2 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | asserts the configured count reaches --yte-videos-per-row-count | channel_videos | setProperty in onEnable (index.ts:25) and in onConfigChange (index.ts:11) is the only runtime effect besides the body class, and no test in the repo reads it - grep for 'videosPerRow' across src/features/__tests__ and sr… | src/features/videosPerRow/index.ts:11,25; src/features/__tests__/videosPerRow.spec.ts:15-17,62-66 (only expectBodyWithCl… |
| high | renders the configured number of grid columns above the clamp thresholds | channel_videos | The column change is the entire user-visible outcome and is unobserved. At the suite's 1280x720 viewport the (width <= 1400px) clamp forces min(4, count), so the counts 6 and 8 the spec writes cannot change anything on s… | src/features/videosPerRow/index.css:2-5,7-10,19-24; playwright.config.ts:173-176 |
| medium | removes the count variable when the feature is disabled | channel_videos | onDisable's removeProperty (index.ts:18) is unobserved; a leak only misbehaves once the class returns, so this is a cleanup regression rather than an immediate user-facing one - one extra assertion in an existing test, n… | src/features/videosPerRow/index.ts:13-19; videosPerRow.spec.ts:50-59 (disable branch asserts only the class) |
| low | clamps the count on narrower viewports | channel_videos | Five responsive clamps exist and none is verified, but they are static CSS constants and layout-based assertions on live YouTube are brittle, so this is nice-to-have rather than medium. | src/features/videosPerRow/index.css:12-45 |
| low | applies the count to the posts grid on channel_posts | channel_posts | --ytd-rich-grid-posts-per-row is a second override in the same rule; channel_posts is currently visited only to re-check the body class. Low, not medium: it is one declaration adjacent to the items-per-row one and would … | src/features/videosPerRow/index.css:9; videosPerRow.spec.ts:13-18 (channel_posts iteration asserts the class only) |
| low | videos-per-row number input is disabled until the feature is enabled | options | disabledWhen and the 1..16 bounds are declared but unverified; Options.spec.ts contains only 6 generic tests (render, language select, import, export, clear, reset) and never opens a feature section. Belongs in Options.s… | src/features/videosPerRow/index.metadata.ts:20-31; src/pages/options/Options.spec.ts:4-50 |

### volumeBoost

`src/features/__tests__/volumeBoost.spec.ts` — 31 generated cases today, about 20 after the recommendations below.

The spec is broad on lifecycle plumbing and thin on the feature's own logic. Global-mode boost, onDisable and enabled-on-load are covered meaningfully, but three whole surfaces have zero coverage: the wheel handler on the button (1 dB steps, shift/ctrl multipliers, 0 dB clamp, storage write, OSD, no-apply while off, index.ts:24-70), onConfigChange's per_video branch (index.ts:146-149), and shouldR…

**Tests we have**

| Test | Pages | Cases |
|---|---|---|
| volumeBoost (global) › should set global volume boost to 10 | watch, live, shorts | 3 |
| volumeBoost (global) › should persist global volume boost after navigation | watch, live, shorts | 3 |
| volumeBoost (global) › should re-apply global volume boost after disable then re-enable | watch, live, shorts | 3 |
| volumeBoost (global) › should persist global volume boost after full page reload | watch, live, shorts | 3 |
| volumeBoost (button) › button should be enabled | watch, live | 2 |
| volumeBoost (button) › button should be disabled when feature is off | watch, live | 2 |
| volumeBoost (button) › button should set volume boost to 10 | watch, live | 2 |
| volumeBoost (button) › button should toggle off when clicked again | watch, live | 2 |
| volumeBoost (button) › button should persist boost after navigation | watch, live | 2 |
| volumeBoost (button) › button should persist boost after full page reload | watch, live | 2 |
| should not create volume boost button on non-target page | — | 1 |
| button placement › should render button in player_controls_left | — | 1 |
| button placement › should render button in player_controls_right | — | 1 |
| button placement › should render button in feature menu | — | 1 |
| fullscreen transition › should move button from left to right on fullscreen enter/exit | — | 1 |
| fullscreen transition › should not move button when fullscreenPlacement is same | — | 1 |
| audio engine › resumes a suspended audio context when the page becomes visible | watch | 1 |

**Not needed** (12)

| Test | Line | Verdict | Cases saved | Why |
|---|---|---|---|---|
| should persist global volume boost after navigation on ${pageType} | 62 | remove | 3 | Confirmed: navigateToPageType is a page.goto full document load (src/utils/_tests/navigation.ts:136), so home->pageType is the same fresh-load path as the reload test; worse, lines 71-74 disable, re-enable and re-set mod… |
| button should set volume boost to 10 on ${pageType} | 122 | merge-into:button should toggle off when clicked again on ${pageType} | 2 | Confirmed subsumption: lines 134-142 of the toggle-off test perform byte-identical setup, the same click and both assertions (expectVolumeBoostEnabled true, expectVolumeBoostAmount 10) before its second click. No distinc… |
| button should persist boost after navigation on ${pageType} | 146 | merge-into:button should persist boost after full page reload on ${pageType} | 2 | Both end in a full document load and both assert only expectFeatureButtonToBeTruthy; navigateToPageType never performs an SPA navigation, so onNavigate is not reached by either. Keep the reload variant (with the rename/a… |
| should render button in ${placement} | 185 | remove | 2 | Placement is forwarded verbatim to addFeatureButton and getFeatureIcon maps every non-menu placement to the same shared_icon_position icon (src/icons.ts:517-523, :528), so left and right are the same code path for this f… |
| should move button from left to right on fullscreen enter/exit | 205 | remove | 1 | volumeBoost only passes fullscreenPlacement through to addFeatureButton (index.ts:120); the move itself lives in featureButtonManager/ButtonController and is asserted verbatim on the loop button. The test asserts placeme… |
| should not move button when fullscreenPlacement is same | 218 | remove | 1 | Same scenario, same assertions and same generic code path as the loop button "same" test; no volumeBoost code participates beyond forwarding the config value. |
| should render button in feature menu | 195 | merge-into:should toggle volume boost from the feature menu item | 1 | Existence of a menu item is covered generically by buttonController.spec.ts:34. The volumeBoost-specific part (menu icon must be a plain SVG, label interpolates amount, aria-checked drives onConfigChange) is only reached… |
| should re-apply global volume boost after disable then re-enable on ${pageType} | 78 | reduce-pages:watch | 2 | onEnable/onDisable have no page-specific branch (index.ts:152-160) and getAudioEngine binds to a generic document.querySelector("video") (src/utils/audioEngine.ts:25); engine creation on live and shorts is already proven… |
| should persist global volume boost after full page reload on ${pageType} | 93 | reduce-pages:watch | 2 | The enabled-on-load path runs the same onEnable code on every page, and the live variant additionally forces the 120 s live-fixture search (src/utils/_tests/navigation.ts:146-160) for no extra branch; shorts/live engine … |
| button should toggle off when clicked again on ${pageType} | 133 | reduce-pages:watch | 1 | The toggle listener (index.ts:90-116) has no live-specific branch, and "button should be enabled on ${pageType}" still proves the button renders on live. |
| button should be disabled when feature is off on ${pageType} | 117 | reduce-pages:watch | 1 | Button removal is page-agnostic (featureButtonManager.updateButtonPlacement); it also needs the fix listed under incorrect before it can fail at all, so duplicating it on live buys nothing. |
| button should persist boost after full page reload on ${pageType} | 160 | reduce-pages:watch | 1 | Reload re-runs the same page-agnostic enable path, and the live variant repeats the expensive live-fixture lookup; live button rendering remains covered by the line 110 test. |

**Incorrect** (6)

| Test | Line | Severity | Problem | Fix |
|---|---|---|---|---|
| should persist global volume boost after navigation on ${pageType} | 62 | high | Confirmed at lines 71-74: after navigating home and back, the test disables the feature, re-enables it and re-sets mode and amount before asserting. The final expectVolumeBoostEnabled/expectVolumeBoostAmount therefore me… | Delete lines 71-74 and assert immediately after navigating back, or (preferred) delete the test: with those lines gone it is the reload test's path, since navigateToPageType is page.goto (src/utils/_tests/navigation.ts:1… |
| button should persist boost after full page reload on ${pageType} | 160 | high | Title claims the boost persists, but the only post-reload assertion is expectFeatureButtonToBeTruthy (line 172). The boost demonstrably cannot persist: isVolumeBoostEnabled is a module-level flag reset on every document … | Rename to "button reappears after reload" and add await expectVolumeBoostEnabled(page, false) so the documented reset is pinned instead of implied. |
| button should persist boost after navigation on ${pageType} | 146 | medium | Same title/body mismatch: after home -> pageType the test only asserts the button is attached (line 158) while the title promises the boost persisted, which the reset of isVolumeBoostEnabled and initialChecked = false ru… | Fold into the reload test per the unnecessary finding; if kept, rename to "button reappears after navigation" and assert expectVolumeBoostEnabled(page, false). |
| should not create volume boost button on non-target page | 177 | medium | volumeBoost.mode is left at its default "global", so shouldRender returns false and the button is absent for that reason alone (index.ts:139). The test would still pass if page gating broke completely and the feature ran… | Add setOption(page, "volumeBoost.mode", "per_video") and setOption(page, "volumeBoost.button.placement", right) before expectFeatureButtonToBeFalsy; optionally also assert no boost is applied there. |
| button should be disabled when feature is off on ${pageType} | 117 | medium | The button never exists in this state - the feature is disabled and mode is still the default "global" - so expectFeatureButtonToBeFalsy cannot fail and the removal path (btn.remove + eventManager.removeEventListeners, i… | Enable the feature, set mode per_video and a placement, assert the button is attached, then disableFeature and assert it is gone (mirrors buttonController.spec.ts:145 but exercises volumeBoost's own remove()). |
| expectVolumeBoostEnabled helper used by the toggle-off and disable assertions | 36 | low | Lines 41-44 return false when window.engine or the gain node is missing, so every expectVolumeBoostEnabled(page, false) (lines 86 and 144) also passes when the audio engine was never created or was torn down - "not boost… | Return null when the engine is absent and assert gain.value === 1 explicitly (e.g. poll for the numeric gain and compare to 1), so a missing engine fails instead of masquerading as "not boosted". |

**Missing** (8; 3 high)

| Priority | Proposed test | Page | Why | Evidence |
|---|---|---|---|---|
| high | should not render the button while mode is global | watch | shouldRender's false branch and the two defaults (mode "global", amount 5) have zero coverage: every existing button test flips mode to per_video first, and every global test overwrites amount with 10. The two tests that… | src/features/volumeBoost/index.ts:139 (shouldRender: ({ mode }) => mode === "per_video"), src/features/volumeBoost/index… |
| high | should apply an amount change only while the per-video toggle is on | watch | onConfigChange's per_video branch reads the button/menu item's aria-checked and is never exercised: every button test sets amount before clicking and never changes config afterwards, so a regression that ignores (or unco… | src/features/volumeBoost/index.ts:142-150 (getFeatureMenuItem ?? getFeatureButton, ariaChecked === "true" gate); no test… |
| high | should change the boost by one dB per wheel notch over the button | watch | The entire wheel handler on the button - step size, direction, the storage write via sendContentOnlyMessage("setVolumeBoostAmount"), the OSD and the early return while the toggle is off - is untested; no spec dispatches … | src/features/volumeBoost/index.ts:24-70 and :124-132 (wheel listener on the button), src/pages/content/index.ts:171-174 … |
| medium | should apply shift and ctrl wheel modifiers and clamp at 0 dB | watch | The modifier multipliers and clampDb's lower bound (MIN_DB = 0) have no coverage anywhere; an inverted delta sign or a wrong multiplier would be invisible. | src/features/volumeBoost/index.ts:26-31 (delta = +/-STEP_DB, *2.5 shift, *5 ctrl) and :40 (clampDb(amount + delta)); src… |
| medium | should toggle volume boost from the feature menu item | watch | The existing feature_menu test only asserts the item is attached; the menu path's toggle listener and the aria-checked lookup that onConfigChange depends on (getFeatureMenuItem is tried before getFeatureButton) are never… | src/features/volumeBoost/index.ts:86-88 (menu label carries the amount), :90-116 (toggle listener), :146; src/features/b… |
| medium | should render and toggle the volume boost button on shorts | shorts | shorts is a declared include page and the feature's own wheel handler has an explicit shorts branch (div#shorts-player), yet buttonTestPages filters shorts out of every button test, leaving button support on shorts compl… | src/features/volumeBoost/index.metadata.ts:25 (includePages watch/live/shorts), src/features/volumeBoost/index.ts:42, vo… |
| medium | should re-apply the boost after in-page navigation to another video | watch | onNavigate is never reached by the suite: every helper navigation is page.goto, and the navigation manager records the initial signature without invoking the callback and then early-returns while the signature is unchang… | src/features/volumeBoost/index.ts:161-165; src/utils/_tests/navigation.ts:133-144 (page.goto) and :145-164; src/features… |
| low | button title and aria-checked follow the toggle state | watch | Fold into the toggle test (no extra test case). The title is the only place the current boost value is surfaced to the user, and it is feature-specific (it interpolates amount), unlike the generic toggle mechanics covere… | src/features/volumeBoost/index.ts:101-114; src/features/buttonController/ButtonController.ts:652-659 (updateFeatureButto… |

## 5. Harness, configuration and family-template findings

Findings from the four cross-cutting auditors, deduplicated against section 3 where they restate it.

### harness

The helper layer is broadly well factored (typed config paths, readiness gating on html[yte-ready], player abstractions), but three classes of problems dominate. (1) Assertion vacuity: expectElementsHidden/expectElementsNotHidden default to mode "all", which passes when zero elements match — 117 call sites across 12 hide* specs — and injectDynamicContent's null return (nothing cloned) is never checked by any of the 12 "hides dynamically added content" tests, so that whole family can silently be a no-op; the selector data they consume is only regenerated by the post-build pipeline, never by `npm test`. (2) Timing: every config write sleeps a fixed 500 ms (features.ts:70, ~1230 call sites ≈ 10 min of pure sleep per project run), messaging/navigation use retry loops with fixed backoff that mask context-destroyed races, pageSetup spawns an uncancelled background loop that can reload the page mid-assertion, and waitForYoutubePlayerReady's "stable currentTime" condition is only satisfiable when playback is not advancing. (3) CI is non-functional as written: the workflow never builds the extension that playwright.config.ts hard-codes at dist/Chrome\|dist/Firefox, runs Node 18 against an .nvmrc of 24.19.0, `npm ci` fails on a vite peer conflict, the 30-minute globalTimeout cannot cover 2706 collected tests at 1 worker, the CI per-test timeout (30 s) is shorter than the helpers' own 30 s readiness waits, the auth profile is deliberately not copied in CI while hasAuthState() still reports true, and the uploaded playwright-report/ is never produced because the CI reporter is "dot". Stale artefacts: __base__.spec.ts is 0 bytes and is copied by generateMissingFeatureTests (run as an import side effect of the config in every worker) so a new feature silently gets a zero-test spec; tests/test-settings.json is still the legacy snake_case v1 schema and the only assertion made on it is a toast.

| Severity | Category | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| high | infra | CI never builds the extension the tests load | .github/workflows/playwright.yml:20-21 runs `npx playwright test` directly, and package.json:35 defines "test": "playwright test" with no build. playwright.config.ts:59-68 getExtensionPath() returns join(cwd(), "dist/Chrome"\|"dist/Firefox") with no existsSync check, and .gitignore:145 ignores dist. Worse, the dist folder names are derived from the browsers installed on the build machine (src/utils/plugins/utils.ts:31-46 `browsers = GetInstalledBrowsers()`, with Chrome/Firefox only as a fallback when none are installed). With no dist, launchPersistentContext (playwright.config.ts:32-38) starts a browser with no extension and every test fails later at waitForExtensionReady (navigation.ts:172-176) with a misleading "div#yte-message-from-youtube not attached" error. | Add `npm run build` (or a `globalSetup` that builds when dist is missing/stale) before `npx playwright test` in the workflow and in a `pretest` script; make getExtensionPath() throw a explicit error such as `Extension not built: run npm run build (missing ${path})` when the directory does not exist, and derive the folder name from the same constant the pipeline writes rather than assuming Chrome/Firefox. |
| high | infra | CI globalTimeout cannot cover the collected suite | `npx playwright test --list` reports "Total: 2706 tests in 61 files" (2 projects x ~1353). playwright.config.ts:132 sets globalTimeout to 1_800_000 ms (30 min) and playwright.config.ts:178 sets workers to 1 in CI, while the job allows 60 minutes (.github/workflows/playwright.yml:9). At the stated 10-20 s per test the run needs roughly 8-15 hours, so CI aborts after ~100-150 tests with "Timed out waiting 1800000ms for the test suite to run" and reports a red build that says nothing about the extension. | Shard the run (`--shard=${{matrix.shard}}/N` with a job matrix), raise workers above 1, and/or restrict CI to `--project=chromium` plus a `--grep @smoke` subset; then set globalTimeout to match the shard budget instead of a flat 30 minutes. |
| high | infra | CI per-test timeout is shorter than the harness's own readiness waits | playwright.config.ts:151 sets timeout to 30_000 in CI but 60_000 locally, while navigation.ts:175 waits up to 30_000 ms for html[yte-ready], player.ts:306 waits up to 30_000 ms for the player, and playwright.config.ts:153 sets navigationTimeout to 30_000. A single navigation can therefore consume the entire CI test budget before the first assertion runs; with retries: 2 (playwright.config.ts:149) each such test burns 90 s of the already exhausted globalTimeout. | Make the CI timeout greater than or equal to the local one (e.g. 90_000 in CI, 60_000 locally), or lower the internal readiness timeouts to a fraction of testInfo.timeout so a slow page fails fast with a meaningful error instead of a bare test timeout. |
| high | infra | Node version mismatch and npm ci peer conflict make the CI install fail | .nvmrc pins 24.19.0 while .github/workflows/playwright.yml:13-15 uses actions/setup-node@v3 with `node-version: 18`; the project depends on vite ^7.3.5 and typescript 6.0 (package.json), which require Node >= 20.19. Independently, `npm ci` fails ERESOLVE: package-lock.json pins vite-plugin-css-injected-by-js 5.0.2 whose peerDependencies declare `vite: >8.0.0-0` against the project's vite ^7.3.5 (package.json dependencies/devDependencies). | Replace `node-version: 18` with `node-version-file: .nvmrc` (and add an `engines` field to package.json), and resolve the peer conflict by downgrading vite-plugin-css-injected-by-js to a release whose peer range includes vite 7 (do not change vite); if a stopgap is needed, run `npm ci --legacy-peer-deps` in the workflow with a TODO. |
| high | infra | Auth handling disagrees with hasAuthState() in CI and is Chromium-only | playwright.config.ts:30-31 copies the profile only `if (!isCI && existsSync(AUTH_PROFILE))`, but auth.ts:4-6 hasAuthState() only checks that playwright/.auth-profile exists on disk. If a CI job ever restores that directory (cache/secret), hasAuthState() returns true, the login skips in ~55 call sites (`loginRequiredPages.includes(pageType)`) stop firing, and every home/subscriptions test runs logged out. Additionally scripts/auth-setup.mjs:6-10 creates a Chromium persistent profile, yet playwright.config.ts:31 copies it into the Firefox userDataDir as well, where the profile format is meaningless. | Derive hasAuthState() from the same predicate used to copy the profile (export a single `authProfileInUse(browserName)` from the config, false in CI and false for firefox), or actually restore and load the profile in CI; gate the copy on `browserName === "chromium"`. |
| high | incorrect | expectElementsHidden / expectElementsNotHidden pass vacuously when nothing matches | assertions.ts:24-39 and 40-59: in the default mode "all" the function iterates `for (let count = await locator.count(), i = 0; i < count; i++)` and makes no assertion when count is 0; only mode "any" throws. There are 117 expectElementsHidden call sites (0 of them with mode "any") and 28 expectElementsNotHidden call sites (4 with mode "any") across 12 hide* specs (hideArtificialIntelligence, hideEndScreenCards, hideLiveStreamChat, hideMembersOnlyVideos, hideOfficialArtistVideosFromHomePage, hidePaidPromotionBanner, hidePlayables, hidePlaylistRecommendationsFromHomePage, hidePosts, hideShorts, hideSidebarRecommendedVideos, hideTranslateComment). On a page where YouTube renders none of the targeted elements (e.g. hidePosts on watch, or after a selector goes stale), the test is green while asserting nothing. | Add a `requireMatch` option (default true) that asserts at least one selector matched before checking display, and let the few genuinely optional call sites opt out explicitly; report the matched selector count in the failure message so stale selectors surface as failures rather than passes. |
| high | incorrect | injectDynamicContent's null return is never checked, so the 12 dynamic-content tests cannot fail | dom.ts:23-41 returns the injected selector or null when no existing element matched. No spec assigns the return value (`grep "= await injectDynamicContent" src/features/__tests__` returns nothing) — all 24 call sites are bare `await injectDynamicContent(page, selectors);`. Combined with the vacuous expectElementsHidden that follows it, a test titled e.g. "hides dynamically added content on channel_posts" passes even when nothing was cloned and nothing was asserted. | Have injectDynamicContent throw (or return a value the caller must assert, e.g. `expect(await injectDynamicContent(...)).not.toBeNull()`), and update the shared hide-spec template so the injection is proven before the post-injection assertion. |
| medium | infra | Generated hide selectors are only refreshed by the post-build pipeline, and bodyClass leaks a CSS guard | generateHideFeatureSelectors is registered in the post-build pipeline (src/pipeline/build.ts:25, inside runPostBuildPipeline), so `npm test` / `npx playwright test` never regenerates src/features/__tests__/__generated__/hideFeatureSelectors.ts; a CSS edit without a full build leaves specs asserting stale selectors that then pass vacuously. Separately the capture regex src/pipeline/steps/generateHideFeatureSelectors.ts:29 (`^body\.(yte-hide-[a-z0-9-]+(?::[^{]+)?)\s*$`) writes the pseudo-class guard into bodyClass — `hideMembersOnlyVideos.bodyClass === "yte-hide-members-only-videos:not(:has(yt-sponsorships-hub))"` — which expectBodyWithClass would turn into a regex whose parentheses are capture groups and can never match a real class list; hideMembersOnlyVideos.spec.ts:17 works around it with a local `rawBodyClass.replace(/:not\(.*?\)$/, "")`, and expectBodyWithoutClass would pass unconditionally for any future feature that forgets that strip. | Emit bodyClass and the guard as separate fields (e.g. `{ bodyClass, guard }`), delete the per-spec regex strip, and run the generator from a `pretest` script (or a Playwright globalSetup) so the file is always current when specs load it. |
| medium | incorrect | Fixed 500 ms sleep after every config write | features.ts:63-71 setFeatureValue posts the test_setConfigValue message and then `await page.waitForTimeout(500)` with no confirmation that storage was written or that the feature reacted. It backs enableFeature (645 call sites), disableFeature (276), setOption (312) — roughly 1230 writes, i.e. ~10 minutes of pure sleep per project run — and it is simultaneously too long (most changes apply in tens of ms) and too short (a change that takes 600 ms produces a flaky failure attributed to the feature). | Make the content-script handler ack the write (it already has a data_response channel used by storage.ts readStoredState) and have setFeatureValue await that ack, or poll readStoredState for the new value; keep the sleep only as a last-resort fallback behind an explicit option. |
| medium | incorrect | pageSetup starts an uncancelled background loop that can reload the page mid-test | pageSetup.ts:127-169 handleYoutubeErrors fires `void (async () => { while (!page.isClosed()) { await checkForErrors(); await page.waitForTimeout(5000) } })()` — a detached loop, started once per navigateToPageType, that calls page.reload() (pageSetup.ts:142) whenever .ytp-error appears. Nothing cancels it at test end, and navigateToPageType is called several times per test so multiple loops stack up. A reload in the middle of a test wipes the DOM the assertions are polling and re-runs the extension's onEnable, producing failures that look like feature bugs. | Return a disposer from handleYoutubeErrors and stop it in the page fixture teardown (or convert it to a one-shot recovery invoked explicitly by navigateToPageType), and record an annotation on testInfo whenever it reloads so post-hoc failures are attributable. |
| medium | incorrect | waitForYoutubePlayerReady requires playback to be frozen | player.ts:294-300: after checking readyState/networkState the predicate samples currentTime, waits 200 ms, and returns `v1 === v2 && t1 === t2`. For a normally autoplaying watch/live video currentTime advances, so the condition is only satisfiable while the video is paused, buffering or stalled; when autoplay succeeds the helper polls for the full 30_000 ms (player.ts:306) and then fails the test with a timeout that has nothing to do with the feature under test. navigation.ts:222-224 runs it on every watch/shorts/live navigation, and navigation.ts:179 runs it for live *before* playVideo. | Drop the currentTime equality from the readiness predicate (keep the volume-stability check, or require `readyState >= 3 && !seeking`), or pause the video explicitly before sampling; if the intent is "no seek in flight", assert monotonically increasing time instead of equality. |
| medium | incorrect | Retry loops with fixed backoff hide navigation/context races | messaging.ts:31-40 safeEvaluate silently swallows up to 2 failures with a 500 ms sleep between attempts (so a message dropped because the execution context was destroyed by a YouTube navigation is invisible); messaging.ts:14 and 29 add unconditional 50 ms / 20 ms sleeps after every message; navigation.ts:133-144 navigateToPage retries page.goto 3 times with a 500 ms sleep and an `expect(...).toBe(...)` used as a control-flow check; pageSetup.ts:107-113 dismissContentWarning sleeps 2000 ms after a click; navigation.ts:185 sleeps 100 ms after playVideo; player.ts:121/123 ensureCaptionsState sleeps 200/150 ms around the toggle click. Specs add 80 more page.waitForTimeout calls (e.g. 23 in timestampPeek.spec.ts, 19 in playlistReverseButton.spec.ts). | Replace the sleeps with awaited conditions (expect.poll / waitForFunction on the observable effect), log a testInfo annotation when safeEvaluate has to retry so the race is visible, and expose a shared `waitForFeatureApplied(page, predicate)` helper so specs stop hand-rolling sleeps. |
| medium | incorrect | navigateToYoutubePage silently skips navigation when already on the URL | navigation.ts:215-217: `if (normalizeUrl(page.url()) !== normalizeUrl(pageUrl)) { await navigateToPage(...) }` — when the current URL already matches, the call is a no-op that only re-runs waitForExtensionReady/pageSetup. Specs that use "navigate away and back" therefore may never navigate: hideMembersOnlyVideos.spec.ts:44-45 does `navigateToPageType(page, home)` then `navigateToPageType(page, pageType)` inside a loop that includes pageType === "home", so the test titled "hides elements after navigation on home" performs zero navigations, and the same pattern recurs in the other hide* specs. | Add an explicit `{ force?: boolean }` (or a `reloadPageType` helper) that always performs the goto, and use it in the navigation/reload transition tests; alternatively skip the away-and-back test when the away page equals the target page. |
| medium | missing | Live-page fixture requirements are silently ignored except for captions | navigation.ts:274-285 videoMeetsCapabilities has a single `case "captions"`; every other requirement falls through and returns true. navigateToPageType(page, "live", reqs) (navigation.ts:145-161) never calls getFixture, so pageFixtures.live[0].capabilities: [] (navigation.ts:59-64) is dead data. Concretely, monoToStereo declares includePages ['watch','live'] and its spec calls navigateToPageType(page, pageType, ["monoAudio"]) — on live it accepts whatever stream is currently broadcasting, mono or not, so the mono-to-stereo assertion tests an unverified precondition. | Implement the remaining capability probes (at minimum monoAudio via the audio track / channel count, dubbedAudio and endScreenCards) or make videoMeetsCapabilities throw on an unimplemented requirement so the gap fails loudly instead of producing a false pass. |
| medium | infra | Firefox project runs clipboard specs without (unsupported) clipboard permissions and runs headed in CI | playwright.config.ts:135-145: only the chromium project sets `permissions: ["clipboard-read", "clipboard-write"]`; the firefox project sets none (Playwright does not support those permission names on Firefox at all). Both projects run the same specs, including screenshotButton.spec.ts:50/73 (`navigator.clipboard.read()`) and copyTimestampUrlButton.spec.ts:26 (`navigator.clipboard.readText()`), which reject without permission. Also playwright.config.ts:35-37 forces `headless: false` and only adds `--headless=chrome` for chromium, so the firefox project runs headed on ubuntu-latest with no xvfb-run in the workflow (.github/workflows/playwright.yml:20-21). | Tag clipboard-dependent tests and exclude them from the firefox project (or gate them on `browserName === "chromium"`), and either wrap the CI run in xvfb-run or use Firefox's headless mode; alternatively drop firefox from CI until the specs are portable. |
| medium | infra | Empty __base__.spec.ts plus generation as a config import side effect creates silent zero-test specs | src/features/__tests__/__base__.spec.ts is 0 bytes; generateMissingFeatureTests.ts:16-19 copies it to `<feature>.spec.ts` for any feature directory containing index.metadata.ts. playwright.config.ts:11 calls generateMissingFeatureTests() at module evaluation, i.e. once when the runner loads the config and again in every worker process (each spec imports `test` from playwright.config), so spec files are written into the repo while the run is in progress and after the runner has already enumerated test files. A new feature therefore gets a committed spec that contains no tests, reports green, and hides the coverage gap. | Make __base__.spec.ts a real template containing `test.fixme("TODO: cover <feature>")` so a missing spec is visibly unimplemented, and move the generator out of the config into a `pretest`/`npm run gen:specs` script (or a globalSetup) that runs exactly once. |
| medium | incorrect | tests/test-settings.json is the legacy v1 schema and the import test asserts only a toast | tests/test-settings.json is entirely snake_case v1 keys (`enable_automatic_theater_mode`, `player_quality`, `osd_display_color`, `button_placements`, `remembered_volumes`) while the current schema is nested camelCase (src/utils/config/defaults.ts:5-18 plus per-feature metadata). It therefore only exercises the migration branch (src/utils/config/utils.ts:38-54 isLegacyConfiguration / migrateConfiguration). The consuming test, Options.spec.ts:12-21 "should import settings", asserts only that the text "Settings imported successfully" appears — it never reads back a single migrated value, so a migration that drops or mis-maps every key still passes. There is no fixture in the current format at all. | Keep the legacy file as an explicit migration fixture but assert the migrated result (e.g. read config back and expect automaticTheaterMode.enabled === true, playerQuality.level === "hd2160", loopButton placement "feature_menu"), and add a second fixture generated from getDefaultConfiguration() to cover the current-format import path. |
| medium | missing | Feature-menu items are only asserted to exist, never clicked | features.ts:28-38 exports clickFeatureMenuItem, which no spec imports (0 references across src/features/__tests__ and src/pages/options). Specs use expectFeatureMenuItemToBeTruthy (22 references) / expectFeatureMenuItemToBeFalsy (3) only, so for every button whose placement is "feature_menu" the click effect is never observed, and the featureMenu.openType config ("click" vs "hover", defaults.ts:6) has no test that opens the menu either way. | Add one buttonController-level test per open type that opens the menu and clicks a representative item, asserting the same observable effect the below_player variant asserts (e.g. loop attribute toggles); then feature specs can keep the cheap existence assertion. |
| medium | infra | CI reporter produces no report for the artifact upload, and the workflow uses retired action versions and narrow triggers | .github/workflows/playwright.yml:22-27 uploads `playwright-report/`, but playwright.config.ts:148 sets `reporter: isCI ? "dot" : [["html", ...]]` — no HTML reporter runs in CI, so the artifact is empty and there is no JUnit/GitHub annotation output either. The workflow also pins actions/checkout@v3, actions/setup-node@v3 and actions/upload-artifact@v3 (deprecated; v3 uploads are rejected by GitHub), and triggers only on push/pull_request to [main, master] (lines 3-6), so work on branches such as the current playwright-testing never runs and there is no workflow_dispatch escape hatch. | Use `reporter: isCI ? [["github"], ["blob"]] : [["html", ...]]` (blob merges cleanly across shards) and upload blob-report/; bump to checkout@v4, setup-node@v4 (with node-version-file), upload-artifact@v4; add `workflow_dispatch` and widen the branch filter (or trigger on all pull_request branches). |
| medium | infra | Test-only config backdoor ships in production builds | src/pages/content/index.ts:176-193 handles `case "test_setConfigValue"` — documented as "Test-only entrypoint ... Exists solely to support E2E tests (Playwright)" — but it is unconditional, with no import.meta.env / build-flag guard, and it is reachable from page context by writing to #yte-message-from-youtube and dispatching the event (the exact mechanism messaging.ts:16-30 uses). Any YouTube page script can therefore rewrite arbitrary extension configuration keys in released builds. | Guard the case with a build-time constant (e.g. `if (import.meta.env.MODE === "test")` or a vite `define` such as __E2E__) so the branch is tree-shaken out of release bundles, and have the build pipeline fail if the string test_setConfigValue appears in the shipped dist. |
| low | unnecessary | Unused and duplicated helper exports | Exported but referenced by no spec: features.ts:28 clickFeatureMenuItem; features.ts:90 loadDefaultConfig (which boots a full Vite dev server inside the test process); player.ts:21 WHEEL_DELTA_PER_NOTCH; player.ts:210 getWheelContainerSelector, navigation.ts:9 fixtureCapabilities, navigation.ts:125 getFixture, navigation.ts:133 navigateToPage, navigation.ts:172 waitForExtensionReady, pageSetup.ts:183 handleYoutubePromos, pageSetup.ts:226 ensurePlayerControlsVisible and messaging.ts:3/16 (all only used internally by other helpers). features.ts:86-88 setOption is a pure alias of features.ts:63 setFeatureValue, giving four public names for one operation. buttonController.spec.ts:199-211 re-declares toggleFullscreen/waitForFullscreenState byte-for-byte identically to src/utils/_tests/fullscreen.ts:5-18, which 12 other specs import. | Delete loadDefaultConfig unless it is wired into a defaults/reset assertion, drop the setOption alias (or keep only setOption), un-export the internal-only helpers, and replace the duplicated block in buttonController.spec.ts with the shared fullscreen helper. |
| low | incorrect | Misleading helper names and behaviour: expectCurrentQualityLevelToBeFalsy, toggleFullscreen, waitForStableTime | assertions.ts:16-20 expectCurrentQualityLevelToBeFalsy asserts the opposite of its name — `expect(currentQualityLevel).toBeTruthy()` then `.not.toBe(expectedQuality)` — and unlike its polled counterpart (assertions.ts:21-23) it reads once with no poll, so it races the player's quality settling. fullscreen.ts:5-9 toggleFullscreen(page, fullscreen) ignores the `fullscreen` argument for the action: it always clicks the toggle and then waits for the requested state, so calling it when already in that state exits fullscreen and fails. player.ts:255 waitForStableTime's `threshold = 150` is a stability duration in ms, not a threshold, and its `while (stableFor < threshold)` loop has no timeout, so a continuously playing video hangs until the test timeout with no diagnostic. | Rename to expectCurrentQualityLevelNotToBe and wrap it in expect.poll; change toggleFullscreen into setFullscreen that first reads the ytd-app[fullscreen] attribute and returns early if already in the desired state; rename waitForStableTime's parameter to stableForMs and bound the loop with expect.poll/a deadline. |
| low | infra | Local retries and headed 3-worker runs mask flakes | playwright.config.ts:149 `retries: isCI ? 2 : 1` — a locally flaky test is retried once and reported green, so flakiness is discovered only in CI (which currently cannot complete a run). playwright.config.ts:178 runs 3 workers locally, each launching a headed persistent context and recursively copying the whole Chromium auth profile (playwright.config.ts:31), against live YouTube; playwright.config.ts:148 also binds the HTML report server to host 0.0.0.0. | Set local retries to 0 (use `--retries` ad hoc) so flakes surface during development, and bind the HTML reporter to 127.0.0.1 unless remote viewing is intentional. |

### non-feature-surface

Checkout audited: C:/Users/Nathan/AppData/Local/Temp/yte-audit.  Core (non-feature) config keys are defined in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/utils/config/defaults.ts:5-11 — `featureMenu.openType`, `language`, `onScreenDisplay.{color,hideTime,opacity,padding,position,type}`, `openSettingsOnMajorOrMinorVersionChange`, `youtubeDataApiV3Key`. Grepping every spec for these keys returns hits only in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/features/__tests__/onScreenDisplay.spec.ts. Coverage matrix: onScreenDisplay.position (covered, spec:42), onScreenDisplay.hideTime (covered, spec:52), onScreenDisplay.padding (set at spec:28 but never asserted), onScreenDisplay.type (pinned to "text" at spec:26; no_display/line/circle unexercised), onScreenDisplay.color and .opacity (zero), featureMenu.openType (zero — only the default "click" is implicitly exercised by buttonController.spec), language (zero), youtubeDataApiV3Key (zero), openSettingsOnMajorOrMinorVersionChange (zero, only implicitly via the optionsTest fixture's "existing options tab" branch).  The whole options-page UI is effectively untested: Options.spec.ts (51 lines, 6 tests) only touches the footer buttons and one select, so SettingsGenerator (every feature's controls, 415 lines), SettingSearch/SettingSection filtering, ConflictResolutionDialog (358 lines), import validation/alert paths, and the disabled-gating logic in FeatureMenuOpenType/OnScreenDisplay sections have no e2e assertions. No test anywhere changes a setting through the options UI and verifies it reaches storage.  Two live-update paths in src/pages/content/index.ts changeHandlers (index.ts:243-262) have no e2e observer at all: `featureMenuOpenTypeChange` (rewires hover vs click listeners in ButtonController.ts:534-612) and `languageChange` (coreFeatures.handleLanguageChange tears down and re-enables every feature). The language path in particular looks broken today because i18nService caches its instance module-globally (src/i18n/index.ts:12-15) and ignores the requested locale on subsequent calls — a test would have caught it.  One test in Options.spec.ts is outright broken: `#language` is an id that the Select component never renders.

| Severity | Category | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| high | incorrect | "should render language select" targets #language, an id that is never rendered | C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/pages/options/Options.spec.ts:8-11 does `page.locator("#language")` then `toBeAttached()`. The id comes from `<Setting id="language" .../>` (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/sections/LanguageSettings.tsx:42), which forwards it to `<Select id={id} .../>` (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/components/Setting.tsx:192-206). But Select never destructures or renders `id` (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Inputs/Select/Select.tsx:39-48 — only className, disabled, disabledReason, label, loading, onChange, options, selectedOption); the only id it emits is `id={label}` on the trigger button (Select.tsx:81), i.e. the translated label "Language" (public/locales/en-US.json pages.options.extras.language.select.label). ID selectors are case-sensitive in the standards-mode options page (src/pages/options/index.html starts with `<!doctype html>`), so `#language` matches nothing while `#Language` would. | Locate the control by what is actually rendered — `page.getByRole("button", { name: /Language/ })` or `page.locator("#Language")` — or fix Select to spread the `id` prop onto the trigger button (which would also make the ButtonPlacement selects addressable). If Select is fixed, keep the `#language` selector; otherwise the test must change. |
| high | missing | No test writes a setting through the options UI and verifies it reaches storage | Options.spec.ts only exercises footer buttons (#import_settings_button, #export_settings_button, #clear_data_button, #reset_button) and one select's presence. Nothing covers the core write path in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/Settings.tsx:108-138 (createOptionSetter / setCheckboxOption / setValueOption, the `currentValue === nextValue` short-circuit, number coercion) or the 415-line generator that renders every feature's controls (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/SettingsGenerator.tsx). Every feature spec writes config with `test_setConfigValue`, bypassing the UI entirely. | Add to Options.spec.ts (optionsTest fixture): "should persist a checkbox change to storage" — `page.getByLabel(<enable label for a stable feature, e.g. remaining time>)`, click it, expect the "Options saved." toast in `#notifications > div`, then `page.evaluate(() => chrome.storage.local.get("remainingTime"))` and assert `enabled === true`; reload the page and assert the checkbox is still checked. Add a companion "should persist a number setting to storage" using an OSD number input (e.g. opacity) to cover the `Number(value)` coercion branch in Settings.tsx:130-137. Priority high. |
| high | missing | featureMenu.openType has zero coverage — hover mode and the live openType switch are never exercised | `featureMenu.openType` never appears in any spec. C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/features/buttonController/ButtonController.ts:576-608 has two distinct listener sets: "click" (click toggle + click-outside + mouseover/mouseleave tooltip) and "hover" (pointerenter/pointerleave on the button and menu, an 80 ms hide timer, playerContainer pointerleave, hideYouTubeSettings()). buttonController.spec.ts:40-74 only covers the default "click" mode. The live rewire path — content/index.ts:243-247 `featureMenuOpenTypeChange` -> messageHandling.ts:38-40 -> coreFeatures.handleConfigChange (coreFeatures.ts:17-24) which re-runs setupFeatureMenuEventListeners — is never triggered. | Add to buttonController.spec.ts under the featureMenu describe (fixture: "test"): (1) "feature menu should open on hover when openType is hover" — navigate watch, enableFeature(screenshotButton.button.enabled), setOption placement feature_menu, wait for `#yte-feature-menu-button` to be attached (setupFeatureMenuEventListeners early-returns at ButtonController.ts:541 if the button/menu are missing), then setOption("featureMenu.openType","hover"), `menuButton.hover()`, expect `#yte-feature-menu` visible; (2) "feature menu should close shortly after the pointer leaves in hover mode" — `page.mouse.move(0,0)` and expect `#yte-feature-menu` not visible (covers the 80 ms scheduleHide timer); (3) "switching openType from click to hover rebinds the menu listeners without reload" — open by click first, then switch to hover and assert hover opens it. Priority high. |
| high | missing | language change has zero coverage; the live languageChange path is likely a no-op due to the cached i18n instance | `language` is written by the options page (LanguageSettings.tsx:45) and broadcast as `languageChange` (content/index.ts:248-253) into coreFeatures.handleLanguageChange (coreFeatures.ts:27-40), which awaits `i18nService(language)`, then `registry.disableAll()` + `registry.enableAll(options)` and updateFeatureMenuTitle. But C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/i18n/index.ts:12-15 returns the module-cached instance whenever one exists, ignoring the requested locale, so both the page and the options UI (Settings.tsx:97-104 calls i18nService on every settings change) keep the first-loaded locale until a full reload. No spec observes any of this. | Two tests. (a) optionsTest fixture, "should re-translate the settings UI when the language changes": open the language select, pick de-DE, expect the footer button values / a section title to change to the German strings (this currently fails and would surface the i18nService cache bug); also assert the RTL case by selecting he-IL and checking `dir="rtl"` on the settings root (localeDirection, Settings.tsx:152-162) — the dir attribute does update live even though text does not, so assert both. (b) "test" fixture on watch, "changing the language re-labels the feature menu button and keeps buttons mounted": enable a feature_menu-placed button, record `#yte-feature-menu-button`'s data-title, setOption("language","de-DE"), expect data-title to change and `#yte-feature-screenshotButton-menuitem` to still be attached (guards the disableAll/enableAll teardown). Priority high. |
| medium | missing | onScreenDisplay.type variants (no_display, line, circle) and .color/.opacity are never asserted | onScreenDisplay.spec.ts:26 pins the type to "text" for every test and never sets color or opacity. The four branches in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/ui/OnScreenDisplayManager/index.ts:110-186 are meaningfully different: "circle" and "line" size the canvas and stroke/fill with displayColor, "text" applies `globalAlpha = displayOpacity / 100`, and "no_display" draws nothing yet still creates, positions and appends a 300x150 canvas (index.ts:57-73), so a naive "canvas is absent" assertion would be wrong. | Add to onScreenDisplay.spec.ts, reusing setupVolumeControl (fixture "test", watch only — the manager has no page-specific branch beyond shorts padding): (1) "draws nothing when the display type is no_display" — setOption type no_display, wheel up, expect `canvas#yte-osd` attached and `page.evaluate` that `getContext("2d").getImageData(...).data` is entirely alpha 0 (and width===300); (2) "renders the configured colour" — setOption color "red", type "line" (a solid fill, easiest to sample), wheel up and assert a non-transparent pixel whose r channel dominates; (3) "applies opacity" — same canvas with opacity 100 vs 25 and compare sampled alpha. Priority medium. |
| medium | incorrect | Import test does not verify that the legacy migration actually landed in storage | "should import settings" (Options.spec.ts:12-22) uploads tests/test-settings.json — a legacy-shaped file (`osd_display_color`, `feature_menu_open_type`, `button_placements`, ...) that drives the isLegacyConfiguration/migrateConfiguration branch in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/components/SettingsFooter.tsx:71-77 — but the only assertion is that a "Settings imported successfully" toast is attached. The migration, zod validation, number-constraint validation and state-key filtering (SettingsFooter.tsx:78-115) are all invisible to the test; the title promises an import, the body only checks a toast. | After the toast, assert the migrated values: `page.evaluate(() => chrome.storage.local.get(["onScreenDisplay","screenshotButton","playerQuality"]))` and expect `onScreenDisplay.color === "red"`, `onScreenDisplay.hideTime === 1505`, `screenshotButton.button.placement === "feature_menu"`, `playerQuality.quality === "hd2160"`. This is the suite's only exercise of the legacy migration path, so the assertion is worth the zero extra wall-clock cost. |
| medium | missing | Import conflict-resolution dialog and import failure paths have no coverage | detectConflicts (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/components/SettingsFooter.tsx:277-315) can raise four conflict kinds (globalVolume vs rememberVolume, auto-enable vs auto-disable captions, identical scroll-wheel modifier keys, removed "auto" quality) and renders a 358-line ConflictResolutionDialog whose Apply path is the only way those imports ever reach storage. tests/test-settings.json triggers none of them, and no other fixture exists. The schema-failure and number-constraint-failure branches (SettingsFooter.tsx:79-92, which call `window.alert`) are also unexercised. | Add fixtures next to tests/test-settings.json and tests in Options.spec.ts (optionsTest): (1) "should ask which feature to keep when imported settings conflict" — import a file with globalVolume.enabled and rememberVolume.enabled both true, expect the "Import Conflicts Detected" heading, pick one radio, click Apply, then assert storage has exactly one of the two enabled; (2) "should reject an invalid settings file" — import a file with e.g. `onScreenDisplay.opacity: 500`, register a `page.on("dialog")` handler and assert the alert text matches the validation message and that storage is unchanged. Priority medium. |
| medium | missing | Settings search filter has no coverage | SettingSearch (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/components/SettingSearch.tsx) feeds useSettingsFilter, which gates both individual settings (Setting.tsx:51-57) and whole sections (SettingSection.tsx:12-22). No spec types into it. This is a user-facing feature of the options page with zero assertions and is cheap to test (no YouTube page load). | Add to Options.spec.ts (optionsTest): "should filter settings by search text" — count visible section titles, type "screenshot" into the search input (`page.getByPlaceholder(<pages.options.extras.settingSearch.placeholder>)`), expect the screenshot settings to remain visible while an unrelated section (e.g. the language section title) is detached, then clear the box and expect it back. Priority medium. |
| medium | missing | Options-page disabled-state gating is never verified | Two sections compute a disabled state from other settings and show an explanatory title: FeatureMenuOpenType disables the openType select unless some button is placed in feature_menu (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/sections/FeatureMenuOpenType.tsx:11,39-52 hasAnyFeatureMenuButton), and OnScreenDisplay disables all six OSD controls unless scrollWheelVolumeControl, scrollWheelSpeedControl or volumeBoost(per_video) is enabled (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/sections/OnScreenDisplay.tsx:104-108). ButtonPlacement likewise disables selects via isButtonSelectDisabled. None of this logic is exercised. | Add to Options.spec.ts (optionsTest): "should disable the on-screen display settings until a consumer feature is enabled" — from a fresh profile assert the OSD colour select trigger has the `disabled` attribute, tick the scroll-wheel volume control checkbox, assert it becomes enabled. Optionally a second test for the featureMenu.openType select gated on hasAnyFeatureMenuButton. Priority medium. |
| medium | missing | Generic tooltip mechanics for feature buttons and the feature-menu button are untested | createTooltip (C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/utils/dom/tooltip.ts:15-70) creates `#yte-feature-<name>-tooltip` on mouseover, removes it on mouseleave, chooses body vs `#movie_player` as the container depending on mini-player / below-player placement, and its text tracks `element.dataset.title` (updateFeatureButtonTitle, ButtonController.ts:653-659). Grepping the specs for "tooltip" returns only a comment in saveToWatchLaterButton.spec.ts:89; the three data-title assertions (copyTimestampUrlButton.spec.ts:55-73, maximizePlayerButton.spec.ts:174-178) read the attribute without ever hovering. This is a cross-feature mechanic, so it belongs in buttonController.spec.ts rather than in each feature spec. | Add to buttonController.spec.ts (fixture "test", watch): "should show and hide a button tooltip on hover" — place the screenshot button in player_controls_left, ensure controls visible, hover it, expect `#yte-feature-screenshotButton-tooltip` attached with textContent equal to the button's data-title, then `page.mouse.move(0,0)` and expect it detached. One test at below_player placement would additionally cover the body-vs-player container branch. Priority medium. |
| medium | missing | bfcache restore (pagehide/pageshow re-setup) is never exercised | C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/pages/embedded/index.ts:35-42 disposes the whole page setup on `pagehide` and re-runs initSetup on `pageshow`, and the content script mirrors this by removing the storage listener and the `yte-ready` attribute on pagehide (content/index.ts:155-163). No spec calls `page.goBack()`/`goForward()` (grep for goBack/pageshow across src/utils/_tests and src/features/__tests__ returns nothing), so a broken restore would leave every feature dead after a browser back with no test failing. Feature specs only cover SPA navigation and full reloads. | Add a test (fixture "test") in buttonController.spec.ts or a small core spec: "extension re-initialises after a browser back navigation" — navigateToPageType(watch), enable a button and assert it is placed, navigateToPageType(home), `page.goBack()`, then expect `html[yte-ready]` to be attached again and a subsequent `setOption(...placement...)` to still move the button live (proving the storage listener was re-registered). Priority medium. |
| medium | missing | deepDarkCSS "Custom" preset / deepDarkCSS.colors branch is explicitly skipped | C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/features/__tests__/deepDarkCSS.spec.ts:72 does `if (preset === "Custom") continue;`, and no other test sets `deepDarkCSS.colors`. The branch `preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset]` appears three times in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/features/deepDarkCSS/index.ts:15,31,33 (onConfigChange, onEnable update, onEnable create) and also feeds the button-colour resolution in src/utils/deep-dark-theme/index.ts:32-33. The custom-theme colour object is one of the few structured config values with no coverage at all. | Add to deepDarkCSS.spec.ts (fixture "test", watch only): "applies custom theme colours when the preset is Custom" — setOption("deepDarkCSS.preset","Custom"), setOption("deepDarkCSS.colors.mainColor", "#ff00ff"), enable the feature and expect `#yte-deep-dark-css` textContent to match `--main-color:\s*#ff00ff`; then change one colour and assert the style element updates live (onConfigChange path). Priority medium. |
| low | incorrect | clear/reset/export tests assert only a toast, never the resulting state | "should clear data" (Options.spec.ts:28-39) and "should reset data" (Options.spec.ts:40-50) both end at `getByText(...)` on `#notifications > div`; neither checks that `browser.storage.local` was actually set to the default configuration (SettingsFooter.tsx:127-135 and 216-232). "should export settings" (Options.spec.ts:23-27) asserts the success toast only — the exported blob is never inspected even though the context is created with `acceptDownloads: true` and a `downloadsPath` (playwright.config.ts:33-36), so a regression in exportSettings' key filtering or the `state:` merge (SettingsFooter.tsx:151-172) would not fail the test. | For clear/reset, follow the toast with `page.evaluate(() => chrome.storage.local.get(null))` and compare a couple of representative keys against the defaults (loadDefaultConfig() from src/utils/_tests/features.ts is available). For export, wrap the click in `const [download] = await Promise.all([page.waitForEvent("download"), exportSettings.click()])`, assert the filename matches /^youtube_enhancer_settings_.*\.json$/ and that the parsed JSON contains the core keys plus at least one `state:` entry. |
| low | unnecessary | "should render YouTube Enhancer settings page" only re-checks the fixture | Options.spec.ts:4-7 asserts `page.url()` contains "/src/pages/options/index.html" and the document title — both are guaranteed by the optionsTest fixture itself, which navigates to exactly that URL (playwright.config.ts:110-125), and the title is a static string in src/pages/options/index.html. It cannot detect a React mount failure: if <Settings> throws or stays on the Loader, the test still passes. Combined with the broken "should render language select", the suite has no working smoke check that the settings UI renders. | simplify — replace the url/title assertions with a real render check, e.g. `await expect(page.getByRole("heading", { name: "YouTube Enhancer" })).toBeVisible()` (SettingsHeader.tsx:9-12) plus one generated section title, and merge "should render language select" into it using a selector that actually exists. |
| low | missing | youtubeDataApiV3Key and openSettingsOnMajorOrMinorVersionChange have no coverage | Both are core config keys (src/utils/config/defaults.ts:9-10). `youtubeDataApiV3Key` has no runtime consumer in src/features (grep for apiKey/googleapis in src/features returns nothing), so its only observable behaviour is the password TextInput round-trip in C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/components/Settings/sections/YouTubeDataApiKey.tsx:16-27. `openSettingsOnMajorOrMinorVersionChange` gates the onInstalled tab open (src/pages/background/index.ts:10-38); the install case is exercised only incidentally by the optionsTest fixture's "existing options tab" branch, and the toggle itself (Settings.tsx:165-174) is never touched. | Low priority, options page only (optionsTest): one test that types into the API-key input, asserts `chrome.storage.local.get("youtubeDataApiV3Key")` matches and that the input renders with `type="password"`; one test that toggles openSettingsOnMajorOrMinorVersionChange and asserts it persists. Do not attempt to test the onInstalled tab-open branch — it is not reproducible from a running context. |
| low | missing | The popup page has no spec despite rendering the same settings UI with a different footer branch | C:/Users/Nathan/AppData/Local/Temp/yte-audit/src/pages/popup/Popup.tsx renders the same <SettingsPage/> as Options.tsx, but SettingsFooter branches on `isPopup` (SettingsFooter.tsx:32) to render the extra `#openinnewtab_button` (SettingsFooter.tsx:196-205) and to redirect the import flow to a new tab on Firefox (SettingsFooter.tsx:138-147). No fixture or spec loads /src/pages/popup/index.html. | Optional: add a `popupTest` fixture mirroring optionsTest but navigating to `${origin}/src/pages/popup/index.html`, and one spec asserting the settings render there and that `#openinnewtab_button` is present (it must be absent on the options page). Priority low — it duplicates the options page apart from that one branch. |

### hide-family

The 13 hide-family specs are 13 hand-copied instances of one 7-test template (enabled / disabled / after-navigation / reload / restore-on-disable / re-enable / dynamic-content), multiplied by a page loop. Current cost, per Playwright project: hideArtificialIntelligence 11x7=77, hideMembersOnlyVideos 11x7=77, hidePlayables 11x7=77, hideScrollBar 10x7+1 skip=71, hideShorts 6 sub-keys x 6=36 +1 conflict=37, hideEndScreenCards 1x5 +reload +non-target +conflict=8, hideLiveStreamChat 1x7 +1=8, hidePaidPromotionBanner 8, hideSidebarRecommendedVideos 8, hideTranslateComment 8, hideOfficialArtistVideosFromHomePage 7, hidePlaylistRecommendationsFromHomePage 7, hidePosts 7 => 400 test cases per project, 800 across chromium+firefox, roughly 100 min/project at 15 s/test (worse: 28 of them navigate to the `live` page type, which alone budgets up to 120 s each). Because every one of these features is nothing but `modifyElementClassList(add\|remove, "yte-hide-*", document.body)` plus a static CSS rule (hideScrollBar injects a <style> instead), only four behaviours are actually distinct: (a) class added + a real element hidden, (b) class absent on cold load, (c) enable->disable->enable within one page session, (d) class restored after a full page load; plus, for the 9 features that declare includePages, (e) the class is not added on a non-target page and (f) the SPA-navigation gate in featureNavigationManager.areDependenciesMet. Everything else is derivable: "after navigation" is a reload plus a toggle and re-enables the feature before asserting; "restores when disabled after being enabled" is a strict prefix of "re-applies after disable then re-enable"; "hides dynamically added content" cannot fail for a body-class + CSS feature; and the page loops multiply identical assertions over pages where the generated selectors cannot match, so `expectElementsHidden` passes vacuously and the only surviving assertion is `expectBodyWithClass`. Recommended minimal template: 4 tests for the 4 features with no includePages (hideArtificialIntelligence, hideMembersOnlyVideos, hidePlayables, hideScrollBar) = 16; 6 tests (the 4 plus non-target plus SPA-gate) for the 8 single-key gated features = 48; hideShorts 6 sub-keys x 3 (enabled/disabled/toggle-cycle) = 18 plus 1 reload, 1 gate, 1 key-isolation = 21. Total 16+48+21 = 85 per project, 170 across both projects - a 79% cut (315 tests/project, ~80 min/project) while adding coverage of the SPA gate, the sub-key isolation and the currently-vacuous element assertions.

| Severity | Category | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| high | incorrect | "hides elements after navigation" re-enables the feature before asserting, so it cannot fail on navigation | Present in all 13 specs, e.g. src/features/__tests__/hidePosts.spec.ts:37-49: after `navigateToPageType(page, home)` / `navigateToPageType(page, pageType)` the body does `await disableFeature(...)` then `await enableFeature(...)` (lines 45-46) and only then asserts the body class. Any breakage of the post-navigation re-application path is masked by the forced re-enable. Worse, both navigateToPageType calls are full document loads (src/utils/_tests/navigation.ts:216-226 -> navigateToPage -> page.goto), so the test is the reload test with extra steps, and when pageType === "home" navigateToYoutubePage skips the goto entirely because the URL is unchanged - so "hides elements after navigation on home" performs zero navigations. Same shape at src/features/__tests__/hideShorts.spec.ts:85-88, src/features/__tests__/hideScrollBar.spec.ts:64-67, src/features/__tests__/hideEndScreenCards.spec.ts:46-48. | remove: delete "hides elements after navigation on ${pageType}" from the template. Its reload half is already "persists hide after full page reload on ${pageType}" and its toggle half is "re-applies after disable then re-enable on ${pageType}". Replace it with a genuine SPA-navigation test (next finding). |
| high | missing | No test exercises SPA navigation or the dependency gate on navigation | src/features/_registry/featureNavigationManager.ts:32-33 (`areDependenciesMet`) combined with src/features/_registry/featureOrchestrator.ts:143-166 means that when YouTube SPA-navigates from an includePages page to a non-target page the feature is disabled and the body class is removed, and re-added on return. Every "navigation" test in the family (and every non-target test, e.g. src/features/__tests__/hidePaidPromotionBanner.spec.ts:88-93) uses `navigateToPageType`, which is a cold `page.goto`, so the yt-navigate-start / yt-navigate-finish / pushState listeners installed at featureNavigationManager.ts:256-265 are never driven by any hide spec. A regression in signature computation or in the include/exclude gate on SPA navigation would be invisible to the whole family. | Add one template test per gated feature: load the target page, enable, assert the class, then click an in-page link (or `history.pushState` + dispatch `yt-navigate-finish`) to a non-target page, assert `expectBodyWithoutClass`, navigate back in-page and assert the class returns. This is the only genuinely new behaviour the family should gain. |
| high | incorrect | expectElementsHidden/expectElementsNotHidden pass vacuously with zero matches and the template never guards | src/utils/_tests/assertions.ts:26-40 and :41-58: in the default `mode: "all"`, the loop `for (let count = await locator.count(), i = 0; i < count; i++)` simply does not execute when nothing matches, and the function returns without asserting. The template calls both helpers with the default mode, so on any page where the generated selector matches nothing the only surviving assertion is `expectBodyWithClass`. Concretely: hidePaidPromotionBanner's `.ytp-paid-content-overlay` requires a video with a paid-promotion disclosure and no fixture declares such a capability (src/utils/_tests/navigation.ts:9-20, 97-122), hideTranslateComment's `ytd-tri-state-button-view-model.translate-button` only renders for non-English comments and the watch fixtures are English, and hideEndScreenCards asserts the enabled case without seeking to the end of the video (src/features/__tests__/hideEndScreenCards.spec.ts:24-29) while the disabled case does seek (lines 34-37) - so the enabled assertion is vacuous by construction while its mirror is not. | Two changes: (1) in the one "enabled" test per feature, use `expectElementsHidden(page, selectors, { mode: "any" })`, which throws "No selectors matched the expected state" when nothing matched, so vacuity becomes a failure; (2) add a `mountSelectorFixture(page, selector)` helper that synthesises a DOM node matching the generated selector (the selectors are all structural: tag + attribute + :has(path[d=...])), append it, and assert display:none. That makes every hide feature deterministically testable without depending on YouTube serving matching content, and lets the family drop the remaining page loops. |
| high | unnecessary | 11-page loops for the four features that declare no includePages | `resolvePageTypes` returns all 11 page types when includePages is absent (src/utils/_tests/utils.ts:6-8). hideArtificialIntelligence, hideMembersOnlyVideos, hidePlayables (all `metadata` without `dependencies`) and hideScrollBar therefore run 7 tests on each of 11 pages = 77/77/77/71 tests. The feature code has no page-specific branch whatsoever (src/features/hidePosts/index.ts:9-20 is the whole family's shape; src/features/hideScrollBar/index.ts:7-25 injects a page-independent <style>), and most of those pages cannot match the selectors: hidePlayables' only selector is `ytd-rich-section-renderer:has(a[href="/playables"])`, and `ytd-rich-section-renderer` exists only in the home/subscriptions rich grid, so 9 of its 11 pages (63 tests) assert nothing but the body class; hideArtificialIntelligence's 14 selectors are watch/search/live-only, so its channel_home, channel_posts, channel_streams, channel_videos, home, playlist, shorts and subscriptions runs (56 tests) are body-class-only duplicates. That is roughly 200 of the family's 400 test cases. | reduce-pages: hideArtificialIntelligence -> watch, search, live; hideMembersOnlyVideos -> home, channel_home; hidePlayables -> home; hideScrollBar -> search (any page with a scrollbar; the feature is page-independent). Drive the page list from an explicit per-feature `coveragePages` constant in the spec rather than from `resolvePageTypes`, since includePages is a runtime gate and not a statement about where the CSS can match. |
| medium | unnecessary | "restores ... when disabled after being enabled" is a strict prefix of "re-applies after disable then re-enable" | src/features/__tests__/hidePosts.spec.ts:61-70 ("restores original state when disabled after being enabled on ${pageType}") does enable -> assert class -> assert hidden -> disable -> assert no class -> assert not hidden. src/features/__tests__/hidePosts.spec.ts:71-82 ("re-applies after disable then re-enable on ${pageType}") does exactly the same first five steps and then adds enable -> assert class -> assert hidden. The same pair exists in all 13 specs (hideShorts.spec.ts:92-104 already merges them into one test, proving the merge is viable). | merge-into:re-applies after disable then re-enable on ${pageType} - delete the "restores ..." test and add the missing `expectElementsNotHidden` call to the middle of the re-enable test, as hideShorts.spec.ts:100 already does. Saves 1 test per feature per page. |
| medium | unnecessary | "hides dynamically added content" is tautological for a body-class + CSS feature | src/features/__tests__/hidePosts.spec.ts:83-92 and the identical test in the other 12 specs. `injectDynamicContent` (src/utils/_tests/dom.ts:22-42) clones an element that already matched the selector and re-appends it; since the hide is a static CSS rule scoped to `body.yte-hide-*` (src/features/hidePosts/index.css:1-5), the clone is matched by the browser's style engine the instant it is inserted. There is no MutationObserver or per-element inline style anywhere in the family that could fail to catch it. When nothing matched, `injectDynamicContent` returns null and the test silently degenerates into a duplicate of "hides posts section on ${pageType}". | remove from the template for all 13 features. If you want to keep one canary that the mechanism is CSS-based rather than element-based, keep exactly one instance (e.g. hidePosts on home) and assert the return value of `injectDynamicContent` is non-null so it cannot pass vacuously. |
| medium | infra | Thirteen hand-copied templates that have already diverged | generateMissingFeatureTests (src/utils/_tests/generateMissingFeatureTests.ts:12-20) only copies the empty src/features/__tests__/__base__.spec.ts (0 bytes), so each hide spec is a manual copy. The copies have drifted: hideArtificialIntelligence.spec.ts:35-36 and :70-71 guard the "shows when disabled" assertion with a `hasAnyMatch` probe plus `{ mode: "any" }` while the other 12 specs call `expectElementsNotHidden(page, selectors)` with the vacuous default mode; hideMembersOnlyVideos.spec.ts:17 string-hacks the bodyClass; hideEndScreenCards.spec.ts:78-87 hoists the reload test out of the page loop while every other spec keeps it inside; hideScrollBar.spec.ts is a bespoke re-implementation. Fixing any template-level bug currently requires 13 edits. | Extract a `describeHideFeature({ featureId, configKey, bodyClass, selectors, coveragePages, gated })` factory into src/utils/_tests and reduce each spec to one call plus its feature-specific extras (endScreenCards' seek-to-end, hideShorts' sub-key table). The vacuity guard, the mode choice and the page set then have exactly one definition. |
| medium | incorrect | hideScrollBar uses nine fixed 1 s sleeps in front of conditions that are already polled | src/features/__tests__/hideScrollBar.spec.ts:22, 54, 68, 82, 94, 108, 136, 161, 175 - each `await page.waitForTimeout(1000)` is immediately followed by an `await expect.poll(..., { timeout: 10000 })` that would have waited for the same condition. `setFeatureValue` already sleeps 500 ms (src/utils/_tests/features.ts:70). Across the 10 non-shorts pages this is 90 s of dead wall clock per project, 180 s across both, and it does nothing to reduce flake. | simplify: delete all nine `waitForTimeout(1000)` calls; the `expect.poll` blocks are the awaited condition. Also delete the `test.skip("scrollbar tests are not applicable on shorts")` placeholder at line 16 rather than registering a skipped test. |
| medium | incorrect | hideShorts conflict test cannot fail | src/features/__tests__/hideShorts.spec.ts:131-143, "hideShorts sub-features active on watch don't interfere with shortsAutoScroll on shorts page": it enables all six sub-keys on watch, does a cold `navigateToPageType(page, shorts)`, sleeps 3 s (line 141) and asserts `expect(page.locator("#shorts-player")).toBeAttached()`. `#shorts-player` is present on every shorts page regardless of extension state, none of the six `yte-hide-shorts-*` rules can hide it, hideShorts' includePages does not contain "shorts" (src/features/hideShorts/index.metadata.ts) so `areDependenciesMet` returns false and all six classes are removed on arrival, and shortsAutoScroll is never enabled or observed. The assertion is true even with the extension uninstalled, and the 3 s sleep is redundant with toBeAttached's auto-wait. | remove, or rewrite to actually assert the interaction: enable shortsAutoScroll plus the six hideShorts keys, land on shorts, assert `expectBodyWithoutClass` for all six shorts classes (the gate) and that shortsAutoScroll still advances to the next short. |
| medium | infra | The generator emits a CSS guard inside `bodyClass`, forcing a per-spec string hack | src/features/__tests__/__generated__/hideFeatureSelectors.ts:26 emits `bodyClass: "yte-hide-members-only-videos:not(:has(yt-sponsorships-hub))"` because the capture group at src/pipeline/steps/generateHideFeatureSelectors.ts:29 (`/^body\.(yte-hide-[a-z0-9-]+(?::[^{]+)?)\s*$/`) swallows the pseudo-class chain. `expectBodyWithClass` interpolates that string straight into a RegExp (src/utils/_tests/assertions.ts:11), where `:not(:has(yt-sponsorships-hub))` becomes capture groups and the pattern can never match a class attribute - so the spec compensates at src/features/__tests__/hideMembersOnlyVideos.spec.ts:17 with `rawBodyClass.replace(/:not\(.*?\)$/, "")`. Any new guard shape (`:has(...)`, a second `:not`, a nested paren) silently breaks that regex and turns `expectBodyWithoutClass` into an always-passing assertion. | Emit `{ bodyClass, guard }` separately from the generator and have `expectBodyWithClass` escape its argument (`RegExp.escape` / manual escaping) so a malformed class name fails loudly instead of matching nothing. |
| medium | missing | The generator drops every declaration that is not display:none, leaving those CSS effects untested | src/pipeline/steps/generateHideFeatureSelectors.ts:36 keeps a nested rule only if it declares `display: none`. That silently discards src/features/hideLiveStreamChat/index.css:10-12 (`ytd-watch-flexy[fixed-panels] #columns.ytd-watch-flexy { padding-right: 0px !important }` - the layout reflow after the chat is hidden) and src/features/hideArtificialIntelligence/index.css:21-23 (`ytd-menu-renderer[has-items] yt-button-shape.ytd-menu-renderer { margin-left: 0 !important }`, which is also skipped because the top-level selector does not match the `^body\.(...)$` regex at line 29). Both are user-visible layout changes with zero coverage, and the generated map gives the false impression that it fully describes each feature. | Either extend the generator to emit a second `layoutRules: [{ selector, prop, value }]` array and add one assertion per feature that checks the computed property, or accept the gap explicitly and document in the generated header that only display:none rules are extracted so a reader does not mistake the map for full coverage. |
| medium | missing | hideMembersOnlyVideos' `:not(:has(yt-sponsorships-hub))` escape hatch is never exercised | src/features/hideMembersOnlyVideos/index.css:1 scopes the entire hide to `body.yte-hide-members-only-videos:not(:has(yt-sponsorships-hub))`, i.e. the feature deliberately stops hiding on pages that contain a sponsorships hub. The spec strips that guard away (src/features/__tests__/hideMembersOnlyVideos.spec.ts:17) and never visits or synthesises a page containing `yt-sponsorships-hub`, so nothing verifies that members-only items stay visible there - which is the whole point of the guard. | Add one test that appends a `<yt-sponsorships-hub>` element to the page with the feature enabled and asserts the matching items are no longer display:none. Deterministic, one page, no fixture dependency. |
| medium | missing | hideShorts sub-key isolation and the derived enabled state are untested | src/features/__tests__/hideShorts.spec.ts:63-127 exercises each of the six config keys, but only ever asserts its own class: "shows when disabled on ${page}" (line 72) checks `expectBodyWithoutClass(pageObj, bodyClass)` for that one key. `applyShortsVisibility` (src/features/hideShorts/utils.ts:16-23) writes all six classes on every call from onEnable/onConfigChange/onNavigate, so a mis-keyed map entry (e.g. `search` writing `yte-hide-shorts-sidebar`) would still pass every existing test as long as the intended class also happens to be set. There is also no test that the parent feature is off when all six keys are false and on when any single key is true. | Add one "only the enabled sub-key's class is present" test: enable exactly one key and assert `expectBodyWithoutClass` for the other five classes. One test covers all six keys if it loops the assertions rather than the tests. |
| low | unnecessary | "shows X when disabled" is the family's only cold-start-disabled check but is run on every page | src/features/__tests__/hidePosts.spec.ts:30-36 and the equivalent in the other specs. Since every hide feature defaults to `enabled: false` (e.g. src/features/hidePosts/index.metadata.ts `config: { enabled: field(z.boolean(), false) }`), this test loads a page, writes `false` over `false`, and asserts the class is absent - a state that is also asserted mid-way through "re-applies after disable then re-enable". Its one distinct value is proving that the class is not added at extension startup, which is page-independent. | reduce-pages: keep exactly one instance per feature, on the feature's coverage page, and drop it from the page loop. |
| low | infra | The `live` page type is pulled into three unrelated 11-page loops at up to 120 s per navigation | `resolvePageTypes` includes "live" for hideArtificialIntelligence, hideMembersOnlyVideos, hidePlayables and hideScrollBar, so 7 tests each (28 in total) run the live-video discovery loop in src/utils/_tests/navigation.ts:187-214, which retries up to 5 times with a 60 s visibility wait and then polls the live badge for up to 120 s (navigation.ts:149-159) under a single `test.setTimeout(120_000)` (navigation.ts:147). The "hides elements after navigation on live" variant performs two live discoveries plus a home load inside that same 120 s budget, so it is structurally at risk of timing out. Only hideLiveStreamChat and hideArtificialIntelligence's live-chat selectors have any reason to be on that page. | Exclude `live` from the recommended per-feature coverage page sets; keep it only for hideLiveStreamChat (which is gated to it) and, if desired, one hideArtificialIntelligence test for the `ytd-live-chat-frame [class*="ai-summary"]` selectors. |
| low | missing | No guard against the generated selector list silently becoming empty | src/pipeline/steps/generateHideFeatureSelectors.ts:29 only recognises a single top-level `body.yte-hide-*` selector and :36 only keeps rules declaring display:none; if a feature's CSS is refactored (comma-joined body selectors, a `@media` wrapper, `visibility: hidden` instead of `display: none`), the entry silently drops out of hideFeatureSelectors.ts or gets an empty `selectors` array. Every `expectElementsHidden(page, [])` then passes and the spec still goes green - exactly what already happens implicitly for hideScrollBar, which has no index.css and therefore no entry in the generated map at all. | Add a single module-level assertion in the shared template - `test("generated selectors are non-empty", () => expect(selectors.length).toBeGreaterThan(0))` - or, better, fail the pipeline step when a hide* feature directory with an index.css produces zero entries. |

### button-family

The 13 button-feature specs are copies of one template: a `for (const pageType of testPages)` loop (present/absent/click/persist-after-navigation/re-appear/reload), a `non-target page` test, a `button placement` describe looping [left, right] (+ sometimes feature_menu), and a `fullscreen transition` describe with left→right and fullscreenPlacement:"same". The placement/fullscreen half is pure buttonController mechanics: 64 test cases per Playwright project (128 across chromium+firefox) that re-prove what src/features/__tests__/buttonController.spec.ts already proves generically; two of them (loopButton fullscreen) are byte-identical copies of buttonController tests. Collapsing them to one placement smoke test per button (14) saves 50 cases/project, 100 total, roughly 12-25 min of live-YouTube wall clock. The template also has a systemic correctness bug: six "persist after navigation" tests disable+re-enable+re-set placement after navigating back, so they no longer test navigation at all and become duplicates of the neighbouring "re-appear after disable then re-enable" test. On the other side, real button behaviour is under-tested: no spec ever clicks a feature-menu item (the `clickFeatureMenuItem` helper is dead code, and hideEndScreenCardsButton's feature_menu-inverts-`checked` branch is therefore unexercised); no spec asserts that aria-checked flips or the on/off icon swaps when a toggle button is clicked, for any of the six toggle buttons; flipVideoButtons has zero click-effect tests despite a trivially observable `video.style.transform`; maximizePlayerButton's Escape/"t" shortcut and volumeBoost's wheel-on-button handler have no coverage. Helper usage is inconsistent (buttonController.spec.ts re-declares `toggleFullscreen` locally while all 11 others import src/utils/_tests/fullscreen.ts), and feature-menu placement is tested for 8 of 11 buttonController features but omitted for flipVideoButtons, forwardRewindButtons and playbackSpeedButtons even though icons.ts defines feature_menu icons for all of them.

| Severity | Category | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| high | unnecessary | Per-feature "button placement" + "fullscreen transition" describes re-test buttonController mechanics: 64 cases/project reducible to 14 | Every button spec ends with the same two describes, whose bodies only call setOption(placement)/setOption(fullscreenPlacement)/enableFeature/expectFeatureButtonToBeIn — i.e. they exercise ButtonController.placeButton and handleFullscreenChange, not the feature. src/features/__tests__/copyTimestampUrlButton.spec.ts:115 and :134 (5 cases), flipVideoButtons.spec.ts:118 and :137 (8), forwardRewindButtons.spec.ts:97 and :116 (8), hideEndScreenCardsButton.spec.ts:107 and :126 (5), loopButton.spec.ts:87 and :106 (5), maximizePlayerButton.spec.ts:122 and :141 (5), miniPlayerButton.spec.ts:93 and :112 (5), openTranscriptButton.spec.ts:106 and :125 -> actually :92 and :111 (5), playbackSpeedButtons.spec.ts:106 and :125 (8), screenshotButton.spec.ts:121 and :140 (5), volumeBoost.spec.ts:183 and :204 (5) = 64 test cases per project, 128 across chromium+firefox. src/features/buttonController/ButtonController.ts:928 (placeButton) branches only on the placement string and is completely feature-agnostic; src/features/buttonController/ButtonController.ts:813 (handleFullscreenChange) iterates `trackedButtons` generically. buttonController.spec.ts:79-150 already covers left, right, below_player, left<->right, right<->left, below->left, ->feature_menu and "same" for two representative features. | reduce to one placement smoke test per button (14 total: copyTimestampUrl, flipH, flipV, forward, rewind, hideEndScreenCards, loop, maximize, miniPlayer, openTranscript, increaseSpeed, decreaseSpeed, screenshot, volumeBoost) that asserts the button renders in its configured placement, and delete the per-feature fullscreen describes entirely. Saves 50 cases/project, 100 across both projects (~12-25 min of live wall clock). If a per-feature fullscreen check is still wanted, drive it from a shared table (feature id -> button id) so it is one parametrised test file rather than 11 copies. |
| high | unnecessary | loopButton and screenshotButton fullscreen/placement tests are byte-identical duplicates of buttonController.spec.ts | loopButton.spec.ts:107-117 "should move button from left to right on fullscreen enter/exit" has the same body (placement left, fullscreenPlacement right, same button id, same three expectFeatureButtonToBeIn calls) as buttonController.spec.ts:79-89 "should move loop button from left to right controls when entering fullscreen and back when exiting". loopButton.spec.ts:119-129 "should not move button when fullscreenPlacement is same" is identical to buttonController.spec.ts:100-111 "should not move loop button when fullscreenPlacement is same". screenshotButton.spec.ts:123-129 "should render button in ${placement}" duplicates buttonController.spec.ts:136-142 "should place screenshot button in ${placement}", and screenshotButton.spec.ts:132-137 "should render button in feature menu" duplicates buttonController.spec.ts:33-38 "should add feature menu item to feature menu" (same feature, same option, same assertion helper). | remove the "fullscreen transition" describe from loopButton.spec.ts:106-130 and the "button placement" + "fullscreen transition" describes from screenshotButton.spec.ts:121-164; buttonController.spec.ts is the owner of those mechanics for exactly these two features. |
| high | incorrect | "persist after navigation" tests disable+re-enable the feature after navigating back, so they cannot detect a navigation regression | flipVideoButtons.spec.ts:44-55 `horizontal flip button should persist after navigation on ${pageType}` navigates home->pageType then runs disableFeature/enableFeature/setOption(placement) at lines 51-53 before asserting the button exists; identical pattern at flipVideoButtons.spec.ts:56-67 (vertical), hideEndScreenCardsButton.spec.ts:47-58 (lines 54-56), miniPlayerButton.spec.ts:52-63 (lines 59-61), loopButton.spec.ts:58-69 (lines 65-67), volumeBoost.spec.ts:62-77 (lines 71-74). Because the feature is torn down and rebuilt after the navigation, the final assertion passes even if onNavigate never re-adds the button, which is the only thing the title claims. The bodies then become exact duplicates of the neighbouring "should re-appear after disable then re-enable" tests (flipVideoButtons.spec.ts:68-78, hideEndScreenCardsButton.spec.ts:59-69, miniPlayerButton.spec.ts:64-74). | Delete the disable/enable/setOption block from each navigation test so the assertion actually follows navigateToPageType(home) -> navigateToPageType(pageType); then delete the now-redundant "should re-appear after disable then re-enable" twin. copyTimestampUrlButton.spec.ts:77-85 and maximizePlayerButton.spec.ts:67-75 already do it correctly and can be the template. |
| high | missing | flipVideoButtons has no test of what the buttons actually do | src/features/flipVideoButtons/utils.ts:16-23 sets `video.style.transform = scale(scaleX, scaleY)` and `transformOrigin = center center`, with independent flipX/flipY latches, so horizontal-only, vertical-only and both-at-once are three distinct observable states. src/features/__tests__/flipVideoButtons.spec.ts contains 8 placement/fullscreen cases plus presence/persistence cases and never once clicks either button (no clickFeatureButton import at flipVideoButtons.spec.ts:1-9). | Add on watch: (1) "horizontal flip button applies scale(-1, 1) to the video and restores scale(1, 1) on second click"; (2) same for vertical with scale(1, -1); (3) "clicking both flip buttons applies scale(-1, -1)" to cover the combined-latch branch in applyVideoFlip. |
| high | missing | Feature-menu placement is only ever asserted as "item exists"; no spec clicks through the menu, and the helper for it is dead code | src/utils/_tests/features.ts:28 defines `clickFeatureMenuItem`, and a repo-wide grep finds no caller. Every feature-menu test stops at existence: copyTimestampUrlButton.spec.ts:126-131, hideEndScreenCardsButton.spec.ts:118-123, loopButton.spec.ts:98-103, maximizePlayerButton.spec.ts:133-138, miniPlayerButton.spec.ts:104-109, openTranscriptButton.spec.ts:103-108, screenshotButton.spec.ts:132-137, volumeBoost.spec.ts:195-201 all only call expectFeatureMenuItemToBeTruthy. buttonController.spec.ts:39-48 only opens the menu. Meanwhile ButtonController.ts:744-750 (featureMenuClickListener) and ButtonController.ts:960-963 (setMenuItemChecked, which also toggles the `ytp-menuitem-checked` class) are a separate code path from the button click path, and src/features/hideEndScreenCardsButton/index.ts:24-27 deliberately inverts the semantics for the menu (`shouldHideCards = checked` in the menu vs `!checked` for a player button) — an inversion regression there is invisible to the whole suite. | Add one generic menu click-through test in buttonController.spec.ts using clickFeatureMenuItem (e.g. loopButton: open menu, click #yte-feature-loopButton-menuitem, expect video.loop true and the item to gain aria-checked="true" and class ytp-menuitem-checked), plus one feature-specific test "clicking the hideEndScreenCards menu item hides end screen cards" to pin the inverted branch at hideEndScreenCardsButton/index.ts:24-27. |
| high | missing | No toggle button is tested for aria-checked flipping on click or for the on/off icon swap | src/icons.ts:466-522 defines on/off ToggleIcon pairs for hideEndScreenCardsButton, loopButton, maximizePlayerButton, miniPlayerButton, monoToStereoButton and volumeBoostButton, and ButtonController.ts:706-713 (buttonClickListener) flips aria-checked via setChecked and swaps the SVG via updateFeatureButtonIcon on every click. A repo-wide grep for "aria-checked" in src/features/__tests__ matches only maximizePlayerButton.spec.ts:173/177 — and that test ("reflects automatic maximization in the button state on watch") covers the external-sync path, not a user click. No spec anywhere asserts that the rendered <svg> inside the button changes. | Add to the reduced smoke test for each toggle button (loop, hideEndScreenCards, miniPlayer, maximize, volumeBoost): after clickFeatureButton assert `toHaveAttribute("aria-checked", "true")` and that the button's inner svg outerHTML differs from the pre-click value, and that both revert on the second click. One shared assertion helper `expectToggleButtonState(page, id, checked)` in src/utils/_tests/assertions.ts keeps it to one added assertion per existing click test rather than new test cases. |
| medium | missing | maximizePlayerButton's Escape / "t" keyboard shortcut is untested | src/features/maximizePlayerButton/utils.ts:176-182 registers a capture-phase keydown handler that minimizes the player on "Escape" or "t", and explicitly bails when the event target is inside `input, textarea, [contenteditable='true']`. src/features/__tests__/maximizePlayerButton.spec.ts never uses page.keyboard (grep for `press(` across src/features/__tests__ matches only blockNumberKeySeeking.spec.ts:19/42/132). | Add on watch: "pressing Escape while maximized minimizes the player" (click button, expect body[yte-maximized], keyboard.press("Escape"), expect the attribute gone and the button's aria-checked back to false), and "typing t in the search box does not minimize the player" to cover the input/textarea guard. |
| medium | missing | volumeBoost button's wheel handler has no coverage | src/features/volumeBoost/index.ts:121-132 attaches a non-passive `wheel` listener to the volume boost button, and src/features/volumeBoost/index.ts:24-41 implements it: deltaY<0 raises by STEP_DB, Shift multiplies by 2.5, Ctrl by 5, the result is clamped with clampDb, persisted via sendContentOnlyMessage("setVolumeBoostAmount") and shown in an OnScreenDisplayManager. volumeBoost.spec.ts only ever clicks the button (lines 129, 140, 153, 167) and never dispatches a wheel event, although the repo already has dispatchWheelNotches/adjustWithScrollWheel helpers used by scrollWheelVolumeControl.spec.ts. | Add on watch with mode per_video and the button in player_controls_right: "scrolling up on the volume boost button raises the boost amount by one step" (assert window.engine.volumeGain.gain via the existing expectVolumeBoostAmount) and "shift+scroll raises it by 2.5 steps", and assert the amount is clamped at the maximum after many notches. |
| medium | incorrect | buttonController.spec.ts "feature menu should be disabled" can never fail | src/features/__tests__/buttonController.spec.ts:27-32: the test navigates to watch, calls disableFeature(page, "screenshotButton.button.enabled") and asserts `expect(featureMenuButton).not.toBeVisible()`. It never sets screenshotButton.button.placement to "feature_menu" first (unlike its sibling at line 21), so #yte-feature-menu-button is never created in this test regardless of the feature state, and `not.toBeVisible()` passes for a detached element. The assertion holds even if disabling a feature stopped removing its menu item. | Either set the placement to feature_menu and assert the menu button disappears after disabling, or delete the test — buttonController.spec.ts:49-57 "feature menu item should be added when feature enabled and removed when disabled" already covers the meaningful half. |
| medium | infra | buttonController.spec.ts re-declares toggleFullscreen instead of importing the shared helper | src/features/__tests__/buttonController.spec.ts:194-211 defines local `toggleFullscreen` and `waitForFullscreenState` whose bodies are character-for-character the same as src/utils/_tests/fullscreen.ts:5-19, which the other eleven button specs import (e.g. copyTimestampUrlButton.spec.ts:14, loopButton.spec.ts:12, volumeBoost.spec.ts:14). The two copies can drift, and the shared version is the one that would get a fix if the ytp-fullscreen-button selector or the ytd-app[fullscreen] signal changes. | Delete the local copies in buttonController.spec.ts and import { toggleFullscreen } from "@/src/utils/_tests/fullscreen". |
| medium | missing | Feature-menu placement test omitted for flipVideoButtons, forwardRewindButtons and playbackSpeedButtons | src/icons.ts:454-476 defines feature_menu icons for flipVideoHorizontalButton, flipVideoVerticalButton, forwardButton, rewindButton, increasePlaybackSpeedButton and decreasePlaybackSpeedButton, and their metadata uses the shared `buttonPlacements` enum (src/features/flipVideoButtons/index.metadata.ts:10-13), so feature_menu is a selectable value for all six. Eight of the eleven buttonController specs have a "should render button in feature menu" test (e.g. loopButton.spec.ts:98, volumeBoost.spec.ts:195), but flipVideoButtons.spec.ts:118-135, forwardRewindButtons.spec.ts:97-114 and playbackSpeedButtons.spec.ts:106-123 have none — these are exactly the three multi-button features, where addFeatureItemToMenu is called twice and menu sizing (ButtonController.ts:1002 updateMenuSize) actually matters. | Add one test per multi-button feature asserting both menu items are present when placement is feature_menu (e.g. "should render both flip buttons in feature menu"), or fold it into the single reduced placement smoke test proposed above so the count stays flat. |
| medium | unnecessary | Tautological "should not crash the page" tests in saveToWatchLaterButton and playlistReverseButton | src/features/__tests__/saveToWatchLaterButton.spec.ts:19-28 `toggling feature should not crash the page on ${pageType}` enables the feature, sleeps 1000 ms, asserts `expect(page.locator("body")).toBeAttached()`, disables, sleeps 500 ms and asserts the same thing — <body> is attached on any loaded page, so the test cannot fail; it runs once per page and includePages is ["home", "subscriptions", "watch"], so 3 cases/project (6 across both). src/features/__tests__/playlistReverseButton.spec.ts:46-52 and :160-166 do the same with `div#yte-message-from-extension`, an element the content script always injects, for another 2 cases/project. Both also use fixed waitForTimeout where a condition is available. | remove all five cases; saveToWatchLaterButton.spec.ts:30-35 and :37-44 and playlistReverseButton.spec.ts:53-58 and :59-66 already assert the observable enable/disable behaviour, and a genuine crash would fail those. |
| medium | missing | saveToWatchLaterButton has no click-effect or toggle-state test | src/features/__tests__/saveToWatchLaterButton.spec.ts contains only presence/absence/persistence tests plus "renders a native toggle button in the actions row" (line 83), which asserts the tag name is yt-button-view-model and that a <button> exists inside it. The word "toggle" appears in that title but nothing is ever clicked in the whole spec, so neither the save action nor the saved/unsaved visual state is observed. | Add on watch (gated on hasAuthState like its siblings): "clicking the save button marks the video as saved to Watch Later" asserting the button's aria-pressed/state attribute or label text flips, and a second click reverting it. If the Innertube round-trip is not observable, at minimum assert the button's own toggled state changes. |
| medium | missing | External-state sync of toggle buttons is tested for maximizePlayerButton only | src/features/loopButton/index.ts:10-25 installs a MutationObserver (setupLoopObserver) that re-renders the loop icon when video.loop changes outside the button, and src/features/miniPlayerButton/index.ts:17 (syncMiniPlayerButtonUI) updates the icon and title when the mini player is toggled from elsewhere. Only maximizePlayerButton.spec.ts:167-179 "reflects automatic maximization in the button state on watch" tests this class of behaviour; loopButton.spec.ts and miniPlayerButton.spec.ts have no equivalent, so both observers could be removed without any test failing. | Add "loop button reflects loop enabled from the native context menu" (set video.loop via page.evaluate, expect aria-checked="true" and the on icon) and "mini player button reflects the mini player being activated by the miniPlayer feature" (enable miniPlayer.enabled, expect the button's aria-checked/title to update). |
| medium | incorrect | Persistence tests whose titles promise state persistence only assert button presence | volumeBoost.spec.ts:146-159 `button should persist boost after navigation on ${pageType}` and volumeBoost.spec.ts:160-173 `button should persist boost after full page reload on ${pageType}` both end with expectFeatureButtonToBeTruthy and never call expectVolumeBoostEnabled/expectVolumeBoostAmount after the navigation or reload, so nothing about the boost is checked (and in per_video mode the boost is not expected to survive). loopButton.spec.ts:58-69 "loop should persist after navigation" never clicks the button, never touches video.loop, and asserts only that the button element exists. | Either rename these to "...button should persist after navigation/reload" to match what they check, or re-assert the state after the transition (expectVolumeBoostEnabled(page, ...) / toHaveJSProperty("loop", ...)) so the title is honoured. |
| low | unnecessary | buttonController.spec.ts repeats the disabled-button assertion once per placement | src/features/__tests__/buttonController.spec.ts:143-150 `should not place screenshot button when disabled in ${placement}` runs inside the `for (const placement of [left, right, below])` loop, producing 3 cases. removeFeatureButton/ButtonController's teardown removes the element by id regardless of which container it sits in, so the three cases assert the same thing; screenshotButton.spec.ts:78-82 also covers it. | reduce-pages: keep a single case outside the placement loop (or delete it and rely on screenshotButton.spec.ts:78 "screenshot button should not be present when disabled on ${pageType}"). Saves 2 cases/project. |
| low | infra | Static test titles inside the pageType loop | loopButton.spec.ts:21, :27, :32, :40, :46, :58, :70 and openTranscriptButton.spec.ts:22, :28, :34, :46, :54, :63 declare tests inside `for (const pageType of testPages)` with titles that do not interpolate ${pageType} (e.g. "loop button should be enabled"), unlike every other spec in the family (copyTimestampUrlButton.spec.ts:31, screenshotButton.spec.ts:21). Both features currently have includePages ["watch"] so no collision occurs, but adding "live" would silently produce two tests with the same title, making failures ambiguous in reports and breaking --grep targeting. | Interpolate the page type into these titles to match the rest of the family. |
| low | missing | Button tooltip element is never asserted | ButtonController.ts:881-897 creates a tooltip with id `yte-feature-<buttonName>-tooltip` on mouseover and ButtonController.ts:652-659 (updateFeatureButtonTitle) rewrites both `button.dataset.title` and that tooltip's textContent; ButtonController.ts:821-827 removes the tooltip when the button moves on fullscreen change. Specs only ever read the data-title attribute (copyTimestampUrlButton.spec.ts:55/67/73, maximizePlayerButton.spec.ts:174/178) and never hover a button, so the tooltip element itself, its text and its cleanup on fullscreen transitions are untested. | Add one generic test in buttonController.spec.ts: hover the screenshot button, expect #yte-feature-screenshotButton-tooltip to be visible with text equal to the button's data-title; then toggle fullscreen and expect the stale tooltip to be removed. |

## 6. Recommended order of work

**Remove or reduce first (about 560 cases per project, 1120 across both projects)**

1. Collapse the eight page-agnostic 11-page loops to explicit `coveragePages` (about 500 cases).
2. Delete the per-feature `button placement` and `fullscreen transition` describes in the 11 button specs (about 50 cases).
3. Delete every `hides dynamically added content` test and every `restores original state when disabled` prefix in the hide family (about 23 cases beyond the loop reduction), then extract the shared hide-family factory.
4. Delete the tautological tests: body-attached, message-element-attached, disable-an-already-disabled-feature (convert the few cold-start ones into real transitions), duplicate `fullscreenPlacement: "same"` tests.
5. Drop `live` from loops in specs with no live branch (about 20 cases, but the largest wall-clock win at up to 120 s each).

**Fix the incorrect tests (203)**

1. Strip the disable/enable pairs from the ~30 navigation tests (one mechanical edit).
2. Replace `navigateToPageType` after `page.reload()` with `waitForExtensionReady` (about 15 tests, mostly live).
3. Fix expectations that contradict the code: `automaticTheaterMode.spec.ts:84`, `automaticallyDisableClosedCaptions.spec.ts:53`, the shorts loops in `automaticallyDisableAmbientMode` and `defaultToOriginalAudioTrack`, `screenshotButton.spec.ts:42`, `maximizePlayerButton.spec.ts:27/40/88`, `buttonController.spec.ts:28`, `hideShorts.spec.ts:131`, `openTranscriptButton.spec.ts:49`.
4. Fix `Options.spec.ts` (`#language`), which most likely fails today.
5. Replace early-return guards with `test.skip` or injected fixture markup (`removeRedirect`, `hideScrollBar`, `blockNumberKeySeeking`).

**Add the high-priority missing tests (112; start here)**

1. One genuine SPA navigation test per `onNavigate` implementer, via a new `spaNavigate` helper.
2. A generic feature-menu item click test in `buttonController.spec.ts`, plus the `hideEndScreenCardsButton` menu branch.
3. Toggle-button state after a click (`aria-checked`, icon, `data-title`) through a shared `expectToggleButtonState` helper; `flipVideoButtons` click effects; `saveToWatchLaterButton` toggle; `volumeBoost` wheel handler.
4. `featureMenu.openType: "hover"` and its live rewire.
5. Options UI to storage round trip, and a language change (which will likely expose the i18n cache defect).
6. Config fields with zero references: `playerQuality.fpsPreference` and `preferPremium`, `playerSpeed.channelSpeeds`, `playlistLength.watchTimeGetMethod`, `screenshotButton.filename`, `format`, `dateFormat`, `timestampSeparator`, `playlistManagementButtons.removeAllButton.enabled`, `scrollWheelVolumeControl.holdModifierKey` and `holdRightClick` as negative gates, `deepDarkCSS` custom colours.
7. `restoreFullscreenScrolling` in actual fullscreen; `shareShortener.cleanSearchPage`; `onScreenDisplay.type`, `color`, `opacity`; synthetic-DOM fixtures so the 117 vacuous hide assertions become falsifiable.

**Harness and configuration**

1. Build before testing (a `pretest` script or `globalSetup`) and make `getExtensionPath()` fail with a clear message when `dist` is missing.
2. Guard `test_setConfigValue` behind a build-time flag and fail the build if it reaches `dist`.
3. Add `requireMatch` to the element assertions; make `injectDynamicContent` throw; poll in `expectCurrentQualityLevelToBeFalsy`.
4. Replace the 500 ms sleep in `setFeatureValue` with an acknowledgement; add `spaNavigate` and a `waitForFeatureApplied(page, predicate)` so specs stop hand-rolling sleeps.
5. Return a disposer from `handleYoutubeErrors` and tear it down per test; do not re-run `pageSetup` when the navigation was skipped.
6. Grant permissions and viewport inside `createExtensionContext`; normalise player preferences in the fixture or assert only transitions.
7. Move the selector generator and the spec scaffolder into `pretest`; emit `{ bodyClass, guard }` separately; make `__base__.spec.ts` a `test.fixme` template.
8. CI: `node-version-file: .nvmrc`, resolve the vite peer conflict, build, shard with more than one worker, use the `github` and `blob` reporters and upload `blob-report/`, bump actions to v4, add `workflow_dispatch`, widen the branch filter, set the CI test timeout to at least 60 s.

## 7. Caveats

- One in three raw findings was discarded by the verifiers, most often because an auditor assumed `navigateToPageType` performs SPA navigation, assumed `disableFeature` on a default-off feature runs `onDisable`, or misread `expectElementsHidden`'s vacuity as strength. The catalogue contains only the surviving findings, but they are still machine-generated reviews of code, not test runs: a handful may be wrong in detail, and every line number should be re-checked before editing.
- The "after" case counts are per-spec estimates by the auditors; the "today" counts are exact.
- The `live` fixture requirement system only implements `captions`; other requirements (for example `monoAudio`) are accepted unverified, so some passing live tests rest on an unverified premise.
- Login-gated specs were run with a real profile during this work and pass; page-agnostic specs on all 11 pages were not run in full because of YouTube's rate limiting of automated sessions.
