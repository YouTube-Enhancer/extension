import type { FeatureKeys, FeatureSettingNode } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { isGroupNode, isSettingNode } from "@/src/features/_registry/types";

import type { SubFeatureInfo } from "./types";

export function getEnabledPathFromMetadata<F extends FeatureKeys>(settings: FeatureSettingNode<F>[], featureId: string): Nullable<string> {
	for (const node of settings) {
		if (isSettingNode(node) && String(node.id).endsWith(".enabled")) {
			return node.id as string;
		}
		if (isGroupNode(node) && node.children) {
			const found = getEnabledPathFromMetadata(node.children, featureId);
			if (found) return found;
		}
	}
	return null;
}

export function getEnabledPathsFromMetadata<F extends FeatureKeys>(settings: FeatureSettingNode<F>[], featureId: string): SubFeatureInfo[] {
	const result: SubFeatureInfo[] = [];
	for (const node of settings) {
		if (isSettingNode(node) && String(node.id).endsWith(".enabled")) {
			result.push({
				enabled: false,
				key: String(node.id).replace(`${featureId}.`, "").replace(".enabled", ""),
				path: String(node.id)
			});
		}
		if (isGroupNode(node) && node.children) {
			result.push(...getEnabledPathsFromMetadata(node.children, featureId));
		}
	}
	return result;
}

export function getSubFeatures(config: unknown, prefix = ""): SubFeatureInfo[] {
	const result: SubFeatureInfo[] = [];
	if (!config || typeof config !== "object") return result;
	const obj = config as Record<string, unknown>;

	for (const [key, value] of Object.entries(obj)) {
		if (typeof key !== "string") continue;
		const currentPath = prefix ? `${prefix}.${key}` : key;

		if (value && typeof value === "object") {
			const nested = value as Record<string, unknown>;
			if ("enabled" in nested && typeof nested.enabled === "boolean") {
				result.push({
					enabled: nested.enabled,
					key: currentPath,
					path: `${currentPath}.enabled`
				});
			} else {
				result.push(...getSubFeatures(nested, currentPath));
			}
		}
	}
	return result;
}

export function hasAnyConfigurableSettings(settings: unknown[]): boolean {
	return settings.some((node) => {
		if (!node || typeof node !== "object") return false;
		const n = node as Record<string, unknown>;
		if (n.type === "group" && Array.isArray(n.children)) {
			return hasAnyConfigurableSettings(n.children);
		}
		if (n.type === "divider" || n.type === "text") return false;
		const settingId = typeof n.id === "string" ? n.id : "";
		return settingId !== "enabled" && !settingId.endsWith(".enabled");
	});
}

export function hasButtonPlacement(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	return "button" in config || "buttons" in config;
}
