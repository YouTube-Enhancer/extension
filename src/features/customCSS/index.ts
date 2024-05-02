import { waitForSpecificMessage } from "@/src/utils/utilities";

import { createCustomCSSElement, customCSSExists, updateCustomCSS } from "./utils";
export const customCssID = "yte-custom-css";
export async function enableCustomCSS() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { custom_css_code, enable_custom_css }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// Check if custom CSS is enabled
	if (!enable_custom_css) return;
	if (customCSSExists()) return updateCustomCSS({ custom_css_code });
	// Create the custom CSS style element
	const customCSSStyleElement = createCustomCSSElement({ custom_css_code });
	// Insert the custom CSS style element
	document.head.appendChild(customCSSStyleElement);
}
export function disableCustomCSS() {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${customCssID}`);
	// Remove the custom CSS style element
	customCSSStyleElement?.remove();
}
