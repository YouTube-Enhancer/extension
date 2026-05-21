import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { type Nullable } from "@/src/types";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

async function takeScreenshot(videoElement: HTMLVideoElement) {
	try {
		// Create a canvas element and get its context
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		// Set the dimensions of the canvas to the video's dimensions (fallback for unavailable streams)
		const videoWidth = videoElement.videoWidth || videoElement.offsetWidth || 640;
		const videoHeight = videoElement.videoHeight || videoElement.offsetHeight || 360;
		canvas.width = videoWidth;
		canvas.height = videoHeight;
		// Draw the video element onto the canvas
		if (!context) return;
		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
		// Wait for the options message and get the format from it
		const {
			data: {
				options: {
					screenshotButton: { format, saveAs }
				}
			}
		} = await waitForSpecificMessage("options", "request_data", "content");

		const copyToClipboard = async () => {
			const screenshotButton = getFeatureButton("screenshotButton");
			if (!screenshotButton) return;
			const { listener, remove } = createTooltip({
				direction: "up",
				element: screenshotButton,
				featureName: "screenshotButton",
				id: "yte-feature-screenshotButton-tooltip",
				text: window.i18nextInstance.t((translations) => translations.pages.content.features.screenshotButton.extras.copiedToClipboard)
			});
			listener();
			try {
				const mimeType = "image/png";
				const blob = await new Promise<Nullable<Blob>>((resolve) => canvas.toBlob(resolve, mimeType));
				if (blob) {
					const clipboardImage = new ClipboardItem({ [mimeType]: blob });
					await navigator.clipboard.write([clipboardImage]);
				}
				setTimeout(() => {
					remove();
				}, 1200);
			} catch (err) {
				remove();
				console.error("[screenshotButton] Failed to copy screenshot to clipboard:", err);
			}
		};

		const saveToFile = async () => {
			const mimeType = `image/${format}`;
			const blob = await new Promise<Nullable<Blob>>((resolve) => canvas.toBlob(resolve, mimeType));
			if (!blob) return;
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `Screenshot-${location.href.match(/[\?|\&]v=([^&]+)/)?.[1]}-${timestamp}.${format}`;
			a.click();
		};

		if (saveAs === "clipboard" || saveAs === "both") {
			await copyToClipboard();
		}
		if (saveAs === "file" || saveAs === "both") {
			await saveToFile();
		}
	} catch (_error) {}
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				// Add a click event listener to the screenshot button
				function screenshotButtonClickListener() {
					void (async () => {
						// Get the video element
						const videoElement = document.querySelector<HTMLVideoElement>("video");
						// If video element is not available, return
						if (!videoElement) return;
						try {
							// Take a screenshot
							await takeScreenshot(videoElement);
						} catch (error) {
							console.error("[screenshotButton] Failed to take screenshot:", error);
						}
					})();
				}
				await addFeatureButton(
					"screenshotButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.screenshotButton.button.label),
					getFeatureIcon("screenshotButton", placement),
					screenshotButtonClickListener,
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "screenshotButton",
			remove: async (placement) => {
				await removeFeatureButton("screenshotButton", placement);
				eventManager.removeEventListeners("screenshotButton");
			}
		}
	],
	dependencies: { includePages: ["watch", "live"] }
});
