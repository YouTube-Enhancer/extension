import { expect, type Page } from "@playwright/test";

import type { Nullable } from "@/src/types";

const YOUTUBE_AD_SELECTORS = {
	adCount: "div.video-ads .ytp-ad-player-overlay-layout__ad-info-container .ytp-ad-pod-index .ad-simple-attributed-string",
	adShowing: "#movie_player.ad-showing",
	remainingTime: ".ytp-time-display .ytp-time-duration",
	skipButton: [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern"].join(", ")
} as const;
const parseAdPodIndex = (text: Nullable<string>): Nullable<{ index: number; total: number }> => {
	if (!text) return null;
	const match = text.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
	if (!match) return null;
	return {
		index: Number(match[1]),
		total: Number(match[2])
	};
};

async function handleYoutubeAds(page: Page): Promise<void> {
	const getAdInfo = async () => {
		return await page.evaluate((selectors) => {
			const isShowing = document.querySelector(selectors.adShowing) !== null;
			if (!isShowing) {
				return {
					isShowing: false,
					isSkippable: false,
					podText: null,
					remainingSeconds: null
				};
			}
			const skipButton = document.querySelector<HTMLElement>(selectors.skipButton);
			const remainingText = document.querySelector<HTMLElement>(selectors.remainingTime)?.textContent?.trim() ?? null;
			const podText = document.querySelector<HTMLElement>(selectors.adCount)?.textContent?.trim() ?? null;
			let remainingSeconds: Nullable<number> = null;
			if (remainingText) {
				const [hours = 0, minutes = 0, seconds = 0] = remainingText.split(":").map((value) => Number.parseInt(value, 10));
				remainingSeconds = hours * 3600 + minutes * 60 + seconds;
			}
			return {
				isShowing: true,
				isSkippable: skipButton !== null && skipButton.offsetParent !== null,
				podText,
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
	let lastPodKey: Nullable<string> = null;
	while (true) {
		const adInfo = await getAdInfo();
		if (!adInfo.isShowing) break;
		if (adInfo.isSkippable) await clickSkipButton();
		const maxWaitTime = adInfo.remainingSeconds !== null ? Math.min(adInfo.remainingSeconds * 1000, 120_000) : 30_000;
		const start = Date.now();
		while (Date.now() - start < maxWaitTime) {
			const current = await getAdInfo();
			if (!current.isShowing) return;
			const currentPod = parseAdPodIndex(current.podText);
			const currentKey = currentPod ? `${currentPod.index}/${currentPod.total}` : null;
			if (await clickSkipButton()) {
				await expect(page.locator(YOUTUBE_AD_SELECTORS.adShowing)).toHaveCount(0);
				return;
			}
			if (currentKey && lastPodKey && currentKey !== lastPodKey) {
				break; // next ad in pod started
			}
			lastPodKey = currentKey;
			await page.waitForTimeout(500);
		}
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
const YOUTUBE_PROMO_SELECTOR = `
	tp-yt-paper-dialog:has(> yt-mealbar-promo-renderer)
	> yt-mealbar-promo-renderer
`;

export async function handleYoutubePromos(page: Page): Promise<void> {
	await page.addStyleTag({
		content: `
			${YOUTUBE_PROMO_SELECTOR} {
				display: none !important;
			}
		`
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
