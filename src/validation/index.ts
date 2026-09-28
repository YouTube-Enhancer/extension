import type { ConstraintTree } from "@/src/validation/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { isGroupNode, isSettingNode } from "@/src/features/_registry/types";

export function getNumberConstraints(): ConstraintTree {
	const constraints: ConstraintTree = {};
	for (const feature of metadataRegistry.getAll()) {
		if (!feature.settings) continue;
		for (const node of feature.settings) {
			extractConstraints(node, constraints);
		}
	}
	// Core features have settings defined in React components, not the metadata registry.
	// These are the only numeric constraints for core features.
	setNestedPath(constraints, ["onScreenDisplay", "opacity"], { max: 100, min: 1 });
	return constraints;
}

export function validateNumbers<T extends Record<string, unknown>>(obj: T, constraints: ConstraintTree, path: (number | string)[] = []): void {
	const EPSILON = 1e-8;
	for (const key in constraints) {
		if (!Object.prototype.hasOwnProperty.call(constraints, key)) continue;
		const { [key]: rule } = constraints;
		const { [key]: value } = obj as Record<string, unknown>;
		const currentPath = [...path, key];
		if (isConstraintTree(rule)) {
			if (value && typeof value === "object" && !Array.isArray(value)) {
				validateNumbers(value as Record<string, unknown>, rule, currentPath);
			}
			continue;
		}
		if (typeof value !== "number") continue;
		const { max, min, step } = rule;
		const label = currentPath.map(String).join(".");
		if (min !== undefined && value < min - EPSILON) {
			throw new Error(`${label} must be >= ${min}`);
		}
		if (max !== undefined && value > max + EPSILON) {
			throw new Error(`${label} must be <= ${max}`);
		}
		if (step !== undefined) {
			const base = min ?? 0;
			const remainder = (value - base) % step;
			if (!(Math.abs(remainder) < EPSILON || Math.abs(remainder - step) < EPSILON)) {
				throw new Error(`${label} must be in steps of ${step}`);
			}
		}
	}
}

function extractConstraints(node: unknown, constraints: ConstraintTree): void {
	if (isGroupNode(node)) {
		for (const child of node.children) {
			extractConstraints(child, constraints);
		}
		return;
	}
	if (!isSettingNode(node)) return;
	if (!hasNumericConstraints(node)) return;
	const { id, max, min, step } = node;
	if (max === undefined && min === undefined && step === undefined) return;
	const pathParts = id.split(".");
	setNestedPath(constraints, pathParts, { max, min, step });
}

function hasNumericConstraints(node: unknown): node is { component: "number" | "slider"; id: string; max?: number; min?: number; step?: number } {
	if (typeof node !== "object" || node === null) return false;
	if (!("component" in node)) return false;
	const { component } = node;
	return component === "number" || component === "slider";
}

function isConstraintTree(value: unknown): value is ConstraintTree {
	return typeof value === "object" && value !== null && !("min" in value || "max" in value || "step" in value);
}

function setNestedPath(obj: Record<string, unknown>, pathParts: string[], value: unknown): void {
	let current = obj;
	for (let i = 0; i < pathParts.length - 1; i++) {
		const { [i]: part } = pathParts;
		if (!(part in current) || typeof current[part] !== "object") {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	const { [pathParts.length - 1]: lastPart } = pathParts;
	current[lastPart] = value;
}

export * from "./types";
