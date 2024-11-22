import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { browserColorLog, formatError, waitForSpecificMessage } from "@/src/utils/utilities";

export default async function volumeBoost() {
	const {
		data: {
			options: { enable_volume_boost, volume_boost_amount, volume_boost_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_volume_boost) return;
	setupVolumeBoost();
	if (volume_boost_mode === "per_video") await addVolumeBoostButton();
	else if (volume_boost_mode === "global") applyVolumeBoost(volume_boost_amount);
}
export async function enableVolumeBoost() {
	setupVolumeBoost();
=======

	if (volume_boost_mode === "per_video") await addVolumeBoostButton();
	else if (volume_boost_mode === "global") applyVolumeBoost(volume_boost_amount);
}
export async function enableVolumeBoost() {
	setupVolumeBoost();
	const {
		data: {
			options: { volume_boost_amount }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	applyVolumeBoost(volume_boost_amount);
}
function setupVolumeBoost() {
	if (window.audioCtx && window.gainNode) return;
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
export function disableVolumeBoost() {
	if (!window.gainNode) return;
	browserColorLog(`Disabling volume boost`, "FgMagenta");
	window.gainNode.gain.value = 1; // Set gain back to default
}
export function applyVolumeBoost(volume_boost_amount: number) {
	browserColorLog(`Setting volume boost to ${Math.pow(10, volume_boost_amount / 20)}`, "FgMagenta");
	if (!window.gainNode) setupVolumeBoost();
	window.gainNode.gain.value = Math.pow(10, volume_boost_amount / 20);
}
export const addVolumeBoostButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { volumeBoostButton: volumeBoostButtonPlacement }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	await addFeatureButton(
		"volumeBoostButton",
		volumeBoostButtonPlacement,
		volumeBoostButtonPlacement === "feature_menu" ?
			window.i18nextInstance.t("pages.content.features.volumeBoostButton.button.label")
		:	window.i18nextInstance.t(`pages.content.features.volumeBoostButton.button.toggle.off`),
		getFeatureIcon("volumeBoostButton", volumeBoostButtonPlacement),
		(checked) => {
			void (async () => {
				if (checked === undefined) return;
				updateFeatureButtonTitle(
					"volumeBoostButton",
					window.i18nextInstance.t(`pages.content.features.volumeBoostButton.button.toggle.${checked ? "on" : "off"}`)
				);
				if (checked) await enableVolumeBoost();
				else disableVolumeBoost();
			})();
		},
		true
	);
};
export const removeVolumeBoostButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("volumeBoostButton", placement);
	eventManager.removeEventListeners("volumeBoostButton");
};
