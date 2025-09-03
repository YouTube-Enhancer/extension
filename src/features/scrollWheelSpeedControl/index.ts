import type { YouTubePlayerDiv } from "@/src/types";

import { calculatePlaybackButtonSpeed, updatePlaybackSpeedButtonTooltip } from "@/src/features/playbackSpeedButtons";
import { setupScrollListeners } from "@/src/features/scrollWheelVolumeControl/utils";
import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { isShortsPage, isWatchPage, preventScroll, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { adjustSpeed } from "./utils";

export default async function adjustSpeedOnScrollWheel() {
	// Wait for the "options" message from the content script
	let optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_scroll_wheel_speed_control: enableScrollWheelSpeedControl }
		}
	} = optionsData;
	// If scroll wheel speed control is disabled, return
	if (!enableScrollWheelSpeedControl) return;
	const containerSelectors = ["div#player", "div#player-container"];
	// Wait for the specified container selectors to be available on the page
	await waitForAllElements(containerSelectors);
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
				data: {
					options: {
						enable_scroll_wheel_speed_control,
						osd_display_color,
						osd_display_hide_time,
						osd_display_opacity,
						osd_display_padding,
						osd_display_position,
						osd_display_type,
						playback_buttons_speed,
						scroll_wheel_speed_control_modifier_key,
						speed_adjustment_steps
					}
				}
			} = optionsData;
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
			const { newSpeed } = await adjustSpeed(scrollDelta, speed_adjustment_steps);
			await updatePlaybackSpeedButtonTooltip(
				"increasePlaybackSpeedButton",
				calculatePlaybackButtonSpeed(newSpeed, playback_buttons_speed, "increase")
			);
			await updatePlaybackSpeedButtonTooltip(
				"decreasePlaybackSpeedButton",
				calculatePlaybackButtonSpeed(newSpeed, playback_buttons_speed, "decrease")
			);
			new OnScreenDisplayManager(
				{
					displayColor: osd_display_color,
					displayHideTime: osd_display_hide_time,
					displayOpacity: osd_display_opacity,
					displayPadding: osd_display_padding,
					displayPosition: osd_display_position,
					displayType: osd_display_type,
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
