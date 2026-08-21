import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/miniPlayer/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("miniPlayer", () => {
	for (const pageType of testPages) {
		test(`should create sentinel element on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		});
		test(`should remove sentinel element when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
			await disableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
		});
	}
});
