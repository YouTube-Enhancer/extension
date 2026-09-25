import type { configuration, Nullable } from "@/src/types";

/**
 * featureMenu is a core feature, so its settings do not flow through the per-feature config lifecycle. This store
 * is seeded at startup and fed by the featureMenuOpenTypeChange broadcast.
 */
let currentConfig: Nullable<configuration["featureMenu"]> = null;

export function getFeatureMenuConfig(): Nullable<configuration["featureMenu"]> {
	return currentConfig;
}

export function setFeatureMenuConfig(config: configuration["featureMenu"]) {
	currentConfig = config;
}
