import type { configuration, Nullable, YouTubePlayerDiv } from "@/src/types";
import type { OnScreenDisplayType, ValueType } from "@/src/ui/OnScreenDisplayManager/types";

import { getOnScreenDisplayConfig } from "@/src/ui/onScreenDisplayConfigStore";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";

type OSDConfig = configuration["onScreenDisplay"];
type OSDValueType = ValueType;

export function getOSDConfig(fallback?: OSDConfig): Nullable<OSDConfig> {
	return getOnScreenDisplayConfig() ?? fallback ?? null;
}

export function showOSD(
	osdConfig: OSDConfig,
	playerContainer: YouTubePlayerDiv,
	displayValue: { max: number; type: OSDValueType; value: number },
	displayTypeOverride?: OnScreenDisplayType
) {
	const { color, hideTime, opacity, padding, position, type } = osdConfig;
	new OnScreenDisplayManager(
		{
			displayColor: color,
			displayHideTime: hideTime,
			displayOpacity: opacity,
			displayPadding: padding,
			displayPosition: position,
			displayType: displayTypeOverride ?? type,
			playerContainer
		},
		"yte-osd",
		displayValue
	);
}
