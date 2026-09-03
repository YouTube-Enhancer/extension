import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableAutoPlay/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function getAutoPlayState(page: Page) {
	const toggle = page.locator(".ytp-autonav-toggle-button");
	await expect(toggle).toHaveAttribute("aria-checked", /^(true|false)$/);
	const value = await toggle.getAttribute("aria-checked");
	return value === "true";
}

async function setAutoPlayState(page: Page, enabled: boolean) {
	const toggle = page.locator(".ytp-autonav-toggle");
	await expect(toggle).toBeVisible();
	const currentState = await getAutoPlayState(page);
	if (currentState !== enabled) {
		await toggle.click();
		await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(enabled);
	}
}

test.describe("automaticallyDisableAutoPlay", () => {
	for (const pageType of testPages) {
		test(`disables autoplay on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
		});
		test(`does not re-enable autoplay when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, false);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			// Autoplay is already off, so a single poll would pass on its first sample. Watch the state for longer
			// than the enable task's settle window (10 x 300 ms) so a stray click would be observed.
			await expectToStay(() => getAutoPlayState(page), false, { durationMs: 4000, intervalMs: 500, page });
			await disableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expectToStay(() => getAutoPlayState(page), false, { durationMs: 4000, intervalMs: 500, page });
		});
		test(`restores autoplay when disabled after being enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
			await disableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
		});
		test(`persists disable after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
			// Turn autoplay back on so YouTube restores it on the next load; without this the post-reload assertion
			// cannot tell the extension re-applying the override from YouTube simply remembering the off state.
			await setAutoPlayState(page, true);
			await reloadPage(page, pageType);
			await expect.poll(() => getAutoPlayState(page), { timeout: 15000 }).toBe(false);
		});
	}
});
