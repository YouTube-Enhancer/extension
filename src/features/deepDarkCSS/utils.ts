import type { DeepDarkCustomThemeColors } from "@/src/types";

import { deepDarkMaterial } from "@/src/deepDarkMaterialCSS";
import { deepDarkCssID } from "@/src/features/deepDarkCSS";

export function updateDeepDarkCSS(css_code: string) {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${deepDarkCssID}`);
	customCSSStyleElement?.replaceWith(createDeepDarkCSSElement(css_code));
}
export function createDeepDarkCSSElement(css_code: string) {
	// Create the custom CSS style element
	const customCSSStyleElement = document.createElement("style");
	customCSSStyleElement.id = deepDarkCssID;
	customCSSStyleElement.textContent = `${deepDarkMaterial}\n${css_code}`;
	return customCSSStyleElement;
}
export function deepDarkCSSExists() {
	// Get the custom CSS style element
	const customCSSStyleElement = document.querySelector<HTMLStyleElement>(`#${deepDarkCssID}`);
	// Check if the custom CSS style element exists
	return customCSSStyleElement !== null;
}

export function getDeepDarkCustomThemeStyle({
	colorShadow,
	dimmerText,
	hoverBackground,
	mainBackground,
	mainColor,
	mainText,
	secondBackground
}: DeepDarkCustomThemeColors) {
	return `:root {
		--main-color: ${mainColor};
		--main-background: ${mainBackground};
		--second-background: ${secondBackground};
		--hover-background: ${hoverBackground};
		--main-text: ${mainText};
		--dimmer-text: ${dimmerText};
		--shadow: 0 1px 0.5px ${colorShadow};
	}`;
}
