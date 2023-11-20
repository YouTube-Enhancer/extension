import type { OnScreenDisplayColor, OnScreenDisplayPosition, OnScreenDisplayType, Selector, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog, clamp, createStyledElement, isShortsPage, round, toDivisible } from "@/src/utils/utilities";

/**
 * Adjust the volume based on the scroll direction.
 *
 * @param playerContainer - The player container element.
 * @param scrollDelta - The scroll direction.
 * @param adjustmentSteps - The volume adjustment steps.
 * @returns Promise that resolves with the new volume.
 */
export function adjustVolume(
	playerContainer: YouTubePlayerDiv,
	scrollDelta: number,
	volumeStep: number
): Promise<{ newVolume: number; oldVolume: number }> {
	return new Promise((resolve) => {
		(async () => {
			if (!playerContainer.getVolume) return;
			if (!playerContainer.setVolume) return;
			if (!playerContainer.isMuted) return;
			if (!playerContainer.unMute) return;
			const [volume, isMuted] = await Promise.all([playerContainer.getVolume(), playerContainer.isMuted()]);
			const newVolume = clamp(toDivisible(volume + scrollDelta * volumeStep, volumeStep), 0, 100);
			browserColorLog(`Adjusting volume by ${volumeStep} to ${newVolume}. Old volume was ${volume}`, "FgMagenta");
			await playerContainer.setVolume(newVolume);
			if (isMuted) {
				if (typeof playerContainer.unMute === "function") await playerContainer.unMute();
			}
			resolve({ newVolume, oldVolume: volume });
		})();
	});
}
/**
 * Set up event listeners for the specified element.
 *
 * @param selector - The CSS selector for the element.
 * @param listener - The event listener function.
 */
export function setupScrollListeners(selector: Selector, handleWheel: (event: Event) => void) {
	const elements: NodeListOf<HTMLDivElement> = document.querySelectorAll(selector);
	if (!elements.length) return browserColorLog(`No elements found with selector ${selector}`, "FgRed");
	for (const element of elements) {
		eventManager.addEventListener(element, "wheel", handleWheel, "scrollWheelVolumeControl", { passive: false });
	}
}
function calculateCanvasPosition(displayPosition: OnScreenDisplayPosition, displayPadding: number, paddingTop: number, paddingBottom: number) {
	let styles: Partial<CSSStyleDeclaration> = {};

	switch (displayPosition) {
		case "top_left":
			styles = { left: `${displayPadding}px`, top: `${displayPadding + paddingTop}px` };
			break;
		case "top_right":
			styles = { right: `${displayPadding}px`, top: `${displayPadding + paddingTop}px` };
			break;
		case "bottom_left":
			styles = { bottom: `${displayPadding + paddingBottom}px`, left: `${displayPadding}px` };
			break;
		case "bottom_right":
			styles = { bottom: `${displayPadding + paddingBottom}px`, right: `${displayPadding}px` };
			break;
		case "center":
			styles = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
			break;
		default:
			console.error("Invalid display position");
			break;
	}

	return styles;
}
/**
 * Draw the volume display over the player.
 *
 * @param options - The options for the volume display.
 */
export function drawVolumeDisplay({
	displayColor,
	displayHideTime,
	displayOpacity,
	displayPadding,
	displayPosition,
	displayType,
	playerContainer,
	volume
}: {
	displayColor: OnScreenDisplayColor;
	displayHideTime: number;
	displayOpacity: number;
	displayPadding: number;
	displayPosition: OnScreenDisplayPosition;
	displayType: OnScreenDisplayType;
	playerContainer: YouTubePlayerDiv | null;
	volume: number;
}) {
	volume = clamp(volume, 0, 100);
	// Set canvas dimensions based on player/container dimensions
	if (!playerContainer) {
		browserColorLog("Player container not found", "FgRed");
		return;
	}
	if (displayType === "no_display") return;
	let { clientHeight: height, clientWidth: width } = playerContainer;
	const originalWidth = width;
	const originalHeight = height;
	// Adjust canvas dimensions for different display positions
	switch (displayPosition) {
		case "top_left":
		case "top_right":
		case "bottom_left":
		case "bottom_right":
			width /= 4;
			height /= 4;
			break;
		case "center":
			width /= 2;
			height /= 2;
			break;
		default:
			console.error("Invalid display position");
			return;
	}
	if (displayPadding > Math.max(width, height)) {
		// Clamp displayPadding to max width and height
		displayPadding = clamp(displayPadding, 0, Math.max(width, height));
		browserColorLog(`Clamped display padding to ${displayPadding}`, "FgRed");
	}

	const bottomElement: HTMLDivElement | null =
		document.querySelector(
			"ytd-reel-video-renderer[is-active] > div.overlay.ytd-reel-video-renderer > ytd-reel-player-overlay-renderer > div > ytd-reel-player-header-renderer"
		) ?? document.querySelector(".ytp-chrome-bottom");
	const { top: topRectTop = 0 } = document.querySelector(".player-controls > ytd-shorts-player-controls")?.getBoundingClientRect() || {};
	const { bottom: bottomRectBottom = 0, top: bottomRectTop = 0 } = bottomElement?.getBoundingClientRect() || {};
	const heightExcludingMarginPadding = bottomElement
		? bottomElement.offsetHeight -
		  (parseInt(getComputedStyle(bottomElement).marginTop, 10) +
				parseInt(getComputedStyle(bottomElement).marginBottom, 10) +
				parseInt(getComputedStyle(bottomElement).paddingTop, 10) +
				parseInt(getComputedStyle(bottomElement).paddingBottom, 10)) +
		  10
		: 0;
	const paddingTop = isShortsPage() ? topRectTop / 2 : 0;
	const paddingBottom = isShortsPage() ? heightExcludingMarginPadding : Math.round(bottomRectBottom - bottomRectTop);

	const canvas = createStyledElement("volume-display", "canvas", {
		pointerEvents: "none",
		position: "absolute",
		zIndex: "2021",
		...calculateCanvasPosition(displayPosition, displayPadding, paddingTop, paddingBottom)
	});
	const context = canvas.getContext("2d");

	if (!context) {
		browserColorLog("Canvas not supported", "FgRed");
		return;
	}

	switch (displayType) {
		case "text": {
			const fontSize = clamp(Math.min(originalWidth, originalHeight) / 10, 48, 72);
			canvas.width = fontSize + 4;
			canvas.height = fontSize + 4;
			// Clear canvas
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillStyle = displayColor;
			context.globalAlpha = displayOpacity / 100;
			context.font = `${fontSize}px bold Arial`;
			context.fillText(`${round(volume)}`, canvas.width / 2, canvas.height / 2);
			break;
		}
		case "line": {
			const maxLineWidth = 100; // Maximum width of the volume line
			const lineHeight = 5; // Height of the volume line
			const lineWidth = Math.round(round(volume / 100, 2) * maxLineWidth);
			canvas.width = lineWidth;
			canvas.height = lineHeight;
			// Clear canvas
			context.clearRect(0, 0, canvas.width, canvas.height);
			const lineX = (canvas.width - lineWidth) / 2;
			const lineY = (canvas.height - lineHeight) / 2;
			context.fillStyle = displayColor;
			context.globalAlpha = displayOpacity / 100;

			context.fillRect(lineX, lineY, lineWidth, lineHeight);
			break;
		}
		case "round": {
			const lineWidth = 5;
			const radius = Math.min(width, height, 75) / 2 - lineWidth; // Maximum radius based on canvas dimensions
			const circleWidth = radius * 2 + lineWidth * 2;
			canvas.width = circleWidth;
			canvas.height = circleWidth;
			// Clear canvas
			context.clearRect(0, 0, canvas.width, canvas.height);
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;
			const startAngle = Math.PI + Math.PI * round(volume / 100, 2); // Start angle based on volume
			const endAngle = Math.PI - Math.PI * round(volume / 100, 2); // End angle based on volume
			// Draw the volume arc as a circle at 100% volume
			context.strokeStyle = displayColor; // Line color
			context.lineWidth = lineWidth; // Line width
			context.lineCap = "butt"; // Line cap style
			context.beginPath();
			context.arc(centerX, centerY, radius, startAngle, endAngle, true);
			context.stroke();
			break;
		}
		default:
			console.error("Invalid display type");
			return;
	}

	// Append canvas to player container if it doesn't already exist
	const existingCanvas = playerContainer.parentElement?.parentElement?.querySelector(`canvas#volume-display`);
	if (!existingCanvas) {
		playerContainer.parentElement?.parentElement?.appendChild(canvas);
	} else {
		// Update the existing canvas
		existingCanvas.replaceWith(canvas);
	}
	setTimeout(() => {
		canvas.remove();
	}, displayHideTime);
}
