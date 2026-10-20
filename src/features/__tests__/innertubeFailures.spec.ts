import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { REMOVE_BUTTON_CLASS } from "@/src/features/playlistManagementButtons/constants";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { enableFeature, setFeatureValue } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const { playlist } = pageTypeRecord;

// Mirrors playlistLength.spec.ts's UI.root; duplicated rather than imported so this file never
// registers that spec's tests through a spec-module import.
const PLAYLIST_LENGTH_UI = "#yte-playlist-length-ui";

/**
 * Failure-path coverage by stubbing the extension's own Innertube calls. Live tests cannot make a
 * request fail deterministically; page.route can. Routes are always added AFTER the page has
 * loaded, so YouTube's own navigation traffic (player, next, guide) is never touched - only the
 * feature-under-test's calls hit the stub.
 *
 * Expansion paths, deliberately not written yet: the reset button's history-edit failure (needs a
 * fully-watched fixture row like playlistManagementButtons:347's setup), the remove-all rejection,
 * and a save-failure variant - the save path already has one in saveToWatchLaterButton.spec.ts
 * (its command-pipeline + edit_playlist block), so it is not repeated here.
 */

/** Forces playlistLength to initialise now, with the API method the failure test wants to break. */
async function enableWithApiMethod(page: Page): Promise<void> {
	await setFeatureValue(page, "playlistLength.lengthGetMethod", "api");
	await enableFeature(page, "playlistLength.enabled");
	// The controller caches its first successful method; a disable/enable cycle makes this enable
	// run the API attempt under the stub (the same trick playlistLength.spec.ts uses).
	await setFeatureValue(page, "playlistLength.enabled", false);
	await setFeatureValue(page, "playlistLength.enabled", true);
}

test.describe("innertube failures", () => {
	test(`playlistLength falls back to scraping the page when the API fails on ${playlist}`, async ({
		page
	}) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (error) => pageErrors.push(String(error)));
		await navigateToPageType(page, playlist, ["playlistLength"]);
		// After navigation, so the playlist's own browse request has already happened.
		await page.route("**/youtubei/v1/browse*", (route) => route.abort());
		await enableWithApiMethod(page);
		// The controller's catch re-initialises with the html method; the totals must still render,
		// now computed from the page's own playlist items. This is the bounded-fallback path added
		// with the duration-guard retry.
		await expect(page.locator(PLAYLIST_LENGTH_UI)).toBeVisible({ timeout: 30000 });
		await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([]);
	});

	test(`playlistLength also recovers from a server error, not only a dead network, on ${playlist}`, async ({
		page
	}) => {
		await navigateToPageType(page, playlist, ["playlistLength"]);
		await page.route("**/youtubei/v1/browse*", (route) =>
			route.fulfill({ body: "{}", contentType: "application/json", status: 400 })
		);
		await enableWithApiMethod(page);
		// A fulfilled 400 exercises the catch's non-network branch; the html fallback must carry
		// the render either way.
		await expect(page.locator(PLAYLIST_LENGTH_UI)).toBeVisible({ timeout: 30000 });
	});
	test(`a failed playlist edit leaves the row and its remove button usable on ${playlist}`, async ({
		page
	}) => {
		test.skip(!hasAuthState(), "the successful second click needs a logged-in removal");
		await navigateToPageType(page, playlist, ["playlistChipBar"]);
		await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
		const rows = page.locator("ytd-playlist-video-list-renderer ytd-playlist-video-renderer");
		await expect(rows.first()).toBeAttached({ timeout: 15000 });
		// Identity by video link, not position: after a removal the nth() row is a different
		// element, so a positional locator could never observe the removal (the same reason
		// playlistManagementButtons:347 filters by href).
		const firstHref = await rows.first().locator('a[href*="v="]').first().getAttribute("href");
		const videoId = new URLSearchParams(
			new URL(firstHref ?? "", "https://www.youtube.com").search
		).get("v");
		expect(videoId).toBeTruthy();
		const firstRow = rows.filter({ has: page.locator(`a[href*="v=${videoId}"]`) });
		const removeButton = firstRow.locator(`.${REMOVE_BUTTON_CLASS}`);
		await expect(removeButton).toBeAttached({ timeout: 15000 });

		await page.route("**/youtubei/v1/browse/edit_playlist*", (route) => route.abort());
		await removeButton.click();
		// The feature dispatches the row-removal yt-action only after a successful response; with
		// the request aborted the row must survive and the button must not be left dead.
		await page.waitForTimeout(2000);
		await expect(firstRow).toBeAttached();

		await page.unroute("**/youtubei/v1/browse/edit_playlist*");
		await removeButton.click();
		// With the stub gone the same button completes the removal - no re-enable, no reload.
		await expect(firstRow).not.toBeAttached({ timeout: 15000 });
	});
});
