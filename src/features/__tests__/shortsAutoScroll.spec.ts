import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/shortsAutoScroll/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function expectAutoScroll(page: Page, initialId: Nullable<string>): Promise<void> {
	await expect
		.poll(() => getShortId(page.url()), {
			timeout: 25_000
		})
		.not.toBe(initialId);
}

async function expectNoAutoScroll(page: Page, initialId: Nullable<string>): Promise<void> {
	await expect
		.poll(() => getShortId(page.url()), {
			timeout: 3000
		})
		.toBe(initialId);
}

function getShortId(url: string): Nullable<string> {
	const match = url.match(/shorts\/([^/?]+)/);
	return match?.[1] ?? null;
}
async function seekToEnd(page: Page): Promise<void> {
	await page.mouse.move(500, 300);
	await page.evaluate(async () => {
		const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		for (let i = 0; i < 100; i++) {
			const p = document.querySelector<YouTubePlayerDiv>("#shorts-player");
			if (p) {
				const v = p.querySelector<HTMLVideoElement>("video");
				if (v && Number.isFinite(v.duration) && v.duration > 0 && typeof p.getProgressState === "function") break;
			}
			await delay(100);
		}
		const player = document.querySelector<YouTubePlayerDiv>("#shorts-player")!;
		player.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		player.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
		player.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
		const video = player.querySelector<HTMLVideoElement>("video")!;
		const originalGetProgressState = player.getProgressState.bind(player);
		const { duration } = originalGetProgressState();
		let current = duration * 0.995;
		player.getProgressState = () => ({
			...originalGetProgressState(),
			current,
			duration
		});
		video.dispatchEvent(new Event("timeupdate"));
		current = 0;
		video.dispatchEvent(new Event("timeupdate"));
	});
}
test.describe("shortsAutoScroll", () => {
	for (const pageType of testPages) {
		test(`should automatically scroll when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, initialId);
		});
		test(`should not automatically scroll when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectNoAutoScroll(page, initialId);
		});
		test(`should toggle auto-scroll on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, initialId);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "shortsAutoScroll.enabled");
			const newId = getShortId(page.url());
			await expectNoAutoScroll(page, newId);
		});
		test(`should persist auto-scroll after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, initialId);
			await page.reload();
			await navigateToPageType(page, pageType);
			const newId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, newId);
		});
	}
});
