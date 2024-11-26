import type { configuration } from "@/src/types";

import { customCssID } from "@/src/features/customCSS";

export function updateCustomCSS({ custom_css_code }: Pick<configuration, "custom_css_code">) {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${customCssID}`);
	customCSSStyleElement?.replaceWith(createCustomCSSElement({ custom_css_code }));
}
export function createCustomCSSElement({ custom_css_code }: Pick<configuration, "custom_css_code">) {
	// Create the custom CSS style element
	const customCSSStyleElement = document.createElement("style");
	customCSSStyleElement.id = customCssID;
	customCSSStyleElement.textContent = custom_css_code;
	return customCSSStyleElement;
}
export function customCSSExists() {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${customCssID}`);
	// Check if the custom CSS style element exists
	return customCSSStyleElement !== null;
}
