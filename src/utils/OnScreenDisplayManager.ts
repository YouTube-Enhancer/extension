import type { OnScreenDisplayColor, OnScreenDisplayPosition, OnScreenDisplayType, YouTubePlayerDiv } from "../types";

import { browserColorLog, calculateCanvasPosition, clamp, createStyledElement, isShortsPage, round } from "./utilities";

export type DisplayOptions = {
	displayColor: OnScreenDisplayColor;
	displayHideTime: number;
	displayOpacity: number;
	displayPadding: number;
	displayPosition: OnScreenDisplayPosition;
	displayType: OnScreenDisplayType;
	playerContainer: YouTubePlayerDiv | null;
};
export const valueType = {
	Speed: "speed",
	Volume: "volume"
} as const;
type ValueType = (typeof valueType)[keyof typeof valueType];

type Value<V extends ValueType> = {
	max: number;
	type: V;
	value: number;
};
export const ensurePlayerContainerExists = (playerContainer: YouTubePlayerDiv | null): playerContainer is YouTubePlayerDiv => {
	if (!playerContainer) {
		throw new Error("Player container not found");
	}
	return true;
};
export default class OnScreenDisplayManager<V extends ValueType> {
	private readonly defaultFontSize = 48;

	private fontSize: number = this.defaultFontSize;
	private value?: Value<V>;
	protected canvas: HTMLCanvasElement;
	protected context: CanvasRenderingContext2D | null = null;
	constructor(
		protected options: DisplayOptions,
		private displayId: string,
		value: Value<V>
	) {
		this.options = options;
		this.value = value;
		this.canvas = this.createCanvas();
		this.setupCanvas();
		this.context = this.getContext();
		this.drawCanvas();
		this.appendCanvas();
	}
	private appendCanvas() {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return;
		const existingCanvas = this.getExistingCanvas();
		if (!existingCanvas) {
			this.appendToParent();
		} else {
			this.updateExistingCanvas(existingCanvas);
		}

		this.scheduleRemoval();
	}

	private appendToParent() {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return;
		this.options.playerContainer.parentElement?.parentElement?.appendChild(this.canvas);
	}

	private clearCanvas(): void {
		if (!this.context) return;
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private createCanvas(): HTMLCanvasElement {
		const canvas = createStyledElement({
			elementId: this.displayId,
			elementType: "canvas",
			styles: {
				pointerEvents: "none",
				position: "absolute",
				zIndex: "2021"
			}
		});
		return canvas;
	}

	private drawCanvas(): void {
		if (!this.context) return;
		if (!this.value) return;
		const {
			fontSize,
			options: { displayColor, displayOpacity, displayType },
			value: { max, type, value }
		} = this;
		switch (displayType) {
			case "text": {
				let text: string = "";
				switch (type) {
					case "speed": {
						text = `${value.toFixed(2)}x`;
						break;
					}
					case "volume": {
						text = `${value}%`;
						break;
					}
				}
				this.setFont();
				const { width } = this.context.measureText(text);
				this.canvas.width = width;
				this.canvas.height = fontSize;
				this.clearCanvas();
				this.context.globalAlpha = displayOpacity / 100;
				this.context.fillStyle = displayColor;
				this.setFont();
				this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
				break;
			}
			case "line": {
				const lineWidth = Math.round(round(value / max, 2) * max);
				const lineHeight = 5;
				this.canvas.width = lineWidth;
				this.canvas.height = lineHeight;
				this.clearCanvas();
				this.context.globalAlpha = displayOpacity / 100;
				this.context.fillStyle = displayColor;
				const lineX = (this.canvas.width - lineWidth) / 2;
				const lineY = (this.canvas.height - lineHeight) / 2;
				this.context.fillRect(lineX, lineY, lineWidth, lineHeight);
				break;
			}
			case "round": {
				const lineWidth = 5;
				const radius = 75 / 2 - lineWidth;
				const circleWidth = radius * 2 + lineWidth * 2;
				this.canvas.width = circleWidth;
				this.canvas.height = circleWidth;
				this.clearCanvas();
				const centerX = this.canvas.width / 2;
				const centerY = this.canvas.height / 2;
				const startAngle = Math.PI + Math.PI * round(value / max, 2);
				const endAngle = Math.PI - Math.PI * round(value / max, 2);
				this.context.strokeStyle = displayColor;
				this.context.lineWidth = lineWidth;
				this.context.lineCap = "butt";
				this.context.beginPath();
				this.context.arc(centerX, centerY, radius, startAngle, endAngle, true);
				this.context.stroke();
				break;
			}
			case "no_display":
				break;
			default:
				throw new Error("Invalid display type");
		}
	}

	private getContext(): CanvasRenderingContext2D | null {
		const context = this.canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas context not found");
		}
		return context;
	}
	private getExistingCanvas(): HTMLCanvasElement | null {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return null;
		return this.options.playerContainer.parentElement?.parentElement?.querySelector(`canvas#${this.displayId}`) ?? null;
	}
	private handleError(message: string) {
		throw new Error(message);
	}
	private scheduleRemoval() {
		setTimeout(() => {
			this.canvas.remove();
		}, this.options.displayHideTime);
	}

	private setFont() {
		if (!this.context) return;
		this.context.font = `${this.fontSize}px Arial`;
		this.context.textAlign = "center";
		this.context.textBaseline = "middle";
	}

	private setupCanvas(): void {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return;

		const {
			options: {
				playerContainer: { clientHeight: height, clientWidth: width }
			}
		} = this;
		if (this.options.displayPadding > Math.max(width, height)) {
			// Clamp displayPadding to max width and height
			this.options.displayPadding = clamp(this.options.displayPadding, 0, Math.max(width, height));
			browserColorLog(`Clamped display padding to ${this.options.displayPadding}`, "FgRed");
		}
		this.fontSize = clamp(Math.min(width, height) / 10, 48, 72);
		const bottomElement: HTMLDivElement | null =
			document.querySelector(
				"ytd-reel-video-renderer[is-active] > div.overlay.ytd-reel-video-renderer > ytd-reel-player-overlay-renderer > div > ytd-reel-player-header-renderer"
			) ?? document.querySelector(".ytp-chrome-bottom");
		const { top: topRectTop = 0 } = document.querySelector(".player-controls > ytd-shorts-player-controls")?.getBoundingClientRect() || {};
		const { bottom: bottomRectBottom = 0, top: bottomRectTop = 0 } = bottomElement?.getBoundingClientRect() || {};
		const heightExcludingMarginPadding =
			bottomElement ?
				bottomElement.offsetHeight -
				(parseInt(getComputedStyle(bottomElement).marginTop, 10) +
					parseInt(getComputedStyle(bottomElement).marginBottom, 10) +
					parseInt(getComputedStyle(bottomElement).paddingTop, 10) +
					parseInt(getComputedStyle(bottomElement).paddingBottom, 10)) +
				10
			:	0;
		const paddingTop = isShortsPage() ? topRectTop / 2 : 0;
		const paddingBottom = isShortsPage() ? heightExcludingMarginPadding : Math.round(bottomRectBottom - bottomRectTop);
		Object.assign(this.canvas.style, {
			...calculateCanvasPosition(this.options.displayPosition, this.options.displayPadding, paddingTop, paddingBottom)
		});
	}
	private updateExistingCanvas(existingCanvas: HTMLCanvasElement) {
		existingCanvas.replaceWith(this.canvas);
	}
}
