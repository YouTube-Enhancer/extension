import type { YouTubePlayerDiv } from "@/src/types";

import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { calculatePlaybackButtonSpeed, updatePlaybackSpeedButtonTooltip } from "@/src/features/playbackSpeedButtons";
import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { isShortsPage, isWatchPage, preventScroll, waitForAllElements, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import { adjustSpeed, setupScrollListeners } from "./utils";

export default async function adjustSpeedOnScrollWheel() {
	// Wait for the "options" message from the content script
	let optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: {
				scrollWheelSpeedControl: { enabled: enableScrollWheelSpeedControl }
			}
		}
	} = optionsData;
	// If scroll wheel speed control is disabled, return
	if (!enableScrollWheelSpeedControl) return;
	const containerSelectors = ["div#player", isShortsPage() ? "#player-container:has(#shorts-player)" : "#player-container:has(#movie_player)"];
	// Wait for the specified container selectors to be available on the page
	await waitForAllElements(containerSelectors);
	// Get the player element
	const playerContainer =
		isWatchPage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	// Define the event handler for the scroll wheel events
	const handleWheel = (event: Event) => {
		const volumeBoostButton = getFeatureButton("volumeBoostButton");
		if (volumeBoostButton && event.target === volumeBoostButton) return;
		const setOptionsData = async () => {
			return (optionsData = await waitForSpecificMessage("options", "request_data", "content"));
		};
		void (async () => {
			if (!optionsData) {
				return void (await setOptionsData());
			}
			const {
				data: {
					options: {
						onScreenDisplay: { color, hideTime, opacity, padding, position, type },
						playbackSpeedButtons: { speed },
						scrollWheelSpeedControl: { enabled, modifierKey, steps }
					}
				}
			} = optionsData;
			const wheelEvent = event as WheelEvent;
			// If the modifier key is required and not pressed, return
			if (enabled && !wheelEvent[modifierKey]) return void (await setOptionsData());
			// Only prevent default scroll wheel behavior
			// if we are going to handle the event
			preventScroll(wheelEvent);
			// Update the options data after preventScroll()
			await setOptionsData();
			// Get the player element
			const playerContainer =
				isWatchPage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
				: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
				: null;
			// If player element is not available, return
			if (!playerContainer) return;
			// Adjust the speed based on the scroll direction
			const scrollDelta = wheelEvent.deltaY < 0 ? 1 : -1;
			// Adjust the speed based on the scroll direction and options
			const { newSpeed } = await adjustSpeed(scrollDelta, steps);
			await updatePlaybackSpeedButtonTooltip("increasePlaybackSpeedButton", calculatePlaybackButtonSpeed(newSpeed, speed, "increase"));
			await updatePlaybackSpeedButtonTooltip("decreasePlaybackSpeedButton", calculatePlaybackButtonSpeed(newSpeed, speed, "decrease"));
			new OnScreenDisplayManager(
				{
					displayColor: color,
					displayHideTime: hideTime,
					displayOpacity: opacity,
					displayPadding: padding,
					displayPosition: position,
					displayType: type,
					playerContainer: playerContainer
				},
				"yte-osd",
				{
					max: 16,
					type: "speed",
					value: newSpeed
				}
			);
		})();
	};
	// Set up the scroll wheel event listeners on the specified container selectors
	for (const selector of containerSelectors) {
		setupScrollListeners(selector, handleWheel);
	}
}
