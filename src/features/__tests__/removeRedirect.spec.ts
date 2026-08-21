import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/removeRedirect/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function getRedirectLinks(page: Page): Promise<string[]> {
	return await page.evaluate(() =>
		Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
			.map((link) => link.href)
			.filter((href) => href.startsWith("https://www.youtube.com/redirect?"))
	);
}

test.describe("removeRedirect", () => {
	for (const pageType of testPages) {
		test(`should remove redirect links when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await enableFeature(page, "removeRedirect.enabled");
			await expect.poll(async () => (await getRedirectLinks(page)).length).toBe(0);
		});
		test(`should not remove redirect links when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await disableFeature(page, "removeRedirect.enabled");
			await expect.poll(async () => (await getRedirectLinks(page)).length).toBe(before.length);
		});
	}
});
