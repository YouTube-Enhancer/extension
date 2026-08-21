import { test } from "playwright.config";

import { metadata } from "@/src/features/videosPerRow/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("videosPerRow", () => {
	for (const pageType of testPages) {
		test(`should set videos per row on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "videosPerRow.videosPerRow", 6);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
		});
		test(`should remove videos per row when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "videosPerRow.videosPerRow", 6);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await disableFeature(page, "videosPerRow.enabled");
			await expectBodyWithoutClass(page, "yte-videos-per-row", { timeout: 15000 });
		});
		test(`should update videos per row count on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await setOption(page, "videosPerRow.videosPerRow", 8);
		});
	}
});
