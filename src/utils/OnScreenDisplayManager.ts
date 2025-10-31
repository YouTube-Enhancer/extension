import type { Nullable, OnScreenDisplayColor, OnScreenDisplayPosition, OnScreenDisplayType, YouTubePlayerDiv } from "../types";

import { browserColorLog, calculateCanvasPosition, clamp, createStyledElement, isShortsPage, round } from "./utilities";

export type DisplayOptions = {
	displayColor: OnScreenDisplayColor;
	displayHideTime: number;
	displayOpacity: number;
	displayPadding: number;
	displayPosition: OnScreenDisplayPosition;
	displayType: OnScreenDisplayType;
	playerContainer: Nullable<YouTubePlayerDiv>;
};

export const valueType = {
	Speed: "speed",
	Volume: "volume"
} as const;
type Value<V extends ValueType> = {
	max: number;
	type: V;
	value: number;
};

type ValueType = (typeof valueType)[keyof typeof valueType];

export const ensurePlayerContainerExists = (playerContainer: Nullable<YouTubePlayerDiv>): playerContainer is YouTubePlayerDiv => {
	if (!playerContainer) {
		throw new Error("Player container not found");
	}
	return true;
};

export default class OnScreenDisplayManager<V extends ValueType> {
	// Canvas element for the display.
	protected canvas: HTMLCanvasElement;

	// Context for the canvas element.
	protected context: Nullable<CanvasRenderingContext2D> = null;

	// Default font size for the display.
	private readonly defaultFontSize = 48;

	// Current font size for the display.
	private fontSize: number = this.defaultFontSize;

	// Current value for the display.
	private value?: Value<V>;
	constructor(
		// Options for the display.
		protected options: DisplayOptions,
		// ID for the display.
		private displayId: string,
		// Value for the display.
		value: Value<V>
	) {
		// Initialize instance variables.
		this.options = options;
		this.value = value;

		// Create the canvas element.
		this.canvas = this.createCanvas();

		// Setup the canvas element.
		this.setupCanvas();

		// Get the context for the canvas element.
		this.context = this.getContext();

		// Draw on the canvas element.
		this.drawCanvas();

		// Append the canvas element to the parent element.
		this.appendCanvas();
	}

	private appendCanvas() {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return;

		// Check if an existing canvas is present.
		const existingCanvas = this.getExistingCanvas();

		// If no existing canvas, append the canvas to the parent.
		if (!existingCanvas) {
			this.appendToParent();
		} else {
			// If existing canvas, update it.
			this.updateExistingCanvas(existingCanvas);
		}

		// Schedule removal of the canvas after a certain time.
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
			case "circle": {
				// Draw a circle shape on the canvas.
				const lineWidth = 5;
				const radius = 75 / 2 - lineWidth;
				const circleWidth = radius * 2 + lineWidth * 2;
				this.canvas.width = circleWidth + 20;
				this.canvas.height = circleWidth + 20;
				this.clearCanvas();
				const centerX = this.canvas.width / 2;
				const centerY = this.canvas.height / 2;
				const startAngle = Math.PI + Math.PI * round(value / max, 2);
				const endAngle = Math.PI - Math.PI * round(value / max, 2);
				// Add a shadow effect around the circle.
				this.context.shadowColor = "black";
				this.context.shadowBlur = 10;
				this.context.shadowOffsetX = 0;
				this.context.shadowOffsetY = 0;
				this.context.strokeStyle = displayColor;
				this.context.lineWidth = lineWidth;
				this.context.lineCap = "butt";
				this.context.beginPath();
				this.context.arc(centerX, centerY, radius, startAngle, endAngle, true);
				this.context.stroke();
				break;
			}
			case "line": {
				// Draw a line on the canvas.
				const lineWidth = Math.round(round(value / max, 2) * max);
				const lineHeight = 5;
				this.canvas.width = lineWidth + 25;
				this.canvas.height = lineHeight + 25;
				this.context.globalAlpha = displayOpacity / 100;
				this.context.fillStyle = displayColor;
				const lineX = (this.canvas.width - lineWidth) / 2;
				const lineY = (this.canvas.height - lineHeight) / 2;
				this.clearCanvas();
				// Add a shadow effect around the line.
				this.context.shadowColor = "black";
				this.context.shadowBlur = 10;
				this.context.shadowOffsetX = 0;
				this.context.shadowOffsetY = 0;
				this.context.fillRect(lineX, lineY, lineWidth, lineHeight);
				break;
			}
			case "no_display":
				// Do nothing for no_display type.
				break;
			case "text": {
				// Draw text on the canvas.
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
				this.canvas.width = width + 15;
				this.canvas.height = fontSize + 15;
				this.clearCanvas();
				// Add a shadow effect around the text.
				this.context.shadowColor = "black";
				this.context.shadowBlur = 10;
				this.context.shadowOffsetX = 0;
				this.context.shadowOffsetY = 0;
				this.context.globalAlpha = displayOpacity / 100;
				this.context.fillStyle = displayColor;
				this.setFont();
				this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
				break;
			}
			default:
				this.handleError("Invalid display type");
		}
	}

	private getContext(): Nullable<CanvasRenderingContext2D> {
		const context = this.canvas.getContext("2d");
		if (!context) {
			this.handleError("Canvas context not found");
		}
		return context;
	}

	private getExistingCanvas(): Nullable<HTMLCanvasElement> {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return null;
		return this.options.playerContainer.parentElement?.parentElement?.querySelector(`canvas#${this.displayId}`) ?? null;
	}

	private handleError(message: string) {
		this.handleError(message);
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

	// method to set up the canvas based on options.
	private setupCanvas(): void {
		if (!ensurePlayerContainerExists(this.options.playerContainer)) return;
		const {
			options: {
				playerContainer: { clientHeight: height, clientWidth: width }
			}
		} = this;
		// Adjust displayPadding if it exceeds max width or height.
		if (this.options.displayPadding > Math.max(width, height)) {
			this.options.displayPadding = clamp(this.options.displayPadding, 0, Math.max(width, height));
			browserColorLog(`Clamped display padding to ${this.options.displayPadding}`, "FgRed");
		}
		// Calculate font size based on canvas dimensions.
		this.fontSize = clamp(Math.min(width, height) / 10, 48, 72);
		// Find elements for positioning the canvas.
		const bottomElement: Nullable<HTMLDivElement> =
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
		// Position the canvas based on options.
		Object.assign(this.canvas.style, {
			...calculateCanvasPosition(this.options.displayPosition, this.options.displayPadding, paddingTop, paddingBottom)
		});
	}

	// method to update an existing canvas.
	private updateExistingCanvas(existingCanvas: HTMLCanvasElement) {
		existingCanvas.replaceWith(this.canvas);
	}
}
