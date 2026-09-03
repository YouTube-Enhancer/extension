import type { MiniSeekBar } from "@/src/features/miniPlayer/seekBar";
import type { MiniPlayerOptions, MiniPlayerSize } from "@/src/features/miniPlayer/types";
import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { cleanupRegistry } from "@/src/features/_registry/cleanupRegistry";
import { registry } from "@/src/features/_registry/featureRegistry";
import { attachMiniSeekBar } from "@/src/features/miniPlayer/seekBar";
import { createStyledElement } from "@/src/utils/dom/elements";
import { clamp } from "@/src/utils/math";

import "./index.css";
const stateAPI = registry.stateManager.getStateAPI("miniPlayer");
export type MiniPlayerCallbacks = {
	/** Notified whenever the overlay activates or deactivates, including from paths the button never goes through, like close(). */
	onStateChange?: (active: boolean) => void;
};
export type MiniPlayerRect = {
	height: number;
	width: number;
	x: number;
	y: number;
};
export class MiniPlayerController {
	private detachedPlayer: Nullable<HTMLElement> = null;
	private dragHandleElement: Nullable<HTMLDivElement> = null;
	private isActiveState = false;
	private readonly onStateChange: MiniPlayerCallbacks["onStateChange"];
	private options: MiniPlayerOptions;
	private originalPlayerParent: Nullable<HTMLElement> = null;
	private overlayElement: Nullable<HTMLDivElement> = null;
	private playerPlaceholder: Nullable<HTMLDivElement> = null;
	private resizeHandleElement: Nullable<HTMLDivElement> = null;
	private seekBar: Nullable<MiniSeekBar> = null;
	constructor(options: MiniPlayerOptions, { onStateChange }: MiniPlayerCallbacks = {}) {
		this.options = options;
		this.onStateChange = onStateChange;
		eventManager.addEventListener(window, "resize", this.handleViewportResize, "miniPlayer");
	}
	close() {
		setManualOverride(false);
		this.disable();
	}
	destroy() {
		eventManager.removeEventListeners("miniPlayer");
		cleanupRegistry.run("miniPlayer");
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
	setOverlayHidden(hidden: boolean) {
		if (!this.isActiveState || !this.overlayElement) return;
		this.overlayElement.style.display = hidden ? "none" : "block";
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
		const { height, width } = parseSizePreset(this.options.defaultSize);
		const margin = 16;
		const { innerHeight: vh, innerWidth: vw } = window;
		const xLeft = margin;
		const xCenter = Math.round((vw - width) / 2);
		const xRight = vw - width - margin;
		const yTop = margin;
		const yBottom = vh - height - margin;
		let x = xRight;
		let y = yBottom;
		switch (this.options.defaultPosition) {
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
				const evt = e;
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
				const evt = e;
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
				const evt = e;
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
				const evt = e;
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
		if (!this.isActiveState && !this.detachedPlayer) return;
		this.restorePlayer();
		if (this.overlayElement) this.overlayElement.style.display = "none";
		this.isActiveState = false;
		document.documentElement.classList.remove("yte-mini-player-active");
		// close() and destroy() get here without going through setMiniPlayerManual, so the state change is announced here.
		this.onStateChange?.(this.isActiveState);
	}
	private enable() {
		if (this.isActiveState) return;
		this.ensureOverlay();
		if (!this.overlayElement) return;
		try {
			const ok = this.movePlayerIntoOverlay();
			if (!ok) return;
			this.applyInitialRect();
			this.overlayElement.style.display = "block";
			this.isActiveState = true;
			document.documentElement.classList.add("yte-mini-player-active");
			this.onStateChange?.(this.isActiveState);
		} catch (error) {
			console.error("[miniPlayer] Failed to enable mini player, restoring player:", error);
			this.restorePlayer();
			if (this.overlayElement) this.overlayElement.style.display = "none";
			this.isActiveState = false;
			document.documentElement.classList.remove("yte-mini-player-active");
			this.onStateChange?.(this.isActiveState);
		}
	}
	private ensureOverlay() {
		if (this.overlayElement) return;
		document.querySelectorAll<HTMLDivElement>("#yte-mini-player-overlay").forEach((stale) => stale.remove());
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
		if (this.detachedPlayer === player) return true;
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
		this.seekBar?.destroy();
		this.seekBar = attachMiniSeekBar({ host: this.overlayElement, playerElement: player });
		return true;
	}
	private restorePlayer() {
		const { detachedPlayer } = this;
		if (detachedPlayer) {
			try {
				const { originalPlayerParent, playerPlaceholder } = this;
				if (originalPlayerParent && playerPlaceholder && originalPlayerParent.contains(playerPlaceholder)) {
					originalPlayerParent.insertBefore(detachedPlayer, playerPlaceholder);
				} else {
					const fallbackContainer =
						document.querySelector<HTMLElement>("ytd-player #container") ??
						document.querySelector<HTMLElement>("#full-bleed-container #container") ??
						document.querySelector<HTMLElement>("#player-container #container");
					if (fallbackContainer && fallbackContainer !== detachedPlayer.parentElement) {
						fallbackContainer.appendChild(detachedPlayer);
					}
				}
				if (!detachedPlayer.isConnected) console.error("[miniPlayer] Player could not be reattached to the page after restore");
				detachedPlayer.style.width = "";
				detachedPlayer.style.height = "";
				detachedPlayer.style.position = "";
			} catch (error) {
				console.error("[miniPlayer] Failed to restore player into page:", error);
			}
		}
		this.playerPlaceholder?.remove();
		this.seekBar?.destroy();
		this.seekBar = null;
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
export function readManualOverride(): boolean {
	try {
		return stateAPI.getState().manualOverride;
	} catch {
		return false;
	}
}
export function setManualOverride(enabled: boolean) {
	try {
		stateAPI.setState((prev) => ({ ...prev, manualOverride: enabled }));
	} catch (error) {
		console.error("[miniPlayer] Failed to update manual override:", error);
	}
}
function parseSizePreset(preset: MiniPlayerSize): { height: number; width: number } {
	const [w, h] = (preset ?? "400x225").split("x").map((n) => parseInt(n, 10));
	return { height: h, width: w };
}
function readSavedState(): Nullable<MiniPlayerRect> {
	try {
		const { rect: savedRect } = stateAPI.getState();
		if (!savedRect) return null;
		if (!Number.isFinite(savedRect.x) || !Number.isFinite(savedRect.y) || !Number.isFinite(savedRect.width) || !Number.isFinite(savedRect.height))
			return null;
		return savedRect;
	} catch {
		return null;
	}
}
function writeSavedState(s: MiniPlayerRect) {
	try {
		stateAPI.setState((prev) => ({ ...prev, rect: s }));
	} catch (error) {
		console.error("[miniPlayer] Failed to persist mini player rect:", error);
	}
}
