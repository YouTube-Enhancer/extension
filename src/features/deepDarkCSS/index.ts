import { deepDarkPresets } from "@/src/deepDarkPresets";
import { deepDarkCssID } from "@/src/utils/constants";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { createDeepDarkCSSElement, deepDarkCSSExists, getDeepDarkCustomThemeStyle, updateDeepDarkCSS } from "./utils";
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
			options: {
				deepDarkCSS: { colors, enabled, preset }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// Check if deep dark theme is enabled
	if (!enabled) return;
	if (deepDarkCSSExists()) {
		updateDeepDarkCSS(preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset]);
		return;
	}
	// Create the deep dark theme style element
	const deepDarkThemeStyleElement = createDeepDarkCSSElement(preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset]);
	// Insert the deep dark theme style element
	document.head.appendChild(deepDarkThemeStyleElement);
}
