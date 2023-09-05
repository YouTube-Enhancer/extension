import { YouTubePlayerDiv } from "@/src/types";
import { waitForSpecificMessage, browserColorLog, formatError } from "@/src/utils/utilities";

export default async function volumeBoost() {
	// Wait for the "options" message from the extension
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	const { volume_boost_amount, enable_volume_boost } = options;
	// If volume boost option is disabled, return
	if (!enable_volume_boost) return;

	// Get the player element
	const player = document.querySelector("video") as YouTubePlayerDiv | null;
	// If player element is not available, return
	if (!player) return;

	// Log the message indicating the volume boost being enabled
	browserColorLog(`Enabling volume boost`, "FgMagenta");

	if (window.audioCtx && window.gainNode) {
		browserColorLog(`Setting volume boost to ${Math.pow(10, volume_boost_amount / 20)}`, "FgMagenta");
		window.gainNode.gain.value = Math.pow(10, volume_boost_amount / 20);
	} else {
		try {
			window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			const source = window.audioCtx.createMediaElementSource(player as unknown as HTMLMediaElement);
			const gainNode = window.audioCtx.createGain();
			source.connect(gainNode);
			gainNode.connect(window.audioCtx.destination);
			window.gainNode = gainNode;
			browserColorLog(`Setting volume boost to ${Math.pow(10, volume_boost_amount / 20)}`, "FgMagenta");
			gainNode.gain.value = Math.pow(10, volume_boost_amount / 20);
		} catch (error) {
			browserColorLog(`Failed to set volume boost: ${formatError(error)}`, "FgRed");
		}
	}
}
