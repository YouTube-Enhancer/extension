import {
	MessageData,
	MessageTypes,
	OnScreenDisplayColor,
	OnScreenDisplayPosition,
	OnScreenDisplayType,
	YoutubePlayerQualityLabel,
	YoutubePlayerQualityLevel
} from "@/src/types";

import { browserColorLog, chooseClosetQuality, clamp, round, toDivisible } from "../../utils/utilities";

import type { YouTubePlayer } from "node_modules/@types/youtube-player/dist/types";
import { YoutubePlayerQualityLabels, YoutubePlayerQualityLevels } from "../../utils/constants";
const eventListeners = new Map<string, { element: Element; listener: EventListener }[]>();
type Selector = string;
type YouTubePlayerDiv = YouTubePlayer & HTMLDivElement;
const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-youtube";
document.documentElement.appendChild(element);
function waitForSpecificMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">): Promise<MessageData<T>> {
	return new Promise((resolve) => {
		function handleMessage() {
			const provider = document.querySelector("#yte-message-from-extension");
			if (!provider) return;
			const { textContent: stringifiedMessage } = provider;
			if (!stringifiedMessage) return;
			let message;
			try {
				message = JSON.parse(stringifiedMessage) as MessageData<T>;
			} catch (error) {
				console.error(error);
				return;
			}
			if (!message) return;
			if (message.type && message.type === eventType) {
				document.removeEventListener("yte-message-from-extension", handleMessage);
				resolve(message as MessageData<T>);
			}
		}
		document.addEventListener("yte-message-from-extension", handleMessage);
		sendMessage(eventType, data);
	});
}
function sendMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">) {
	const message: Omit<MessageData<typeof eventType>, "type"> = {
		type: eventType,
		source: "extension",
		...data
	};
	const stringifiedMessage = JSON.stringify(message);
	element.textContent = stringifiedMessage;
	document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
}

window.onload = function () {
	// Invoke the main function
	adjustVolumeOnScrollWheel();
	setRememberedVolume();
	setPlayerQuality();
};
window.onbeforeunload = function () {
	cleanUpListeners([...Object.values(eventListeners)]);
	element.remove();
};
/**
 * Wait for all elements to appear in the document.
 *
 * @param selectors - Array of CSS selectors for the elements to wait for.
 * @returns Promise that resolves with an array of the matching elements.
 */
function waitForAllElements(selectors: Selector[]): Promise<Selector[]> {
	return new Promise((resolve) => {
		setTimeout(() => {
			browserColorLog("Waiting for target nodes", "FgMagenta");
			const elementsMap = new Map<string, Element | null>();
			const { length: selectorsCount } = selectors;
			let resolvedCount = 0;

			const observer = new MutationObserver(() => {
				selectors.forEach((selector) => {
					const element = document.querySelector(selector);
					elementsMap.set(selector, element);
					if (!element) {
						return;
					}

					resolvedCount++;
					if (resolvedCount === selectorsCount) {
						observer.disconnect();
						const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
						resolve(resolvedElements);
					}
				});
			});

			observer.observe(document, { childList: true, subtree: true });

			selectors.forEach((selector) => {
				const element = document.querySelector(selector);
				elementsMap.set(selector, element);
				if (!element) {
					return;
				}

				resolvedCount++;
				if (resolvedCount === selectorsCount) {
					observer.disconnect();
					const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
					resolve(resolvedElements);
				}
			});
		}, 2_500);
	});
}
/**
 * Main function to control volume adjustment using scroll wheel.
 */
async function adjustVolumeOnScrollWheel(): Promise<void> {
	const containerSelectors = await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);

	browserColorLog("Target nodes found", "FgMagenta");
	console.log(`[YouTube Enhancer]`, ...containerSelectors);

	const handleWheel = async (event: Event) => {
		const wheelEvent = event as WheelEvent | undefined;
		if (!wheelEvent) return;
		const { target: playerContainer } = event;

		// Adjust the volume based on the scroll direction
		const scrollDelta = getScrollDirection(wheelEvent.deltaY);
		const { options } = await waitForSpecificMessage("options", { source: "content_script" });
		if (!options) return;
		if (!options.enable_scroll_wheel_volume_control) return;
		const { newVolume } = await adjustVolume(scrollDelta, options.volume_adjustment_steps);

		drawVolumeDisplay({
			displayType: options.osd_display_type,
			displayPosition: options.osd_display_position,
			displayColor: options.osd_display_color,
			displayOpacity: options.osd_display_opacity,
			playerContainer: (playerContainer as unknown as YouTubePlayerDiv) || null,
			volume: newVolume
		});
		sendMessage("setVolume" as const, { volume: newVolume, source: "content_script" });
	};
	for (const selector of containerSelectors) {
		setupListeners(selector, handleWheel);
	}
}

async function setRememberedVolume() {
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });
	if (!options) return;
	const { remembered_volume: rememberedVolume, enable_remember_last_volume: enableRememberVolume } = options;
	const playerContainer = document.querySelector("div#movie_player") as YouTubePlayerDiv | null;
	if (!playerContainer) return;
	if (!playerContainer.setVolume) return;
	browserColorLog(`${enableRememberVolume ? "Restoring" : "Not restoring"} last volume ${rememberedVolume}`, "FgMagenta");
	if (rememberedVolume && enableRememberVolume) {
		await playerContainer.setVolume(rememberedVolume);
		drawVolumeDisplay({
			displayType: options.osd_display_type,
			displayPosition: options.osd_display_position,
			displayColor: options.osd_display_color,
			displayOpacity: options.osd_display_opacity,
			playerContainer: playerContainer || null,
			volume: rememberedVolume
		});
	}
}
async function setPlayerQuality() {
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });
	if (!options) return;
	const { player_quality, enable_automatically_set_quality } = options;
	if (!enable_automatically_set_quality) return;
	if (!player_quality) return;
	let playerQuality: YoutubePlayerQualityLabel | YoutubePlayerQualityLevel = player_quality;
	const player = document.querySelector("div#movie_player") as YouTubePlayerDiv | null;
	if (!player) return;
	if (!player.setPlaybackQuality) return;

	const availableQualityLevels = (await player.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
	if (playerQuality && playerQuality !== "auto") {
		if (availableQualityLevels.includes(playerQuality) === false) {
			const availableResolutions = availableQualityLevels.reduce(function (array, elem) {
				if (YoutubePlayerQualityLabels[YoutubePlayerQualityLevels.indexOf(elem)]) {
					array.push(YoutubePlayerQualityLabels[YoutubePlayerQualityLevels.indexOf(elem)]);
				}
				return array;
			}, [] as YoutubePlayerQualityLabel[]);
			playerQuality = chooseClosetQuality(YoutubePlayerQualityLabels[YoutubePlayerQualityLevels.indexOf(playerQuality)], availableResolutions);
			if (!YoutubePlayerQualityLevels.at(YoutubePlayerQualityLabels.indexOf(playerQuality))) return;
			playerQuality = YoutubePlayerQualityLevels.at(YoutubePlayerQualityLabels.indexOf(playerQuality)) as YoutubePlayerQualityLevel;
		}

		browserColorLog(`Setting player quality to ${playerQuality}`, "FgMagenta");
		player.setPlaybackQualityRange(playerQuality);
		player.dataset.defaultQuality = playerQuality;
	}
}
/**
 * @param listeners - Array of listeners to clean up.
 *
 */
async function cleanUpListeners(listeners: { element: Element; listener: EventListener }[]) {
	for (const { element, listener } of listeners) {
		element.removeEventListener("wheel", listener);
	}
}
/**
 * Set up event listeners for the specified element.
 *
 * @param selector - The CSS selector for the element.
 * @param listener - The event listener function.
 */
function setupListeners(selector: Selector, handleWheel: (event: Event) => void) {
	const elements = document.querySelectorAll(selector);
	if (!elements.length) return browserColorLog(`No elements found with selector ${selector}`, "FgRed");
	for (const element of elements) {
		const mouseWheelListener = (e: Event) => {
			if (element.clientHeight === 0) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			handleWheel(e);
		};
		element.addEventListener("wheel", mouseWheelListener, { passive: false });
		if (!eventListeners.has(selector)) eventListeners.set(selector, []);
		const existingListeners = eventListeners.get(selector);
		if (existingListeners) eventListeners.set(selector, [...existingListeners, { element, listener: mouseWheelListener }]);
	}
}
/**
 * Get the scroll direction based on the deltaY value.
 *
 * @param deltaY - The deltaY value from the scroll event.
 * @returns The scroll direction: 1 for scrolling up, -1 for scrolling down.
 */
function getScrollDirection(deltaY: number): number {
	return deltaY < 0 ? 1 : -1;
}

/**
 * Adjust the volume based on the scroll direction.
 *
 * @param scrollDelta - The scroll direction.
 * @param adjustmentSteps - The volume adjustment steps.
 * @returns Promise that resolves with the new volume.
 */
function adjustVolume(scrollDelta: number, volumeStep: number): Promise<{ newVolume: number; oldVolume: number }> {
	return new Promise((resolve) => {
		(async () => {
			const player = document.querySelector("div#movie_player") as YouTubePlayer | null;
			if (!player) return;
			if (!player.getVolume) return;
			if (!player.setVolume) return;
			if (!player.isMuted) return;
			if (!player.unMute) return;
			const [volume, isMuted] = await Promise.all([player.getVolume(), player.isMuted()]);
			browserColorLog(`Scroll delta: ${scrollDelta}`, "FgMagenta");
			browserColorLog(`Volume step: ${volumeStep}`, "FgMagenta");
			const newVolume = toDivisible(volume + scrollDelta * volumeStep, volumeStep);
			browserColorLog(`Adjusting volume by ${volumeStep} to ${newVolume}. Old volume was ${volume}`, "FgMagenta");
			await player.setVolume(newVolume);
			if (isMuted) {
				if (typeof player.unMute === "function") await player.unMute();
			}
			resolve({ newVolume, oldVolume: volume });
		})();
	});
}
/**
 * Draw the volume display over the player.
 *
 * @param options - The options for the volume display.
 */
function drawVolumeDisplay({
	displayType,
	displayPosition,
	displayColor,
	displayOpacity,
	playerContainer,
	volume
}: {
	volume: number;
	displayType: OnScreenDisplayType;
	displayPosition: OnScreenDisplayPosition;
	displayColor: OnScreenDisplayColor;
	displayOpacity: number;
	playerContainer: YouTubePlayerDiv | null;
}) {
	const canvas = document.createElement("canvas");
	canvas.id = "volume-display";
	const context = canvas.getContext("2d");

	if (!context) {
		console.error("Canvas not supported");
		return;
	}

	// Set canvas dimensions based on player/container dimensions
	if (!playerContainer) {
		console.error("Player container not found");
		return;
	}

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

	canvas.width = width;
	canvas.height = height;

	// Set canvas styles for positioning
	canvas.style.position = "absolute";
	switch (displayPosition) {
		case "top_left":
			canvas.style.top = "0";
			canvas.style.left = "0";
			break;
		case "top_right":
			canvas.style.top = "0";
			canvas.style.right = "0";
			break;
		case "bottom_left":
			canvas.style.bottom = "0";
			canvas.style.left = "0";
			break;
		case "bottom_right":
			canvas.style.bottom = "0";
			canvas.style.right = "0";
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
	canvas.style.zIndex = "100";
	canvas.style.pointerEvents = "none";

	// Clear canvas
	context.clearRect(0, 0, width, height);
	context.fillStyle = displayColor;
	context.globalAlpha = displayOpacity / 100;
	// Draw volume representation based on display type
	switch (displayType) {
		case "no_display":
			// Do nothing or display an empty screen
			break;
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
			const lineHeight = 10; // Height of the volume line
			const lineWidth = Math.round(volume * maxLineWidth);
			const lineX = (width - lineWidth) / 2;
			const lineY = (height - lineHeight) / 2;

			context.fillRect(lineX, lineY, lineWidth, lineHeight);
			break;
		}
		case "round": {
			const lineWidth = 4;
			const centerX = width / 2;
			const centerY = height / 2;
			const radius = Math.min(width, height, 75) / 2 - lineWidth; // Maximum radius based on canvas dimensions
			const startAngle = Math.PI + Math.PI * volume; // Start angle based on volume
			const endAngle = Math.PI - Math.PI * volume; // End angle based on volume
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
	}, 750);
}
