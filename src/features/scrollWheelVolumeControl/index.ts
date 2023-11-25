import type { YouTubePlayerDiv } from "@/src/types";

import { isShortsPage, isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { adjustVolume, drawVolumeDisplay, setupScrollListeners } from "./utils";

function preventScroll(event: Event) {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
}
/**
 * Adjusts the volume on scroll wheel events.
 * It listens for scroll wheel events on specified container selectors,
 * adjusts the volume based on the scroll direction and options,
 * and updates the volume display.
 *
 * @returns {Promise<void>} A promise that resolves once the volume adjustment is completed.
 */
export default async function adjustVolumeOnScrollWheel(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_scroll_wheel_volume_control: enableScrollWheelVolumeControl } = options;
	// If scroll wheel volume control is disabled, return
	if (!enableScrollWheelVolumeControl) return;
	// Wait for the specified container selectors to be available on the page
	const containerSelectors = await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);

	// Define the event handler for the scroll wheel events
	const handleWheel = (event: Event) => {
		void (async () => {
			preventScroll(event);
			// Wait for the "options" message from the content script
			const optionsData = await waitForSpecificMessage("options", "request_data", "content");
			if (!optionsData) return;
			const {
				data: { options }
			} = optionsData;
			// Extract the necessary properties from the options object
			const { enable_scroll_wheel_volume_control, enable_scroll_wheel_volume_control_modifier_key, scroll_wheel_volume_control_modifier_key } =
				options;
			const wheelEvent = event as WheelEvent;
			if (
				!(
					(enable_scroll_wheel_volume_control &&
						enable_scroll_wheel_volume_control_modifier_key &&
						scroll_wheel_volume_control_modifier_key &&
						wheelEvent[scroll_wheel_volume_control_modifier_key]) ||
					(enable_scroll_wheel_volume_control && !enable_scroll_wheel_volume_control_modifier_key)
				)
			)
				return;
			// Get the player element
			const playerContainer = isWatchPage()
				? document.querySelector<YouTubePlayerDiv>("div#movie_player")
				: isShortsPage()
				  ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
				  : null;
			// If player element is not available, return
			if (!playerContainer) return;

			// Adjust the volume based on the scroll direction
			const scrollDelta = wheelEvent.deltaY < 0 ? 1 : -1;
			// Adjust the volume based on the scroll direction and options
			const { newVolume } = await adjustVolume(playerContainer, scrollDelta, options.volume_adjustment_steps);

			// Update the volume display
			drawVolumeDisplay({
				displayColor: options.osd_display_color,
				displayHideTime: options.osd_display_hide_time,
				displayOpacity: options.osd_display_opacity,
				displayPadding: options.osd_display_padding,
				displayPosition: options.osd_display_position,
				displayType: options.osd_display_type,
				playerContainer: playerContainer,
				volume: newVolume
			});
		})();
	};

	// Set up the scroll wheel event listeners on the specified container selectors
	for (const selector of containerSelectors) {
		setupScrollListeners(selector, handleWheel);
	}
}
