import { expect, type Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

const YOUTUBE_AD_SELECTORS = {
	adCount: "div.video-ads .ytp-ad-player-overlay-layout__ad-info-container .ytp-ad-pod-index .ad-simple-attributed-string",
	adShowing: "#movie_player.ad-showing",
	remainingTime: ".ytp-time-display .ytp-time-duration",
	skipButton: [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern"].join(", ")
} as const;

/** Seeks the ad's video to its end so YouTube moves on to the content instead of playing the ad out. */
async function fastForwardAd(page: Page): Promise<void> {
	await page
		.evaluate((selector) => {
			const video = document.querySelector<HTMLVideoElement>(`${selector} video`);
			if (!video) return;
			const { duration } = video;
			if (!Number.isFinite(duration) || duration <= 0) return;
			video.muted = true;
			video.currentTime = duration;
			if (video.paused) void video.play().catch(() => {});
		}, YOUTUBE_AD_SELECTORS.adShowing)
		.catch(() => {});
}
async function handleYoutubeAds(page: Page): Promise<void> {
	const GLOBAL_TIMEOUT = 90_000;
	const PLAYER_WAIT_TIMEOUT = 15_000;
	const startTime = Date.now();

	const getAdInfo = async () => {
		return await page.evaluate((selectors) => {
			const isShowing = document.querySelector(selectors.adShowing) !== null;
			if (!isShowing) {
				return {
					isShowing: false,
					playerExists: document.querySelector("#movie_player") !== null,
					podText: null,
					remainingSeconds: null
				};
			}
			const remainingText = document.querySelector<HTMLElement>(selectors.remainingTime)?.textContent?.trim() ?? null;
			const podText = document.querySelector<HTMLElement>(selectors.adCount)?.textContent?.trim() ?? null;
			let remainingSeconds: Nullable<number> = null;
			if (remainingText) {
				const [hours = 0, minutes = 0, seconds = 0] = remainingText.split(":").map((value) => Number.parseInt(value, 10));
				remainingSeconds = hours * 3600 + minutes * 60 + seconds;
			}
			return {
				isShowing: true,
				playerExists: true,
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
	// Wait for the player to exist (or an ad to show) before deciding there is nothing to handle.
	let adInfo = await getAdInfo();
	while (!adInfo.isShowing && !adInfo.playerExists && Date.now() - startTime < PLAYER_WAIT_TIMEOUT) {
		await page.waitForTimeout(500);
		adInfo = await getAdInfo();
	}
	// Every tick handles whatever ad is showing right now: seek it to its end, then click skip once the countdown
	// allows it (the button is visible, but inert, while it counts down). Ads in a pod follow each other, so the
	// loop keeps going until no ad is showing instead of assuming the first one seen was the only one.
	while (adInfo.isShowing && Date.now() - startTime < GLOBAL_TIMEOUT) {
		await fastForwardAd(page);
		await clickSkipButton();
		await page.waitForTimeout(500);
		adInfo = await getAdInfo();
	}
	if (adInfo.isShowing) {
		throw new Error(
			`An ad was still showing after ${GLOBAL_TIMEOUT / 1000}s (${adInfo.podText ?? "no pod info"}, ${adInfo.remainingSeconds ?? "?"}s remaining)`
		);
	}
}
const YOUTUBE_ERROR_SELECTORS = {
	contentWarningProceed: "button:has-text('I understand and wish to proceed')",
	error: ".ytp-error",
	reason: ".ytp-error-content-wrap-reason"
} as const;
async function dismissContentWarning(page: Page): Promise<void> {
	const button = page.locator(YOUTUBE_ERROR_SELECTORS.contentWarningProceed);
	if ((await button.count()) > 0) {
		await button.click();
		await page.waitForTimeout(2000);
	}
}

async function getErrorReason(page: Page): Promise<null | string> {
	if (!(await hasYoutubeError(page))) {
		return null;
	}
	const reason = await page
		.locator(YOUTUBE_ERROR_SELECTORS.reason)
		.first()
		.textContent()
		.catch(() => null);
	return reason?.trim() || null;
}

const pagesWithErrorWatch = new WeakSet<Page>();
async function handleYoutubeErrors(page: Page): Promise<void> {
	await dismissContentWarning(page);
	// pageSetup runs on every navigation; keep a single background watcher per page.
	if (pagesWithErrorWatch.has(page)) return;
	pagesWithErrorWatch.add(page);
	let lastReload = 0;
	const reloadCooldown = 30_000;
	const pollInterval = 5_000;
	const checkForErrors = async (): Promise<void> => {
		if (page.isClosed()) return;
		try {
			await dismissContentWarning(page);
			if (await isAdShowing(page)) return;
			const reason = await getErrorReason(page);
			if (!reason) return;
			const now = Date.now();
			if (now - lastReload < reloadCooldown) return;
			lastReload = now;
			await page.reload({
				waitUntil: "domcontentloaded"
			});
			await expect
				.poll(async () => page.isClosed() || !(await hasYoutubeError(page)), {
					intervals: [500],
					timeout: 30_000
				})
				.toBe(true);
		} catch {
			// Ignore transient navigation / detached DOM errors.
		}
	};
	await checkForErrors();
	void (async () => {
		while (!page.isClosed()) {
			await checkForErrors();
			if (page.isClosed()) {
				break;
			}
			try {
				await page.waitForTimeout(pollInterval);
			} catch {
				break;
			}
		}
	})();
}

async function hasYoutubeError(page: Page): Promise<boolean> {
	return (await page.locator(YOUTUBE_ERROR_SELECTORS.error).count()) > 0;
}

async function isAdShowing(page: Page): Promise<boolean> {
	return (await page.locator(YOUTUBE_AD_SELECTORS.adShowing).count()) > 0;
}
const YOUTUBE_PROMO_SELECTOR = `
	tp-yt-paper-dialog:has(> yt-mealbar-promo-renderer)
	> yt-mealbar-promo-renderer
`;

export async function handleYoutubePromos(page: Page): Promise<void> {
	try {
		await page.addStyleTag({
			content: `
				${YOUTUBE_PROMO_SELECTOR} {
					display: none !important;
				}
			`
		});
	} catch (e) {
		if (e instanceof Error && e.message.includes("Execution context was destroyed")) return;
		throw e;
	}
}
const YOUTUBE_OVERLAY_SELECTORS = {
	container: ".ytp-overlay-bottom-left",
	featured: ".ytp-featured-product",
	suggested: ".ytp-suggested-action"
} as const;

async function handleYoutubeSuggestedActions(page: Page): Promise<void> {
	try {
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
	} catch (e) {
		if (e instanceof Error && e.message.includes("Execution context was destroyed")) return;
		throw e;
	}
}
export const pageSetup = async (page: Page): Promise<void> => {
	await handleYoutubeErrors(page);
	await handleYoutubePromos(page);
	await handleYoutubeSuggestedActions(page);
	await handleYoutubeAds(page);
};
export async function ensurePlayerControlsVisible(page: Page, pageType: PageType) {
	const isShorts = pageType === "shorts";
	const playerSelector = isShorts ? "#shorts-player" : "#movie_player";
	const player = page.locator(playerSelector);
	await player.evaluate((el) => {
		el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
		el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
	});
	await page.mouse.move(500, 300);
}
