import type { Nullable } from "@/src/types";

import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { buttonContainerId } from "./constants";

// ─── PlacementTransition ──────────────────────────────────────────
// Owns all placement observers (fullscreen, theater, geometry) as
// instance state. Activation splits into container tracking (theater and
// geometry) and fullscreen tracking so the two start independently.
// Chrome signals ride the shared DOM Mutation Bus; geometry keeps a
// ResizeObserver for player size.

/** Watch-page layout attributes that can move the button container. */
const WATCH_LAYOUT_ATTRIBUTE_FILTER = ["theater", "is-collapsed", "is-two-columns"] as const;

class PlacementTransition {
	private containerGeometryResizeHandler: Nullable<() => void> = null;
	// Container geometry
	private containerGeometryResizeObserver: Nullable<ResizeObserver> = null;
	private containerGeometryUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;
	private containerTrackingActive = false;

	// Fullscreen
	private fullscreenDomHandler: Nullable<() => void> = null;
	private fullscreenObserverActive = false;
	private fullscreenUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;

	// Theater mode
	private observedPlayerElement: Nullable<HTMLDivElement> = null;
	private theaterModeUnsubscribes: UnsubscribeFromDomMutations[] = [];
	private theaterNavigationHandler: Nullable<() => void> = null;

	// ─── Public lifecycle ───────────────────────────────────────────

	activateContainerTracking() {
		if (this.containerTrackingActive) return;
		this.containerTrackingActive = true;
		void this.startTheaterModeObserver();
		void this.startContainerGeometryObserver();
	}

	activateFullscreenTracking(onFullscreenChange: () => void) {
		this.startFullscreenObserver(onFullscreenChange);
	}

	deactivate() {
		this.stopTheaterModeObserver();
		this.stopContainerGeometryObserver();
		this.stopFullscreenObserver();
		this.containerTrackingActive = false;
	}

	ensureContainerPosition() {
		const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
		if (!container) return;
		const inTheaterMode = isInTheaterMode();
		const { parentElement: currentParent } = container;
		if (!currentParent) return;
		const isNewLayout = isNewYouTubeVideoLayout();
		const expectedParent = inTheaterMode
			? isNewLayout
				? document.querySelector("ytd-watch-grid")
				: document.querySelector("ytd-watch-flexy")
			: document.querySelector("div#primary > div#primary-inner");
		if (currentParent === expectedParent) {
			this.syncContainerGeometry();
			return;
		}
		if (inTheaterMode) {
			const parent = expectedParent as HTMLElement;
			const columns = parent?.querySelector("#columns");
			if (columns) parent.insertBefore(container, columns);
		} else {
			const player = expectedParent?.querySelector("#player");
			if (player) {
				player.insertAdjacentElement("afterend", container);
			} else {
				requestAnimationFrame(() => {
					this.ensureContainerPosition();
				});
				return;
			}
		}
		this.syncContainerGeometry();
	}

	isFullscreenTrackingActive(): boolean {
		return this.fullscreenObserverActive;
	}

	syncContainerGeometry() {
		const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
		if (!container?.isConnected) return;
		if (isFullscreen()) return;
		const player = document.querySelector<HTMLDivElement>("#movie_player");
		if (!player) return;
		if (this.observedPlayerElement !== player && this.containerGeometryResizeObserver) {
			this.containerGeometryResizeObserver.disconnect();
			this.containerGeometryResizeObserver.observe(player);
			this.observedPlayerElement = player;
		}
		const playerRect = player.getBoundingClientRect();
		if (playerRect.width === 0) return;
		container.style.width = `${playerRect.width}px`;
		const currentMarginLeft = parseFloat(container.style.marginLeft) || 0;
		const naturalLeft = container.getBoundingClientRect().left - currentMarginLeft;
		container.style.marginLeft = `${playerRect.left - naturalLeft}px`;
	}

	// ─── Fullscreen observer ────────────────────────────────────────

	private onFullscreenChange = () => {
		this.fullscreenDomHandler?.();
	};

	// ─── Navigation cleanup ─────────────────────────────────────────

	private onNavigationStart = () => {
		this.deactivate();
	};

	// ─── Container geometry observer ────────────────────────────────

	private async startContainerGeometryObserver() {
		if (this.containerGeometryResizeObserver) return;
		const player = await waitForPagePlayer({ timeout: 15000 });
		if (!player || this.containerGeometryResizeObserver) return;
		this.containerGeometryResizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => this.syncContainerGeometry());
		});
		this.containerGeometryResizeObserver.observe(player);
		this.observedPlayerElement = player;
		// Watch-page layout attribute changes (theater, columns) via the shared bus
		this.containerGeometryUnsubscribe = subscribeToDomMutations(
			"ytd-watch-flexy, ytd-watch-grid",
			() => {
				requestAnimationFrame(() => this.syncContainerGeometry());
			},
			{ attributeFilter: [...WATCH_LAYOUT_ATTRIBUTE_FILTER] }
		);
		this.containerGeometryResizeHandler = () => this.syncContainerGeometry();
		window.addEventListener("resize", this.containerGeometryResizeHandler);
		this.syncContainerGeometry();
	}

	private startFullscreenObserver(callback: () => void) {
		if (this.fullscreenObserverActive) return;
		this.fullscreenObserverActive = true;
		this.fullscreenDomHandler = callback;
		// ytd-app[fullscreen] attribute via the shared bus
		this.fullscreenUnsubscribe = subscribeToDomMutations(
			"ytd-app",
			() => {
				callback();
			},
			{ attributeFilter: ["fullscreen"] }
		);
		document.addEventListener("fullscreenchange", this.onFullscreenChange, { passive: true });
	}

	private async startTheaterModeObserver() {
		if (this.theaterModeUnsubscribes.length > 0) return;
		const scheduleReposition = () => {
			requestAnimationFrame(() => {
				this.ensureContainerPosition();
			});
		};
		// Player chrome + watch element theater signals via the shared bus
		await waitForElement<HTMLButtonElement>("button.ytp-size-button");
		this.theaterModeUnsubscribes.push(
			subscribeToDomMutations("button.ytp-size-button", scheduleReposition, {
				attributeFilter: ["class"]
			})
		);
		this.theaterModeUnsubscribes.push(
			subscribeToDomMutations("ytd-watch-flexy, ytd-watch-grid", scheduleReposition, {
				attributeFilter: ["theater"]
			})
		);
		document.addEventListener("yt-navigate-start", this.onNavigationStart);
	}

	private stopContainerGeometryObserver() {
		this.containerGeometryResizeObserver?.disconnect();
		this.containerGeometryResizeObserver = null;
		this.containerGeometryUnsubscribe?.();
		this.containerGeometryUnsubscribe = null;
		this.observedPlayerElement = null;
		if (this.containerGeometryResizeHandler) {
			window.removeEventListener("resize", this.containerGeometryResizeHandler);
			this.containerGeometryResizeHandler = null;
		}
	}

	private stopFullscreenObserver() {
		if (!this.fullscreenObserverActive) return;
		this.fullscreenObserverActive = false;
		this.fullscreenUnsubscribe?.();
		this.fullscreenUnsubscribe = null;
		document.removeEventListener("fullscreenchange", this.onFullscreenChange);
		this.fullscreenDomHandler = null;
	}

	private stopTheaterModeObserver() {
		if (this.theaterNavigationHandler) {
			document.removeEventListener("yt-navigate-start", this.theaterNavigationHandler);
			this.theaterNavigationHandler = null;
		}
		for (const unsubscribe of this.theaterModeUnsubscribes) unsubscribe();
		this.theaterModeUnsubscribes = [];
	}
}

// ─── Singleton ────────────────────────────────────────────────────

export const placementTransition = new PlacementTransition();

// ─── Pure query helpers (no state) ────────────────────────────────

export function isFullscreen(): boolean {
	return !!document.fullscreenElement || document.querySelector("ytd-app[fullscreen]") !== null;
}

export function isInTheaterMode(): boolean {
	return (
		document
			.querySelector<HTMLButtonElement>(
				isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy"
			)
			?.hasAttribute("theater") ?? false
	);
}
