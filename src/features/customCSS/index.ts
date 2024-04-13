import { waitForSpecificMessage } from "@/src/utils/utilities";

import { createCustomCSSElement } from "./utils";

export async function enableCustomCSS() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { custom_css_code, enable_custom_css }
		}
	} = optionsData;
	// Check if custom CSS is enabled
	if (!enable_custom_css) return;
	// Create the custom CSS style element
	const customCSSStyleElement = createCustomCSSElement({
		custom_css_code
	});
	// Insert the custom CSS style element
	document.head.appendChild(customCSSStyleElement);
}
export function disableCustomCSS() {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>("#yte-custom-css");
	// Check if the custom CSS style element exists
	if (!customCSSStyleElement) return;
	// Remove the custom CSS style element
	customCSSStyleElement.remove();
}
