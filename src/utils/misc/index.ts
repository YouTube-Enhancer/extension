import type { Path, PathValue } from "@/src/types";

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
