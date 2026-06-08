import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { type YouTubePlayerDiv } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { preventScroll } from "@/src/utils/dom/events";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForAllElements, waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { adjustSpeed, setupScrollListeners } from "./utils";

export default createFeature({
	...metadata,
	onDisable: () => eventManager.removeEventListeners("scrollWheelSpeedControl"),
	onEnable: async () => {
		let optionsData = await waitForSpecificMessage("options", "request_data", "content");
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
		const refreshOptions = async () => {
			optionsData = await waitForSpecificMessage("options", "request_data", "content");
			return optionsData;
		};
		// Define the event handler for the scroll wheel events
		const handleWheel = async (event: Event) => {
			const volumeBoostButton = getFeatureButton("volumeBoostButton");
			if (volumeBoostButton && event.target === volumeBoostButton) return;
			const settingsPanelMenu = await waitForElement<HTMLDivElement>(settingsPanelMenuSelector);
			// If the settings panel menu is targeted return
			if (settingsPanelMenu?.contains(event.target as Node)) return;
			if (!optionsData) return void (await refreshOptions());
			const {
				data: {
					options: {
						onScreenDisplay: { color, hideTime, opacity, padding, position, type },
						playbackSpeedButtons: { speed: speedPerClick },
						scrollWheelSpeedControl: { enabled: scrollWheelSpeedControlEnabled, modifierKey: speedModifierKey, steps: speedSteps }
					}
				}
			} = optionsData;
			const wheelEvent = event as WheelEvent;
			// If speed control is disabled, return
			if (!scrollWheelSpeedControlEnabled) return void (await refreshOptions());
			// If the modifier key is required and not pressed, return
			if (!wheelEvent[speedModifierKey]) return void (await refreshOptions());
			// Only prevent default scroll wheel behavior
			// if we are going to handle the event
			preventScroll(wheelEvent);
			// Update the options data after preventScroll()
			await refreshOptions();
			// Adjust the speed based on the scroll direction
			const scrollDelta = wheelEvent.deltaY < 0 ? 1 : -1;
			// Adjust the speed based on the scroll direction and options
			const { newSpeed } = await adjustSpeed(scrollDelta, speedSteps);
			await updatePlaybackSpeedButtonTooltips(newSpeed, speedPerClick);
			new OnScreenDisplayManager(
				{
					displayColor: color,
					displayHideTime: hideTime,
					displayOpacity: opacity,
					displayPadding: padding,
					displayPosition: position,
					displayType: type,
					playerContainer
				},
				"yte-osd",
				{
					max: 16,
					type: "speed",
					value: newSpeed
				}
			);
		};
		containerSelectors.forEach((selector) => setupScrollListeners(selector, (e) => void handleWheel(e as WheelEvent)));
	}
});
