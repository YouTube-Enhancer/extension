# E2E test status: the tests that did not pass outright

State as of the full run of 2026-09-06 at 00:38, the first on the branch rebased onto `dev` (`94353bf2`, one commit past `v1.35.0`) together with the fixes of 2026-09-05: 691 passed, 1 flaky, 0 failed, 5 skipped of 697. Every one of the thirteen tests listed here after the run of 2026-09-05 passed or, in one case, skipped for a fixture reason. Later that day `dev` gained the `keywordBlocklist` feature; the branch was rebased onto it (signed, tip `ea4a61f3`) and `keywordBlocklist.spec.ts` (17 cases) plus two `Options.spec.ts` cases were added, bringing the suite to 716; they passed on their own and three times over on three workers, and have not yet been part of a full run. This file lists the six that were not a plain pass this time, what each one does, the fixture it uses, what went wrong and what was done about it. The audit (`E2E-TEST-AUDIT.md`) has the history and the product defects; this is the working list.

## How fixtures work and how to run one test

Every fixture URL lives in `pageFixtures` in `src/utils/_tests/navigation.ts`. A test asks `navigateToPageType(page, pageType, [capabilities])` and gets the first fixture of that page type whose `capabilities` list contains every requested one. Live pages are not a fixed URL: `navigateToLiveVideo` opens the `live` fixture, a channel page, and clicks its live tiles in order until one meets the requested capabilities.

To run one test alone, from the repo root in Git Bash:

```
PLAYWRIGHT_HEADLESS=1 npx playwright test --project=chromium --workers=1 --retries=0 --trace=on -g "<title>"
```

Leave `PLAYWRIGHT_HEADLESS=1` off to watch it headed. Both use the saved login profile in `playwright/.auth-profile`. Add `--repeat-each=3` to shake out a flake; open `test-results/<test>/trace.zip` with `npx playwright show-trace` for the timeline. Since the rebase the project lints with `npm run lint` (oxlint plus prettier, the spec files included) and type-checks with `npm run typecheck` (TypeScript 7); both pass on the suite.

Two constraints when swapping a fixture: the `timestamps` fixture must carry timestamps in its description, because three timestampPeek cases hover those; and the `playlistManagementButtons` fixture is shared by every test in that spec, so a replacement needs legacy `ytd-playlist-video-renderer` rows, more of them than YouTube renders up front (the fixture holds over 300 since 2026-09-06). The remove-all case uses the account's Watch Later instead (`list=WL`, capability `playlistChipBar`), the one playlist page that still shows a chip bar over legacy rows, and the 34 s video `WldIfjaOAAE`, which it puts into Watch Later and watches to the end itself (`src/utils/_tests/watchLater.ts`).

One constraint of the environment, found on 2026-09-05: on the signed-in profile YouTube never completes a seek to a position outside what the player has buffered, on any video longer than a few minutes (`player.seekTo()` and `video.currentTime` alike stay in `seeking`; playback from the start buffers fine, and a page opened at a position serves from there). Only short, fully preloaded videos such as `dQw4w9WgXcQ` seek. A test that needs a far position should open the page with `t=` rather than seek to it.

## What the rebase onto dev brought in

Thirty-five commits of `dev` had no counterpart on this branch: fixes to the event manager (listeners are removed with the options they were added with), the player manager (an aborted retry run no longer invalidates its replacement), the embedded page (on-screen display settings catch up after page setup), closed captions (state tracked per video), the button controller (checked state follows external toggles), playbackSpeedButtons, timestampPeek (a pending preview stands down once the video is restored), the URL helpers (stale live flag), openYouTubeSettingsOnHover, scrollWheelController (volume listeners removed on disable), automaticallyDisableAutoPlay (a click budget per video), notifications (identified by id); the loop, maximize and mini-player buttons reporting their state to the button controller; the `@/src` import alias and block-comment style throughout; and the toolchain: ESLint replaced by oxlint, TypeScript 7, zod 4.5, `vite-plugin-css-injected-by-js` held at 4.x. None of it changed a test's outcome.

The second rebase, onto `95b237cc`, brought only the feature itself: `src/features/keywordBlocklist`, the string-list settings control and the locale strings. The feature redacts rather than hides (title text, thumbnail and avatar images, `title` and `aria-label` attributes) and is off by default, so no other spec is affected; its own spec is described in the audit's catalogue. It was found to act on keyword edits while disabled, fixed on this branch (`fix(keywordBlocklist)`).

The branch still differs from `dev` in product code in a few places, all older than this run: `setPlayerSpeed` writes the video element's rate before the player call; `playlistManagementButtons` waits for a row with a time-status overlay instead of the sort menu; `applyVolumeSteps` keeps the shorts video element's volume in step with the player; `timestampPeek` resets its state on setup and disable rather than on `yt-navigate-start`; `openTranscriptButton` waits 5 s for the transcript button instead of 150 ms; `restoreFullscreenScrolling` uses the elements it waited for; the content script carries the `yte-ready` attribute and the `test_setConfigValue` message; and the pipeline has the `generateHideFeatureSelectors` step. Each is a candidate for `dev` or for dropping, in the user's hands.

## What the previous run's list turned into

Of the thirteen of 2026-09-05: the six failed cases (the playbackSpeedButtons conflict regression, the four playlist reset-button cases, the shorts volume read) passed with the fixes made after that run; the autoplay "keeps it on" flake passed with its wait; the Watch Later native toggle passed; the audio-track in-page switch, a navigation stall then, skipped this time for a fixture reason (below); and the four skips skipped again.

## Failed (0)

## Flaky (1): failed once, passed on retry

### miniPlayer › should create sentinel element after navigation on live

- Spec: `src/features/__tests__/miniPlayer.spec.ts` line 108. Fixture: a live stream found from `https://www.youtube.com/channel/UC4R8DWoMoI7CAwX8_LjQHig`, then home, then a second live hunt.
- What it does: enables the feature on a live page, expects the sentinel element, leaves for the home page, hunts for a live page again and expects the sentinel to be back from the navigation alone.
- What went wrong: the second hunt spent a minute on tiles whose players showed an error or no live badge, and the sentinel check that followed ran out of its 15 s at 86 s of the test's 120 s. The retry found a stream at once and passed.
- Verdict: not changed. A live-fixture condition (which of the channel's streams are on air and playable), not the feature: `miniPlayer` did not change on `dev`. If it recurs, give the live hunt its own budget in the test.

## Skipped (5), each with its reason and what a different fixture would need

### automaticallyDisableAmbientMode › does not touch ambient mode on live

- Spec: `src/features/__tests__/automaticallyDisableAmbientMode.spec.ts` line 293.
- Fixture: live hunt on `https://www.youtube.com/channel/UC4R8DWoMoI7CAwX8_LjQHig` with the `ambientMode` capability, which opens each live tile and checks the player's settings menu for the ambient entry (dark theme is set through the PREF cookie first).
- Skip reason: "no live stream with an ambient mode control is on air right now".
- A different fixture: a channel whose live streams show "Ambient mode" in the player settings; swap the `live` fixture URL.

### defaultToOriginalAudioTrack › should restore the current video's audio track, not the previous one's, after an in-page switch on watch

- Spec: `src/features/__tests__/defaultToOriginalAudioTrack.spec.ts` line 263. Fixture: the watch fixture with an auto-dubbed track, then up to five in-page hops looking for a related video that also offers more than one audio track.
- Skip reason: "no related video within five hops offers more than one audio track". YouTube's related list for the fixture carried no dubbed video this time; the previous run found one (and stalled once on the hop).
- A different fixture: a dubbed video whose related list is mostly other dubbed videos, for instance from a channel that dubs everything.

### onScreenDisplay › offsets the display below the shorts player controls on shorts

- Spec: `src/features/__tests__/onScreenDisplay.spec.ts` line 207. Fixture: `https://www.youtube.com/shorts/Ay8lynMZ4mE` (capability `ambientMode`).
- Skip reason in this run: "this shorts layout does not render ytd-shorts-player-controls".
- Verdict, later on 2026-09-06: the test was wrong, not the fixture. The layout YouTube serves has its control bar over the top of the video and its title block over the bottom (beside the video in a tall enough window), and the display manager found neither, so a display sat under them. Fixed in the manager (audit 3.10) and replaced by two tests, "offsets a top display below the shorts player's control bar" and "keeps a bottom display clear of the title block when it lies over the video", which pass.

### playlistManagementButtons › remove all watched videos button should appear in the playlist header when enabled and disappear when disabled

- Spec: `src/features/__tests__/playlistManagementButtons.spec.ts` line 225. Fixture: `PLA-lApStgDt8`.
- Skip reason: the playlist page rendered no chip-bar header (`chip-bar-view-model`), which is where the feature appends the button.
- Looked into on 2026-09-06: regular playlists moved to a `yt-page-header-view-model` header (play all, shuffle and the rest in a `yt-flexible-actions-view-model` row) with no chip bar anywhere, so on them the button has nowhere to go and never appears; that is a product gap (audit 3.10, still open). The chip bar survives on two pages: Watch Later (a sort chip over legacy rows) and channel upload lists (an All/Videos/Shorts filter over lockup rows, which the feature does not count). The feature was written in July 2026 against Watch Later, where it works: the button appears once at least one video there is fully watched.
- Since then the case is self-contained and real: it puts the 34 s video `WldIfjaOAAE` into Watch Later through the extension's own toggle, plays it muted at four times speed to the end, reloads Watch Later until the row reads fully watched, enables the button, checks its count, clicks it, sees the rows leave live and stay gone across a reload, and puts the video back. It passed on its own and twice more in a row. Note that the button removes every fully watched video from the account's Watch Later, not only the fixture one.

### playlistManagementButtons › buttons should be added to playlist items rendered after enabling

- Spec: same file, line 271. Fixture: `PLA-lApStgDt8`.
- Skip reason in this run: "the playlist fixture rendered all of its rows up front", with 29 rows.
- Resolved on 2026-09-06: the playlist was filled to over 300 rows (374 at the time of writing). YouTube now renders 100 up front and the rest on scroll, so the test reaches the MutationObserver path and passes.
- The longer fixture also exposed a `playlistReverseButton` defect (audit 3.10): the feature reversed only the loaded rows and moved YouTube's continuation trigger to the top, so a click gave rows 100 to 1 followed by 101 to 200. The feature now fetches every page before reversing (about five seconds for 374 rows), and the reverse spec's playlist-page cases load the whole list first, except the double-click case, which leaves that to the feature. Note for fixture swaps: an owned playlist shows suggested videos in `ytd-playlist-video-renderer` rows below the list, so readers of the list's order must stay inside `ytd-playlist-video-list-renderer div#contents`.

## Passed this time but not in the previous run

The six failures and two of the three flaky cases of 2026-09-05 (listed above under what the previous run's list turned into), and `hideLiveStreamChat › removes the hide when SPA-navigating from a live stream to a VOD`, which found a regular video beside the stream again. It skips with "no related VOD rendered next to this live stream" when the stream's list has none.
