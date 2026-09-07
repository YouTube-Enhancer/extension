import type { DeepDarkPreset } from "@/src/deepDarkPresets";
import type { DeepDarkCustomThemeColors, Nullable } from "@/src/types";

// The attributes the theme leaves on the document element for the button colouring. Shared with the specs.
export const DEEP_DARK_COLORS_ATTRIBUTE = "data-yte-deep-dark-colors";
export const DEEP_DARK_PRESET_ATTRIBUTE = "data-yte-deep-dark-preset";

export function clearDeepDarkData() {
	delete document.documentElement.dataset.yteDeepDarkPreset;
	delete document.documentElement.dataset.yteDeepDarkColors;
}
export function getDeepDarkData() {
	const { documentElement } = document;
	const preset = documentElement.getAttribute(DEEP_DARK_PRESET_ATTRIBUTE) as Nullable<DeepDarkPreset>;
	if (!preset) return null;
	const colorsStr = documentElement.getAttribute(DEEP_DARK_COLORS_ATTRIBUTE);
	const colors = colorsStr ? (JSON.parse(colorsStr) as DeepDarkCustomThemeColors) : null;
	return { colors, preset };
}
export function setDeepDarkData(preset: DeepDarkPreset, colors: Nullable<DeepDarkCustomThemeColors>) {
	document.documentElement.dataset.yteDeepDarkPreset = preset;
	if (colors && preset === "Custom") {
		document.documentElement.dataset.yteDeepDarkColors = JSON.stringify(colors);
	} else {
		delete document.documentElement.dataset.yteDeepDarkColors;
	}
}
