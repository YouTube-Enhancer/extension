import type { Nullable } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { createStyledElement } from "@/src/utils/utilities";

export const timestampElementSelector = ".yt-core-attributed-string__link";
const timestampsWithListeners = new WeakSet<HTMLElement>();
const CLICK_GRACE_MS = 450;
const OVERLAY_LEAVE_HIDE_MS = 120;
let hideTimer: null | number = null;
let placeholderDiv: HTMLDivElement | null = null;
let overlayParent: HTMLElement | null = null;
let originalVideoStyles: null | { height: string; objectFit: string; width: string } = null;

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
export function handleTimestampElementsHover() {
	const href = getVideoHref();
	if (!href) return;
	document.querySelectorAll<HTMLElement>(`${timestampElementSelector}[href^='${href}']`).forEach((el) => {
		const ts = getTimestampFromString(el.getAttribute("href")!);
		if (!Number.isNaN(ts) && ts >= 0) handleTimestampHover(el, ts);
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
	let restoreTime: null | number = null;
	let wasPlaying = false;
	let committedByUser = false;
	const getVideo = () => document.querySelector<HTMLVideoElement>("video.html5-main-video");
	const hideAndRestoreIfNeeded = async () => {
		const video = getVideo();
		if (!video) return;
		await previewTimestamp(el, timestamp, false);
		if (committedByUser) {
			hideShield();
			return;
		}
		video.currentTime = restoreTime ?? 0;
		if (!wasPlaying) await video.pause();
		hideShield();
	};
	const mouseEnterHandler = () => {
		cancelHideTimer();
		const video = getVideo();
		if (!video) return;
		({ currentTime: restoreTime } = video);
		wasPlaying = !video.paused;
		committedByUser = false;
		void previewTimestamp(el, timestamp, true).then(() => {
			const overlay = getOrCreateOverlay();
			overlay.onmouseenter = () => {
				cancelHideTimer();
			};
			overlay.onmouseleave = () => {
				if (committedByUser) return;
				scheduleHide(() => void hideAndRestoreIfNeeded(), OVERLAY_LEAVE_HIDE_MS);
			};
			overlay.onclick = async (evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				committedByUser = true;
				cancelHideTimer();
				const v = getVideo();
				if (!v) return;
				const { currentTime: t } = v;
				await previewTimestamp(el, timestamp, false);
				hideShield();
				window.scrollTo({ behavior: "smooth", top: 0 });
				v.currentTime = t;
				try {
					await v.play();
				} catch (err) {
					if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
						console.error(err);
					}
				}
			};
			return null;
		});
	};
	const commitHandler = (e: unknown) => {
		const event = e as MouseEvent | PointerEvent;
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
		scheduleHide(() => {
			void hideAndRestoreIfNeeded();
		}, CLICK_GRACE_MS);
	};
	eventManager.addEventListener(el, "mouseenter", mouseEnterHandler, "timestampPeek");
	eventManager.addEventListener(el, "mouseleave", mouseLeaveHandler, "timestampPeek");
	eventManager.addEventListener(el, "pointerdown", commitHandler, "timestampPeek");
}

export function observeTimestampElements(): Nullable<MutationObserver> {
	const href = getVideoHref();
	if (!href) return null;
	const observer = new MutationObserver((mutations) => {
		for (const { addedNodes } of mutations) {
			for (const node of addedNodes) {
				if (!(node instanceof HTMLElement)) continue;
				if (node.matches?.(`${timestampElementSelector}[href^='${href}']`)) {
					const ts = getTimestampFromString(node.getAttribute("href")!);
					if (!Number.isNaN(ts) && ts >= 0) handleTimestampHover(node, ts);
				}
				node.querySelectorAll<HTMLElement>(`${timestampElementSelector}[href^='${href}']`).forEach((child) => {
					const ts = getTimestampFromString(child.getAttribute("href")!);
					if (!Number.isNaN(ts) && ts >= 0) handleTimestampHover(child, ts);
				});
			}
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}

function cancelHideTimer() {
	if (hideTimer !== null) {
		window.clearTimeout(hideTimer);
		hideTimer = null;
	}
}

function getOrCreateHoverShield(): HTMLDivElement {
	let shield = document.getElementById("yte-timestamp-peek-hover-shield") as HTMLDivElement | null;
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
	let overlay = document.getElementById("yte-timestamp-peek-overlay") as HTMLDivElement | null;
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
	const shield = document.getElementById("yte-timestamp-peek-hover-shield") as HTMLDivElement | null;
	if (shield) shield.style.display = "none";
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
		const clampedLeft = Math.max(0, left);
		const clampedTop = Math.max(0, top);
		const clampedRight = Math.min(window.innerWidth, right);
		const clampedBottom = Math.min(window.innerHeight, bottom);
		shield.style.left = `${clampedLeft}px`;
		shield.style.top = `${clampedTop}px`;
		shield.style.width = `${Math.max(0, clampedRight - clampedLeft)}px`;
		shield.style.height = `${Math.max(0, clampedBottom - clampedTop)}px`;
		shield.style.display = "block";
	});
}

async function previewTimestamp(element: HTMLElement, timestamp: number, show: boolean) {
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;
	const overlay = getOrCreateOverlay();
	if (show) {
		const { style } = video;
		originalVideoStyles = { height: style.height, objectFit: style.objectFit, width: style.width };
		if (!placeholderDiv) {
			const { parentElement } = video;
			if (!parentElement) return;
			const { height: vh, width: vw } = video.getBoundingClientRect();
			placeholderDiv = document.createElement("div");
			placeholderDiv.id = "yte-timestamp-peek-placeholder";
			Object.assign(placeholderDiv.style, { height: `${vh}px`, width: `${vw}px` });
			parentElement.insertBefore(placeholderDiv, video);
			overlayParent = parentElement;
		}
		overlay.innerHTML = "";
		overlay.appendChild(video);
		overlay.style.display = "block";
		const { bottom, left, top, width: elWidth } = element.getBoundingClientRect();
		const { offsetHeight: overlayHeight, offsetWidth: overlayWidth } = overlay;
		const margin = 8;
		let posX = left + elWidth / 2 - overlayWidth / 2;
		posX = Math.min(Math.max(posX, margin), window.innerWidth - overlayWidth - margin);
		const aboveY = top - overlayHeight - margin;
		const belowY = bottom + margin;
		const fitsAbove = aboveY >= margin;
		const fitsBelow = belowY + overlayHeight <= window.innerHeight - margin;
		let posY: number;
		if (fitsAbove || !fitsBelow) posY = aboveY;
		else posY = belowY;
		posY = Math.min(Math.max(posY, margin), window.innerHeight - overlayHeight - margin);
		overlay.style.transform = `translate(${posX}px, ${posY}px)`;
		video.pause();
		await seekVideo(video, timestamp);
		try {
			await video.play();
		} catch (err) {
			if (!(err instanceof DOMException && err.name === "AbortError")) {
				console.error(err);
			}
		}
	} else {
		cancelHideTimer();
		hideShield();
		if (overlayParent && placeholderDiv) {
			overlayParent.insertBefore(video, placeholderDiv);
			placeholderDiv.remove();
			placeholderDiv = null;
			overlayParent = null;
			if (originalVideoStyles) {
				const { height, objectFit, width } = originalVideoStyles;
				Object.assign(video.style, { height, objectFit, width });
				originalVideoStyles = null;
			}
		}
		overlay.style.display = "none";
	}
}

function scheduleHide(fn: () => void, delayMs: number) {
	cancelHideTimer();
	hideTimer = window.setTimeout(() => {
		hideTimer = null;
		fn();
	}, delayMs);
}
async function seekVideo(video: HTMLVideoElement, time: number) {
	const target = Math.max(0, time);
	if (Math.abs(video.currentTime - target) < 0.05) return;
	const seeked = new Promise<void>((resolve) => {
		const onSeeked = () => resolve();
		video.addEventListener("seeked", onSeeked, { once: true });
	});
	video.currentTime = target;
	await Promise.race([seeked, new Promise<void>((resolve) => window.setTimeout(resolve, 200))]);
}
