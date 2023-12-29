import type { YouTubePlayerDiv } from "@/src/types";

import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { isShortsPage, isWatchPage, preventScroll, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { setupScrollListeners } from "../scrollWheelVolumeControl/utils";
import { adjustSpeed } from "./utils";

export default async function adjustSpeedOnScrollWheel() {
	// Wait for the "options" message from the content script
	let optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_scroll_wheel_speed_control: enableScrollWheelSpeedControl } = options;
	// If scroll wheel speed control is disabled, return
	if (!enableScrollWheelSpeedControl) return;
	// Wait for the specified container selectors to be available on the page
	const containerSelectors = await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	// Get the player element
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	// Define the event handler for the scroll wheel events
	const handleWheel = (event: Event) => {
		const setOptionsData = async () => {
			return (optionsData = await waitForSpecificMessage("options", "request_data", "content"));
		};

		void (async () => {
			if (!optionsData) {
				return void (await setOptionsData());
			}
			const {
				data: { options }
			} = optionsData;
			// Extract the necessary properties from the options object
			const { enable_scroll_wheel_speed_control, scroll_wheel_speed_control_modifier_key } = options;
			const wheelEvent = event as WheelEvent;
			// If the modifier key is required and not pressed, return
			if (enable_scroll_wheel_speed_control && !wheelEvent[scroll_wheel_speed_control_modifier_key]) return void (await setOptionsData());

			// Only prevent default scroll wheel behavior
			// if we are going to handle the event
			preventScroll(wheelEvent);

			// Update the options data after preventScroll()
			await setOptionsData();

			// Get the player element
			const playerContainer =
				isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
				: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
				: null;
			// If player element is not available, return
			if (!playerContainer) return;

			// Adjust the speed based on the scroll direction
			const scrollDelta = wheelEvent.deltaY < 0 ? 1 : -1;
			// Adjust the speed based on the scroll direction and options
			const { newSpeed } = await adjustSpeed(playerContainer, scrollDelta, options.speed_adjustment_steps);
			new OnScreenDisplayManager(
				{
					displayColor: options.osd_display_color,
					displayHideTime: options.osd_display_hide_time,
					displayOpacity: options.osd_display_opacity,
					displayPadding: options.osd_display_padding,
					displayPosition: options.osd_display_position,
					displayType: options.osd_display_type,
					playerContainer: playerContainer
				},
				"yte-osd",
				{
					max: 4,
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
