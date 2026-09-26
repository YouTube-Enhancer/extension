import type { configuration, Nullable } from "@/src/types";

/**
 * Consolidated store for core feature configs (onScreenDisplay, featureMenu, deepDarkCSS).
 * These are outside the per-feature config lifecycle. Seeded at startup and fed by
 * dedicated broadcast messages.
 */

let onScreenDisplay: Nullable<configuration["onScreenDisplay"]> = null;
let featureMenu: Nullable<configuration["featureMenu"]> = null;
let deepDarkCSS: Nullable<configuration["deepDarkCSS"]> = null;

export function getDeepDarkCSSConfig(): Nullable<configuration["deepDarkCSS"]> {
	return deepDarkCSS;
}

export function getFeatureMenuConfig(): Nullable<configuration["featureMenu"]> {
	return featureMenu;
}

export function getOnScreenDisplayConfig(): Nullable<configuration["onScreenDisplay"]> {
	return onScreenDisplay;
}

export function setCoreConfigs({
	deepDarkCSS: deepDarkCSSConfig,
	featureMenu: featureMenuConfig,
	onScreenDisplay: onScreenDisplayConfig
}: {
	deepDarkCSS?: configuration["deepDarkCSS"];
	featureMenu?: configuration["featureMenu"];
	onScreenDisplay?: configuration["onScreenDisplay"];
}) {
	if (onScreenDisplayConfig !== undefined) onScreenDisplay = onScreenDisplayConfig;
	if (featureMenuConfig !== undefined) featureMenu = featureMenuConfig;
	if (deepDarkCSSConfig !== undefined) deepDarkCSS = deepDarkCSSConfig;
}

export function setDeepDarkCSSConfig(config: configuration["deepDarkCSS"]) {
	deepDarkCSS = config;
}

export function setFeatureMenuConfig(config: configuration["featureMenu"]) {
	featureMenu = config;
}

export function setOnScreenDisplayConfig(config: configuration["onScreenDisplay"]) {
	onScreenDisplay = config;
}
