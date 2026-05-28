import { deepDarkPresets } from "@/src/deepDarkPresets";
import { getDeepDarkCustomThemeStyle } from "@/src/features/deepDarkCSS/utils";
import { resolveContrastColor } from "@/src/utils/color";
import { getDeepDarkData } from "@/src/utils/deep-dark-theme/dom";
import { waitForSpecificMessage } from "@/src/utils/messaging";

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

export async function resolveFromCSS(): Promise<string> {
	const {
		data: {
			options: {
				deepDarkCSS: { colors, preset }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const resolved = preset === "Custom" ? getDeepDarkCustomThemeStyle(colors) : deepDarkPresets[preset];
	return resolveContrastColor(resolved);
}
