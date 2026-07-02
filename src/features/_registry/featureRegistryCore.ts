import type { AnyFeatureBase, FeatureBase, FeatureKeys } from "@/src/features/_registry/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";

const featureKeys = metadataRegistry.getAll().map((m) => m.id) as FeatureKeys[];

export function hasState(feature: AnyFeatureBase): feature is AnyFeatureBase & { state: NonNullable<AnyFeatureBase["state"]> } {
	return "state" in feature && feature.state !== undefined;
}
export function isFeature(feature: unknown): feature is FeatureBase<FeatureKeys> {
	if (!isObject(feature)) {
		console.warn("Feature check failed: not an object", feature);
		return false;
	}
	if (!("id" in feature && "defaults" in feature && "schemaInput" in feature)) {
		console.warn("Feature check failed: missing required properties ('id', 'defaults', 'schemaInput')", feature);
		return false;
	}
	const hasEnable = "onEnable" in feature;
	const hasDisable = "onDisable" in feature;
	if (hasEnable !== hasDisable) {
		console.warn("Feature check failed: must have both onEnable and onDisable, or neither", feature);
		return false;
	}
	if (hasEnable) {
		if (typeof feature.onEnable !== "function" || typeof feature.onDisable !== "function") {
			console.warn("Feature check failed: onEnable/onDisable must be functions", feature);
			return false;
		}
	}
	if ("buttons" in feature && !Array.isArray(feature.buttons)) {
		console.warn("Feature check failed: 'buttons' must be an array", feature);
		return false;
	}
	if ("state" in feature && !("stateSchemaInput" in feature)) {
		console.warn("Feature check failed: feature has 'state' but no 'stateSchemaInput'", feature);
		return false;
	}
	return true;
}
export function isFeatureKey(key: string): key is FeatureKeys {
	return featureKeys.includes(key);
}
export function resolveEnabled(config: unknown, visited = new WeakSet()): boolean {
	if (!config || typeof config !== "object" || visited.has(config)) return false;
	visited.add(config);
	if ("enabled" in config && typeof (config as { enabled?: unknown }).enabled === "boolean") return (config as { enabled: boolean }).enabled;
	for (const value of Object.values(config as Record<string, unknown>)) {
		if (value && typeof value === "object") {
			if (resolveEnabled(value, visited)) return true;
		}
	}
	return false;
}
function isObject(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null;
}
