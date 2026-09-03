import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";

const { channel_home: channelHome, watch } = pageTypeRecord;

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = [channelHome, watch];

const REDIRECT_TARGET = "https://example.com";
const REDIRECT_URL = `https://www.youtube.com/redirect?q=${encodeURIComponent(REDIRECT_TARGET)}`;
const INJECTED_ANCHOR_ID = "yte-test-redirect";

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

/**
 * No page reliably contains a redirect link, so the subject of every test is injected explicitly. The id lets the
 * assertions target that exact anchor, which distinguishes "unwrapped to its target" from "removed or blanked".
 */
async function injectRedirectAnchor(page: Page): Promise<void> {
	await page.evaluate(
		({ id, url }) => {
			const anchor = document.createElement("a");
			anchor.id = id;
			anchor.setAttribute("href", url);
			anchor.textContent = "test";
			document.body.appendChild(anchor);
		},
		{ id: INJECTED_ANCHOR_ID, url: REDIRECT_URL }
	);
	await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toBeAttached();
}

test.describe("removeRedirect", () => {
	for (const pageType of testPages) {
		test(`should remove redirect links when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await injectRedirectAnchor(page);
			await enableFeature(page, "removeRedirect.enabled");
			await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
			await expectNoRedirects(page);
		});
	}
	test("should not remove redirect links when disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page);
		await expectToStay(async () => page.locator(`#${INJECTED_ANCHOR_ID}`).getAttribute("href"), REDIRECT_URL, { page });
	});
	test("should clean dynamically added redirect links on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should persist redirect removal after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		await reloadPage(page, watch);
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
});
