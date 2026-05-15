import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { isMiniPlayerActive } from "@/src/features/miniPlayer";
import { createStyledElement } from "@/src/utils/dom/elements";
import { timestampElementSelector } from "@/src/utils/dom/selectors";

const timestampsWithListeners = new Set<HTMLElement>();
const CLICK_GRACE_MS = 450;
const OVERLAY_LEAVE_HIDE_MS = 120;

const state: {
	hideTimer: Nullable<number>;
	originalVideoStyles: Nullable<{
		height: string;
		objectFit: string;
		width: string;
	}>;
	overlayParent: HTMLElement | null;
	placeholder: HTMLDivElement | null;
} = {
	hideTimer: null,
	originalVideoStyles: null,
	overlayParent: null,
	placeholder: null
};

const getVideo = () => document.querySelector<HTMLVideoElement>("video.html5-main-video");

const getOverlay = () => document.getElementById("yte-timestamp-peek-overlay") as HTMLDivElement | null;

const getShield = () => document.getElementById("yte-timestamp-peek-hover-shield") as HTMLDivElement | null;

export function getTimestampFromString(href: string) {
	const tParam = new URLSearchParams(href).get("t") ?? "0";
	return parseInt(tParam, 10);
}

export function getVideoHref() {
	const {
		location: { search }
	} = window;
	const v = new URLSearchParams(search).get("v");
	return v ? `/watch?v=${v}` : null;
}

export async function handleTimestampElementsHover() {
	const href = getVideoHref();
	if (!href) return;
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const videoLength = await playerContainer.getDuration();
	const timestampLinks = document.querySelectorAll<HTMLElement>(`${timestampElementSelector}[href^='${href}']`);
	timestampLinks.forEach((el) => {
		const ts = getTimestampFromString(el.getAttribute("href")!);
		if (!isValidTimestamp(ts, videoLength)) return;
		handleTimestampHover(el, ts);
	});
}

/**
 * Behavior:
 * - Hover timestamp -> show preview overlay (using the real video element).
 * - Leaving timestamp starts a grace timer.
 *   - If user moves into overlay, cancel timer (keep preview visible).
 *   - If user clicks overlay -> scroll top + keep playing at preview time.
 *   - If user leaves overlay (and hasn’t clicked) -> hide + restore.
 * - Invisible "hover shield" prevents accidental hover of nearby timestamps while traveling to the overlay.
 */
export function handleTimestampHover(el: HTMLElement, timestamp: number) {
	if (timestampsWithListeners.has(el)) return;
	timestampsWithListeners.add(el);
	let restoreTime: Nullable<number> = null;
	let wasPlaying = false;
	let committedByUser = false;
	const hideAndRestore = async () => {
		const video = getVideo();
		if (!video) return;
		await previewTimestamp(el, timestamp, false);
		if (committedByUser) {
			hideShield();
			return;
		}
		video.currentTime = restoreTime ?? 0;
		if (!wasPlaying) video.pause();
		hideShield();
	};
	const mouseEnterHandler = async () => {
		cancelHideTimer();
		const video = getVideo();
		if (!video) return;
		({ currentTime: restoreTime } = video);
		wasPlaying = !video.paused;
		committedByUser = false;
		await previewTimestamp(el, timestamp, true);
		const overlay = getOrCreateOverlay();
		eventManager.addEventListener(overlay, "mouseenter", cancelHideTimer, "timestampPeek");
		eventManager.addEventListener(
			overlay,
			"mouseleave",
			() => {
				if (committedByUser) return;
				scheduleHide(() => {
					void hideAndRestore();
				}, OVERLAY_LEAVE_HIDE_MS);
			},
			"timestampPeek"
		);
		eventManager.addEventListener(
			overlay,
			"click",
			(evt) => {
				void (async () => {
					evt.preventDefault();
					evt.stopPropagation();
					committedByUser = true;
					cancelHideTimer();
					const video = getVideo();
					if (!video) return;
					const { currentTime } = video;
					await previewTimestamp(el, timestamp, false);
					hideShield();
					window.scrollTo({
						behavior: "smooth",
						top: 0
					});
					video.currentTime = currentTime;
					try {
						await video.play();
					} catch (err) {
						if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
							console.error("[timestampPeek] Failed to resume playback after seek:", err);
						}
					}
				})();
			},
			"timestampPeek"
		);
	};

	const commitHandler = (event: MouseEvent | PointerEvent) => {
		if ("button" in event && event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		committedByUser = true;
		cancelHideTimer();
		hideShield();
		void previewTimestamp(el, timestamp, false);
	};
	const mouseLeaveHandler = () => {
		const overlay = getOrCreateOverlay();
		positionShieldBetween(el, overlay);
		scheduleHide(() => void hideAndRestore(), CLICK_GRACE_MS);
	};
	eventManager.addEventListener(el, "mouseenter", () => void mouseEnterHandler(), "timestampPeek");
	eventManager.addEventListener(el, "mouseleave", mouseLeaveHandler, "timestampPeek");
	eventManager.addEventListener(el, "pointerdown", (e) => void commitHandler(e as MouseEvent), "timestampPeek");
}

export async function observeTimestampElements(): Promise<Nullable<MutationObserver>> {
	const href = getVideoHref();
	if (!href) return null;
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return null;
	const videoLength = await playerContainer.getDuration();
	const observer = new MutationObserver((mutations) => {
		for (const { addedNodes } of mutations) {
			for (const node of addedNodes) {
				if (!(node instanceof HTMLElement)) continue;
				processNode(node, href, videoLength);
				node.querySelectorAll<HTMLElement>(`${timestampElementSelector}[href^='${href}']`).forEach((child) => processNode(child, href, videoLength));
			}
		}
	});
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	return observer;
}

export function resetState() {
	cancelHideTimer();
	state.originalVideoStyles = null;
	state.overlayParent = null;
	state.placeholder = null;
	timestampsWithListeners.clear();
}

function cancelHideTimer() {
	if (state.hideTimer !== null) {
		clearTimeout(state.hideTimer);
		state.hideTimer = null;
	}
}

function getOrCreateHoverShield(): HTMLDivElement {
	let shield = getShield();
	if (!shield) {
		shield = createStyledElement({
			elementId: "yte-timestamp-peek-hover-shield",
			elementType: "div",
			styles: {
				background: "transparent",
				display: "none",
				pointerEvents: "auto",
				position: "fixed",
				zIndex: "9998"
			}
		});
		document.body.appendChild(shield);
	}
	return shield;
}

function getOrCreateOverlay(): HTMLDivElement {
	let overlay = getOverlay();
	if (!overlay) {
		overlay = createStyledElement({
			elementId: "yte-timestamp-peek-overlay",
			elementType: "div",
			styles: {
				cursor: "pointer",
				display: "none",
				height: "225px",
				pointerEvents: "auto",
				position: "fixed",
				width: "400px",
				zIndex: "9999"
			}
		});
		document.body.appendChild(overlay);
	}
	return overlay;
}

function hideShield() {
	const shield = getShield();
	if (shield) shield.style.display = "none";
}

function isValidTimestamp(ts: number, videoLength: number) {
	return !Number.isNaN(ts) && ts >= 0 && ts <= videoLength;
}

function positionOverlay(element: HTMLElement, overlay: HTMLElement) {
	const { bottom, left, top, width } = element.getBoundingClientRect();
	const margin = 8;
	const { offsetWidth: overlayWidth } = overlay;
	const { offsetHeight: overlayHeight } = overlay;
	let x = left + width / 2 - overlayWidth / 2;
	x = Math.min(Math.max(x, margin), window.innerWidth - overlayWidth - margin);
	const above = top - overlayHeight - margin;
	const below = bottom + margin;
	const y = above >= margin || below + overlayHeight > window.innerHeight ? above : below;
	overlay.style.transform = `translate(${x}px, ${Math.max(margin, Math.min(y, window.innerHeight - overlayHeight - margin))}px)`;
}

function positionShieldBetween(timestampEl: HTMLElement, overlay: HTMLElement) {
	const shield = getOrCreateHoverShield();
	requestAnimationFrame(() => {
		if (overlay.style.display === "none") {
			shield.style.display = "none";
			return;
		}
		const ts = timestampEl.getBoundingClientRect();
		const ov = overlay.getBoundingClientRect();
		const pad = 8;
		const left = Math.min(ts.left, ov.left) - pad;
		const top = Math.min(ts.top, ov.top) - pad;
		const right = Math.max(ts.right, ov.right) + pad;
		const bottom = Math.max(ts.bottom, ov.bottom) + pad;
		shield.style.left = `${Math.max(0, left)}px`;
		shield.style.top = `${Math.max(0, top)}px`;
		shield.style.width = `${Math.min(window.innerWidth, right) - Math.max(0, left)}px`;
		shield.style.height = `${Math.min(window.innerHeight, bottom) - Math.max(0, top)}px`;
		shield.style.display = "block";
	});
}

async function previewTimestamp(element: HTMLElement, timestamp: number, show: boolean) {
	const video = getVideo();
	if (!video) return;
	const overlay = getOrCreateOverlay();
	const miniPlayerActive = isMiniPlayerActive();
	if (show) {
		const { style } = video;
		state.originalVideoStyles = {
			height: style.height,
			objectFit: style.objectFit,
			width: style.width
		};
		if (!state.placeholder) {
			const { parentElement } = video;
			if (!parentElement) return;
			const { height, width } = video.getBoundingClientRect();
			state.placeholder = document.createElement("div");
			state.placeholder.id = "yte-timestamp-peek-placeholder";
			Object.assign(state.placeholder.style, {
				height: `${height}px`,
				width: `${width}px`
			});
			parentElement.insertBefore(state.placeholder, video);
			state.overlayParent = parentElement;
		}
		overlay.innerHTML = "";
		overlay.appendChild(video);
		overlay.style.display = "block";
		positionOverlay(element, overlay);
		video.pause();
		await seekVideo(video, timestamp);
		if (miniPlayerActive) {
			document.querySelector<HTMLDivElement>("#yte-mini-player-overlay")!.style.display = "none";
		}
		try {
			await video.play();
		} catch (err) {
			if (!(err instanceof DOMException && err.name === "AbortError")) {
				console.error("[timestampPeek] Failed to play video in mini-player:", err);
			}
		}
	} else {
		cancelHideTimer();
		hideShield();
		if (state.overlayParent && state.placeholder) {
			state.overlayParent.insertBefore(video, state.placeholder);
			state.placeholder.remove();
			state.placeholder = null;
			state.overlayParent = null;
			if (state.originalVideoStyles) {
				Object.assign(video.style, state.originalVideoStyles);
				state.originalVideoStyles = null;
			}
		}
		overlay.style.display = "none";
		if (miniPlayerActive) {
			document.querySelector<HTMLDivElement>("#yte-mini-player-overlay")!.style.display = "block";
		}
	}
}

function processNode(node: HTMLElement, href: string, duration: number) {
	if (!node.matches?.(`${timestampElementSelector}[href^='${href}']`)) return;
	const ts = getTimestampFromString(node.getAttribute("href")!);
	if (!isValidTimestamp(ts, duration)) return;
	handleTimestampHover(node, ts);
}

function scheduleHide(fn: () => void, delay: number) {
	cancelHideTimer();
	state.hideTimer = window.setTimeout(() => {
		state.hideTimer = null;
		fn();
	}, delay);
}
async function seekVideo(video: HTMLVideoElement, time: number) {
	const target = Math.max(0, time);
	if (Math.abs(video.currentTime - target) < 0.05) return;
	const seeked = new Promise<void>((resolve) => {
		video.addEventListener("seeked", () => resolve(), { once: true });
	});
	video.currentTime = target;
	await Promise.race([seeked, new Promise<void>((resolve) => setTimeout(resolve, 200))]);
}
