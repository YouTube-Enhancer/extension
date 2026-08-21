import { test } from "playwright.config";

import { metadata } from "@/src/features/playlistReverseButton/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("playlistReverseButton", () => {
	for (const pageType of testPages) {
		test(`should enable reverse playlist on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "playlistReverseButton.enabled");
		});
		test(`should disable reverse playlist on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playlistReverseButton.enabled");
		});
	}
});
