import type { configuration } from "@/src/types";

export function updateCustomCSS({ custom_css_code }: Pick<configuration, "custom_css_code">) {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>("#yte-custom-css");
	// Check if the custom CSS style element exists
	if (!customCSSStyleElement) return;
	customCSSStyleElement.replaceWith(createCustomCSSElement({ custom_css_code }));
}
export function createCustomCSSElement({ custom_css_code }: Pick<configuration, "custom_css_code">) {
	// Create the custom CSS style element
	const customCSSStyleElement = document.createElement("style");
	customCSSStyleElement.id = "yte-custom-css";
	customCSSStyleElement.textContent = custom_css_code;
	return customCSSStyleElement;
}
export function customCSSExists() {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>("#yte-custom-css");
	// Check if the custom CSS style element exists
	if (!customCSSStyleElement) return false;
	return true;
}
