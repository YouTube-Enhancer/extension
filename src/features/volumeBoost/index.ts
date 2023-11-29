import eventManager from "@/src/utils/EventManager";
import { browserColorLog, formatError, waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "../featureMenu/utils";
function makeVolumeBoostIcon() {
	const volumeBoostIconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	volumeBoostIconSvg.style.height = "24px";
	volumeBoostIconSvg.style.width = "24px";
	volumeBoostIconSvg.setAttributeNS(null, "stroke", "currentColor");
	volumeBoostIconSvg.setAttributeNS(null, "fill", "currentColor");
	volumeBoostIconSvg.setAttributeNS(null, "viewBox", "0 0 24 24");
	const volumeUpPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	volumeUpPath.setAttributeNS(
		null,
		"d",
		"M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"
	);
	volumeUpPath.setAttributeNS(null, "stroke", "none");
	volumeBoostIconSvg.appendChild(volumeUpPath);
	return volumeBoostIconSvg;
}
export default async function volumeBoost() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;

	const {
		data: { options }
	} = optionsData;

	const { enable_volume_boost } = options;

	if (!enable_volume_boost) return;
	await addVolumeBoostButton();
	setupVolumeBoost();
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
	await addVolumeBoostButton();
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
	await addFeatureItemToMenu({
		featureName: "volumeBoost",
		icon: makeVolumeBoostIcon(),
		isToggle: true,
		label: window.i18nextInstance.t("pages.content.features.volumeBoostButton.label"),
		listener: (checked) => {
			void (async () => {
				if (checked !== undefined) {
					if (checked) {
						await enableVolumeBoost();
					} else {
						disableVolumeBoost();
					}
				}
			})();
		}
	});
}
export function removeVolumeBoostButton() {
	removeFeatureItemFromMenu("volumeBoost");
	eventManager.removeEventListeners("volumeBoost");
}
