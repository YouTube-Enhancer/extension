import { browserColorLog, sendContentToBackgroundMessage, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enablePauseBackgroundPlayers() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_pausing_background_players: pauseBackgroundPlayersEnabled }
		}
	} = optionsData;
	if (!pauseBackgroundPlayersEnabled) return;
	browserColorLog(`Enabling pauseBackgroundPlayers`, "FgMagenta");

	let videoPlayerContainer: HTMLElement | null = null;
	if (!videoPlayerContainer) {
		videoPlayerContainer = document.querySelector(".html5-main-video");
	}
	function detectPlaying() {
		if (videoPlayerContainer) {
			videoPlayerContainer.addEventListener("playing", () => {
				void (async () => {
					await sendContentToBackgroundMessage("pauseBackgroundPlayers");
				})();
			});
		}
	}

	let debounceTimeout: null | number = null;
	const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
		if (debounceTimeout) clearTimeout(debounceTimeout);
		// @ts-expect-error - doesn't recognize browser environment properly
		debounceTimeout = setTimeout(() => {
			for (const mutation of mutationsList) {
				if (mutation.addedNodes.length) {
					detectPlaying();
				}
			}
		}, 100);
	});

	if (videoPlayerContainer) {
		observer.observe(videoPlayerContainer, { childList: true, subtree: true });
	}
	detectPlaying();
}

export function disablePauseBackgroundPlayers() {
	const videoPlayerContainer: HTMLElement | null = document.querySelector(".html5-main-video");
	if (videoPlayerContainer) {
		videoPlayerContainer.removeEventListener("playing", () => {
			void (async () => {
				await sendContentToBackgroundMessage("pauseBackgroundPlayers");
			})();
		});
	}
	browserColorLog("Disabling pauseBackgroundPlayers", "FgMagenta");
}
