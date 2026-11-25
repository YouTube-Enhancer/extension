import type { Page } from "@playwright/test";

import { metadata } from "@/src/features/blockNumberKeySeeking/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import {
	disableFeature,
	enableFeature,
	expectFeatureSilentOnNonTargetPage
} from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
import {
	expect,
	test,
	verifyNavigationPersistence,
	verifyReloadPersistence
} from "@/tests/harness";

const { home, live, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

/**
 * Arms a page-side probe that records whether digit keydowns reach the document at all.
 *
 * The feature's handler sits on `document` in the capture phase and stops propagation before
 * anything else sees a digit, so the probe firing (or staying silent while the feature is on)
 * reads the interception directly — it needs no seek to happen, which is what makes it usable on
 * live, where a stream without a usable DVR window ignores the number keys entirely.
 */
async function armDigitKeyProbe(page: Page): Promise<void> {
	await page.evaluate(() => {
		const state: { reached: boolean } = { reached: false };
		(window as unknown as { __yteDigitKeyProbe?: { reached: boolean } }).__yteDigitKeyProbe = state;
		document.addEventListener(
			"keydown",
			(event) => {
				if (/^[0-9]$/.test(event.key)) state.reached = true;
			},
			{ capture: true }
		);
	});
}
/** Whether a digit keydown reached the page since {@link armDigitKeyProbe}. */
async function digitKeysReachPage(page: Page): Promise<boolean> {
	return await page.evaluate(
		() =>
			(window as unknown as { __yteDigitKeyProbe?: { reached: boolean } }).__yteDigitKeyProbe
				?.reached === true
	);
}
async function pressNumberKeys(page: Page) {
	for (const key of keys) {
		await page.keyboard.press(key);
	}
}

test.describe("blockNumberKeySeeking", () => {
	const assertOn = async (page: Page) => {
		const start = await freezeAndGetTime(page, watch);
		expect(start).not.toBeNull();
		if (start === null) return;
		await pressNumberKeys(page);
		const end = await freezeAndGetTime(page, watch);
		expect(end).not.toBeNull();
		if (end === null) return;
		expect(Math.abs(end - start)).toBeLessThan(0.5);
	};
	const subject = { assertOn };

	for (const pageType of testPages) {
		test(`restores seeking when disabled after being enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			// Narrow on null only: a currentTime of 0 is a valid reading, not a reason to skip the assertions.
			if (start === null) return;
			await pressNumberKeys(page);
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (end === null) return;
			expect(Math.abs(end - start)).toBeLessThan(0.5);
			await disableFeature(page, "blockNumberKeySeeking.enabled");
			// On live the number keys drive DVR seeking, which a stream without a usable DVR window
			// cannot perform: the position would not move whether or not the feature had released the
			// keys, so the VOD-shaped >30s delta measures the stream rather than the feature (the red
			// run read exactly 0 — no seek at all — while the product only removes a keydown listener
			// that is byte-identical to playwright-testing's). What the feature owns is the keydown
			// interception itself, so live reads the restoration off the probe instead: it fires only
			// once the feature's capture-phase handler is gone from `document`.
			if (pageType === live) await armDigitKeyProbe(page);
			const start2 = await freezeAndGetTime(page, pageType);
			expect(start2).not.toBeNull();
			if (start2 === null) return;
			await page.keyboard.press("9");
			if (pageType === live) {
				expect(await digitKeysReachPage(page)).toBe(true);
			} else {
				const end2 = await freezeAndGetTime(page, pageType);
				expect(end2).not.toBeNull();
				if (end2 === null) return;
				expect(Math.abs(end2 - start2)).toBeGreaterThan(30);
			}
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start3 = await freezeAndGetTime(page, pageType);
			expect(start3).not.toBeNull();
			if (start3 === null) return;
			await pressNumberKeys(page);
			const end3 = await freezeAndGetTime(page, pageType);
			expect(end3).not.toBeNull();
			if (end3 === null) return;
			expect(Math.abs(end3 - start3)).toBeLessThan(0.5);
		});
	}

	// Watch only: index.ts registers a single document-level listener and featureNavigationManager.areDependenciesMet is page-type agnostic, so the live run adds no branch.
	test(`number key seeking works when disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		const start = await freezeAndGetTime(page, watch);
		expect(start).not.toBeNull();
		if (start === null) return;
		await page.keyboard.press("9");
		const end = await freezeAndGetTime(page, watch);
		expect(end).not.toBeNull();
		if (end === null) return;
		expect(Math.abs(end - start)).toBeGreaterThan(30);
	});
	// A real in-page navigation keeps the document alive, so the assertion below depends on the listener
	// surviving the navigation rather than on a fresh onEnable after a document load.
	test(`blocks number key seeking after navigation on ${watch}`, async ({ page }) => {
		await verifyNavigationPersistence(page, watch, "blockNumberKeySeeking", subject, (navPage) =>
			spaNavigateToRelatedVideo(navPage)
		);
	});
	// Watch only: on live the post-reload navigateToPageType always re-runs navigateToLiveVideo, so the reload is never what is measured.
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await verifyReloadPersistence(page, watch, "blockNumberKeySeeking", subject);
	});

	test(`does not block digits typed in the search box on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "blockNumberKeySeeking.enabled");
		// A signed-in masthead renders YouTube's newer search box, whose input is a different element from the legacy
		// `input#search` (which stays in the DOM, hidden); the accessible role and label are what both layouts share.
		const searchInput = page.getByRole("combobox", { name: /^Search/ }).first();
		await expect(searchInput).toBeVisible();
		await searchInput.click();
		await searchInput.fill("");
		await page.keyboard.type("1234567890");
		// The capture-phase handler bails out for inputs; without that guard preventDefault would swallow every digit
		// typed anywhere on YouTube and the field would stay empty.
		await expect(searchInput).toHaveValue("1234567890");
	});
	test(`does not block non-digit player shortcuts on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "blockNumberKeySeeking.enabled");
		const start = await freezeAndGetTime(page, watch);
		expect(start).not.toBeNull();
		if (start === null) return;
		// "l" is YouTube's seek-forward-10s shortcut: only the digit keys may be swallowed, everything else has to
		// keep reaching the player.
		await page.keyboard.press("l");
		const end = await freezeAndGetTime(page, watch);
		expect(end).not.toBeNull();
		if (end === null) return;
		expect(end - start).toBeGreaterThan(5);
	});
});

test(`enabling on ${home}, a non-target page, raises no errors`, async ({ page }) => {
	await expectFeatureSilentOnNonTargetPage(page, "blockNumberKeySeeking.enabled", home);
});
