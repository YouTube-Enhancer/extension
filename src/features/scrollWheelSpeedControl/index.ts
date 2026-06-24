import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { type Nullable, type YouTubePlayerDiv } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { preventScroll } from "@/src/utils/dom/events";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { adjustSpeed, setupScrollListeners } from "./utils";

export default createFeature({
	...metadata,
	onDisable: () => eventManager.removeEventListeners("scrollWheelSpeedControl"),
	onEnable: async () => {
		await setupSpeedScrollControl();
	},
	onNavigate: async () => {
		await setupSpeedScrollControl();
	}
});

async function setupSpeedScrollControl() {
	let optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const containerSelectors = ["div#player", isShortsPage() ? "#player-container:has(#shorts-player)" : "#player-container:has(#movie_player)"];

	let playerContainer: Nullable<YouTubePlayerDiv> = null;

	const findPlayerTask = (): boolean => {
		const el =
			isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
			: null;
		if (el) playerContainer = el;
		return playerContainer !== null;
	};

	await registry.playerManager.executeWithRetries("scrollWheelSpeedControl", [findPlayerTask], ["find player"], {
		maxAttempts: 15,
		waitForLoaded: false
	});

	if (!playerContainer) return;

	const refreshOptions = async () => {
		optionsData = await waitForSpecificMessage("options", "request_data", "content");
		return optionsData;
	};

	const handleWheel = async (event: Event) => {
		const volumeBoostButton = getFeatureButton("volumeBoostButton");
		if (volumeBoostButton && event.target === volumeBoostButton) return;
		const settingsPanelMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
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
		if (!scrollWheelSpeedControlEnabled) return void (await refreshOptions());
		if (!wheelEvent[speedModifierKey]) return void (await refreshOptions());
		preventScroll(wheelEvent);
		await refreshOptions();
		const scrollDelta = wheelEvent.deltaY < 0 ? 1 : -1;
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

	containerSelectors.forEach((selector) => setupScrollListeners(selector, (e) => void handleWheel(e)));
}
