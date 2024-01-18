import { getIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { browserColorLog, formatError, waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureButton, removeFeatureButton } from "../buttonPlacement";

export default async function volumeBoost() {
	setupVolumeBoost();
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;

	const {
		data: { options }
	} = optionsData;

	const { volume_boost_amount, volume_boost_mode } = options;
	if (volume_boost_mode === "per_video") {
		await addVolumeBoostButton();
	} else if (volume_boost_mode === "global") {
		applyVolumeBoost(volume_boost_amount);
	}
}
export async function enableVolumeBoost() {
	setupVolumeBoost();
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;

	const {
		data: { options }
	} = optionsData;

	const { volume_boost_amount } = options;
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
export async function addVolumeBoostButton() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;

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
		window.i18nextInstance.t("pages.content.features.volumeBoostButton.label"),
		getIcon("volumeBoostButton", volumeBoostButtonPlacement !== "feature_menu" ? "shared_position_icon" : "feature_menu"),
		(checked) => {
			void (async () => {
				if (checked !== undefined) {
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
}
export function removeVolumeBoostButton() {
	void removeFeatureButton("volumeBoostButton");
	eventManager.removeEventListeners("volumeBoostButton");
}
