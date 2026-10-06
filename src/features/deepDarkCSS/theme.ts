import type { DeepDarkCustomThemeColors } from "@/src/types";

import { deepDarkCssID } from "@/src/utils/constants";

/**
 * Pure deep-dark helpers used by button color resolution.
 * Must not import deepDarkMaterialCSS — that string stays on the feature enable path only.
 */
export function deepDarkCSSExists(): boolean {
	return document.querySelector<HTMLStyleElement>(`#${deepDarkCssID}`) !== null;
}

export function getDeepDarkCustomThemeStyle({
	colorShadow,
	dimmerText,
	hoverBackground,
	mainBackground,
	mainColor,
	mainText,
	secondBackground
}: DeepDarkCustomThemeColors): string {
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
