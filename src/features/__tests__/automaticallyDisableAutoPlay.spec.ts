import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableAutoPlay/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function getAutoPlayState(page: Page) {
	const toggle = page.locator(".ytp-autonav-toggle-button");
	await expect(toggle).toHaveAttribute("aria-checked", /^(true|false)$/);
	const value = await toggle.getAttribute("aria-checked");
	expect(value).not.toBeNull();
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
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
			await disableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
		});
	}
});
