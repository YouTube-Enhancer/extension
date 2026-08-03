import type { DeepDarkPreset } from "@/src/deepDarkPresets";
import type { DeepDarkCustomThemeColors } from "@/src/types";

export function clearDeepDarkData() {
	delete document.documentElement.dataset.yteDeepDarkPreset;
	delete document.documentElement.dataset.yteDeepDarkColors;
}
export function getDeepDarkData() {
	const { documentElement } = document;
	const preset = documentElement.getAttribute("data-yte-deep-dark-preset") as DeepDarkPreset | null;
	if (!preset) return null;
	const colorsStr = documentElement.getAttribute("data-yte-deep-dark-colors");
	const colors = colorsStr ? (JSON.parse(colorsStr) as DeepDarkCustomThemeColors) : null;
	return { colors, preset };
}
export function setDeepDarkData(preset: DeepDarkPreset, colors: DeepDarkCustomThemeColors | null) {
	document.documentElement.dataset.yteDeepDarkPreset = preset;
	if (colors && preset === "Custom") {
		document.documentElement.dataset.yteDeepDarkColors = JSON.stringify(colors);
	} else {
		delete document.documentElement.dataset.yteDeepDarkColors;
	}
}
