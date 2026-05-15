import type { FeatureKeys, FeatureSettingNode, SettingNode } from "@/src/features/_registry/types";

import { isGroupNode, isSettingNode } from "@/src/features/_registry/types";

export function getSettingConfigs<F extends FeatureKeys>(settings: FeatureSettingNode<F>[]): SettingNode<F>[] {
	const configs: SettingNode<F>[] = [];

	for (const node of settings) {
		if (isSettingNode<F>(node) && !String(node.id).endsWith(".enabled")) {
			configs.push(node);
		} else if (isGroupNode<F>(node)) {
			configs.push(...getSettingConfigs<F>(node.children));
		}
	}

	return configs;
}

export function isBoolean(val: unknown): val is boolean {
	return typeof val === "boolean";
}

export function isNumber(val: unknown): val is number {
	return typeof val === "number" && !isNaN(val);
}

export function isString(val: unknown): val is string {
	return typeof val === "string";
}
