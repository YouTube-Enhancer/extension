import type { YouTubePlayerDiv } from "@/src/types";

import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { isLivePage, isShortsPage, isWatchPage, preventScroll, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { adjustVolume, setupScrollListeners } from "./utils";

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
	let optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_scroll_wheel_volume_control: enableScrollWheelVolumeControl }
		}
	} = optionsData;
	// If scroll wheel volume control is disabled, return
	if (!enableScrollWheelVolumeControl) return;
	// Wait for the specified container selectors to be available on the page
	const containerSelectors = await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);

	// Define the event handler for the scroll wheel events
	const handleWheel = (event: Event) => {
		const settingsPanelMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
		// If the settings panel menu is targeted return
		if (settingsPanelMenu && settingsPanelMenu.contains(event.target as Node)) return;
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
						enable_scroll_wheel_volume_control_hold_modifier_key,
						enable_scroll_wheel_volume_control_hold_right_click,
						osd_display_color,
						osd_display_hide_time,
						osd_display_opacity,
						osd_display_padding,
						osd_display_position,
						osd_display_type,
						scroll_wheel_speed_control_modifier_key,
						scroll_wheel_volume_control_modifier_key,
						volume_adjustment_steps
					}
				}
			} = optionsData;
			const wheelEvent = event as WheelEvent;
			// If scroll wheel speed control is enabled and the modifier key is pressed return
			if (enable_scroll_wheel_speed_control && wheelEvent[scroll_wheel_speed_control_modifier_key]) return void (await setOptionsData());
			// If the modifier key is required and not pressed, return
			if (enable_scroll_wheel_volume_control_hold_modifier_key && !wheelEvent[scroll_wheel_volume_control_modifier_key])
				return void (await setOptionsData());
			// If the right click is required and not pressed, return
			if (enable_scroll_wheel_volume_control_hold_right_click && wheelEvent.buttons !== 2) return void (await setOptionsData());
			// If the right click is required and is pressed hide the context menu
			if (enable_scroll_wheel_volume_control_hold_right_click && wheelEvent.buttons === 2) {
				const contextMenu = document.querySelector<HTMLDivElement>("div.ytp-popup.ytp-contextmenu");
				if (contextMenu) contextMenu.style.display = "none";
			}
			// Only prevent default scroll wheel behavior
			// if we are going to handle the event
			preventScroll(wheelEvent);

			// Update the options data after preventScroll()
			await setOptionsData();

			// Get the player element
			const playerContainer =
				isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
				: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
				: null;
			// If player element is not available, return
			if (!playerContainer) return;

			// Adjust the volume based on the scroll direction
			const scrollDelta = wheelEvent.deltaY < 0 ? 1 : -1;
			// Adjust the volume based on the scroll direction and options
			const { newVolume } = await adjustVolume(playerContainer, scrollDelta, volume_adjustment_steps);
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
					max: 100,
					type: "volume",
					value: newVolume
				}
			);
		})();
	};

	// Set up the scroll wheel event listeners on the specified container selectors
	for (const selector of containerSelectors) {
		setupScrollListeners(selector, handleWheel);
	}
}
