# E2E tests

This branch carries the extension's end-to-end suite: Playwright driving real YouTube pages with the extension loaded. Almost everything is a feature spec.

## Running

The build must be a development build — the test entrypoints (`test_setConfigValue`, the `yte-config-processing` signal) are compiled out of release builds. `tests/globalSetup.ts` checks this before every run and rebuilds when the dist is missing or stale, but if you've been running `pnpm run dev`, stop it first: dev mode rewrites the page HTML to point at a localhost Vite server, and with no server running every UI assertion fails mysteriously.

```
pnpm exec playwright test src/features/__tests__/removeRedirect.spec.ts --project=chromium --workers=1   # one spec
pnpm exec playwright test --project=chromium                                                             # everything
pnpm exec playwright test --project=chromium --grep "persists after"                                     # filter by test name
pnpm exec playwright test src/features/__tests__/removeRedirect.spec.ts --trace on                       # record a trace for debugging
```

Iterate on `--workers=1` with one file; the full suite defaults to 5 workers (`PLAYWRIGHT_WORKERS` overrides). Don't push past ~5: YouTube throttles per IP and starts serving "video unavailable" error pages somewhere between five and eight concurrent workers, which corrupts results in ways that look like test bugs. One Playwright command at a time — parallel invocations fight over the same browser profile.

`PLAYWRIGHT_HEADLESS=1` runs headless while keeping the saved login profile.

## Authentication

Not every test needs a login, but a meaningful subset does: specs covering login-required page types (home, members-only content, that sort of thing — the list is `loginRequiredPages` in `src/utils/_tests/utils.ts`) guard themselves with `test.skip(!hasAuthState(), ...)`, so on a full-suite run without a session they show up as skips rather than failures. About 14 spec files do this.

When the session exists, tests run against it: the profile lives at `playwright/.auth-profile` and persists between runs, `playwright.config.ts` copies it into every browser context, and `pnpm run test:auth` (see `scripts/auth-setup.mjs`) sets it up. `src/utils/_tests/auth.ts` exposes `hasAuthState()` if you need the same guard in a new spec — and note it always returns false under `CI=1`, because the config doesn't copy the profile into the context in CI mode, so CI runs skip the login-required tests even if the profile is on disk.

## Layout

- `src/features/__tests__/<featureId>.spec.ts` — one spec per feature, named after the feature id. This is where you write tests.
- `src/features/__tests__/__base__.spec.ts` — a deliberately empty template. When `playwright.config.ts` loads, `generateMissingFeatureTests()` copies it over for any registered feature that has no spec yet, so new features show up as empty spec files that trivially pass. Replace the copy with real tests.
- `src/features/__tests__/__generated__/` — generated selector helpers, not tests. Hide-features get their target selectors here (`hideFeatureSelectors`), so a spec never hardcodes YouTube's class names for things it only hides.
- `tests/test-settings*.json` — deliberately broken/legacy/conflicting settings files used by `src/pages/options/Options.spec.ts`. Don't "fix" them.
- `tests/globalSetup.ts` — the build check described above.

## Writing a spec

Import `test` and `expect` from `playwright.config`, not `@playwright/test`. The standard shape, straight from `hideNextButton.spec.ts`:

```ts
import { test } from "playwright.config";

import { metadata } from "@/src/features/myFeature/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("myFeature", () => {
	for (const pageType of testPages) {
		test(`applies on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "myFeature.enabled");
			// assert the feature's own DOM or config effect here
		});
	}
	test(`does nothing on ${nonTargetPage}`, async ({ page }) => {
		/* ... */
	});
});
```

Deriving `testPages` and `nonTargetPage` from the feature's own `metadata` is deliberate: when someone changes the feature's `includePages`, the spec's scope follows without anyone editing it.

Toggling features goes through `src/utils/_tests/features.ts` — `enableFeature` / `disableFeature` take a real config path (`"myFeature.enabled"`, `"myFeature.speed"`) and are typed against it, so a wrong key or value is a compile error, not a silent no-op. Load a page with `navigateToPageType(page, pageType, capabilities)` from `src/utils/_tests/navigation.ts`; the fixtures and their capability tags live in `pageFixtures` in the same file, and `pageTypeRecord` in `src/utils/_tests/constants.ts` gives you the page-type names. A test asks for a capability and gets the first fixture that supports it — `navigateToLiveVideo` exists for live pages specifically.

Everything else shared is in `src/utils/_tests/`: assertions (`expectToStay`, feature-button matchers, `expectBodyWithClass`/`expectElementsHidden` for class-toggle features), `messaging`, `pageSetup` (player controls visibility), `dom`, `player`, `locale`, `storage`, `captions`, `fullscreen`, `watchLater`, `options`, and more. They're all small — skim before writing your own.

## What a feature spec should cover

Every feature gets the core battery, adapted to what the feature actually does. In rough order of value:

1. **It applies on each target page.** One test per page type in `testPages`, asserting the feature's own effect — the body class it toggles, the button it adds, the element it hides, the config it writes.
2. **It's off by default.** Same assertion without enabling anything. This catches features that leak into an enabled state on load.
3. **It survives a full reload.** Enable, assert, `page.reload()`, navigate again, assert again. This exercises the whole storage → startup → apply pipeline, which is where regressions actually hide.
4. **It survives disable → re-enable.** The registry requires enable/disable to be idempotent; the spec should prove it. Watch for leftover elements or double-registered listeners, which show up as duplicated buttons.
5. **It does nothing on a non-target page.** Guards the page-dependency wiring — a feature that leaks onto pages it shouldn't touch breaks unrelated tests in confusing ways.

Then, depending on what the feature is:

**Features with a button or menu item** (see `forwardRewindButtons.spec.ts` for all of these):

- The button renders in **every** configured placement — loop over the placements in a `describe`, don't hardcode one.
- Clicking it actually does the thing, with a measurable result (time moved, class toggled, request sent). Assert the effect, not just that a click happened.
- It re-appears after SPA navigation, not just a full reload.
- It works from the feature menu, the fallback placement.
- Changing the placement while enabled re-places cleanly — no duplicates, no ghosts in the old spot.
- Excluded surfaces: live streams, shorts, fullscreen transitions, whatever the feature's contract says. A `describe` for fullscreen transitions if the button's container moves with the player.

**Features with config beyond a switch:**

- Changing the value while enabled updates the behavior live, without a reload. This is the `onConfigChange` path, and it's the one people forget.

**Features that touch user state or the backend** (see `saveToWatchLaterButton.spec.ts`):

- Assert both sides. The backend effect (Innertube response state, icon flip, accessible name) and the user-visible feedback (snackbar, tooltip, error path). Either side can regress alone — we've had status-200 responses with no toast reach the DOM.

**Page-dependency features** (ones that behave differently per page):

- Assert the per-page difference explicitly on both sides, e.g. works on watch *and* does the shorts-specific thing on shorts.

You don't need all of it on day one. The core battery (1–5) is the minimum for a feature to be considered covered; the rest earn their keep as the feature grows or when a bug shows a gap.

## Rules of thumb

- The page is YouTube's real DOM and it changes; assert on what the extension owns (its own elements, config effects) and inject your own fixture DOM (`page.evaluate` with a known id) when the page can't be guaranteed to provide a subject. `removeRedirect.spec.ts` is the template for this.
- Config writes from tests are async all the way through. The helpers wait for the `yte-config-processing` signal on `<html>` plus a settle; don't reinvent them with flat sleeps.
- Product-side state writes are also async (speed changes, storage, observers). Use `expect.poll` rather than reading state synchronously right after an action.
- Features attach listeners to `document`, some in the capture phase, so any stray click in a test can trigger something. Keep interactions minimal and always disable the feature at the end of a test.
- User-visible strings come from the locales; assert them with the locale helpers (`localeText`) so a wording change doesn't break tests, and so locale coverage comes for free.
- When a test fails on a real page, it's often YouTube changing, not the extension. Before fixing product code, rerun the test alone with `--workers=1` — a failure that only exists under full-suite load is a throttle or timing problem, not a regression.
