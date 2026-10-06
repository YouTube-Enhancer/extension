import { deepDarkMaterial } from "@/src/deepDarkMaterialCSS";
import { deepDarkCssID } from "@/src/utils/constants";

/**
 * Material CSS is only needed when the deep-dark feature injects or updates the style tag.
 * Keep this import here so button color resolution never pulls the ~155KB string.
 */
export function createDeepDarkCSSElement(css_code: string) {
	// Create the custom CSS style element
	const customCSSStyleElement = document.createElement("style");
	customCSSStyleElement.id = deepDarkCssID;
	customCSSStyleElement.textContent = `${deepDarkMaterial}\n${css_code}`;
	return customCSSStyleElement;
}

export function updateDeepDarkCSS(css_code: string) {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${deepDarkCssID}`);
	// Check if the custom CSS style element exists
	if (!customCSSStyleElement) return;
	customCSSStyleElement.replaceWith(createDeepDarkCSSElement(css_code));
}
