import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const testPages = ["watch", "live"] as const;

export async function expectNotTheaterMode(page: Page): Promise<void> {
	await expect(page.locator("ytd-watch-flexy")).not.toHaveAttribute("theater");
}

export async function expectTheaterMode(page: Page): Promise<void> {
	await expect(page.locator("ytd-watch-flexy")).toHaveAttribute("theater");
}

test.describe("automaticTheaterMode", () => {
	for (const pageType of testPages) {
		test(`theater mode should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
		});
		test(`theater mode should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticTheaterMode.enabled");
			await expectNotTheaterMode(page);
		});
		test(`theater mode should be applied after navigation when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
			await navigateToPageType(page, "watch");
			await expectTheaterMode(page);
		});
	}
});
