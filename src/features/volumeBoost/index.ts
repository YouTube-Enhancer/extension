import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";
import type { YouTubePlayerDiv } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIds } from "@/src/features/featureMenu/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { sendContentOnlyMessage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import { applyVolumeBoostDb, clampDb, disableVolumeBoost, setupVolumeBoost, STEP_DB } from "./utils";

let isVolumeBoostEnabled = false;

export async function enableVolumeBoost() {
	setupVolumeBoost();
	const {
		data: {
			options: { volume_boost_amount }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	applyVolumeBoostDb(volume_boost_amount);
}

export default async function volumeBoost() {
	const {
		data: {
			options: { enable_volume_boost, volume_boost_amount, volume_boost_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_volume_boost) return;
	setupVolumeBoost();
	if (volume_boost_mode === "per_video") {
		await addVolumeBoostButton();
	} else {
		applyVolumeBoostDb(volume_boost_amount);
	}
}

export const addVolumeBoostButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { volumeBoostButton: volumeBoostButtonPlacement },
				volume_boost_amount
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	await addFeatureButton(
		"volumeBoostButton",
		volumeBoostButtonPlacement,
		volumeBoostButtonPlacement === "feature_menu" ?
			window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.label, { value: volume_boost_amount })
		:	window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.toggle.off),
		getFeatureIcon("volumeBoostButton", volumeBoostButtonPlacement),
		async (checked) => {
			isVolumeBoostEnabled = !!checked;
			if (checked) {
				await enableVolumeBoost();
				const {
					data: {
						options: { volume_boost_amount }
					}
				} = await waitForSpecificMessage("options", "request_data", "content");
				updateFeatureButtonTitle(
					"volumeBoostButton",
					window.i18nextInstance.t((translations) => translations.pages.content.features.volumeBoostButton.button.toggle.on, {
						value: volume_boost_amount
					})
				);
			} else {
				disableVolumeBoost();
				updateFeatureButtonTitle(
					"volumeBoostButton",
					window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.toggle.off)
				);
			}
		},
		true
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
};
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
			options: { osd_display_color, osd_display_hide_time, osd_display_opacity, osd_display_padding, osd_display_position, volume_boost_amount }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const newValue = clampDb(volume_boost_amount + delta);
	sendContentOnlyMessage("setVolumeBoostAmount", newValue);
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (playerContainer) {
		new OnScreenDisplayManager(
			{
				displayColor: osd_display_color,
				displayHideTime: osd_display_hide_time,
				displayOpacity: osd_display_opacity,
				displayPadding: osd_display_padding,
				displayPosition: osd_display_position,
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
	}
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

export const removeVolumeBoostButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("volumeBoostButton", placement);
	eventManager.removeEventListeners("volumeBoostButton");
};
function updateVolumeBoostFeatureMenuLabel(value: number) {
	const { featureMenuItemLabelId } = getFeatureIds("volumeBoostButton");
	const labelEl = document.getElementById(featureMenuItemLabelId);
	if (!labelEl) return;
	labelEl.textContent = window.i18nextInstance.t((t) => t.pages.content.features.volumeBoostButton.button.label, { value });
}
export { applyVolumeBoostDb, disableVolumeBoost };
