import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { browserColorLog, formatError, waitForSpecificMessage } from "@/src/utils/utilities";

export default async function volumeBoost() {
	setupVolumeBoost();
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");

	const {
		data: {
			options: { volume_boost_amount, volume_boost_mode }
		}
	} = optionsData;

	if (volume_boost_mode === "per_video") {
		await addVolumeBoostButton();
	} else if (volume_boost_mode === "global") {
		applyVolumeBoost(volume_boost_amount);
	}
}
export async function enableVolumeBoost() {
	setupVolumeBoost();
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");

	const {
		data: {
			options: { volume_boost_amount }
		}
	} = optionsData;

	applyVolumeBoost(volume_boost_amount);
}
function setupVolumeBoost() {
	if (!window.audioCtx || !window.gainNode) {
		browserColorLog(`Enabling volume boost`, "FgMagenta");
		try {
			const player = document.querySelector<HTMLMediaElement>("video");
			if (!player) return;
			window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			const source = window.audioCtx.createMediaElementSource(player);
			const gainNode = window.audioCtx.createGain();
			source.connect(gainNode);
			gainNode.connect(window.audioCtx.destination);
			window.gainNode = gainNode;
		} catch (error) {
			browserColorLog(`Failed to enable volume boost: ${formatError(error)}`, "FgRed");
		}
	}
}
export function disableVolumeBoost() {
	if (window.gainNode) {
		browserColorLog(`Disabling volume boost`, "FgMagenta");
		window.gainNode.gain.value = 1; // Set gain back to default
	}
}
export function applyVolumeBoost(volume_boost_amount: number) {
	browserColorLog(`Setting volume boost to ${Math.pow(10, volume_boost_amount / 20)}`, "FgMagenta");
	window.gainNode.gain.value = Math.pow(10, volume_boost_amount / 20);
}
export const addVolumeBoostButton: AddButtonFunction = async () => {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");

	const {
		data: {
			options: {
				button_placements: { volumeBoostButton: volumeBoostButtonPlacement }
			}
		}
	} = optionsData;
	await addFeatureButton(
		"volumeBoostButton",
		volumeBoostButtonPlacement,
		volumeBoostButtonPlacement === "feature_menu" ?
			window.i18nextInstance.t("pages.content.features.volumeBoostButton.label")
		:	window.i18nextInstance.t(`pages.content.features.volumeBoostButton.toggle.off`),
		getFeatureIcon("volumeBoostButton", volumeBoostButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu"),
		(checked) => {
			void (async () => {
				if (checked !== undefined) {
					updateFeatureButtonTitle(
						"volumeBoostButton",
						window.i18nextInstance.t(`pages.content.features.volumeBoostButton.toggle.${checked ? "on" : "off"}`)
					);
					if (checked) {
						await enableVolumeBoost();
					} else {
						disableVolumeBoost();
					}
				}
			})();
		},
		true
	);
};
export const removeVolumeBoostButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("volumeBoostButton", placement);
	eventManager.removeEventListeners("volumeBoostButton");
};
