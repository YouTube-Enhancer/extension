import { expect, type Locator, type Page } from "@playwright/test";

import type { Nullable } from "@/src/types";

const YOUTUBE_AD_SELECTORS = {
	adShowing: "#movie_player.ad-showing",
	remainingTime: ".ytp-ad-duration-remaining .ytp-ad-text",
	skipButton: [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern"].join(", ")
} as const;
async function handleYoutubeAds(page: Page): Promise<void> {
	const getAdInfo = async (): Promise<{
		isShowing: boolean;
		isSkippable: boolean;
		remainingSeconds: Nullable<number>;
	}> => {
		return await page.evaluate((selectors) => {
			const isShowing = document.querySelector(selectors.adShowing) !== null;
			if (!isShowing) {
				return {
					isShowing: false,
					isSkippable: false,
					remainingSeconds: null
				};
			}
			const skipButton = document.querySelector<HTMLElement>(selectors.skipButton);
			const remainingText = document.querySelector<HTMLElement>(selectors.remainingTime)?.textContent?.trim() ?? null;
			let remainingSeconds: Nullable<number> = null;
			if (remainingText) {
				const [hours = 0, minutes = 0, seconds = 0] = remainingText.split(":").map((value) => Number.parseInt(value, 10));
				remainingSeconds = hours * 3600 + minutes * 60 + seconds;
			}
			return {
				isShowing: true,
				isSkippable: skipButton !== null && skipButton.offsetParent !== null,
				remainingSeconds
			};
		}, YOUTUBE_AD_SELECTORS);
	};
	const clickSkipButton = async (): Promise<boolean> => {
		const skipButton = page.locator(YOUTUBE_AD_SELECTORS.skipButton).first();
		if (!(await skipButton.isVisible().catch(() => false))) return false;
		try {
			await skipButton.click({
				force: true,
				timeout: 1_000
			});
			return true;
		} catch {
			return false;
		}
	};
	const adInfo = await getAdInfo();
	if (!adInfo.isShowing) return;
	if (adInfo.isSkippable) {
		await clickSkipButton();
		return;
	}
	const maxWaitTime = adInfo.remainingSeconds !== null ? Math.min(adInfo.remainingSeconds * 1000, 120_000) : 30_000;
	const start = Date.now();
	while (Date.now() - start < maxWaitTime) {
		const current = await getAdInfo();
		if (!current.isShowing) return;
		if (await clickSkipButton()) {
			await expect(page.locator(YOUTUBE_AD_SELECTORS.adShowing)).toHaveCount(0);
			return;
		}
		await page.waitForTimeout(500);
	}
	await expect(page.locator(YOUTUBE_AD_SELECTORS.adShowing)).toHaveCount(0, {
		timeout: 30_000
	});
}
const YOUTUBE_ERROR_SELECTORS = {
	error: ".ytp-error",
	reason: ".ytp-error-content-wrap-reason"
} as const;

async function handleYoutubeErrors(page: Page): Promise<void> {
	let lastReload = 0;
	const COOLDOWN = 10_000;
	const check = async (): Promise<void> => {
		try {
			if (page.isClosed()) return;
			const errorRoot = page.locator(YOUTUBE_ERROR_SELECTORS.error);
			if ((await errorRoot.count()) === 0) return;
			const reason = await page
				.locator(YOUTUBE_ERROR_SELECTORS.reason)
				.first()
				.textContent()
				.catch(() => "");
			if (!reason?.trim()) return;
			const now = Date.now();
			if (now - lastReload < COOLDOWN) return;
			lastReload = now;
			await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
			await page.waitForTimeout(2000);
		} catch {}
	};
	await check();
	const interval = setInterval(() => void check(), 1500);
	page.once("close", () => clearInterval(interval));
}
const YOUTUBE_PROMO_SELECTORS = {
	dialog: "tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)",
	dismissButton: ["yt-button-renderer#dismiss-button button", 'button[aria-label="No thanks"]', 'yt-button-shape button:has-text("No thanks")'].join(
		", "
	)
} as const;

async function handleYoutubePromos(page: Page): Promise<void> {
	const dialog = page.locator(YOUTUBE_PROMO_SELECTORS.dialog);
	const closeOne = async (d: Locator): Promise<boolean> => {
		try {
			if (!(await d.isVisible().catch(() => false))) return false;
			const btn = d.locator(YOUTUBE_PROMO_SELECTORS.dismissButton).first();
			if ((await btn.count()) === 0) return false;
			await btn.click({ force: true, timeout: 1000 });
			await d.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
			return true;
		} catch {
			return false;
		}
	};
	const dismissAll = async (): Promise<void> => {
		const count = await dialog.count();
		for (let i = 0; i < count; i++) {
			await closeOne(dialog.nth(i));
		}
	};
	await dismissAll();
	page.on("domcontentloaded", () => {
		void dismissAll();
	});
}
const YOUTUBE_OVERLAY_SELECTORS = {
	container: ".ytp-overlay-bottom-left",
	featured: ".ytp-featured-product",
	suggested: ".ytp-suggested-action"
} as const;

async function handleYoutubeSuggestedActions(page: Page): Promise<void> {
	await page.addStyleTag({
		content: `
			${YOUTUBE_OVERLAY_SELECTORS.container} ${YOUTUBE_OVERLAY_SELECTORS.suggested},
			${YOUTUBE_OVERLAY_SELECTORS.container} ${YOUTUBE_OVERLAY_SELECTORS.featured} {
				display: none !important;
				visibility: hidden !important;
				pointer-events: none !important;
			}
		`
	});
}
export const pageSetup = async (page: Page): Promise<void> => {
	await handleYoutubeErrors(page);
	await handleYoutubePromos(page);
	await handleYoutubeSuggestedActions(page);
	await handleYoutubeAds(page);
};
export async function ensurePlayerControlsVisible(page: Page) {
	const player = page.locator("#movie_player");
	await player.hover();
	await page.mouse.move(500, 300);
}
