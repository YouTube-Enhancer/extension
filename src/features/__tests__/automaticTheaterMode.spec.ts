import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticTheaterMode/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

const { home } = pageTypeRecord;
export async function expectNotTheaterMode(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				return await page.evaluate(() => {
					const flexy = document.querySelector("ytd-watch-flexy");
					const grid = document.querySelector("ytd-watch-grid");
					return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
				});
			},
			{ timeout: 15000 }
		)
		.toBeFalsy();
}

export async function expectTheaterMode(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				return await page.evaluate(() => {
					const flexy = document.querySelector("ytd-watch-flexy");
					const grid = document.querySelector("ytd-watch-grid");
					return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
				});
			},
			{ timeout: 15000 }
		)
		.toBeTruthy();
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
			if (pageType === "watch") test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticTheaterMode.enabled");
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
		});
		test(`theater mode should re-apply after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
			await disableFeature(page, "automaticTheaterMode.enabled");
			await expectNotTheaterMode(page);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
		});
		test(`theater mode should persist after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectTheaterMode(page);
		});
		test(`restores theater mode to original state when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const wasTheater = await page.evaluate(() => {
				const flexy = document.querySelector("ytd-watch-flexy");
				const grid = document.querySelector("ytd-watch-grid");
				return !!(flexy?.hasAttribute("theater") || grid?.hasAttribute("theater"));
			});
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
			await disableFeature(page, "automaticTheaterMode.enabled");
			await expect
				.poll(
					async () => {
						return await page.evaluate(() => {
							const flexy = document.querySelector("ytd-watch-flexy");
							const grid = document.querySelector("ytd-watch-grid");
							return !!(flexy?.hasAttribute("theater") || grid?.hasAttribute("theater"));
						});
					},
					{ timeout: 15000 }
				)
				.toBe(wasTheater);
		});
	}

	test(`should not enable theater mode on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "automaticTheaterMode.enabled");
		await expectNotTheaterMode(page);
	});
});
