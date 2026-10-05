import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { waitForElement, waitForPlayerLoaded } from "./wait";

/**
 * Shared readiness selectors for the YouTube player shell.
 * Feature-specific targets (transcript button, playlist panel, etc.) stay local.
 * Deliberately does not import `@/src/utils/url` so URL classification can use this module.
 */
export const pageReadinessSelectors = {
	belowPlayerRoot: "div#primary > div#primary-inner > div#player",
	moviePlayer: "div#movie_player",
	playerContainer: "#player-container",
	playerContainerOuter: "#player-container-outer",
	playerControlsLeft: ".ytp-left-controls",
	playerControlsRight: ".ytp-right-controls",
	shortsPlayer: "div#shorts-player"
} as const;

export type PageReadinessOptions = {
	/** Return early (null / reject) when a navigation or disable has superseded this wait. */
	isCancelled?: () => boolean;
	/** Poll budget in ms. Defaults match the historical waitForElement / player-load budgets. */
	timeout?: number;
};

/** Player element for the current page type (shorts vs movie player). */
export function currentPlayerSelector(): string {
	return isShortsPath() ? pageReadinessSelectors.shortsPlayer : pageReadinessSelectors.moviePlayer;
}

/** Sync probe for the movie player only (`div#movie_player`). */
export function getMoviePlayerElement(): Nullable<YouTubePlayerDiv> {
	return document.querySelector<YouTubePlayerDiv>(pageReadinessSelectors.moviePlayer);
}

/** Sync probe for the page player element. */
export function getPagePlayerElement(): Nullable<YouTubePlayerDiv> {
	return document.querySelector<YouTubePlayerDiv>(currentPlayerSelector());
}

/** Wait for the `#player` node used as the below-player button container anchor. */
export async function waitForBelowPlayerRoot(
	options?: PageReadinessOptions
): Promise<Nullable<HTMLDivElement>> {
	const timeout = options?.timeout ?? 2500;
	const root = await waitForElement<HTMLDivElement>(
		pageReadinessSelectors.belowPlayerRoot,
		timeout,
		"optional"
	);
	if (options?.isCancelled?.()) return null;
	return root;
}

/**
 * Wait for the movie player element specifically (watch / live pages).
 * Does not wait for media readiness.
 */
export async function waitForMoviePlayer(
	options?: PageReadinessOptions
): Promise<Nullable<YouTubePlayerDiv>> {
	const timeout = options?.timeout ?? 2500;
	const player = await waitForElement<YouTubePlayerDiv>(
		pageReadinessSelectors.moviePlayer,
		timeout,
		"optional"
	);
	if (options?.isCancelled?.()) return null;
	return player;
}

/**
 * Wait for the page player element. Does not wait for media readiness.
 * Prefer {@link waitForPagePlayerReady} when the caller needs a loaded player.
 */
export async function waitForPagePlayer(
	options?: PageReadinessOptions
): Promise<Nullable<YouTubePlayerDiv>> {
	const timeout = options?.timeout ?? 2500;
	const player = await waitForElement<YouTubePlayerDiv>(
		currentPlayerSelector(),
		timeout,
		"optional"
	);
	if (options?.isCancelled?.()) return null;
	return player;
}

/** Wait until the page player exists and has left the unstarted state (or times out). */
export async function waitForPagePlayerReady(
	options?: PageReadinessOptions
): Promise<Nullable<YouTubePlayerDiv>> {
	const timeout = options?.timeout ?? 10000;
	const player = await waitForPagePlayer({ ...options, timeout });
	if (!player) return null;
	try {
		await waitForPlayerLoaded(player, timeout, { isCancelled: options?.isCancelled });
		return player;
	} catch {
		return null;
	}
}

/** Wait for YouTube's right player-controls strip (feature menu + control buttons live here). */
export async function waitForPlayerControls(
	options?: PageReadinessOptions
): Promise<Nullable<HTMLDivElement>> {
	const timeout = options?.timeout ?? 2500;
	const controls = await waitForElement<HTMLDivElement>(
		pageReadinessSelectors.playerControlsRight,
		timeout,
		"optional"
	);
	if (options?.isCancelled?.()) return null;
	return controls;
}

/**
 * Wait for the movie player plus the outer player containers used by hover/preview features.
 * Resolves when all present (or best-effort after timeout).
 */
export async function waitForPlayerShell(
	options?: PageReadinessOptions
): Promise<Nullable<YouTubePlayerDiv>> {
	const timeout = options?.timeout ?? 2500;
	const [player] = await Promise.all([
		waitForPagePlayer(options),
		waitForElement(pageReadinessSelectors.playerContainer, timeout, "optional"),
		waitForElement(pageReadinessSelectors.playerContainerOuter, timeout, "optional")
	]);
	if (options?.isCancelled?.()) return null;
	return player;
}

function isShortsPath(): boolean {
	return window.location.pathname.startsWith("/shorts");
}
