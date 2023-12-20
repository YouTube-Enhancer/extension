import eventManager from "@/src/utils/EventManager";
import { browserColorLog, createSVGElement, formatError, waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "../featureMenu/utils";
function makeVolumeBoostIcon() {
	const volumeBoostIconSvg = createSVGElement(
		"svg",
		{
			fill: "currentColor",
			height: "24px",
			stroke: "currentColor",
			viewBox: "0 0 24 24",
			width: "24px"
		},
		createSVGElement("path", {
			d: "M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77",
			stroke: "none"
		})
	);
	return volumeBoostIconSvg;
}
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
