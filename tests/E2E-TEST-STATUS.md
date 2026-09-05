# E2E test status: the tests that did not pass outright

State as of the full run of 2026-09-04 at 22:17 (playwright-testing `62760ef6`): 682 passed, 6 flaky, 3 failed, 5 skipped of 696. This file lists the 14 that were not a plain pass, what each one does, the fixture it uses, what went wrong, and how to run it on its own. The audit (`E2E-TEST-AUDIT.md`) has the history; this is the working list.

## How fixtures work and how to run one test

Every fixture URL lives in `pageFixtures` in `src/utils/_tests/navigation.ts`. A test asks `navigateToPageType(page, pageType, [capabilities])` and gets the first fixture of that page type whose `capabilities` list contains every requested one. Live pages are not a fixed URL: `navigateToLiveVideo` opens the `live` fixture, a channel page, and clicks its live tiles in order until one meets the requested capabilities.

To run one test alone, from the repo root in Git Bash:

```
PLAYWRIGHT_HEADLESS=1 npx playwright test --project=chromium --workers=1 --retries=0 --trace=on -g "<title>"
```

Leave `PLAYWRIGHT_HEADLESS=1` off to watch it headed. Both use the saved login profile in `playwright/.auth-profile`. Add `--repeat-each=3` to shake out a flake; open `test-results/<test>/trace.zip` with `npx playwright show-trace` for the timeline.

Two constraints when swapping a fixture: the `timestamps` fixture must carry timestamps in its description, because three timestampPeek cases hover those; and the `playlistManagementButtons` fixture is shared by every test in that spec, so a replacement needs both the chip-bar header and legacy `ytd-playlist-video-renderer` rows.

## Failed (3)

### playerQuality › restores quality setting after disable on watch

- Spec: `src/features/__tests__/playerQuality.spec.ts` line 161.
- Fixture: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=UUuAXFkgsw1L7xaCfnd5JJOw` (plain `watch`, no capability).
- What it does: reads the current quality, asks the feature for `hd2160` with the `lower` fallback strategy, enables it, then disables it and expects the player's `data-default-quality` back at the original level.
- What went wrong: the video tops out below 2160p. The feature logs "Selected format undefined for hd2160", the player then picks its own format, and about a second later the feature logs "Manual quality change detected" and suspends itself. The disable path then has no `currentQuality` to restore, so the marker never comes back. Failed twice in the run, then 1 of 3 in the re-run.
- Verdict: product defect in the feature's manual-change detection (audit 3.10). A fixture that offers 2160p would hide it; the detection is what needs fixing.

### timestampPeek › should show preview overlay when hovering a timestamp in a comment on watch

- Spec: `src/features/__tests__/timestampPeek.spec.ts` line 260.
- Fixture now: `https://www.youtube.com/watch?v=NvbbEBL9My4` (capability `commentTimestamps`, a lofi covers mix whose top comments list the tracks, 37 timestamp links). Until `b7741dc3` it used `https://www.youtube.com/watch?v=yk4I80XVuk4` (capability `timestamps`).
- What went wrong: `yk4I80XVuk4`'s comment section now shows "1 Comment" and renders no thread, so the test waited 30 s for a comment and found none. Failed 6 of 6 on that video.
- Verdict: fixed by the fixture change; passed 2 of 2 on the new video. The description cases keep `yk4I80XVuk4`, whose description timestamps are intact.

### timestampPeek › should seek to timestamp when clicking the preview overlay on a comment timestamp on watch

- Spec: `src/features/__tests__/timestampPeek.spec.ts` line 268.
- Fixture: `NvbbEBL9My4` as above.
- What it does: scrolls to the comments, hovers the first comment timestamp, waits for the preview overlay, asserts the page is still scrolled (`window.scrollY > 0`), clicks the overlay, and expects the click to scroll back to the top and resume playback.
- What went wrong: once the overlay is open, `window.scrollY` reads 0, so the precondition fails before the click. Same on `IPkMEbxhA8Q`, `5jaT_8hy3Vg` and `crgQOez8d4k`; a probe without the feature keeps the page at 1861 px. A different fixture will not help.
- Verdict: open. Run it headed and watch whether the page jumps to the top when the preview opens; see the audit's 3.10 entry.

## Flaky (6): failed once, passed on retry, then 3 of 3 in the targeted re-run

### maximizePlayerButton › clicking the maximize feature menu item should maximize and restore the player on watch

- Spec: `src/features/__tests__/maximizePlayerButton.spec.ts` line 97. Fixture: `dQw4w9WgXcQ` watch fixture.
- Opens the feature menu, clicks the maximize item, expects `body[yte-maximized]` within 5 s. Late once under load.

### playerSpeed › re-applies after disable then re-enable on watch

- Spec: `src/features/__tests__/playerSpeed.spec.ts` line 72. Fixture: `dQw4w9WgXcQ`.
- Sets speed 2, disables (expects 1), re-enables (expects 2 within 5 s). The re-enable once raced the disable's restore.

### saveToWatchLaterButton › actions row button shows the saved state for a video already in Watch Later

- Spec: `src/features/__tests__/saveToWatchLaterButton.spec.ts` line 332. Fixture: `dQw4w9WgXcQ`, signed in.
- Adds the video to Watch Later, reloads, expects the saved state, then removes it again. YouTube's membership read lagged once. This test adds and removes `dQw4w9WgXcQ` in the account's Watch Later.

### videoHistory › in-page navigation to another video clears the old prompt and tracks the new video

- Spec: `src/features/__tests__/videoHistory.spec.ts` line 139. Fixture: `https://www.youtube.com/watch?v=epUk3T2Kfno` (capability `videoHistory`), then an in-page hop to the first related video that is neither live nor promoted.
- The hop never reached a watch URL within 30 s once, about 50 minutes into the run.

### Options › should persist a checkbox change to storage, and › should persist a number setting typed into the options UI

- Spec: `src/pages/options/Options.spec.ts` lines 228 and 241. No YouTube fixture: the `optionsTest` fixture in `playwright.config.ts` opens the extension's own page at `chrome-extension://<id>/src/pages/options/index.html` (the id is read from the test's own context each run).
- One timed out opening the page (30 s), the other waiting for a control (15 s), in the same minute late in the run.

## Skipped (5), each with its reason and what a different fixture would need

### automaticallyDisableAmbientMode › does not touch ambient mode on live

- Spec: `src/features/__tests__/automaticallyDisableAmbientMode.spec.ts` line 293.
- Fixture: live hunt on `https://www.youtube.com/channel/UC4R8DWoMoI7CAwX8_LjQHig` with the `ambientMode` capability, which opens each live tile and checks the player's settings menu for the ambient entry (dark theme is set through the PREF cookie first).
- Skip reason: "no live stream with an ambient mode control is on air right now". None of that channel's streams had the entry in two hunts.
- A different fixture: a channel whose live streams show "Ambient mode" in the player settings; swap the `live` fixture URL.

### hideLiveStreamChat › removes the hide when SPA-navigating from a live stream to a VOD

- Spec: `src/features/__tests__/hideLiveStreamChat.spec.ts` line 107. Fixture: the same live hunt, no capability.
- Skip reason: "no related VOD rendered next to this live stream". After the stream loads it needs a regular video in the related list to hop to; that stream's list rendered none even after the scroll nudges.
- A different fixture: any stream with ordinary videos beside it.

### onScreenDisplay › offsets the display below the shorts player controls on shorts

- Spec: `src/features/__tests__/onScreenDisplay.spec.ts` line 207. Fixture: `https://www.youtube.com/shorts/Ay8lynMZ4mE` (capability `ambientMode`).
- Skip reason: "this shorts layout does not render ytd-shorts-player-controls". The offset only exists for the older Shorts layout; the one YouTube serves this account has no such element, so no shorts URL changes that unless YouTube's layout does.

### playlistManagementButtons › remove all watched videos button should appear in the playlist header when enabled and disappear when disabled

- Spec: `src/features/__tests__/playlistManagementButtons.spec.ts` line 179. Fixture: `https://www.youtube.com/playlist?list=PLA-lApStgDt8` (capability `playlistManagementButtons`).
- Skip reason: the playlist page rendered no chip-bar header (`chip-bar-view-model`), which is where the feature appends the button.
- A different fixture: a playlist page that shows the chip bar above its rows.

### playlistManagementButtons › buttons should be added to playlist items rendered after enabling

- Spec: same file, line 223. Fixture: `PLA-lApStgDt8`.
- Skip reason: "the playlist fixture rendered all of its rows up front". It has 29 rows, so nothing renders later for the MutationObserver.
- A different fixture: a playlist over about 100 rows that still uses `ytd-playlist-video-renderer` rows. The channel-uploads list `UUuAXFkgsw1L7xaCfnd5JJOw` is long enough but renders YouTube's newer `yt-lockup-view-model` rows, on which the feature adds no buttons at all (open product gap, audit 3.10); check the row markup before choosing.
