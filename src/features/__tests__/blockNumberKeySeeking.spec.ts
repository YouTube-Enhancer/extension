import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/blockNumberKeySeeking/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

async function pressNumberKeys(page: Page) {
	for (const key of keys) {
		await page.keyboard.press(key);
	}
}

test.describe("blockNumberKeySeeking", () => {
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
			const start2 = await freezeAndGetTime(page, pageType);
			expect(start2).not.toBeNull();
			if (start2 === null) return;
			await page.keyboard.press("9");
			const end2 = await freezeAndGetTime(page, pageType);
			expect(end2).not.toBeNull();
			if (end2 === null) return;
			expect(Math.abs(end2 - start2)).toBeGreaterThan(30);
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
	test(`blocks number key seeking after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "blockNumberKeySeeking.enabled");
		const start = await freezeAndGetTime(page, watch);
		expect(start).not.toBeNull();
		if (start === null) return;
		await pressNumberKeys(page);
		const end = await freezeAndGetTime(page, watch);
		expect(end).not.toBeNull();
		if (end === null) return;
		expect(Math.abs(end - start)).toBeLessThan(0.5);
		// A real in-page navigation keeps the document alive, so the assertion below depends on the listener
		// surviving the navigation rather than on a fresh onEnable after a document load.
		await spaNavigateToRelatedVideo(page);
		const start2 = await freezeAndGetTime(page, watch);
		expect(start2).not.toBeNull();
		if (start2 === null) return;
		await pressNumberKeys(page);
		const end2 = await freezeAndGetTime(page, watch);
		expect(end2).not.toBeNull();
		if (end2 === null) return;
		expect(Math.abs(end2 - start2)).toBeLessThan(0.5);
	});
	// Watch only: on live the post-reload navigateToPageType always re-runs navigateToLiveVideo, so the reload is never what is measured.
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "blockNumberKeySeeking.enabled");
		// The pre-reload press cycle duplicates the enable test above; the reload is the only thing under test here.
		await reloadPage(page, watch);
		const start = await freezeAndGetTime(page, watch);
		expect(start).not.toBeNull();
		if (start === null) return;
		await pressNumberKeys(page);
		const end = await freezeAndGetTime(page, watch);
		expect(end).not.toBeNull();
		if (end === null) return;
		expect(Math.abs(end - start)).toBeLessThan(0.5);
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
