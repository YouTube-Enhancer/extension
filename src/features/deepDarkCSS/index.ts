import { deepDarkPresets } from "@/src/deepDarkPresets";
import { createFeature } from "@/src/features/_registry/createFeature";
import { updateButtonsIconColor } from "@/src/features/buttonPlacement/utils";
import { deepDarkCssID } from "@/src/utils/constants";
import { buttonColorCache } from "@/src/utils/deep-dark-theme";
import { clearDeepDarkData, setDeepDarkData } from "@/src/utils/deep-dark-theme/dom";

import { metadata } from "./index.metadata";
import { createDeepDarkCSSElement, deepDarkCSSExists, getDeepDarkCustomThemeStyle, updateDeepDarkCSS } from "./utils";

export default createFeature({
	...metadata,
	onConfigChange: ({ colors, preset }) => {
		if (deepDarkCSSExists()) {
			updateDeepDarkCSS(preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset]);
		}
		setDeepDarkData(preset, colors);
		buttonColorCache.clear();
		updateButtonsIconColor();
	},
	onDisable: () => {
		const deepDarkThemeStyleElement = document.querySelector<HTMLStyleElement>(`#${deepDarkCssID}`);
		if (!deepDarkThemeStyleElement) return;
		deepDarkThemeStyleElement.remove();
		clearDeepDarkData();
		buttonColorCache.clear();
		updateButtonsIconColor();
	},
	onEnable: ({ colors, preset }) => {
		if (deepDarkCSSExists()) {
			updateDeepDarkCSS(preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset]);
		} else {
			const deepDarkThemeStyleElement = createDeepDarkCSSElement(preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset]);
			document.head.appendChild(deepDarkThemeStyleElement);
		}
		setDeepDarkData(preset, colors);
		buttonColorCache.clear();
		updateButtonsIconColor();
	}
});
