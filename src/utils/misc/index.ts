import type { Nullable, Path, PathValue } from "@/src/types";
export const MIN_DB = 0;
export const MAX_DB = Infinity;
export const STEP_DB = 1;
export function clampDb(db: number) {
	return Math.min(MAX_DB, Math.max(MIN_DB, db));
}
export function dbToLinear(db: number) {
	return Math.pow(10, db / 20);
}

// The matcher returns null to reject a node. Arrays count as objects.
export function findInObjectTree<T>(root: unknown, matcher: (node: Record<string, unknown>) => Nullable<T>, maxDepth = 10): Nullable<T> {
	if (!root || typeof root !== "object" || maxDepth < 0) return null;
	const matched = matcher(root as Record<string, unknown>);
	if (matched !== null && matched !== undefined) return matched;
	for (const value of Object.values(root)) {
		const found = findInObjectTree(value, matcher, maxDepth - 1);
		if (found !== null && found !== undefined) return found;
	}
	return null;
}

export function getPathValue<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
	const keys = typeof path === "string" ? (path as string).split(".") : [path];
	let value: unknown = obj;
	for (const key of keys) {
		if (value && typeof value === "object" && key in value) {
			({ [key]: value } = value as Record<string, unknown>);
		} else {
			console.error(`Invalid path: ${String(path)}`);
			return undefined as unknown as PathValue<T, P>;
		}
	}
	return value as PathValue<T, P>;
}
