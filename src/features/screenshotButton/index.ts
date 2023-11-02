import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";
import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "../featureMenu/utils";

async function takeScreenshot(videoElement: HTMLVideoElement) {
	try {
		// Create a canvas element and get its context
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");

		// Set the dimensions of the canvas to the video's dimensions
		const { videoWidth, videoHeight } = videoElement;
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
		const { screenshot_save_as, screenshot_format } = options;
		const format = `image/${screenshot_format}`;

		// Get the data URL of the canvas and create a blob from it
		const dataUrl = canvas.toDataURL(format);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!blob) return;

		switch (screenshot_save_as) {
			case "clipboard": {
				const screenshotTooltip = document.querySelector("div#yte-screenshot-tooltip");
				if (screenshotTooltip) {
					const clipboardImage = new ClipboardItem({ "image/png": blob });
					navigator.clipboard.write([clipboardImage]);
					navigator.clipboard.writeText(dataUrl);
					screenshotTooltip.textContent = "Screenshot copied to clipboard";
				}
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
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_screenshot_button: enableScreenshotButton } = options;
	// If the screenshot button option is disabled, return
	if (!enableScreenshotButton) return;

	// Add a click event listener to the screenshot button
	async function screenshotButtonClickListener() {
		// Get the video element
		const videoElement = document.querySelector("video") as HTMLVideoElement | null;
		// If video element is not available, return
		if (!videoElement) return;
		try {
			// Take a screenshot
			await takeScreenshot(videoElement);
		} catch (error) {
			console.error(error);
		}
	}
	addFeatureItemToMenu({
		featureName: "screenshotButton",
		icon: makeScreenshotIcon(),
		label: "Screenshot",
		listener: screenshotButtonClickListener
	});
}
export async function removeScreenshotButton(): Promise<void> {
	removeFeatureItemFromMenu("screenshotButton");
	eventManager.removeEventListeners("screenshotButton");
}
function makeScreenshotIcon() {
	const screenshotSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	screenshotSVG.style.height = "24px";
	screenshotSVG.style.width = "24px";
	screenshotSVG.setAttributeNS(null, "stroke-width", "1.5");
	screenshotSVG.setAttributeNS(null, "stroke", "currentColor");
	screenshotSVG.setAttributeNS(null, "fill", "none");
	screenshotSVG.setAttributeNS(null, "viewBox", "0 0 24 24");
	const firstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	firstPath.setAttributeNS(
		null,
		"d",
		"M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
	);
	firstPath.setAttributeNS(null, "stroke-linecap", "round");
	firstPath.setAttributeNS(null, "stroke-linejoin", "round");
	const secondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	secondPath.setAttributeNS(null, "d", "M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z");
	secondPath.setAttributeNS(null, "stroke-linecap", "round");
	secondPath.setAttributeNS(null, "stroke-linejoin", "round");
	screenshotSVG.appendChild(firstPath);
	screenshotSVG.appendChild(secondPath);
	return screenshotSVG;
}
