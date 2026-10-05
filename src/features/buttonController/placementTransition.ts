import type { Nullable } from "@/src/types";

import { waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { buttonContainerId } from "./constants";

// ─── PlacementTransition ──────────────────────────────────────────
// Owns all placement observers (fullscreen, theater, geometry) as
// instance state. Provides a single activate/deactivate lifecycle.

class PlacementTransition {
	// Container geometry
	private containerGeometryMutationObserver: Nullable<MutationObserver> = null;
	private containerGeometryObserver: Nullable<ResizeObserver> = null;
	private containerGeometryResizeHandler: Nullable<() => void> = null;

	// Fullscreen
	private fullscreenDomHandler: Nullable<() => void> = null;
	private fullscreenObserver: Nullable<MutationObserver> = null;
	private fullscreenObserverActive = false;

	// Theater mode
	private observedPlayerElement: Nullable<HTMLDivElement> = null;
	private theaterModeObserver: Nullable<MutationObserver> = null;
	private theaterNavigationHandler: Nullable<() => void> = null;

	// ─── Public lifecycle ───────────────────────────────────────────

	activate(_containerElement: HTMLDivElement, onFullscreenChange: () => void) {
		this.startFullscreenObserver(onFullscreenChange);
		void this.startTheaterModeObserver();
		void this.startContainerGeometryObserver();
	}

	deactivate() {
		this.stopTheaterModeObserver();
		this.stopContainerGeometryObserver();
		this.stopFullscreenObserver();
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

	isActive(): boolean {
		return this.fullscreenObserverActive;
	}

	syncContainerGeometry() {
		const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
		if (!container?.isConnected) return;
		if (isFullscreen()) return;
		const player = document.querySelector<HTMLDivElement>("#movie_player");
		if (!player) return;
		if (this.observedPlayerElement !== player && this.containerGeometryObserver) {
			this.containerGeometryObserver.disconnect();
			this.containerGeometryObserver.observe(player);
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
		if (this.containerGeometryObserver) return;
		const player = await waitForPagePlayer({ timeout: 15000 });
		if (!player || this.containerGeometryObserver) return;
		this.containerGeometryObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => this.syncContainerGeometry());
		});
		this.containerGeometryObserver.observe(player);
		this.observedPlayerElement = player;
		const watchElement = document.querySelector("ytd-watch-flexy, ytd-watch-grid");
		if (watchElement) {
			this.containerGeometryMutationObserver = new MutationObserver(() => {
				requestAnimationFrame(() => this.syncContainerGeometry());
			});
			this.containerGeometryMutationObserver.observe(watchElement, { attributes: true });
		}
		this.containerGeometryResizeHandler = () => this.syncContainerGeometry();
		window.addEventListener("resize", this.containerGeometryResizeHandler);
		this.syncContainerGeometry();
	}

	private startFullscreenObserver(callback: () => void) {
		if (this.fullscreenObserverActive) return;
		this.fullscreenObserverActive = true;
		this.fullscreenDomHandler = callback;
		const target = document.querySelector("ytd-app");
		if (target) {
			this.fullscreenObserver = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.type === "attributes" && mutation.attributeName === "fullscreen") {
						callback();
					}
				}
			});
			this.fullscreenObserver.observe(target, {
				attributeFilter: ["fullscreen"],
				attributes: true
			});
		}
		document.addEventListener("fullscreenchange", this.onFullscreenChange, { passive: true });
	}

	private async startTheaterModeObserver() {
		if (this.theaterModeObserver) return;
		const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
		if (!sizeButton) return;
		const scheduleReposition = () => {
			requestAnimationFrame(() => {
				this.ensureContainerPosition();
			});
		};
		this.theaterModeObserver = new MutationObserver(scheduleReposition);
		this.theaterModeObserver.observe(sizeButton, {
			attributeFilter: ["class"],
			attributes: true,
			childList: true,
			subtree: true
		});
		const watchElement = document.querySelector<HTMLElement>("ytd-watch-flexy, ytd-watch-grid");
		if (watchElement) {
			this.theaterModeObserver.observe(watchElement, {
				attributeFilter: ["theater"],
				attributes: true
			});
		}
		document.addEventListener("yt-navigate-start", this.onNavigationStart);
	}

	private stopContainerGeometryObserver() {
		this.containerGeometryObserver?.disconnect();
		this.containerGeometryObserver = null;
		this.containerGeometryMutationObserver?.disconnect();
		this.containerGeometryMutationObserver = null;
		this.observedPlayerElement = null;
		if (this.containerGeometryResizeHandler) {
			window.removeEventListener("resize", this.containerGeometryResizeHandler);
			this.containerGeometryResizeHandler = null;
		}
	}

	private stopFullscreenObserver() {
		if (!this.fullscreenObserverActive) return;
		this.fullscreenObserverActive = false;
		this.fullscreenObserver?.disconnect();
		this.fullscreenObserver = null;
		document.removeEventListener("fullscreenchange", this.onFullscreenChange);
		this.fullscreenDomHandler = null;
	}

	private stopTheaterModeObserver() {
		if (this.theaterNavigationHandler) {
			document.removeEventListener("yt-navigate-start", this.theaterNavigationHandler);
			this.theaterNavigationHandler = null;
		}
		this.theaterModeObserver?.disconnect();
		this.theaterModeObserver = null;
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
