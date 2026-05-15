import { createFeature } from "@/src/features/_registry/createFeature";

import { metadata } from "./index.metadata";
import { createCustomCSSElement, customCSSExists, updateCustomCSS } from "./utils";

export const customCssID = "yte-custom-css";
export default createFeature({
	...metadata,
	onConfigChange: ({ code }) => {
		updateCustomCSS({
			code
		});
	},
	onDisable() {
		// Get the custom CSS style element
		const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${customCssID}`);
		// Check if the custom CSS style element exists
		if (!customCSSStyleElement) return;
		// Remove the custom CSS style element
		customCSSStyleElement.remove();
	},
	onEnable({ code }) {
		if (customCSSExists()) {
			updateCustomCSS({
				code
			});
			return;
		}
		// Create the custom CSS style element
		const customCSSStyleElement = createCustomCSSElement({
			code
		});
		// Insert the custom CSS style element
		document.head.appendChild(customCSSStyleElement);
	}
});
