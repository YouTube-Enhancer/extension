import type { ZodMiniType } from "zod/v4-mini";

import browser from "webextension-polyfill";

import { getConfigurationImportSchema } from "@/src/utils/config/importSchema";
import { deepMerge } from "@/src/utils/config/utils";
import { deepEqual } from "@/src/utils/deepEqual";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Applies settings an administrator set through enterprise policy, read from `storage.managed`, to
 * the stored configuration. In Firefox that is `policies.json` (or the platform's policy store):
 *
 * ```json
 * { "policies": { "3rdparty": { "Extensions": { "{c49b13b1-5dee-4345-925e-0c793377e3fa}": {
 *   "playerSpeed": { "enabled": true, "speed": 1.75 }
 * } } } } }
 * ```
 *
 * A policy value is merged into the stored one, so it may set a single field of a feature's
 * configuration. Only configuration keys are accepted, and a value that fails the import schema is
 * skipped and logged rather than stored. Policy values win once, when this runs (browser startup and
 * install/update); a later change in the options page lasts until the next run.
 * @returns The keys that were written.
 */
export async function applyManagedSettings(): Promise<string[]> {
	let managed: Record<string, unknown>;
	try {
		managed = await browser.storage.managed.get();
	} catch {
		// No policy for this extension, or a browser without managed storage.
		return [];
	}
	const schemaShape = getConfigurationImportSchema().shape as Record<string, ZodMiniType>;
	const keys = Object.keys(managed).filter((key) => {
		if (key in schemaShape) return true;
		console.warn(`[Managed settings] Ignoring unknown setting "${key}"`);
		return false;
	});
	if (keys.length === 0) return [];
	const stored = await browser.storage.local.get(keys);
	const updates: Record<string, unknown> = {};
	for (const key of keys) {
		const { [key]: storedValue } = stored;
		const { [key]: managedValue } = managed;
		const merged =
			isPlainObject(storedValue) && isPlainObject(managedValue)
				? deepMerge(storedValue, managedValue)
				: managedValue;
		const result = schemaShape[key].safeParse(merged);
		if (!result.success) {
			console.warn(`[Managed settings] Ignoring invalid value for "${key}":`, result.error);
			continue;
		}
		if (!deepEqual(result.data, storedValue)) updates[key] = result.data;
	}
	const written = Object.keys(updates);
	if (written.length > 0) await browser.storage.local.set(updates);
	return written;
}
