import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/hideScrollBar/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("hideScrollBar", () => {
	for (const pageType of testPages) {
		if (pageType === "shorts") {
			test.skip(`scrollbar tests are not applicable on shorts`, async () => {});
			continue;
		}
		test(`scrollbar should be hidden on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideScrollBar.enabled");
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 5000 }
				)
				.toBe(true);
		});
		test(`scrollbar should be visible when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideScrollBar.enabled");
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 5000 }
				)
				.toBe(false);
		});
	}
});
