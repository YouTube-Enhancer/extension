import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";

const { channel_home: channelHome, watch } = pageTypeRecord;

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = [channelHome, watch];

const REDIRECT_TARGET = "https://example.com";
const REDIRECT_URL = `https://www.youtube.com/redirect?q=${encodeURIComponent(REDIRECT_TARGET)}`;
const INJECTED_ANCHOR_ID = "yte-test-redirect";
const LATE_ANCHOR_ID = "yte-test-redirect-late";
const NESTED_ANCHOR_ID = "yte-test-redirect-nested";

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
 * Appends a subtree whose root carries no href, so the anchor is only reachable through processNode's
 * querySelectorAll branch rather than its "added node is itself a link" branch.
 */
async function injectNestedRedirectAnchor(page: Page): Promise<void> {
	await page.evaluate(
		({ id, url }) => {
			const wrapper = document.createElement("div");
			const anchor = document.createElement("a");
			anchor.id = id;
			anchor.setAttribute("href", url);
			anchor.textContent = "nested test";
			wrapper.appendChild(anchor);
			document.body.appendChild(wrapper);
		},
		{ id: NESTED_ANCHOR_ID, url: REDIRECT_URL }
	);
	await expect(page.locator(`#${NESTED_ANCHOR_ID}`)).toBeAttached();
}

/**
 * No page reliably contains a redirect link, so the subject of every test is injected explicitly. The id lets the
 * assertions target that exact anchor, which distinguishes "unwrapped to its target" from "removed or blanked".
 */
async function injectRedirectAnchor(page: Page, id: string = INJECTED_ANCHOR_ID): Promise<void> {
	await page.evaluate(
		({ id, url }) => {
			const anchor = document.createElement("a");
			anchor.id = id;
			anchor.setAttribute("href", url);
			anchor.textContent = "test";
			document.body.appendChild(anchor);
		},
		{ id, url: REDIRECT_URL }
	);
	await expect(page.locator(`#${id}`)).toBeAttached();
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
	test("should stop unwrapping newly added redirect links after the feature is disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await disableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page, LATE_ANCHOR_ID);
		await expectToStay(async () => page.locator(`#${LATE_ANCHOR_ID}`).getAttribute("href"), REDIRECT_URL, { page });
	});
	test("should unwrap redirect links rendered after SPA navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		// A genuine in-page navigation: no fresh document, so the observer installed by the first onEnable has to survive it.
		await spaNavigateToRelatedVideo(page);
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should unwrap redirect links nested inside a dynamically added subtree on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		await injectNestedRedirectAnchor(page);
		await expect(page.locator(`#${NESTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
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
