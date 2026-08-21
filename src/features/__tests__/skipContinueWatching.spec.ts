import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/skipContinueWatching/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;

interface YtdWatchElement extends Element {
	youthereDataChanged_: () => void;
}

async function expectHandlerReplaced(page: Page, original: null | string): Promise<void> {
	await expect
		.poll(
			async () => {
				const current = await getHandler(page);
				return current !== null && current !== original;
			},
			{ timeout: 15000 }
		)
		.toBe(true);
}

async function expectHandlerRestored(page: Page, original: null | string): Promise<void> {
	await expect
		.poll(
			async () => {
				const current = await getHandler(page);
				return current?.toString() === original?.toString();
			},
			{ timeout: 15000 }
		)
		.toBe(true);
}

async function getHandler(page: Page): Promise<null | string> {
	return await page.evaluate(() => {
		const el = document.querySelector<YtdWatchElement>("ytd-watch-grid, ytd-watch-flexy");
		return el?.youthereDataChanged_?.toString() ?? null;
	});
}

test.describe("skipContinueWatching", () => {
	for (const pageType of testPages) {
		test(`replaces handler on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
		});
		test(`restores handler on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await disableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerRestored(page, original);
		});
		test(`replaces handler after navigation on ${pageType}`, async ({ page }) => {
			test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "skipContinueWatching.enabled");
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
		});
		test(`should not patch when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await disableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerRestored(page, original);
		});
		test(`should re-patch after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
			await disableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerRestored(page, original);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
		});
		test(`should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
			await page.reload();
			await navigateToPageType(page, pageType);
			await disableFeature(page, "skipContinueWatching.enabled");
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
		});
	}

	test(`should not patch on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		const before = await getHandler(page);
		await enableFeature(page, "skipContinueWatching.enabled");
		const after = await getHandler(page);
		expect(after).toBe(before);
	});
});
