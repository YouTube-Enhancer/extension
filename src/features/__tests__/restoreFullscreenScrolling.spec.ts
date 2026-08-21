import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/restoreFullscreenScrolling/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("restoreFullscreenScrolling", () => {
	for (const pageType of testPages) {
		test(`should add restore fullscreen scrolling classes on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "restoreFullscreenScrolling.enabled");
			await expect(page.locator("ytd-watch-flexy")).toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
		});
		test(`should remove restore fullscreen scrolling classes when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "restoreFullscreenScrolling.enabled");
			await expect(page.locator("ytd-watch-flexy")).not.toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).not.toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
		});
	}
});
