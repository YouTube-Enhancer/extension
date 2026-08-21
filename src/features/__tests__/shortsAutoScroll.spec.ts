import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { Nullable } from "@/src/types";

import { metadata } from "@/src/features/shortsAutoScroll/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

function getShortId(url: string): Nullable<string> {
	const match = url.match(/shorts\/([^/?]+)/);
	return match?.[1] ?? null;
}

async function seekToEnd(page: Page) {
	await page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video");
		if (!video || !Number.isFinite(video.duration)) return;
		video.currentTime = Math.max(video.duration - 0.05, 0);
	});
}

test.describe("shortsAutoScroll", () => {
	for (const pageType of testPages) {
		test(`should automatically scroll when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expect
				.poll(() => getShortId(page.url()), {
					timeout: 15_000
				})
				.not.toBe(initialId);
		});
		test(`should not automatically scroll when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expect
				.poll(() => getShortId(page.url()), {
					timeout: 5000
				})
				.toBe(initialId);
		});
	}
});
