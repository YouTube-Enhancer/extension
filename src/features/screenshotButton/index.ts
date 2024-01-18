import { getIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureButton, removeFeatureButton } from "../buttonPlacement";
import { getFeatureMenuItem } from "../featureMenu/utils";

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
		const optionsData = await waitForSpecificMessage("options", "request_data", "content");
		if (!optionsData) return;
		const {
			data: { options }
		} = optionsData;
		if (!options) return;
		const { screenshot_format, screenshot_save_as } = options;
		const format = `image/${screenshot_format}`;

		// Get the data URL of the canvas and create a blob from it
		const dataUrl = canvas.toDataURL(format);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!blob) return;

		switch (screenshot_save_as) {
			case "clipboard": {
				const tooltip = document.createElement("div");
				const screenshotMenuItem = getFeatureMenuItem("screenshotButton");
				if (!screenshotMenuItem) return;
				const rect = screenshotMenuItem.getBoundingClientRect();
				tooltip.classList.add("yte-button-tooltip");
				tooltip.classList.add("ytp-tooltip");
				tooltip.classList.add("ytp-rounded-tooltip");
				tooltip.classList.add("ytp-bottom");
				tooltip.id = "yte-screenshot-tooltip";
				tooltip.style.left = `${rect.left + rect.width / 2}px`;
				tooltip.style.top = `${rect.top - 2}px`;
				tooltip.style.zIndex = "99999";
				tooltip.textContent = window.i18nextInstance.t("pages.content.features.screenshotButton.copiedToClipboard");
				document.body.appendChild(tooltip);
				const clipboardImage = new ClipboardItem({ "image/png": blob });
				void navigator.clipboard.write([clipboardImage]);
				void navigator.clipboard.writeText(dataUrl);
				setTimeout(() => {
					tooltip.remove();
				}, 1200);
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

export async function addScreenshotButton(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: {
			options: {
				button_placements: { screenshotButton: screenshotButtonPlacement },
				enable_screenshot_button: enableScreenshotButton
			}
		}
	} = optionsData;

	// If the screenshot button option is disabled, return
	if (!enableScreenshotButton) return;
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
				console.error(error);
			}
		})();
	}
	await addFeatureButton(
		"screenshotButton",
		screenshotButtonPlacement,
		window.i18nextInstance.t("pages.content.features.screenshotButton.label"),
		getIcon("screenshotButton", screenshotButtonPlacement !== "feature_menu" ? "shared_position_icon" : "feature_menu"),
		screenshotButtonClickListener,
		false
	);
}
export function removeScreenshotButton() {
	void removeFeatureButton("screenshotButton");
	eventManager.removeEventListeners("screenshotButton");
}
