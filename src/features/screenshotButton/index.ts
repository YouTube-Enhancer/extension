import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { type Nullable } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { createTooltip, waitForSpecificMessage } from "@/src/utils/utilities";

async function takeScreenshot(videoElement: HTMLVideoElement) {
	try {
		// Create a canvas element and get its context
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");

		// Set the dimensions of the canvas to the video's dimensions
		const { videoHeight, videoWidth } = videoElement;
		canvas.width = videoWidth;
		canvas.height = videoHeight;

		// Draw the video element onto the canvas
		if (!context) return;
		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

		// Wait for the options message and get the format from it
		const {
			data: {
				options: { screenshot_format, screenshot_save_as }
			}
		} = await waitForSpecificMessage("options", "request_data", "content");
		const blob = await new Promise<Nullable<Blob>>((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!blob) return;

		switch (screenshot_save_as) {
			case "clipboard": {
				const screenshotButton = getFeatureButton("screenshotButton");
				if (!screenshotButton) return;
				const { listener, remove } = createTooltip({
					direction: "up",
					element: screenshotButton,
					featureName: "screenshotButton",
					id: "yte-feature-screenshotButton-tooltip",
					text: window.i18nextInstance.t("pages.content.features.screenshotButton.copiedToClipboard")
				});
				listener();
				const clipboardImage = new ClipboardItem({ "image/png": blob });
				void navigator.clipboard.write([clipboardImage]);
				setTimeout(() => remove(), 1200);
				break;
			}
			case "file": {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				a.download = `Screenshot-${location.href.match(/[\?|\&]v=([^&]+)/)?.[1]}-${timestamp}.${screenshot_format}`;
				a.click();
				break;
			}
		}
	} catch (error) {}
}

export const addScreenshotButton: AddButtonFunction = async () => {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: {
				button_placements: { screenshotButton: screenshotButtonPlacement },
				enable_screenshot_button: enableScreenshotButton
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");

	// If the screenshot button option is disabled, return
	if (!enableScreenshotButton) return;
	// Add a click event listener to the screenshot button
	function screenshotButtonClickListener() {
		void (async () => {
			// Get the video element
			const videoElement = document.querySelector<HTMLVideoElement>("video");
			// If video element is not available, return
			if (!videoElement) return;
			// Take a screenshot
			await takeScreenshot(videoElement).catch(console.error);
		})();
	}
	await addFeatureButton(
		"screenshotButton",
		screenshotButtonPlacement,
		window.i18nextInstance.t("pages.content.features.screenshotButton.button.label"),
		getFeatureIcon("screenshotButton", screenshotButtonPlacement),
		screenshotButtonClickListener,
		false
	);
};
export const removeScreenshotButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("screenshotButton", placement);
	eventManager.removeEventListeners("screenshotButton");
};
