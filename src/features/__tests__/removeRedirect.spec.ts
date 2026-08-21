import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/removeRedirect/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { home } = pageTypeRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function expectNoRedirects(page: Page): Promise<void> {
	await expect.poll(async () => (await getRedirectLinks(page)).length, { timeout: 15000 }).toBe(0);
}

async function getRedirectLinks(page: Page): Promise<string[]> {
	return await page.evaluate(() =>
		Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
			.map((link) => link.href)
			.filter((href) => href.startsWith("https://www.youtube.com/redirect?"))
	);
}

const REDIRECT_URL = "https://www.youtube.com/redirect?q=https://example.com";

test.describe("removeRedirect", () => {
	for (const pageType of testPages) {
		test(`should remove redirect links when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await enableFeature(page, "removeRedirect.enabled");
			await expectNoRedirects(page);
		});
		test(`should not remove redirect links when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await disableFeature(page, "removeRedirect.enabled");
			await expect.poll(async () => (await getRedirectLinks(page)).length).toBe(before.length);
		});
		test(`should persist redirect removal after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await enableFeature(page, "removeRedirect.enabled");
			await expectNoRedirects(page);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectNoRedirects(page);
		});
		test(`should clean dynamically added redirect links on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "removeRedirect.enabled");
			await expectNoRedirects(page);
			await page.evaluate((url) => {
				const a = document.createElement("a");
				a.href = url;
				a.textContent = "test";
				document.body.appendChild(a);
			}, REDIRECT_URL);
			await page.waitForTimeout(1000);
			await expectNoRedirects(page);
		});
		test(`should re-enable redirect removal after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await enableFeature(page, "removeRedirect.enabled");
			await expectNoRedirects(page);
			await disableFeature(page, "removeRedirect.enabled");
			await enableFeature(page, "removeRedirect.enabled");
			await expectNoRedirects(page);
		});
		test(`should persist redirect removal after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const before = await getRedirectLinks(page);
			if (before.length === 0) return;
			await enableFeature(page, "removeRedirect.enabled");
			await expectNoRedirects(page);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectNoRedirects(page);
		});
	}
});
