import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/miniPlayer/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { home, live, watch } = pageTypeRecord;
const { right } = placementRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

type MiniPlayerRect = { height: number; width: number; x: number; y: number };

type MiniPlayerStoredState = { manualOverride: boolean; rect: MiniPlayerRect | null };
async function readMiniPlayerState(page: Page): Promise<MiniPlayerStoredState | undefined> {
	const state = await readStoredState(page);
	return state.miniPlayer as MiniPlayerStoredState | undefined;
}

/** How far the drag test moves the overlay; small enough that the rect never hits setRect's clamps. */
const dragDelta = 120;

/** Asserts the mini player is up: the class, the overlay shown, and the real player moved inside it. */
async function expectMiniPlayerActive(page: Page): Promise<void> {
	await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 15000 });
	await expect(page.locator("#yte-mini-player-overlay #yte-mini-player-content div#movie_player")).toBeAttached({ timeout: 15000 });
	await expect(page.locator("#yte-mini-player-overlay")).toHaveCSS("display", "block");
}
/** Asserts the mini player is down and, crucially, that the page still has its player. */
async function expectMiniPlayerInactive(page: Page): Promise<void> {
	await expect(page.locator("html")).not.toHaveClass(/yte-mini-player-active/, { timeout: 15000 });
	await expect(page.locator("#yte-mini-player-overlay div#movie_player")).not.toBeAttached();
	await expect(page.locator("div#movie_player")).toBeAttached();
}
/** Waits for the persisted rect and returns it, so a test can compare against the exact stored values. */
async function expectStoredRect(page: Page): Promise<MiniPlayerRect> {
	await expect.poll(async () => (await readMiniPlayerState(page))?.rect, { timeout: 10000 }).not.toBeNull();
	const state = await readMiniPlayerState(page);
	expect(state?.rect).not.toBeNull();
	return state!.rect!;
}
async function isMiniPlayerActive(page: Page): Promise<boolean> {
	return await page.evaluate(() => document.documentElement.classList.contains("yte-mini-player-active"));
}
/**
 * Scrolls until the geometry the feature's IntersectionObserver reads says "player gone, comments on screen", which
 * is the condition setAutoActive(true) is derived from.
 */
async function scrollCommentsIntoView(page: Page): Promise<void> {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const comments = document.querySelector("ytd-comments") ?? document.querySelector("#comments");
					const sentinel = document.getElementById("yte-mini-player-sentinel");
					if (!comments || !sentinel) return false;
					comments.scrollIntoView({ block: "start" });
					const sentinelBounds = sentinel.getBoundingClientRect();
					const commentBounds = comments.getBoundingClientRect();
					const sentinelVisible = sentinelBounds.bottom > 0 && sentinelBounds.top < window.innerHeight;
					const commentsVisible = commentBounds.bottom > 0 && commentBounds.top < window.innerHeight;
					return !sentinelVisible && commentsVisible;
				}),
			{ intervals: [250], message: "expected the comments to be on screen with the player scrolled away", timeout: 20000 }
		)
		.toBe(true);
}
/** Scrolls back until the sentinel below the player is on screen again, the condition for setAutoActive(false). */
async function scrollPlayerIntoView(page: Page): Promise<void> {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const sentinel = document.getElementById("yte-mini-player-sentinel");
					if (!sentinel) return false;
					window.scrollTo({ top: 0 });
					const bounds = sentinel.getBoundingClientRect();
					return bounds.bottom > 0 && bounds.top < window.innerHeight;
				}),
			{ intervals: [250], message: "expected the player to be back on screen", timeout: 20000 }
		)
		.toBe(true);
}
/** Opens the mini player through the extension button, which is the only entry point that sets the manual override. */
async function toggleMiniPlayerFromButton(page: Page): Promise<void> {
	await enableFeature(page, "miniPlayerButton.button.enabled");
	await setOption(page, "miniPlayerButton.button.placement", right);
	await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
}

test.describe("miniPlayer", () => {
	for (const pageType of testPages) {
		// A live stream's player takes longer to settle than a video's, and the registry only enables page-gated
		// features once it has read the player, so the sentinel arrives later there.
		const sentinelTimeout = pageType === live ? 15000 : 5000;
		test(`should create sentinel element on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached({ timeout: sentinelTimeout });
		});
		test(`should create sentinel element after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached({ timeout: sentinelTimeout });
			// No disable/re-enable cycle afterwards: the sentinel has to come back from the navigation itself. On watch
			// that needs a genuine in-page navigation; on live navigateToPageType clicks through from the channel page.
			if (pageType === watch) await spaNavigateToRelatedVideo(page);
			else {
				await navigateToPageType(page, home);
				await navigateToPageType(page, pageType);
			}
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached({ timeout: sentinelTimeout });
		});
	}

	// Watch only: onEnable/onDisable have no live-vs-watch branch (the sentinel is inserted before any page-dependent lookup) and live stays covered by the create-sentinel smoke test.
	test(`should re-create sentinel after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		await disableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
	});
	// Watch only: on watch the post-reload navigateToPageType skips the goto so the assertion really follows the reload; on live it navigates away again.
	test(`should persist sentinel after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		await reloadPage(page, watch);
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
	});

	test(`should not create sentinel element on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
	});
	// navigateToPageType(nonTargetPage) is a document load, so this cannot observe cleanup across a navigation; it
	// checks the includePages gate on a fresh load while the feature is already enabled.
	test(`should not create sentinel when the feature is already enabled and the page is a non-target page`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		await navigateToPageType(page, nonTargetPage!);
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
	});

	test.describe("state persistence", () => {
		test("miniPlayer state is stored in extension storage", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();

			const initialState = await readMiniPlayerState(page);
			expect(initialState).toBeDefined();
			// onEnable resets the override, so the stored value must be false and not merely "a boolean".
			expect(initialState!.manualOverride).toBe(false);

			// Activating through the button runs toggleManual, which flips manualOverride and persists the overlay rect.
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });

			await expect.poll(async () => (await readMiniPlayerState(page))?.manualOverride, { timeout: 10000 }).toBe(true);
			const activeState = await readMiniPlayerState(page);
			const { rect } = activeState!;
			expect(rect).not.toBeNull();
			for (const value of [rect!.height, rect!.width, rect!.x, rect!.y]) {
				expect(Number.isFinite(value)).toBe(true);
			}
		});
	});

	// Every case below runs on watch only: the auto observer keys off the comments section, and the live fixture costs
	// up to 120 s while taking exactly the same code path.
	test.describe("automatic activation", () => {
		test(`should activate the mini player when the comments are scrolled into view on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
			await expectMiniPlayerInactive(page);
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
		});
		test(`should restore the player into the page when the mini player deactivates automatically on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
			await scrollPlayerIntoView(page);
			await expectMiniPlayerInactive(page);
			// The player has to land back in the page shell, not merely outside the overlay.
			await expect(page.locator("ytd-player div#movie_player")).toBeAttached({ timeout: 15000 });
			await expect(page.locator("#yte-mini-player-placeholder")).not.toBeAttached();
		});
		test(`should restore the player when the feature is disabled while the mini player is active on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
			await disableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-overlay")).not.toBeAttached({ timeout: 15000 });
			await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
			await expectMiniPlayerInactive(page);
			await expect(page.locator("ytd-player div#movie_player")).toBeAttached({ timeout: 15000 });
		});
	});
	test.describe("mini seek bar", () => {
		test(`should render the mini seek bar while active and give YouTube its progress bar back on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			const nativeProgressBar = page.locator("div#movie_player .ytp-progress-bar-container");
			await expect(nativeProgressBar).not.toHaveCSS("display", "none");
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
			const miniSeekBar = page.locator("#yte-mini-player-overlay .yte-mini-player-progress");
			await expect(miniSeekBar.locator(".yte-mini-player-progress__track")).toBeAttached({ timeout: 15000 });
			// The mini seek bar takes over from the native progress bar while it is up.
			await expect(nativeProgressBar).toHaveCSS("display", "none");
			await scrollPlayerIntoView(page);
			await expectMiniPlayerInactive(page);
			await expect(miniSeekBar).not.toBeAttached();
			// A destroy regression would leave the normal player without a progress bar for the rest of the session.
			await expect(nativeProgressBar).not.toHaveCSS("display", "none");
		});
	});
	test.describe("defaults", () => {
		test(`should reposition the active mini player when defaultPosition changes on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
			const overlay = page.locator("#yte-mini-player-overlay");
			// The default is bottom_right, so the overlay does not start in the top left corner.
			await expect(overlay).not.toHaveCSS("transform", "matrix(1, 0, 0, 1, 16, 16)");
			await setOption(page, "miniPlayer.defaultPosition", "top_left");
			// applyInitialRect puts top_left at the fixed 16 px margin on both axes.
			await expect(overlay).toHaveCSS("transform", "matrix(1, 0, 0, 1, 16, 16)");
			await expect.poll(async () => (await readMiniPlayerState(page))?.rect, { timeout: 10000 }).toMatchObject({ x: 16, y: 16 });
		});
		test(`should resize the active mini player when defaultSize changes on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
			const overlay = page.locator("#yte-mini-player-overlay");
			// Both presets come through setRect snapping unchanged, so the expected pixel values are exact.
			await expect(overlay).toHaveCSS("width", "400px");
			await expect(overlay).toHaveCSS("height", "225px");
			await setOption(page, "miniPlayer.defaultSize", "560x315");
			await expect(overlay).toHaveCSS("width", "560px");
			await expect(overlay).toHaveCSS("height", "315px");
			await expect.poll(async () => (await readMiniPlayerState(page))?.rect, { timeout: 10000 }).toMatchObject({ height: 315, width: 560 });
		});
	});
	test.describe("manual control", () => {
		test(`should not auto-activate or auto-deactivate while the manual override is set on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
			await toggleMiniPlayerFromButton(page);
			await expectMiniPlayerActive(page);
			await expect.poll(async () => (await readMiniPlayerState(page))?.manualOverride, { timeout: 10000 }).toBe(true);
			// setAutoActive short-circuits on the override, so scrolling in either direction must change nothing.
			await scrollCommentsIntoView(page);
			await expectToStay(async () => isMiniPlayerActive(page), true, { durationMs: 3000, intervalMs: 500, page });
			await scrollPlayerIntoView(page);
			await expectToStay(async () => isMiniPlayerActive(page), true, { durationMs: 3000, intervalMs: 500, page });
		});
		test(`should keep a manually opened mini player active across an in-page navigation on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
			await toggleMiniPlayerFromButton(page);
			await expectMiniPlayerActive(page);
			// onNavigate destroys the controller, so only its wasManualActive branch can bring the mini player back.
			await spaNavigateToRelatedVideo(page);
			await expectMiniPlayerActive(page);
			await expect.poll(async () => (await readMiniPlayerState(page))?.manualOverride, { timeout: 10000 }).toBe(true);
		});
		test(`should close the mini player when the close button is clicked on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await toggleMiniPlayerFromButton(page);
			await expectMiniPlayerActive(page);
			await expect.poll(async () => (await readMiniPlayerState(page))?.manualOverride, { timeout: 10000 }).toBe(true);
			await page.locator("#yte-mini-player-close").evaluate((el) => (el as HTMLButtonElement).click());
			await expectMiniPlayerInactive(page);
			// close() force-clears the override, so the auto observer is back in charge afterwards.
			await expect.poll(async () => (await readMiniPlayerState(page))?.manualOverride, { timeout: 10000 }).toBe(false);
		});
		test(`should persist the mini player rect after dragging on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await scrollCommentsIntoView(page);
			await expectMiniPlayerActive(page);
			const startRect = await expectStoredRect(page);
			const dragHandle = page.locator("#yte-mini-player-drag-handle");
			const handleBox = await dragHandle.boundingBox();
			expect(handleBox).not.toBeNull();
			const grabX = handleBox!.x + handleBox!.width / 2;
			const grabY = handleBox!.y + handleBox!.height / 2;
			await page.mouse.move(grabX, grabY);
			await page.mouse.down();
			await page.mouse.move(grabX - dragDelta, grabY - dragDelta, { steps: 10 });
			await page.mouse.up();
			const expectedX = startRect.x - dragDelta;
			const expectedY = startRect.y - dragDelta;
			await expect(page.locator("#yte-mini-player-overlay")).toHaveCSS("transform", `matrix(1, 0, 0, 1, ${expectedX}, ${expectedY})`);
			// The rect is a persisted surface: it is read back the next time the mini player activates.
			await expect.poll(async () => (await readMiniPlayerState(page))?.rect, { timeout: 10000 }).toMatchObject({ x: expectedX, y: expectedY });
		});
	});
});
