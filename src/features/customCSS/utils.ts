import type { configuration } from "@/src/types";

import { customCssID } from "@/src/features/customCSS";

export function createCustomCSSElement({ code }: Pick<configuration["customCSS"], "code">) {
	// Create the custom CSS style element
	const customCSSStyleElement = document.createElement("style");
	customCSSStyleElement.id = customCssID;
	customCSSStyleElement.textContent = code;
	return customCSSStyleElement;
}
export function customCSSExists() {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${customCssID}`);
	// Check if the custom CSS style element exists
	if (!customCSSStyleElement) return false;
	return true;
}
export function updateCustomCSS({ code }: Pick<configuration["customCSS"], "code">) {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${customCssID}`);
	// Check if the custom CSS style element exists
	if (!customCSSStyleElement) return;
	customCSSStyleElement.replaceWith(createCustomCSSElement({ code }));
}
