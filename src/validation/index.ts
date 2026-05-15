import type { ConstraintTree } from "@/src/validation/types";

export function validateNumbers<T extends Record<string, unknown>>(obj: T, constraints: ConstraintTree, path: (number | string)[] = []): void {
	const EPSILON = 1e-8;
	for (const key in constraints) {
		if (!Object.prototype.hasOwnProperty.call(constraints, key)) continue;
		const { [key]: rule } = constraints;
		const { [key]: value } = obj as Record<string, unknown>;
		const currentPath = [...path, key];
		// Nested object → recurse
		if (isConstraintTree(rule)) {
			if (value && typeof value === "object" && !Array.isArray(value)) {
				validateNumbers(value as Record<string, unknown>, rule, currentPath);
			}
			continue;
		}
		// Leaf constraint → validate number
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

function isConstraintTree(value: any): value is ConstraintTree {
	return typeof value === "object" && value !== null && !("min" in value || "max" in value || "step" in value);
}
export * from "./constraints";
export * from "./types";
