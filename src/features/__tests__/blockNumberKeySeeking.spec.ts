import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/blockNumberKeySeeking/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { home } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

async function pressNumberKeys(page: Page) {
	for (const key of keys) {
		await page.keyboard.press(key);
	}
}

test.describe("blockNumberKeySeeking", () => {
	for (const pageType of testPages) {
		test(`blocks number key seeking on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			if (!start) return;
			await pressNumberKeys(page);
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (!end) return;
			expect(Math.abs(end - start)).toBeLessThan(0.5);
		});
		test(`number key seeking works when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			if (!start) return;
			await page.keyboard.press("9");
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (!end) return;
			expect(Math.abs(end - start)).toBeGreaterThan(30);
		});
		test(`blocks number key seeking after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			if (!start) return;
			await pressNumberKeys(page);
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (!end) return;
			expect(Math.abs(end - start)).toBeLessThan(0.5);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "blockNumberKeySeeking.enabled");
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start2 = await freezeAndGetTime(page, pageType);
			expect(start2).not.toBeNull();
			if (!start2) return;
			await pressNumberKeys(page);
			const end2 = await freezeAndGetTime(page, pageType);
			expect(end2).not.toBeNull();
			if (!end2) return;
			expect(Math.abs(end2 - start2)).toBeLessThan(0.5);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			if (!start) return;
			await pressNumberKeys(page);
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (!end) return;
			expect(Math.abs(end - start)).toBeLessThan(0.5);
			await disableFeature(page, "blockNumberKeySeeking.enabled");
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start2 = await freezeAndGetTime(page, pageType);
			expect(start2).not.toBeNull();
			if (!start2) return;
			await pressNumberKeys(page);
			const end2 = await freezeAndGetTime(page, pageType);
			expect(end2).not.toBeNull();
			if (!end2) return;
			expect(Math.abs(end2 - start2)).toBeLessThan(0.5);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			if (pageType === "live") test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			if (!start) return;
			await pressNumberKeys(page);
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (!end) return;
			expect(Math.abs(end - start)).toBeLessThan(0.5);
			await page.reload();
			await navigateToPageType(page, pageType);
			const start2 = await freezeAndGetTime(page, pageType);
			expect(start2).not.toBeNull();
			if (!start2) return;
			await pressNumberKeys(page);
			const end2 = await freezeAndGetTime(page, pageType);
			expect(end2).not.toBeNull();
			if (!end2) return;
			expect(Math.abs(end2 - start2)).toBeLessThan(0.5);
		});
		test(`restores seeking when disabled after being enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "blockNumberKeySeeking.enabled");
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			if (!start) return;
			await pressNumberKeys(page);
			const end = await freezeAndGetTime(page, pageType);
			expect(end).not.toBeNull();
			if (!end) return;
			expect(Math.abs(end - start)).toBeLessThan(0.5);
			await disableFeature(page, "blockNumberKeySeeking.enabled");
			const start2 = await freezeAndGetTime(page, pageType);
			expect(start2).not.toBeNull();
			if (!start2) return;
			await page.keyboard.press("9");
			const end2 = await freezeAndGetTime(page, pageType);
			expect(end2).not.toBeNull();
			if (!end2) return;
			expect(Math.abs(end2 - start2)).toBeGreaterThan(30);
		});
	}
});
