import type { getDeepDarkData } from "@/src/utils/deep-dark-theme/dom";

import { deepDarkPresets } from "@/src/deepDarkPresets";
import { getDeepDarkCustomThemeStyle } from "@/src/features/deepDarkCSS/utils";
import { getDeepDarkCSSConfig } from "@/src/ui/coreConfigStore";
import { resolveContrastColor } from "@/src/utils/color";

export function fallback(isDarkMode: boolean) {
	return isDarkMode ? "#FFFFFF" : "#000000";
}

export function resolveDeepDarkColors(data: ReturnType<typeof getDeepDarkData>) {
	if (!data) return;
	if (data.preset === "Custom" && data.colors) {
		return getDeepDarkCustomThemeStyle(data.colors);
	}
	if (data.preset !== "Custom") {
		return (deepDarkPresets as Record<string, string>)[data.preset];
	}
}

export function resolveFromCSS(): string {
	const config = getDeepDarkCSSConfig();
	if (!config) return "#FFFFFF";
	const { colors, preset } = config;
	const resolved = preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset];
	return resolveContrastColor(resolved);
}
