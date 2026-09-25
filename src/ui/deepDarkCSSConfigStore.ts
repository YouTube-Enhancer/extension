import type { configuration, Nullable } from "@/src/types";

/**
 * deepDarkCSS config store. Seeded at startup from the initial options read and kept in sync by the
 * deepDarkCSS feature's onEnable/onDisable/onConfigChange handlers.
 */
let currentConfig: Nullable<configuration["deepDarkCSS"]> = null;

export function getDeepDarkCSSConfig(): Nullable<configuration["deepDarkCSS"]> {
	return currentConfig;
}

export function setDeepDarkCSSConfig(config: configuration["deepDarkCSS"]) {
	currentConfig = config;
}
