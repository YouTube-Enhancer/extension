import { deepDarkPresets } from "@/src/deepDarkPresets";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { createDeepDarkCSSElement, deepDarkCSSExists, getDeepDarkCustomThemeStyle, updateDeepDarkCSS } from "./utils";
export const deepDarkCssID = "yte-deep-dark-css";
export function disableDeepDarkCSS() {
	// Get the deep dark theme style element
	const deepDarkThemeStyleElement = document.querySelector<HTMLStyleElement>(`#${deepDarkCssID}`);
	// Check if the deep dark theme style element exists
	if (!deepDarkThemeStyleElement) return;
	// Remove the deep dark theme style element
	deepDarkThemeStyleElement.remove();
}

export async function enableDeepDarkCSS() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { deep_dark_custom_theme_colors, deep_dark_preset, enable_deep_dark_theme }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// Check if deep dark theme is enabled
	if (!enable_deep_dark_theme) return;
	if (deepDarkCSSExists()) {
		updateDeepDarkCSS(deep_dark_preset === "Custom" ? getDeepDarkCustomThemeStyle(deep_dark_custom_theme_colors) : deepDarkPresets[deep_dark_preset]);
		return;
	}
	// Create the deep dark theme style element
	const deepDarkThemeStyleElement = createDeepDarkCSSElement(
		deep_dark_preset === "Custom" ? getDeepDarkCustomThemeStyle(deep_dark_custom_theme_colors) : deepDarkPresets[deep_dark_preset]
	);
	// Insert the deep dark theme style element
	document.head.appendChild(deepDarkThemeStyleElement);
}
