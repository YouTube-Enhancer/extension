import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { type YouTubePlayerDiv } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { type ModifyElementAction, modifyElementClassList } from "@/src/utils/dom/classList";
import { preventScroll } from "@/src/utils/dom/events";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForAllElements, waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import "./index.css";
import { metadata } from "./index.metadata";
import { adjustVolume, setupScrollListeners } from "./utils";
let suppressContextMenu = false;
const HIDE_TIMEOUT = 100;
export default createFeature({
	...metadata,
	onDisable: () => {
		modifyElementClassList("remove", { className: "yte-scroll-wheel-volume-control", element: document.body });
		eventManager.removeEventListeners("scrollWheelVolumeControl");
		suppressContextMenu = false;
	},
	onEnable: async () => {
		let optionsData = await waitForSpecificMessage("options", "request_data", "content");
		const containerSelectors = ["div#player", isShortsPage() ? "#player-container:has(#shorts-player)" : "#player-container:has(#movie_player)"];
		// Wait for the specified container selectors to be available on the page
		await waitForAllElements(containerSelectors);
		// Get the player element
		const playerContainer =
			isWatchPage() || isLivePage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
			: null;
		// If player element is not available, return
		if (!playerContainer) return;
		const refreshOptions = async () => {
			optionsData = await waitForSpecificMessage("options", "request_data", "content");
			return optionsData;
		};
		// Define the event handler for the scroll wheel events
		const handleWheel = async (event: WheelEvent) => {
			const volumeBoostButton = getFeatureButton("volumeBoostButton");
			if (volumeBoostButton && event.target === volumeBoostButton) return;
			const settingsPanelMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
			// If the settings panel menu is targeted return
			if (settingsPanelMenu?.contains(event.target as Node)) return;
			if (!optionsData) return void (await refreshOptions());
			const {
				data: {
					options: {
						onScreenDisplay: { color, hideTime, opacity, padding, position, type },
						scrollWheelSpeedControl: { enabled: scrollWheelSpeedControlEnabled, modifierKey: speedModifierKey },
						scrollWheelVolumeControl: {
							holdModifierKey: volumeHoldModifierKey,
							holdRightClick: volumeHoldRightClick,
							modifierKey: volumeModifierKey,
							steps: volumeAdjustmentSteps
						}
					}
				}
			} = optionsData;
			// If scroll wheel speed control is enabled and the modifier key is pressed return
			if (scrollWheelSpeedControlEnabled && event[speedModifierKey]) return void (await refreshOptions());
			// If the modifier key is required and not pressed, return
			if (volumeHoldModifierKey && !event[volumeModifierKey]) return void (await refreshOptions());
			// If the right click is required and not pressed, return
			if (volumeHoldRightClick && event.buttons !== 2) return void (await refreshOptions());
			// If the right click is required and is pressed hide the context menu
			if (volumeHoldRightClick && event.buttons === 2) {
				toggleContextMenuVisibility("add");
				suppressContextMenu = true;
			}
			// Only prevent default scroll wheel behavior
			// if we are going to handle the event
			preventScroll(event);
			await refreshOptions();
			// Adjust the volume based on the scroll direction
			const scrollDelta = event.deltaY < 0 ? 1 : -1;
			// Adjust the volume based on the scroll direction and options
			const { newVolume } = await adjustVolume(playerContainer, scrollDelta, volumeAdjustmentSteps);
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
				{ max: 100, type: "volume", value: newVolume }
			);
		};
		const onMouseUp = (e: MouseEvent) => {
			if (suppressContextMenu && playerContainer.contains(e.target as Node)) {
				setTimeout(() => {
					suppressContextMenu = false;
					toggleContextMenuVisibility("remove");
				}, HIDE_TIMEOUT);
			}
		};
		const onContextMenu = (e: MouseEvent) => {
			if (suppressContextMenu && playerContainer.contains(e.target as Node)) {
				e.preventDefault();
				e.stopImmediatePropagation();
				toggleContextMenuVisibility("remove");
				suppressContextMenu = false;
			}
		};
		eventManager.addEventListener(document.documentElement, "mouseup", (e) => onMouseUp(e as MouseEvent), "scrollWheelVolumeControl");
		eventManager.addEventListener(document.documentElement, "contextmenu", (e) => onContextMenu(e as MouseEvent), "scrollWheelVolumeControl");
		containerSelectors.forEach((selector) => setupScrollListeners(selector, (e) => void handleWheel(e as WheelEvent)));
		modifyElementClassList("add", { className: "yte-scroll-wheel-volume-control", element: document.body });
	}
});
function toggleContextMenuVisibility(action: ModifyElementAction) {
	modifyElementClassList(action, { className: "yte-context-menu-visible", element: document.body });
}
