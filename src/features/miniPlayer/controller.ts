import type { MiniPlayerOptions } from "@/src/features/miniPlayer";
import type { MiniPlayerSize, Nullable } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { clamp, createStyledElement } from "@/src/utils/utilities";

import "./index.css";

type MiniPlayerRect = {
	height: number;
	width: number;
	x: number;
	y: number;
};
const LS_MINI_PLAYER_RECT_KEY = "yte_mini_player_state";
const LS_MINI_PLAYER_MANUAL_KEY = "yte_mini_player_manual_override";
type MiniPlayerBarState = {
	barRoot: HTMLDivElement;
	cleanupFns: Array<() => void>;
	controlsVisibilityTarget: HTMLElement;
	hideTimeout: Nullable<ReturnType<typeof setTimeout>>;
	playedRatio: number;
	playerElement: HTMLElement;
	progressBar: {
		bufferedBar: HTMLDivElement;
		hoverRange: HTMLDivElement;
		playedBar: HTMLDivElement;
		previewBox: HTMLDivElement;
		previewThumbnail: HTMLDivElement;
		previewTimestamp: HTMLDivElement;
		scrubKnob: HTMLDivElement;
	};
	storyboardSheet: Nullable<StoryboardSheet>;
	videoElement: HTMLVideoElement;
};
type PlayerStoryboardSpecRenderer = {
	fineScrubbingRecommendedLevel?: number;
	highResolutionRecommendedLevel?: number;
	recommendedLevel?: number;
	spec?: string;
};
type StoryboardSheet = {
	baseUrl: string;
	cols: number;
	frameCount: number;
	height: number;
	rows: number;
	selectedLevel?: number;
	signature: string;
	width: number;
};
export class MiniPlayerController {
	private detachedPlayer: Nullable<HTMLElement> = null;
	private dragHandleElement: Nullable<HTMLDivElement> = null;
	private isActiveState = false;
	private options: MiniPlayerOptions;
	private originalPlayerParent: Nullable<HTMLElement> = null;
	private overlayElement: Nullable<HTMLDivElement> = null;
	private playerPlaceholder: Nullable<HTMLDivElement> = null;
	private resizeHandleElement: Nullable<HTMLDivElement> = null;
	constructor(options: MiniPlayerOptions) {
		this.options = options;
		window.addEventListener("resize", this.handleViewportResize, { passive: true });
	}
	close() {
		setManualOverride(false);
		this.disable();
	}
	destroy() {
		window.removeEventListener("resize", this.handleViewportResize);
		eventManager.removeEventListeners("miniPlayer");
		this.disable();
		this.overlayElement?.remove();
		this.overlayElement = null;
	}
	isActive() {
		return this.isActiveState;
	}
	setAutoActive(shouldBeActive: boolean) {
		if (readManualOverride()) return;
		if (shouldBeActive) this.enable();
		else this.disable();
	}
	setDefaults(
		defaults: MiniPlayerOptions,
		{ applyIfNoSavedState = true, forceApply = false }: { applyIfNoSavedState?: boolean; forceApply?: boolean } = {}
	) {
		this.options = { ...this.options, ...defaults };
		if (!this.isActiveState) return;
		const savedRect = readSavedState();
		if (!forceApply && savedRect) return;
		if (forceApply || (applyIfNoSavedState && !savedRect)) {
			this.applyInitialRect({ ignoreSavedState: forceApply });
		}
	}
	toggleManual() {
		if (this.isActiveState) {
			setManualOverride(false);
			this.disable();
			return;
		}
		setManualOverride(true);
		this.enable();
	}
	private applyInitialRect({ ignoreSavedState = false }: { ignoreSavedState?: boolean } = {}) {
		const savedRect = ignoreSavedState ? null : readSavedState();
		if (savedRect) {
			this.setRect(savedRect);
			return;
		}
		const { height, width } = parseSizePreset(this.options.mini_player_default_size);
		const margin = 16;
		const { innerHeight: vh, innerWidth: vw } = window;
		const xLeft = margin;
		const xCenter = Math.round((vw - width) / 2);
		const xRight = vw - width - margin;
		const yTop = margin;
		const yBottom = vh - height - margin;
		let x = xRight;
		let y = yBottom;
		switch (this.options.mini_player_default_position) {
			case "bottom_center":
				x = xCenter;
				y = yBottom;
				break;
			case "bottom_left":
				x = xLeft;
				y = yBottom;
				break;
			case "bottom_right":
				x = xRight;
				y = yBottom;
				break;
			case "top_center":
				x = xCenter;
				y = yTop;
				break;
			case "top_left":
				x = xLeft;
				y = yTop;
				break;
			case "top_right":
				x = xRight;
				y = yTop;
				break;
		}
		this.setRect({ height, width, x, y });
	}
	private attachDragResize() {
		if (!this.overlayElement || !this.dragHandleElement || !this.resizeHandleElement) return;
		let isDragging = false;
		let dragStartX = 0;
		let dragStartY = 0;
		let baseRectX = 0;
		let baseRectY = 0;
		const readCurrentXY = () => {
			return readSavedState() ?? { x: 0, y: 0 };
		};
		eventManager.addEventListener(
			this.dragHandleElement,
			"pointerdown",
			(e) => {
				const evt = e as PointerEvent;
				isDragging = true;
				this.overlayElement!.classList.add("yte-mini-player-dragging");
				this.dragHandleElement!.setPointerCapture(evt.pointerId);
				({ clientX: dragStartX, clientY: dragStartY } = evt);
				({ x: baseRectX, y: baseRectY } = readCurrentXY());
				evt.preventDefault();
			},
			"miniPlayer"
		);
		eventManager.addEventListener(
			this.dragHandleElement,
			"pointermove",
			(e) => {
				if (!isDragging) return;
				const evt = e as PointerEvent;
				const dx = evt.clientX - dragStartX;
				const dy = evt.clientY - dragStartY;
				const savedRect = readSavedState();
				if (!savedRect) return;
				this.setRect({ ...savedRect, x: baseRectX + dx, y: baseRectY + dy });
			},
			"miniPlayer"
		);
		eventManager.addEventListener(
			this.dragHandleElement,
			"pointerup",
			() => {
				isDragging = false;
				this.overlayElement!.classList.remove("yte-mini-player-dragging");
			},
			"miniPlayer"
		);
		let isResizing = false;
		let startWidth = 0;
		let startHeight = 0;
		let aspectRatio = 16 / 9;
		let resizeStartX = 0;
		let resizeStartY = 0;
		eventManager.addEventListener(
			this.resizeHandleElement,
			"pointerdown",
			(e) => {
				const evt = e as PointerEvent;
				isResizing = true;
				this.overlayElement!.classList.add("yte-mini-player-resizing");
				this.resizeHandleElement!.setPointerCapture(evt.pointerId);
				const savedRect = readSavedState();
				if (!savedRect) return;
				({ height: startHeight, width: startWidth } = savedRect);
				aspectRatio = startWidth / startHeight;
				({ clientX: resizeStartX, clientY: resizeStartY } = evt);
				evt.preventDefault();
				evt.stopPropagation();
			},
			"miniPlayer"
		);
		eventManager.addEventListener(
			this.resizeHandleElement,
			"pointermove",
			(e) => {
				if (!isResizing) return;
				const evt = e as PointerEvent;
				const dx = evt.clientX - resizeStartX;
				const dy = evt.clientY - resizeStartY;
				const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
				const nextW = Math.max(240, startWidth + delta);
				const nextH = Math.round(nextW / aspectRatio);
				const savedRect = readSavedState();
				if (!savedRect) return;
				this.setRect({ ...savedRect, height: nextH, width: nextW });
			},
			"miniPlayer"
		);
		eventManager.addEventListener(
			this.resizeHandleElement,
			"pointerup",
			() => {
				isResizing = false;
				this.overlayElement!.classList.remove("yte-mini-player-resizing");
			},
			"miniPlayer"
		);
	}
	private disable() {
		if (!this.isActiveState) return;
		this.restorePlayer();
		if (this.overlayElement) this.overlayElement.style.display = "none";
		this.isActiveState = false;
		document.documentElement.classList.remove("yte-mini-player-active");
	}
	private enable() {
		if (this.isActiveState) return;
		this.ensureOverlay();
		if (!this.overlayElement) return;
		const ok = this.movePlayerIntoOverlay();
		if (!ok) return;
		this.applyInitialRect();
		this.overlayElement.style.display = "block";
		this.isActiveState = true;
		document.documentElement.classList.add("yte-mini-player-active");
	}
	private ensureOverlay() {
		if (this.overlayElement) return;
		const overlay = createStyledElement({
			classlist: ["yte-mini-player"],
			elementId: "yte-mini-player-overlay",
			elementType: "div",
			styles: {
				borderRadius: "12px",
				display: "none",
				overflow: "hidden",
				pointerEvents: "auto",
				position: "fixed",
				zIndex: "2147483647"
			}
		});
		const overlayControls = createStyledElement({
			classlist: ["yte-mini-player-overlay"],
			elementId: "yte-mini-player-controls",
			elementType: "div"
		});
		const dragHandle = createStyledElement({
			classlist: ["yte-mini-player-drag-handle"],
			elementId: "yte-mini-player-drag-handle",
			elementType: "div"
		});
		const closeBtn = createStyledElement({
			classlist: ["yte-mini-player-close"],
			elementId: "yte-mini-player-close",
			elementType: "button"
		});
		closeBtn.textContent = "×";
		closeBtn.addEventListener("pointerdown", (e) => {
			e.stopPropagation();
		});
		closeBtn.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.close();
		};
		const resizeHandle = createStyledElement({
			classlist: ["yte-mini-player-resize-handle"],
			elementId: "yte-mini-player-resize",
			elementType: "div"
		});
		overlayControls.appendChild(dragHandle);
		overlayControls.appendChild(closeBtn);
		overlay.appendChild(overlayControls);
		overlay.appendChild(resizeHandle);
		document.body.appendChild(overlay);
		this.overlayElement = overlay;
		this.dragHandleElement = dragHandle;
		this.resizeHandleElement = resizeHandle;
		this.attachDragResize();
	}
	private handleViewportResize = () => {
		const savedRect = readSavedState();
		if (!savedRect) return;
		this.setRect(savedRect);
	};
	private movePlayerIntoOverlay() {
		const player = document.querySelector<HTMLElement>("#movie_player");
		if (!player) return false;
		const { parentElement: parent } = player;
		if (!parent) return false;
		if (!this.playerPlaceholder) {
			const { height, width } = player.getBoundingClientRect();
			const placeholder = createStyledElement({
				elementId: "yte-mini-player-placeholder",
				elementType: "div",
				styles: {
					height: `${height}px`,
					width: `${width}px`
				}
			});
			parent.insertBefore(placeholder, player);
			this.playerPlaceholder = placeholder;
			this.originalPlayerParent = parent;
		}
		this.ensureOverlay();
		if (!this.overlayElement) return false;
		let content = this.overlayElement.querySelector<HTMLDivElement>("#yte-mini-player-content");
		if (!content) {
			content = createStyledElement({
				elementId: "yte-mini-player-content",
				elementType: "div",
				styles: {
					inset: "0",
					position: "absolute"
				}
			});
			this.overlayElement.insertBefore(content, this.overlayElement.firstChild);
		}
		content.innerHTML = "";
		content.appendChild(player);
		player.style.width = "100%";
		player.style.height = "100%";
		player.style.position = "relative";
		this.detachedPlayer = player;
		enableMiniPlayerCustomProgress(this.detachedPlayer, this.overlayElement);
		return true;
	}
	private restorePlayer() {
		const { detachedPlayer } = this;
		if (this.originalPlayerParent && this.playerPlaceholder && detachedPlayer) {
			this.originalPlayerParent.insertBefore(detachedPlayer, this.playerPlaceholder);
		}
		if (this.playerPlaceholder) this.playerPlaceholder.remove();
		if (detachedPlayer) {
			detachedPlayer.style.width = "";
			detachedPlayer.style.height = "";
			detachedPlayer.style.position = "";
		}
		disableMiniPlayerCustomProgress();
		window.dispatchEvent(new Event("resize"));
		this.playerPlaceholder = null;
		this.originalPlayerParent = null;
		this.detachedPlayer = null;
	}
	private setRect(bounds: MiniPlayerRect) {
		if (!this.overlayElement) return;
		const margin = 16;
		const minW = 240;
		const minH = 135;
		const maxW = window.innerWidth - margin * 2;
		const maxH = window.innerHeight - margin * 2;
		let width = clamp(bounds.width, minW, maxW);
		width = Math.round(width / 16) * 16;
		let height = Math.round((width * 9) / 16);
		height = Math.round(height / 9) * 9;
		width = Math.round((height * 16) / 9);
		width = Math.round(width / 16) * 16;
		width = clamp(width, minW, maxW);
		height = Math.round((width * 9) / 16);
		height = clamp(height, minH, maxH);
		const maxX = Math.max(margin, window.innerWidth - width - margin);
		const maxY = Math.max(margin, window.innerHeight - height - margin);
		const x = clamp(bounds.x, margin, maxX);
		const y = clamp(bounds.y, margin, maxY);
		this.overlayElement.style.width = `${width}px`;
		this.overlayElement.style.height = `${height}px`;
		this.overlayElement.style.transform = `translate(${x}px, ${y}px)`;
		writeSavedState({ height, width, x, y });
	}
}
export function setManualOverride(enabled: boolean) {
	localStorage.setItem(LS_MINI_PLAYER_MANUAL_KEY, enabled ? "1" : "0");
}
function parseSizePreset(preset: MiniPlayerSize): { height: number; width: number } {
	const [w, h] = preset.split("x").map((n) => parseInt(n, 10));
	return { height: h, width: w };
}
function readManualOverride(): boolean {
	return localStorage.getItem(LS_MINI_PLAYER_MANUAL_KEY) === "1";
}
function readSavedState(): Nullable<MiniPlayerRect> {
	try {
		const raw = localStorage.getItem(LS_MINI_PLAYER_RECT_KEY);
		if (!raw) return null;
		const savedRect = JSON.parse(raw) as MiniPlayerRect;
		if (!Number.isFinite(savedRect.x) || !Number.isFinite(savedRect.y) || !Number.isFinite(savedRect.width) || !Number.isFinite(savedRect.height))
			return null;
		return savedRect;
	} catch {
		return null;
	}
}
function writeSavedState(s: MiniPlayerRect) {
	localStorage.setItem(LS_MINI_PLAYER_RECT_KEY, JSON.stringify(s));
}
let miniPlayerBarState: Nullable<MiniPlayerBarState> = null;
export function disableMiniPlayerCustomProgress() {
	if (!miniPlayerBarState) return;
	const { barRoot, cleanupFns } = miniPlayerBarState;
	for (const fn of cleanupFns) fn();
	barRoot.remove();
	miniPlayerBarState = null;
}
export function enableMiniPlayerCustomProgress(playerElement: HTMLElement, overlayElement: HTMLElement) {
	if (miniPlayerBarState) return;
	const videoElement = qs<HTMLVideoElement>(playerElement, "video.html5-main-video");
	if (!videoElement) return;
	const controlsVisibilityTarget = qs<HTMLElement>(playerElement, ".html5-video-player") ?? playerElement;
	const { barRoot, progressBar } = buildMiniBar();
	overlayElement.appendChild(barRoot);
	const restoreNative = hideNativeProgress(playerElement);
	const storyboardRenderer = getStoryboardRenderer();
	const specString = storyboardRenderer?.spec ?? getStoryboardSpec();
	const storyboardSheet = specString ? parseStoryboard(specString, storyboardRenderer) : null;
	const barState: MiniPlayerBarState = {
		barRoot,
		cleanupFns: [restoreNative],
		controlsVisibilityTarget,
		hideTimeout: null,
		playedRatio: 0,
		playerElement,
		progressBar,
		storyboardSheet,
		videoElement
	};
	attachMiniBarEvents(barState);
	miniPlayerBarState = barState;
	updateMiniBar();
}
function attachMiniBarEvents(barState: MiniPlayerBarState) {
	const { barRoot, videoElement } = barState;
	let isScrubbing = false;
	syncMiniBarVisibility(barState);
	const showUI = () => {
		barState.progressBar.hoverRange.style.display = "block";
		barState.progressBar.previewBox.style.display = "flex";
	};
	const hideUI = () => {
		barState.progressBar.hoverRange.style.display = "none";
		barState.progressBar.previewBox.style.display = "none";
	};
	const updateUI = (clientX: number) => {
		const bounds = barRoot.getBoundingClientRect();
		const hoverOffsetX = clamp(clientX - bounds.left, 0, bounds.width);
		const hoverRatio = bounds.width > 0 ? hoverOffsetX / bounds.width : 0;
		const played = clamp(barState.playedRatio, 0, 1);
		const hovered = clamp(hoverRatio, 0, 1);
		const left = Math.min(played, hovered);
		const width = Math.abs(played - hovered);
		barState.progressBar.hoverRange.style.left = `${left * 100}%`;
		barState.progressBar.hoverRange.style.width = `${width * 100}%`;
		const seekWindow = getSeekWindow(videoElement);
		if (!seekWindow) return;
		const { end, start } = seekWindow;
		const t = start + (end - start) * hovered;
		barState.progressBar.previewTimestamp.textContent = formatTime(t);
		const previewWidth = 160;
		const minX = previewWidth / 2;
		const maxX = bounds.width - previewWidth / 2;
		const clampedX = clamp(hoverOffsetX, minX, maxX);
		barState.progressBar.previewBox.style.left = `${clampedX}px`;
		updateStoryboardThumb(barState, t, seekWindow);
	};
	const onPointerDown = (e: PointerEvent) => {
		isScrubbing = true;
		barRoot.classList.add("yte-mini-player-progress--scrubbing");
		barRoot.classList.add("yte-mini-player-progress--force");
		barRoot.setPointerCapture(e.pointerId);
		showUI();
		updateUI(e.clientX);
		seekFromClientX(e.clientX);
		e.preventDefault();
	};
	const onPointerMove = (e: PointerEvent) => {
		forceShowMiniBar(barState);
		showUI();
		updateUI(e.clientX);
		if (isScrubbing) seekFromClientX(e.clientX);
	};
	const onPointerUp = () => {
		isScrubbing = false;
		barRoot.classList.remove("yte-mini-player-progress--scrubbing");
		barRoot.classList.remove("yte-mini-player-progress--force");
		syncMiniBarVisibility(barState);
		hideUI();
	};
	barRoot.addEventListener("pointerdown", onPointerDown);
	barRoot.addEventListener("pointermove", onPointerMove);
	barRoot.addEventListener("pointerleave", onPointerUp);
	barRoot.addEventListener("pointerup", onPointerUp);
	const onTimeUpdate = () => updateMiniBar();
	const onProgress = () => updateMiniBar();
	const onDuration = () => updateMiniBar();
	const onPlayerEnter = () => forceShowMiniBar(barState);
	const onPlayerMove = () => forceShowMiniBar(barState);
	barState.controlsVisibilityTarget.addEventListener("pointerenter", onPlayerEnter);
	barState.controlsVisibilityTarget.addEventListener("pointermove", onPlayerMove);
	const mo = new MutationObserver(() => syncMiniBarVisibility(barState));
	mo.observe(barState.controlsVisibilityTarget, { attributeFilter: ["class"], attributes: true });
	barState.cleanupFns.push(() => mo.disconnect());
	barState.cleanupFns.push(() => barState.controlsVisibilityTarget.removeEventListener("pointerenter", onPlayerEnter));
	barState.cleanupFns.push(() => barState.controlsVisibilityTarget.removeEventListener("pointermove", onPlayerMove));
	videoElement.addEventListener("timeupdate", onTimeUpdate);
	videoElement.addEventListener("progress", onProgress);
	videoElement.addEventListener("durationchange", onDuration);
	barState.cleanupFns.push(() => barRoot.removeEventListener("pointerdown", onPointerDown));
	barState.cleanupFns.push(() => barRoot.removeEventListener("pointermove", onPointerMove));
	barState.cleanupFns.push(() => barRoot.removeEventListener("pointerleave", onPointerUp));
	barState.cleanupFns.push(() => barRoot.removeEventListener("pointerup", onPointerUp));
	barState.cleanupFns.push(() => videoElement.removeEventListener("timeupdate", onTimeUpdate));
	barState.cleanupFns.push(() => videoElement.removeEventListener("progress", onProgress));
	barState.cleanupFns.push(() => videoElement.removeEventListener("durationchange", onDuration));
}
function buildMiniBar(): Pick<MiniPlayerBarState, "barRoot" | "progressBar"> {
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
	return {
		barRoot,
		progressBar: {
			bufferedBar,
			hoverRange,
			playedBar,
			previewBox,
			previewThumbnail,
			previewTimestamp,
			scrubKnob
		}
	};
}
function buildStoryboardUrl(storyBoardSheet: StoryboardSheet, imageIndex: number) {
	const level = storyBoardSheet.selectedLevel ?? 3;
	return buildStoryboardUrlForLevel(storyBoardSheet, imageIndex, level);
}
function buildStoryboardUrlForLevel(storyBoardSheet: StoryboardSheet, imageIndex: number, level: number) {
	let url = storyBoardSheet.baseUrl.replace("$L", String(level)).replace("$N", `M${imageIndex}`);
	if (url.startsWith("//")) url = `https:${url}`;
	if (!/([?&])sigh=/.test(url)) {
		const join = url.includes("?") ? "&" : "?";
		url = `${url}${join}sigh=${encodeURIComponent(storyBoardSheet.signature)}`;
	}
	return url;
}
function forceShowMiniBar(barState: MiniPlayerBarState) {
	const { barRoot } = barState;
	barRoot.classList.add("yte-mini-player-progress--force");
	syncMiniBarVisibility(barState);
	if (barState.hideTimeout) clearTimeout(barState.hideTimeout);
	barState.hideTimeout = setTimeout(() => {
		barRoot.classList.remove("yte-mini-player-progress--force");
		syncMiniBarVisibility(barState);
	}, 1200);
}
function formatTime(seconds: number) {
	const s = Math.max(0, Math.floor(seconds));
	const hh = Math.floor(s / 3600);
	const mm = Math.floor((s % 3600) / 60);
	const ss = s % 60;
	return hh > 0 ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
}
function getPreferredStoryboardLevel(storyboardRenderer: Nullable<PlayerStoryboardSpecRenderer>) {
	const rec =
		storyboardRenderer?.highResolutionRecommendedLevel ?? storyboardRenderer?.recommendedLevel ?? storyboardRenderer?.fineScrubbingRecommendedLevel;
	return Number.isFinite(rec) ? (rec as number) : 3;
}
function getSeekWindow(video: HTMLVideoElement) {
	const { duration, seekable } = video;
	if (Number.isFinite(duration) && duration > 0) {
		return { end: duration, start: 0 };
	}
	try {
		if (seekable && seekable.length) {
			const start = seekable.start(0);
			const end = seekable.end(seekable.length - 1);
			if (Number.isFinite(start) && Number.isFinite(end) && end > start) return { end, start };
		}
	} catch {}
	return null;
}
function getStoryboardRenderer(): Nullable<PlayerStoryboardSpecRenderer> {
	const w = window as unknown as {
		ytInitialPlayerResponse?: any;
		ytplayer?: any;
	};
	return (
		(w.ytInitialPlayerResponse?.storyboards?.playerStoryboardSpecRenderer as PlayerStoryboardSpecRenderer | undefined) ??
		(w.ytplayer?.config?.args?.raw_player_response?.storyboards?.playerStoryboardSpecRenderer as PlayerStoryboardSpecRenderer | undefined) ??
		null
	);
}
function getStoryboardSpec(): Nullable<string> {
	const w = window as unknown as {
		ytInitialPlayerResponse?: any;
		ytplayer?: any;
	};
	return (
		w.ytInitialPlayerResponse?.storyboards?.playerStoryboardSpecRenderer?.spec ??
		w.ytplayer?.config?.args?.raw_player_response?.storyboards?.playerStoryboardSpecRenderer?.spec ??
		null
	);
}
function hideNativeProgress(player: HTMLElement) {
	const native = qs<HTMLElement>(player, ".ytp-progress-bar-container");
	if (!native) return () => {};
	const {
		style: { display: prev }
	} = native;
	native.style.display = "none";
	return () => {
		native.style.display = prev;
	};
}
function parseStoryboard(specString: string, storyboardRenderer: Nullable<PlayerStoryboardSpecRenderer>): Nullable<StoryboardSheet> {
	try {
		const parts = specString.split("|");
		const [baseUrl] = parts;
		const layer = parts.at(-1);
		if (!baseUrl || !layer) return null;
		const [w, h, count, c, r, _a, _b, signature] = layer.split("#");
		const width = parseInt(w, 10);
		const height = parseInt(h, 10);
		const frameCount = parseInt(count, 10);
		const cols = parseInt(c, 10);
		const rows = parseInt(r, 10);
		if (![width, height, frameCount, cols, rows].every(Number.isFinite)) return null;
		if (!signature) return null;
		return {
			baseUrl,
			cols,
			frameCount,
			height,
			rows,
			selectedLevel: getPreferredStoryboardLevel(storyboardRenderer),
			signature,
			width
		};
	} catch {
		return null;
	}
}
function qs<T extends Element>(root: ParentNode, sel: string) {
	return root.querySelector<T>(sel);
}
function seekFromClientX(clientX: number) {
	if (!miniPlayerBarState) return;
	const { barRoot, videoElement } = miniPlayerBarState;
	const bounds = barRoot.getBoundingClientRect();
	const barOffsetX = clamp(clientX - bounds.left, 0, bounds.width);
	const seekRatio = bounds.width > 0 ? barOffsetX / bounds.width : 0;
	const seekWindow = getSeekWindow(videoElement);
	if (!seekWindow) return;
	const { end, start } = seekWindow;
	videoElement.currentTime = start + (end - start) * seekRatio;
}
function syncMiniBarVisibility({ barRoot, controlsVisibilityTarget }: MiniPlayerBarState) {
	const autohide = controlsVisibilityTarget.classList.contains("ytp-autohide");
	const interacting =
		barRoot.classList.contains("yte-mini-player-progress--scrubbing") || barRoot.classList.contains("yte-mini-player-progress--force");
	barRoot.classList.toggle("yte-mini-player-progress--hidden", autohide && !interacting);
}
function updateMiniBar() {
	if (!miniPlayerBarState) return;
	const {
		progressBar: { bufferedBar, playedBar, scrubKnob },
		videoElement
	} = miniPlayerBarState;
	const seekWindow = getSeekWindow(videoElement);
	if (!seekWindow) return;
	const { end, start } = seekWindow;
	const timeRange = end - start;
	const playedRatio = clamp((videoElement.currentTime - start) / timeRange, 0, 1);
	miniPlayerBarState.playedRatio = playedRatio;
	playedBar.style.transform = `scaleX(${playedRatio})`;
	scrubKnob.style.left = `${playedRatio * 100}%`;
	let bufferedEnd = start;
	try {
		const { buffered } = videoElement;
		if (buffered && buffered.length) bufferedEnd = buffered.end(buffered.length - 1);
	} catch {}
	const loadedPct = clamp((bufferedEnd - start) / timeRange, 0, 1);
	bufferedBar.style.transform = `scaleX(${loadedPct})`;
}
function updateStoryboardThumb(
	{ progressBar: { previewThumbnail }, storyboardSheet }: MiniPlayerBarState,
	timeSeconds: number,
	seekWindow: { end: number; start: number }
) {
	if (!storyboardSheet) {
		previewThumbnail.style.backgroundImage = "";
		return;
	}
	const { end, start } = seekWindow;
	const timeRange = end - start;
	if (timeRange <= 0) return;
	const timeRatio = clamp((timeSeconds - start) / timeRange, 0, 1);
	const idx = Math.floor(timeRatio * Math.max(1, storyboardSheet.frameCount - 1));
	const perImage = storyboardSheet.cols * storyboardSheet.rows;
	const imageIndex = Math.floor(idx / perImage);
	const within = idx % perImage;
	const row = Math.floor(within / storyboardSheet.cols);
	const col = within % storyboardSheet.cols;
	const url = buildStoryboardUrl(storyboardSheet, imageIndex);
	const outW = 160;
	const outH = 90;
	const sx = outW / storyboardSheet.width;
	const sy = outH / storyboardSheet.height;
	const s = Math.min(sx, sy);
	const bgW = storyboardSheet.cols * storyboardSheet.width * s;
	const bgH = storyboardSheet.rows * storyboardSheet.height * s;
	const px = col * storyboardSheet.width * s;
	const py = row * storyboardSheet.height * s;
	previewThumbnail.style.width = `${outW}px`;
	previewThumbnail.style.height = `${outH}px`;
	previewThumbnail.style.backgroundImage = `url("${url}")`;
	previewThumbnail.style.backgroundSize = `${bgW}px ${bgH}px`;
	previewThumbnail.style.backgroundPosition = `-${px}px -${py}px`;
}
