import type { YouTubePlayer } from "youtube-player/dist/types";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { waitForElement } from "@/src/utils/dom/wait";

/**
 * Readiness selectors for the YouTube player shell.
 * Feature-specific targets (transcript button, playlist panel, etc.) stay local.
 * Deliberately does not import `@/src/utils/url` so URL classification can use this module.
 */
export const readinessSelectors = {
	belowPlayerRoot: "div#primary > div#primary-inner > div#player",
	moviePlayer: "div#movie_player",
	playerContainer: "#player-container",
	playerContainerOuter: "#player-container-outer",
	playerControlsLeft: ".ytp-left-controls",
	playerControlsRight: ".ytp-right-controls",
	shortsPlayer: "div#shorts-player"
} as const;

/** What whenReady is waiting for. */
export type ReadyTarget =
	| "belowPlayerRoot"
	| "moviePlayer"
	| "pagePlayer"
	| "pagePlayerReady"
	| "playerControls"
	| "playerShell";

export type WhenReadyOptions = {
	/** Return early (null) when a navigation or disable has superseded this wait. */
	isCancelled?: () => boolean;
	/**
	 * Share one wait across callers for this navigation generation.
	 * Defaults true for pagePlayer / pagePlayerReady (cold-load + retry seam);
	 * false for one-shot targets so feature-level budgets stay independent.
	 */
	memo?: boolean;
	/** Poll budget in ms. */
	timeout?: number;
};

type ReadinessMemo = {
	generation: number;
	pagePlayer: Nullable<Promise<Nullable<YouTubePlayerDiv>>>;
	pagePlayerReady: Nullable<Promise<Nullable<YouTubePlayerDiv>>>;
};

let readinessGeneration = 0;
let readinessMemo: Nullable<ReadinessMemo> = null;

const DEFAULT_TIMEOUTS: Record<ReadyTarget, number> = {
	belowPlayerRoot: 2500,
	moviePlayer: 2500,
	pagePlayer: 2500,
	pagePlayerReady: 10000,
	playerControls: 2500,
	playerShell: 2500
};

const MEMO_TARGETS = new Set<ReadyTarget>(["pagePlayer", "pagePlayerReady"]);

/** Player element for the current page type (shorts vs movie player). */
export function currentPlayerSelector(): string {
	return isShortsPath() ? readinessSelectors.shortsPlayer : readinessSelectors.moviePlayer;
}

/** Sync probe for the movie player only (`div#movie_player`). */
export function getMoviePlayerElement(): Nullable<YouTubePlayerDiv> {
	return document.querySelector<YouTubePlayerDiv>(readinessSelectors.moviePlayer);
}

/** Sync probe for the page player element. */
export function getPagePlayerElement(): Nullable<YouTubePlayerDiv> {
	return document.querySelector<YouTubePlayerDiv>(currentPlayerSelector());
}

/**
 * Drop memoized player waits (navigation, full player cleanup). The next wait starts fresh
 * against the new page's player.
 */
export function invalidatePageReadiness(): void {
	readinessGeneration += 1;
	readinessMemo = null;
}

/**
 * Ask the movie player whether the current watch video is live.
 * Waits for the player, then polls getVideoData until the video id matches
 * (or a short budget ends). Does not import URL classification; callers pass
 * the expected video id and apply the result to their page-type cache.
 */
export async function refineLiveFlagFromPlayer(options?: {
	urlVideoId?: null | string;
}): Promise<boolean> {
	try {
		const player = await whenReady("moviePlayer");
		if (!player || typeof player.getVideoData !== "function") return false;
		/**
		 * After a single-page navigation the player can still report the previous video, so wait
		 * until its video id matches the URL before trusting the live flag. Budget is shorter than
		 * the old cold-load poll: classification no longer blocks on this refine.
		 */
		const urlVideoId = options?.urlVideoId ?? null;
		let playerData = await player.getVideoData();
		for (
			let attempt = 0;
			attempt < 12 && urlVideoId && playerData?.video_id !== urlVideoId;
			attempt++
		) {
			await new Promise((resolve) => setTimeout(resolve, 200));
			playerData = await player.getVideoData();
		}
		return Boolean(playerData?.isLive && (!urlVideoId || playerData.video_id === urlVideoId));
	} catch {
		return false;
	}
}
/**
 * Wait for player-presence readiness.
 *
 * - `pagePlayer` / `pagePlayerReady`: generation-memoized by default (navigation + retry seam).
 * - Other targets: independent budget waits (feature one-shots).
 */
export async function whenReady(
	target: "moviePlayer" | "pagePlayer" | "pagePlayerReady" | "playerShell",
	options?: WhenReadyOptions
): Promise<Nullable<YouTubePlayerDiv>>;
export async function whenReady(
	target: "belowPlayerRoot" | "playerControls",
	options?: WhenReadyOptions
): Promise<Nullable<HTMLDivElement>>;
export async function whenReady(
	target: ReadyTarget,
	options?: WhenReadyOptions
): Promise<Nullable<Element>> {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUTS[target];
	const useMemo = options?.memo ?? MEMO_TARGETS.has(target);

	if (useMemo && (target === "pagePlayer" || target === "pagePlayerReady")) {
		const memo = getReadinessMemo();
		if (target === "pagePlayer") {
			if (!memo.pagePlayer) memo.pagePlayer = loadPagePlayerOnce(timeout);
			const player = await memo.pagePlayer;
			if (options?.isCancelled?.()) return null;
			return player;
		}
		if (!memo.pagePlayerReady) memo.pagePlayerReady = loadPagePlayerReadyOnce(timeout);
		const player = await memo.pagePlayerReady;
		if (options?.isCancelled?.()) return null;
		return player;
	}

	switch (target) {
		case "belowPlayerRoot": {
			const root = await waitForElement<HTMLDivElement>(
				readinessSelectors.belowPlayerRoot,
				timeout,
				"optional"
			);
			if (options?.isCancelled?.()) return null;
			return root;
		}
		case "moviePlayer": {
			const player = await waitForElement<YouTubePlayerDiv>(
				readinessSelectors.moviePlayer,
				timeout,
				"optional"
			);
			if (options?.isCancelled?.()) return null;
			return player;
		}
		case "pagePlayer": {
			const player = await waitForElement<YouTubePlayerDiv>(
				currentPlayerSelector(),
				timeout,
				"optional"
			);
			if (options?.isCancelled?.()) return null;
			return player;
		}
		case "pagePlayerReady": {
			const player = await whenReady("pagePlayer", { memo: false, timeout, ...options });
			if (!player) return null;
			try {
				await waitForPlayerLoaded(player, timeout, { isCancelled: options?.isCancelled });
				return player;
			} catch {
				return null;
			}
		}
		case "playerControls": {
			const controls = await waitForElement<HTMLDivElement>(
				readinessSelectors.playerControlsRight,
				timeout,
				"optional"
			);
			if (options?.isCancelled?.()) return null;
			return controls;
		}
		case "playerShell": {
			const [player] = await Promise.all([
				whenReady("pagePlayer", { memo: false, timeout, ...options }),
				waitForElement(readinessSelectors.playerContainer, timeout, "optional"),
				waitForElement(readinessSelectors.playerContainerOuter, timeout, "optional")
			]);
			if (options?.isCancelled?.()) return null;
			return player;
		}
		default:
			return null;
	}
}

function getReadinessMemo(): ReadinessMemo {
	if (!readinessMemo || readinessMemo.generation !== readinessGeneration) {
		readinessMemo = {
			generation: readinessGeneration,
			pagePlayer: null,
			pagePlayerReady: null
		};
	}
	return readinessMemo;
}

function isShortsPath(): boolean {
	return window.location.pathname.startsWith("/shorts");
}

async function loadPagePlayerOnce(timeout: number): Promise<Nullable<YouTubePlayerDiv>> {
	return waitForElement<YouTubePlayerDiv>(currentPlayerSelector(), timeout, "optional");
}

async function loadPagePlayerReadyOnce(timeout: number): Promise<Nullable<YouTubePlayerDiv>> {
	const player = await waitForElement<YouTubePlayerDiv>(
		currentPlayerSelector(),
		timeout,
		"optional"
	);
	if (!player) return null;
	try {
		await waitForPlayerLoaded(player, timeout);
		return player;
	} catch {
		return null;
	}
}

/**
 * Wait until the YouTube player has left the unstarted state (or times out).
 * Internal to readiness; not part of the public wait module.
 */
async function waitForPlayerLoaded(
	player: Nullable<YouTubePlayer>,
	timeout = 10000,
	options?: { isCancelled?: () => boolean }
): Promise<YouTubePlayer> {
	if (!player) {
		throw new Error("Player does not exist");
	}
	const start = performance.now();
	return new Promise((resolve, reject) => {
		const check = (): void => {
			if (options?.isCancelled?.()) {
				reject(new Error("Cancelled waiting for player to load"));
				return;
			}
			let loaded = false;
			try {
				const state = player.getPlayerStateObject();
				if (!state.isUnstarted || (!state.isBuffering && state.isUnstarted)) {
					loaded = true;
				}
			} catch {}
			if (!loaded) {
				const video = (player as unknown as HTMLElement).querySelector("video");
				if (video && video.readyState >= 2) {
					loaded = true;
				}
			}
			if (loaded) {
				resolve(player);
				return;
			}
			if (performance.now() - start >= timeout) {
				reject(new Error("Timed out waiting for player to load"));
				return;
			}
			requestAnimationFrame(check);
		};
		check();
	});
}
