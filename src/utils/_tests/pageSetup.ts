import type { Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { armErrorWatcher } from "@/src/utils/_tests/errorWatcher";
import { expect } from "@/tests/harness";

const YOUTUBE_AD_SELECTORS = {
	adCount:
		"div.video-ads .ytp-ad-player-overlay-layout__ad-info-container .ytp-ad-pod-index .ad-simple-attributed-string",
	adShowing: "#movie_player.ad-showing",
	remainingTime: ".ytp-time-display .ytp-time-duration",
	skipButton: [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern"].join(
		", "
	)
} as const;
/**
 * A navigation that lands while an evaluate is in flight destroys its execution context. YouTube's
 * reload storms and this file's own error-watcher reload both do it mid-hunt; callers treat the
 * destroyed context as a lost probe, not a failed test (see the addStyleTag catches below and the
 * live hunt's setup guard in navigation).
 */
export function isExecutionContextDestroyed(error: unknown): boolean {
	return error instanceof Error && /Execution context (was )?destroyed/i.test(error.message);
}

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
/**
 * Budget for one `pageSetup` ad pass — the last watcher `pageSetup` arms and the only one whose
 * budget was not named anywhere. It is owned here, at module scope next to the selectors it spends
 * itself against, the way the other test budgets are (`CHECKBOX_SETTLE_TIMEOUT` in options.ts,
 * `attachBudget` in assertions.ts), rather than as anonymous numbers inside the loop.
 *
 * It is not a background watcher: `pageSetup` awaits `handleYoutubeAds` inline on every navigation,
 * so the budget is spent inside the caller's own test time and always ends by itself — either the
 * last ad is gone, or the pass throws with the pod and the time left so the spec fails instead of
 * hanging. Nothing has to stop it.
 *
 * 90 s global — the handler seeks each ad to its end and clicks skip as soon as the countdown lets
 * it, so a whole pod (pre-roll plus the mid-rolls that follow it) drains in a few passes rather than
 * playing out; 90 s is the ceiling on that drain: long enough for a long pod under full-suite load,
 * short enough that a stuck ad costs one test instead of the run.
 *
 * 15 s player wait — `pageSetup` runs right after a navigation, so `#movie_player` mounts a beat
 * later; this only has to tell "player not mounted yet" from "nothing to handle here", and it bounds
 * the same pass.
 */
const AD_HANDLER_BUDGET = {
	/** Ceiling for the whole ad pass, measured from the first probe. */
	globalMs: 90_000,
	/** How long to wait for the player (or an ad) to exist before deciding there is nothing to handle. */
	playerWaitMs: 15_000
} as const;
async function handleYoutubeAds(page: Page): Promise<void> {
	const startTime = Date.now();

	const getAdInfo = async () => {
		try {
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
				const remainingText =
					document.querySelector<HTMLElement>(selectors.remainingTime)?.textContent?.trim() ?? null;
				const podText =
					document.querySelector<HTMLElement>(selectors.adCount)?.textContent?.trim() ?? null;
				let remainingSeconds: Nullable<number> = null;
				if (remainingText) {
					const [hours = 0, minutes = 0, seconds = 0] = remainingText
						.split(":")
						.map((value) => Number.parseInt(value, 10));
					remainingSeconds = hours * 3600 + minutes * 60 + seconds;
				}
				return {
					isShowing: true,
					playerExists: true,
					podText,
					remainingSeconds
				};
			}, YOUTUBE_AD_SELECTORS);
		} catch (error) {
			/**
			 * The error watcher's own reload, or a YouTube reload storm, can navigate the page while
			 * the probe is in flight: the destroyed context is not an ad, and the loop re-checks the
			 * new document on its next tick.
			 */
			if (isExecutionContextDestroyed(error)) {
				return {
					isShowing: false,
					playerExists: false,
					podText: null,
					remainingSeconds: null
				};
			}
			throw error;
		}
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
	while (
		!adInfo.isShowing &&
		!adInfo.playerExists &&
		Date.now() - startTime < AD_HANDLER_BUDGET.playerWaitMs
	) {
		await page.waitForTimeout(500);
		adInfo = await getAdInfo();
	}
	// Every tick handles whatever ad is showing right now: seek it to its end, then click skip once the countdown
	// allows it (the button is visible, but inert, while it counts down). Ads in a pod follow each other, so the
	// loop keeps going until no ad is showing instead of assuming the first one seen was the only one.
	while (adInfo.isShowing && Date.now() - startTime < AD_HANDLER_BUDGET.globalMs) {
		await fastForwardAd(page);
		await clickSkipButton();
		await page.waitForTimeout(500);
		adInfo = await getAdInfo();
	}
	if (adInfo.isShowing) {
		throw new Error(
			`An ad was still showing after ${AD_HANDLER_BUDGET.globalMs / 1000}s (${adInfo.podText ?? "no pod info"}, ${adInfo.remainingSeconds ?? "?"}s remaining)`
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

async function handleYoutubeErrors(page: Page): Promise<void> {
	await dismissContentWarning(page);
	// pageSetup runs on every navigation; keep a single background watcher per page, armed once
	// until the harness stops it at teardown (see errorWatcher).
	const watcher = armErrorWatcher(page);
	if (!watcher) return;
	let lastReload = 0;
	const reloadCooldown = 30_000;
	const pollInterval = 5_000;
	const checkForErrors = async (): Promise<void> => {
		if (watcher.stopped || page.isClosed()) return;
		try {
			await dismissContentWarning(page);
			if (await isAdShowing(page)) return;
			const reason = await getErrorReason(page);
			if (!reason) return;
			const now = Date.now();
			if (now - lastReload < reloadCooldown) return;
			lastReload = now;
			watcher.reloads += 1;
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
		while (!watcher.stopped && !page.isClosed()) {
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
		if (isExecutionContextDestroyed(e)) return;
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
		if (isExecutionContextDestroyed(e)) return;
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
