import type { configuration, Nullable } from "@/src/types";

/**
 * onScreenDisplay is a core feature, so its settings do not flow through the per-feature config lifecycle. This store
 * is seeded at startup and fed by the onScreenDisplayConfigChange broadcast.
 */
let currentConfig: Nullable<configuration["onScreenDisplay"]> = null;

export function getOnScreenDisplayConfig(): Nullable<configuration["onScreenDisplay"]> {
	return currentConfig;
}

export function setOnScreenDisplayConfig(config: configuration["onScreenDisplay"]) {
	currentConfig = config;
}
