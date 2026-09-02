import type { configuration, Nullable } from "@/src/types";

// onScreenDisplay is a core feature, so its settings don't flow through the
// per-feature config lifecycle; this store is fed by the
// onScreenDisplayConfigChange broadcast and seeded at startup.
let currentConfig: Nullable<configuration["onScreenDisplay"]> = null;

export function getOnScreenDisplayConfig(): Nullable<configuration["onScreenDisplay"]> {
	return currentConfig;
}

export function setOnScreenDisplayConfig(config: configuration["onScreenDisplay"]) {
	currentConfig = config;
}
