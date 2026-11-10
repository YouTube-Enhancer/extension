import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/autoTransferFocus/index.metadata";
import { watchExtensionErrors } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { disableFeature, enableFeature, loadDefaultConfig } from "@/src/utils/_tests/features";
import { navigateToLiveOrSkip, navigateToPageType } from "@/src/utils/_tests/navigation";
import {
	loginRequiredPages,
	resolveNonTargetPage,
	resolvePageTypes
} from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

const VIDEO_SELECTOR = "video.html5-main-video";
const PLAY_BUTTON_SELECTOR = ".ytp-play-button";

async function blurActiveElement(page: Page): Promise<void> {
	await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/**
 * Seeks to a different position and resolves only once the video has fired `seeked`, the event the
 * feature listens for. The seek is programmatic, so the player never moves focus on its own: whatever
 * focus does afterwards is the feature's listener, or the absence of one.
 */
async function seekSomewhere(page: Page): Promise<void> {
	await page.waitForFunction(
		(selector) => {
			const video = document.querySelector<HTMLVideoElement>(selector);
			return video !== null && video.readyState >= 1;
		},
		VIDEO_SELECTOR,
		{ timeout: 15_000 }
	);
	await page.evaluate(async (selector) => {
		const video = document.querySelector<HTMLVideoElement>(selector);
		if (!video) throw new Error("the video element disappeared before the seek");
		await new Promise<void>((resolve, reject) => {
			const timer = window.setTimeout(
				() => reject(new Error("the video never fired seeked")),
				15_000
			);
			video.addEventListener(
				"seeked",
				() => {
					window.clearTimeout(timer);
					resolve();
				},
				{ once: true }
			);
			// Any other position counts; going backwards when there is room keeps the seek inside the
			// buffered range so it completes without waiting on the network.
			video.currentTime = video.currentTime > 0.5 ? 0 : 1;
		});
	}, VIDEO_SELECTOR);
}

test.describe("autoTransferFocus", () => {
	test("is disabled in the shipped defaults", async () => {
		expect(await loadDefaultConfig()).toMatchObject({ autoTransferFocus: { enabled: false } });
	});

	for (const pageType of testPages) {
		test(`loads ${pageType} cleanly at its defaults`, async ({ page }) => {
			test.skip(
				!hasAuthState() && loginRequiredPages.includes(pageType),
				`${pageType} requires login`
			);
			const errors = watchExtensionErrors(page);
			if (pageType === "live") {
				await navigateToLiveOrSkip(page);
			} else {
				await navigateToPageType(page, pageType);
			}
			await page.waitForTimeout(2000);
			expect(errors, "the extension raised errors on the page").toEqual([]);
		});
	}

	test("raises no errors on a non-target page", async ({ page }) => {
		test.skip(nonTargetPage === undefined, "every page type belongs to this feature");
		if (!nonTargetPage) return;
		const errors = watchExtensionErrors(page);
		await navigateToPageType(page, nonTargetPage);
		await enableFeature(page, "autoTransferFocus.enabled");
		// The page gate must keep the feature's listeners away from a page it was not built
		// for; a leaked onEnable arms them anyway and misfires against elements that do not
		// exist, which shows up as a page error somewhere else in the suite.
		await page.waitForTimeout(2000);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});

	// The effect cases run on watch only. The listener hangs off the same video element on every
	// page, but a programmatic seek on a live stream has no suite precedent and a stream without a
	// DVR window can reject it, so live gets the load check above and its effect coverage waits for
	// a proven live-safe seek.
	test("a seek moves focus to the play/pause button when enabled on watch", async ({ page }) => {
		const errors = watchExtensionErrors(page);
		await navigateToPageType(page, "watch");
		await enableFeature(page, "autoTransferFocus.enabled");
		await blurActiveElement(page);
		await seekSomewhere(page);
		await expect(page.locator(PLAY_BUTTON_SELECTOR)).toBeFocused();
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});

	test("a seek leaves focus alone while the feature stays off on watch", async ({ page }) => {
		const errors = watchExtensionErrors(page);
		await navigateToPageType(page, "watch");
		await blurActiveElement(page);
		await seekSomewhere(page);
		await expect(page.locator(PLAY_BUTTON_SELECTOR)).not.toBeFocused();
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});

	test("disabling detaches the listener so a seek stops moving focus on watch", async ({
		page
	}) => {
		const errors = watchExtensionErrors(page);
		await navigateToPageType(page, "watch");
		await enableFeature(page, "autoTransferFocus.enabled");
		await blurActiveElement(page);
		await seekSomewhere(page);
		await expect(page.locator(PLAY_BUTTON_SELECTOR)).toBeFocused();
		await disableFeature(page, "autoTransferFocus.enabled");
		await blurActiveElement(page);
		await seekSomewhere(page);
		await expect(page.locator(PLAY_BUTTON_SELECTOR)).not.toBeFocused();
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
});
