import type { Nullable } from "@/src/types";

import { clamp } from "@/src/utils/math";

import type { StoryboardRenderer, StoryboardSheet } from "./core";

import { computeSeekWindow, formatTime, isBarHidden, parseStoryboardSheet, ratioToTime, storyboardTileAt, timeToRatio } from "./core";
import { discoverStoryboardRenderer, findControlsHost, findNativeProgressBar, findVideoElement, subscribeMediaChanged } from "./youtubePage";

/**
 * Custom seek bar with storyboard hover previews for the mini player.
 *
 * The single public entry point of `seekBar/`. Everything the bar creates or
 * subscribes to is reversed by the returned handle's `destroy()` — no shared
 * cleanup buckets, no registry imports. YouTube-specific lookups live in
 * `./youtubePage` and can be overridden through the two ports below.
 */
export type MiniSeekBar = {
	destroy(): void;
};
export type MiniSeekBarOptions = {
	/** Element the bar mounts into (the mini player overlay). */
	host: HTMLElement;
	/**
	 * Port: subscribe to "the page may have swapped the video element".
	 * Returns an unsubscribe function. Defaults to the YouTube SPA events.
	 */
	onMediaChanged?: (callback: () => void) => () => void;
	/** The player element already inside the overlay. */
	playerElement: HTMLElement;
	/**
	 * Port: async storyboard spec discovery. Resolving null degrades the
	 * hover preview to timestamp-only. Defaults to the YouTube page chain.
	 */
	storyboards?: () => Promise<Nullable<StoryboardRenderer>>;
};
const FORCE_SHOW_DURATION_MS = 1200;
const PREVIEW_EDGE_CLAMP_PX = 160;
const STORYBOARD_WARMUP_DELAY_MS = 50;
export function attachMiniSeekBar({
	host,
	onMediaChanged = subscribeMediaChanged,
	playerElement,
	storyboards = discoverStoryboardRenderer
}: MiniSeekBarOptions): MiniSeekBar {
	const controlsHost = findControlsHost(playerElement);
	const { barRoot, bufferedBar, hoverRange, playedBar, previewBox, previewThumbnail, previewTimestamp, scrubKnob } = buildBarElements();
	const disposers: (() => void)[] = [];
	let destroyed = false;
	let forced = false;
	let hideTimeout: Nullable<ReturnType<typeof setTimeout>> = null;
	let playedRatio = 0;
	let scrubbing = false;
	let storyboardGeneration = 0;
	let storyboardSheet: Nullable<StoryboardSheet> = null;
	let videoElement: Nullable<HTMLVideoElement> = null;
	const seekWindow = () => (videoElement ? computeSeekWindow(videoElement) : null);
	const syncVisibility = () => {
		const controlsVisible = !controlsHost.classList.contains("ytp-autohide");
		barRoot.classList.toggle("yte-mini-player-progress--hidden", isBarHidden({ controlsVisible, forced, scrubbing }));
	};
	const forceShow = () => {
		forced = true;
		barRoot.classList.add("yte-mini-player-progress--force");
		syncVisibility();
		if (hideTimeout) clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => {
			forced = false;
			barRoot.classList.remove("yte-mini-player-progress--force");
			syncVisibility();
		}, FORCE_SHOW_DURATION_MS);
	};
	const updateBar = () => {
		const window = seekWindow();
		if (!videoElement || !window) return;
		playedRatio = timeToRatio(window, videoElement.currentTime);
		playedBar.style.transform = `scaleX(${playedRatio})`;
		scrubKnob.style.left = `${playedRatio * 100}%`;
		let { start: bufferedEnd } = window;
		try {
			const { buffered } = videoElement;
			if (buffered && buffered.length) bufferedEnd = buffered.end(buffered.length - 1);
		} catch {}
		bufferedBar.style.transform = `scaleX(${timeToRatio(window, bufferedEnd)})`;
	};
	const updateThumbnail = (timeSeconds: number) => {
		const window = seekWindow();
		if (!storyboardSheet || !window) {
			previewThumbnail.style.backgroundImage = "";
			return;
		}
		const videoAspect = (videoElement?.videoWidth || 16) / (videoElement?.videoHeight || 9);
		const tile = storyboardTileAt(storyboardSheet, timeToRatio(window, timeSeconds), videoAspect);
		previewThumbnail.style.width = `${tile.width}px`;
		previewThumbnail.style.height = `${tile.height}px`;
		previewThumbnail.style.backgroundImage = `url("${tile.url}")`;
		previewThumbnail.style.backgroundSize = `${tile.backgroundWidth}px ${tile.backgroundHeight}px`;
		previewThumbnail.style.backgroundPosition = `-${tile.offsetX}px -${tile.offsetY}px`;
	};
	const updatePreview = (clientX: number) => {
		const bounds = barRoot.getBoundingClientRect();
		const hoverOffsetX = clamp(clientX - bounds.left, 0, bounds.width);
		const hoverRatio = bounds.width > 0 ? hoverOffsetX / bounds.width : 0;
		const played = clamp(playedRatio, 0, 1);
		hoverRange.style.left = `${Math.min(played, hoverRatio) * 100}%`;
		hoverRange.style.width = `${Math.abs(played - hoverRatio) * 100}%`;
		const window = seekWindow();
		if (!window) return;
		const hoveredTime = ratioToTime(window, hoverRatio);
		previewTimestamp.textContent = formatTime(hoveredTime);
		const minX = PREVIEW_EDGE_CLAMP_PX / 2;
		const maxX = bounds.width - PREVIEW_EDGE_CLAMP_PX / 2;
		previewBox.style.left = `${clamp(hoverOffsetX, minX, maxX)}px`;
		updateThumbnail(hoveredTime);
	};
	const seekFromClientX = (clientX: number) => {
		if (!videoElement) return;
		const window = seekWindow();
		if (!window) return;
		const bounds = barRoot.getBoundingClientRect();
		const barOffsetX = clamp(clientX - bounds.left, 0, bounds.width);
		videoElement.currentTime = ratioToTime(window, bounds.width > 0 ? barOffsetX / bounds.width : 0);
	};
	const refreshStoryboard = () => {
		const generation = ++storyboardGeneration;
		void (async () => {
			const renderer = await storyboards();
			if (destroyed || generation !== storyboardGeneration) return;
			storyboardSheet = parseStoryboardSheet(renderer);
			if (videoElement) updateThumbnail(videoElement.currentTime);
		})();
	};
	const unbindVideo = () => {
		if (!videoElement) return;
		videoElement.removeEventListener("timeupdate", updateBar);
		videoElement.removeEventListener("progress", updateBar);
		videoElement.removeEventListener("durationchange", updateBar);
		videoElement.removeEventListener("loadedmetadata", refreshStoryboard);
		videoElement = null;
	};
	const bindVideo = () => {
		const nextVideo = findVideoElement(playerElement);
		if (!nextVideo || nextVideo === videoElement) return;
		unbindVideo();
		videoElement = nextVideo;
		videoElement.addEventListener("timeupdate", updateBar);
		videoElement.addEventListener("progress", updateBar);
		videoElement.addEventListener("durationchange", updateBar);
		videoElement.addEventListener("loadedmetadata", refreshStoryboard);
		updateBar();
	};
	const showHoverUI = () => {
		hoverRange.style.display = "block";
		previewBox.style.display = "flex";
	};
	const hideHoverUI = () => {
		hoverRange.style.display = "none";
		previewBox.style.display = "none";
	};
	const onPointerDown = (event: PointerEvent) => {
		scrubbing = true;
		barRoot.classList.add("yte-mini-player-progress--scrubbing");
		barRoot.setPointerCapture(event.pointerId);
		syncVisibility();
		showHoverUI();
		updatePreview(event.clientX);
		seekFromClientX(event.clientX);
		event.preventDefault();
	};
	const onPointerMove = (event: PointerEvent) => {
		forceShow();
		showHoverUI();
		updatePreview(event.clientX);
		if (scrubbing) seekFromClientX(event.clientX);
	};
	const onPointerUp = () => {
		scrubbing = false;
		barRoot.classList.remove("yte-mini-player-progress--scrubbing");
		syncVisibility();
		hideHoverUI();
	};
	const onControlsPointer = () => forceShow();
	const onMediaChange = () => {
		bindVideo();
		queueMicrotask(refreshStoryboard);
	};
	const nativeBar = findNativeProgressBar(playerElement);
	if (nativeBar) {
		const {
			style: { display: previousDisplay }
		} = nativeBar;
		nativeBar.style.display = "none";
		disposers.push(() => {
			nativeBar.style.display = previousDisplay;
		});
	}
	host.querySelectorAll(".yte-mini-player-progress").forEach((stale) => stale.remove());
	host.appendChild(barRoot);
	disposers.push(() => barRoot.remove());
	barRoot.addEventListener("pointerdown", onPointerDown);
	barRoot.addEventListener("pointermove", onPointerMove);
	barRoot.addEventListener("pointerleave", onPointerUp);
	barRoot.addEventListener("pointerup", onPointerUp);
	disposers.push(() => {
		barRoot.removeEventListener("pointerdown", onPointerDown);
		barRoot.removeEventListener("pointermove", onPointerMove);
		barRoot.removeEventListener("pointerleave", onPointerUp);
		barRoot.removeEventListener("pointerup", onPointerUp);
	});
	controlsHost.addEventListener("pointerenter", onControlsPointer);
	controlsHost.addEventListener("pointermove", onControlsPointer);
	disposers.push(() => {
		controlsHost.removeEventListener("pointerenter", onControlsPointer);
		controlsHost.removeEventListener("pointermove", onControlsPointer);
	});
	const autohideObserver = new MutationObserver(syncVisibility);
	autohideObserver.observe(controlsHost, { attributeFilter: ["class"], attributes: true });
	disposers.push(() => autohideObserver.disconnect());
	disposers.push(onMediaChanged(onMediaChange));
	disposers.push(unbindVideo);
	bindVideo();
	syncVisibility();
	const warmupTimeout = setTimeout(refreshStoryboard, STORYBOARD_WARMUP_DELAY_MS);
	return {
		destroy() {
			if (destroyed) return;
			destroyed = true;
			storyboardGeneration += 1;
			clearTimeout(warmupTimeout);
			if (hideTimeout) clearTimeout(hideTimeout);
			for (const dispose of disposers.reverse()) dispose();
		}
	};
}
function buildBarElements() {
	const barRoot = document.createElement("div");
	barRoot.className = "yte-mini-player-progress";
	const barTrack = document.createElement("div");
	barTrack.className = "yte-mini-player-progress__track";
	const bufferedBar = document.createElement("div");
	bufferedBar.className = "yte-mini-player-progress__loaded";
	const playedBar = document.createElement("div");
	playedBar.className = "yte-mini-player-progress__played";
	const hoverRange = document.createElement("div");
	hoverRange.className = "yte-mini-player-progress__hover";
	hoverRange.style.display = "none";
	const scrubKnob = document.createElement("div");
	scrubKnob.className = "yte-mini-player-progress__knob";
	const previewBox = document.createElement("div");
	previewBox.className = "yte-mini-player-progress__preview";
	previewBox.style.display = "none";
	const previewThumbnail = document.createElement("div");
	previewThumbnail.className = "yte-mini-player-progress__preview-thumb";
	const previewTimestamp = document.createElement("div");
	previewTimestamp.className = "yte-mini-player-progress__preview-time";
	previewBox.appendChild(previewThumbnail);
	previewBox.appendChild(previewTimestamp);
	barTrack.appendChild(bufferedBar);
	barTrack.appendChild(hoverRange);
	barTrack.appendChild(playedBar);
	barTrack.appendChild(scrubKnob);
	barRoot.appendChild(barTrack);
	barRoot.appendChild(previewBox);
	return { barRoot, bufferedBar, hoverRange, playedBar, previewBox, previewThumbnail, previewTimestamp, scrubKnob };
}
