import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyMaximizePlayer/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function isPlayerMaximized(page: Page): Promise<boolean> {
	return await page.locator("body").evaluate((body) => body.hasAttribute("yte-maximized"));
}

test.describe("automaticallyMaximizePlayer", () => {
	for (const pageType of testPages) {
		test(`player should automatically maximize on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
		});
		test(`player shouldn't automatically maximize on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeFalsy();
		});
	}
});
