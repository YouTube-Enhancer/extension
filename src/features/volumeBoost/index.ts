import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIds, getFeatureMenuItem } from "@/src/features/featureMenu/utils";
import { getFeatureIcon } from "@/src/icons";
import { type YouTubePlayerDiv } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { getAudioEngine } from "@/src/utils/audioEngine";
import { waitForElement } from "@/src/utils/dom/wait";
import { sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/messaging";
import { clampDb, STEP_DB } from "@/src/utils/misc";
import { isLivePage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { applyVolumeBoostDb, setupVolumeBoost } from "./utils";

let isVolumeBoostEnabled = false;
async function handleVolumeBoostScroll(event: WheelEvent) {
	event.preventDefault();
	let delta: number;
	if (event.deltaY < 0) delta = STEP_DB;
	else delta = -STEP_DB;
	// Apply modifiers: Shift = 2.5x, Ctrl = 5x
	if (event.shiftKey) delta *= 2.5;
	if (event.ctrlKey) delta *= 5;
	const {
		data: {
			options: {
				onScreenDisplay: { color, hideTime, opacity, padding, position },
				volumeBoost: { amount }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const newValue = clampDb(amount + delta);
	sendContentOnlyMessage("setVolumeBoostAmount", newValue);
	const playerContainer = await waitForElement<YouTubePlayerDiv>(isWatchPage() || isLivePage() ? "div#movie_player" : "div#shorts-player");
	if (!playerContainer) return;
	new OnScreenDisplayManager(
		{
			displayColor: color,
			displayHideTime: hideTime,
			displayOpacity: opacity,
			displayPadding: padding,
			displayPosition: position,
			displayType: "text",
			playerContainer
		},
		"yte-osd",
		{
			max: Infinity,
			type: "volume_boost_db",
			value: newValue
		}
	);
	updateVolumeBoostFeatureMenuLabel(newValue);
	updateFeatureButtonTitle(
		"volumeBoostButton",
		!isVolumeBoostEnabled ?
			window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.toggle.off)
		:	window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.toggle.on, { value: newValue })
	);
	if (!isVolumeBoostEnabled) return;
	applyVolumeBoostDb(newValue);
}
function updateVolumeBoostFeatureMenuLabel(value: number) {
	const { featureMenuItemLabelId } = getFeatureIds("volumeBoostButton");
	const labelEl = document.getElementById(featureMenuItemLabelId);
	if (!labelEl) return;
	labelEl.textContent = window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.label, { value });
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ amount, button: { fullscreenPlacement, placement } }) => {
				await addFeatureButton(
					"volumeBoostButton",
					placement,
					placement === "feature_menu" ?
						window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.label, { value: amount })
					:	window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.toggle.off),
					getFeatureIcon("volumeBoostButton", placement),
					(checked) => {
						void (async () => {
							const {
								data: {
									options: { volumeBoost }
								}
							} = await waitForSpecificMessage("options", "request_data", "content");
							isVolumeBoostEnabled = !!checked;
							if (checked) {
								const { amount } = volumeBoost;
								applyVolumeBoostDb(amount);
								updateFeatureButtonTitle(
									"volumeBoostButton",
									window.i18nextInstance.t((translations) => translations.pages.content.features.volumeBoostButton.button.toggle.on, {
										value: amount
									})
								);
							} else {
								const engine = getAudioEngine();
								if (!engine) return;
								engine.volumeGain.gain.value = 1;
								updateFeatureButtonTitle(
									"volumeBoostButton",
									window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.toggle.off)
								);
							}
						})();
					},
					true,
					false,
					fullscreenPlacement
				);
				const volumeBoostButton = getFeatureButton("volumeBoostButton");
				if (!volumeBoostButton) return;
				eventManager.addEventListener(
					volumeBoostButton,
					"wheel",
					(event) => {
						void handleVolumeBoostScroll(event as WheelEvent);
					},
					"volumeBoostButton",
					{ passive: false }
				);
			},
			name: "volumeBoostButton",
			remove: async (placement) => {
				await removeFeatureButton("volumeBoostButton", placement);
				eventManager.removeEventListeners("volumeBoostButton");
			},
			shouldRender: ({ mode }) => mode === "per_video"
		}
	],
	onConfigChange: ({ amount, enabled, mode }) => {
		if (!enabled) return;
		if (mode === "global") applyVolumeBoostDb(amount);
		else {
			const volumeBoostButton = getFeatureMenuItem("volumeBoostButton") ?? getFeatureButton("volumeBoostButton");
			if (!volumeBoostButton) return;
			const volumeBoostForVideoEnabled = volumeBoostButton.ariaChecked === "true";
			if (volumeBoostForVideoEnabled) applyVolumeBoostDb(amount);
		}
	},
	onDisable: () => {
		const engine = getAudioEngine();
		if (!engine) return;
		engine.volumeGain.gain.value = 1;
	},
	onEnable: ({ amount, mode }) => {
		setupVolumeBoost();
		if (mode === "global") applyVolumeBoostDb(amount);
	}
});
