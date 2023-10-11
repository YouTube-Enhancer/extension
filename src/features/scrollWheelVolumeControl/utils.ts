import { OnScreenDisplayColor, OnScreenDisplayPosition, OnScreenDisplayType, Selector, YouTubePlayerDiv } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { isWatchPage, isShortsPage, clamp, toDivisible, browserColorLog, round } from "@/src/utils/utilities";

/**
 * Get the scroll direction based on the deltaY value.
 *
 * @param deltaY - The deltaY value from the scroll event.
 * @returns The scroll direction: 1 for scrolling up, -1 for scrolling down.
 */
export function getScrollDirection(deltaY: number): number {
	return deltaY < 0 ? 1 : -1;
}
/**
 * Adjust the volume based on the scroll direction.
 *
 * @param scrollDelta - The scroll direction.
 * @param adjustmentSteps - The volume adjustment steps.
 * @returns Promise that resolves with the new volume.
 */
export function adjustVolume(scrollDelta: number, volumeStep: number): Promise<{ newVolume: number; oldVolume: number }> {
	return new Promise((resolve) => {
		(async () => {
			const playerContainer = isWatchPage()
				? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
				: isShortsPage()
				? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
				: null;
			if (!playerContainer) return;
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
		const mouseWheelListener = (e: Event) => {
			if (element.clientHeight === 0) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			handleWheel(e);
		};
		eventManager.addEventListener(element, "wheel", mouseWheelListener, "scrollWheelVolumeControl");
	}
}
/**
 * Draw the volume display over the player.
 *
 * @param options - The options for the volume display.
 */
export function drawVolumeDisplay({
	displayType,
	displayPosition,
	displayColor,
	displayOpacity,
	displayPadding,
	displayHideTime,
	playerContainer,
	volume
}: {
	volume: number;
	displayType: OnScreenDisplayType;
	displayPosition: OnScreenDisplayPosition;
	displayColor: OnScreenDisplayColor;
	displayOpacity: number;
	displayPadding: number;
	displayHideTime: number;
	playerContainer: YouTubePlayerDiv | null;
}) {
	volume = clamp(volume, 0, 100);
	const canvas = document.createElement("canvas");
	canvas.id = "volume-display";
	const context = canvas.getContext("2d");

	if (!context) {
		browserColorLog("Canvas not supported", "FgRed");
		return;
	}

	// Set canvas dimensions based on player/container dimensions
	if (!playerContainer) {
		browserColorLog("Player container not found", "FgRed");
		return;
	}
	if (displayType === "no_display") return;
	let { clientWidth: width, clientHeight: height } = playerContainer;
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

	// Set canvas styles for positioning
	canvas.style.position = "absolute";

	switch (displayPosition) {
		case "top_left":
			canvas.style.top = `${displayPadding}px`;
			canvas.style.left = `${displayPadding}px`;
			break;
		case "top_right":
			canvas.style.top = `${displayPadding}px`;
			canvas.style.right = `${displayPadding}px`;
			break;
		case "bottom_left":
			canvas.style.bottom = `${displayPadding}px`;
			canvas.style.left = `${displayPadding}px`;
			break;
		case "bottom_right":
			canvas.style.bottom = `${displayPadding}px`;
			canvas.style.right = `${displayPadding}px`;
			break;
		case "center":
			canvas.style.top = "50%";
			canvas.style.left = "50%";
			canvas.style.transform = "translate(-50%, -50%)";
			break;
		default:
			console.error("Invalid display position");
			return;
	}
	switch (displayType) {
		case "text": {
			const fontSize = Math.min(originalWidth, originalHeight) / 10;
			context.font = `${clamp(fontSize, 48, 72)}px bold Arial`;
			const { width: textWidth } = context.measureText(`${round(volume)}`);
			width = textWidth + 4;
			height = clamp(fontSize, 48, 72) + 4;
			break;
		}
		case "line": {
			const maxLineWidth = 100; // Maximum width of the volume line
			const lineHeight = 5; // Height of the volume line
			const lineWidth = Math.round(round(volume / 100, 2) * maxLineWidth);
			width = lineWidth;
			height = lineHeight;
			break;
		}
		case "round": {
			const lineWidth = 5;
			const radius = Math.min(width, height, 75) / 2 - lineWidth; // Maximum radius based on canvas dimensions
			const circleWidth = radius * 2 + lineWidth * 2;
			width = circleWidth;
			height = circleWidth;
			break;
		}
		default:
			console.error("Invalid display type");
			return;
	}

	// Apply content dimensions to the canvas
	canvas.width = width;
	canvas.height = height;
	canvas.style.zIndex = "2021";
	canvas.style.pointerEvents = "none";

	// Clear canvas
	context.clearRect(0, 0, width, height);
	context.fillStyle = displayColor;
	context.globalAlpha = displayOpacity / 100;
	// Draw volume representation based on display type
	switch (displayType) {
		case "text": {
			const fontSize = Math.min(originalWidth, originalHeight) / 10;
			context.font = `${clamp(fontSize, 48, 72)}px bold Arial`;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText(`${round(volume)}`, width / 2, height / 2);
			break;
		}
		case "line": {
			const maxLineWidth = 100; // Maximum width of the volume line
			const lineHeight = 5; // Height of the volume line
			const lineWidth = Math.round(round(volume / 100, 2) * maxLineWidth);
			const lineX = (width - lineWidth) / 2;
			const lineY = (height - lineHeight) / 2;

			context.fillRect(lineX, lineY, lineWidth, lineHeight);
			break;
		}
		case "round": {
			const lineWidth = 5;
			const centerX = width / 2;
			const centerY = height / 2;
			const radius = Math.min(width, height, 75) / 2 - lineWidth; // Maximum radius based on canvas dimensions
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
			break;
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
	const topElement = document.querySelector(".player-controls > ytd-shorts-player-controls");
	const bottomElement: HTMLDivElement | null =
		document.querySelector(
			"ytd-reel-video-renderer[is-active] > div.overlay.ytd-reel-video-renderer > ytd-reel-player-overlay-renderer > div > ytd-reel-player-header-renderer"
		) ?? document.querySelector(".ytp-chrome-bottom");
	const topRect = topElement?.getBoundingClientRect();
	const bottomRect = bottomElement?.getBoundingClientRect();
	const heightExcludingMarginPadding = bottomElement
		? bottomElement.offsetHeight -
		  (parseInt(getComputedStyle(bottomElement).marginTop, 10) +
				parseInt(getComputedStyle(bottomElement).marginBottom, 10) +
				parseInt(getComputedStyle(bottomElement).paddingTop, 10) +
				parseInt(getComputedStyle(bottomElement).paddingBottom, 10)) +
		  10
		: 0;
	const paddingTop = topRect ? (isShortsPage() ? topRect.top / 2 : 0) : 0;
	const paddingBottom = bottomRect ? (isShortsPage() ? heightExcludingMarginPadding : Math.round(bottomRect.bottom - bottomRect.top)) : 0;
	switch (displayPosition) {
		case "top_left":
		case "top_right":
			canvas.style.top = `${displayPadding + paddingTop}px`;
			break;
		case "bottom_left":
		case "bottom_right":
			canvas.style.bottom = `${displayPadding + paddingBottom}px`;
			break;
		default:
			return;
	}
}
