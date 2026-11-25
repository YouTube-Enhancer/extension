import type { Page } from "@playwright/test";

import { randomUUID } from "crypto";

import type { PageType } from "@/src/features/_registry/types";
import type {
	ButtonPlacement,
	configuration,
	FeatureButtonId,
	FeatureMenuItemId,
	Path,
	PathValue
} from "@/src/types";
import type { FilterKeysByValueType } from "@/src/utils/_tests/types";
import type { ConstraintTree } from "@/src/validation/types";

import { expectFeatureButtonToBeIn } from "@/src/utils/_tests/assertions";
import { sendYouTubeMessage } from "@/src/utils/_tests/messaging";
import { loadAllFeatureMetadata } from "@/src/utils/_tests/metadata";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import {
	ensurePlayerControlsVisible,
	isExecutionContextDestroyed
} from "@/src/utils/_tests/pageSetup";
import { buildNumberConstraints, validateNumbers } from "@/src/validation/rules";
import { expect, watchExtensionErrors } from "@/tests/harness";

export type Switch = FilterKeysByValueType<configuration, boolean>;

export async function clickFeatureButton(
	page: Page,
	pageType: PageType,
	featureId: FeatureButtonId,
	placement: Exclude<ButtonPlacement, "feature_menu">
) {
	await expectFeatureButtonToBeIn(page, featureId, placement);

	if (placement !== "below_player") {
		await ensurePlayerControlsVisible(page, pageType);
	}

	await page.evaluate((id) => {
		const el = document.getElementById(id);
		if (el) el.click();
	}, featureId);
}
export async function clickFeatureMenuItem(
	page: Page,
	pageType: PageType,
	featureId: FeatureMenuItemId
) {
	await ensurePlayerControlsVisible(page, pageType);

	const menuButton = page.locator("#yte-feature-menu-button");
	await menuButton.waitFor({ state: "visible" });
	await menuButton.click();

	const item = page.locator(`#${featureId}`);
	await item.waitFor({ state: "visible" });
	await item.click();
}
/** Every configuration path whose last segment `matches`, found by walking the defaults. */
export function collectPaths(
	node: unknown,
	matches: (key: string) => boolean,
	prefix = "",
	out: Path<configuration>[] = []
): Path<configuration>[] {
	if (typeof node !== "object" || node === null) return out;
	for (const [key, value] of Object.entries(node)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (matches(key) && typeof value !== "object") out.push(path as Path<configuration>);
		else collectPaths(value, matches, path, out);
	}
	return out;
}

/** Every `enabled` switch in the configuration or feature defaults, features and their buttons alike. */
export function collectSwitches(defaults: unknown, prefix = ""): Switch[] {
	return collectPaths(defaults, (key) => key === "enabled", prefix) as Switch[];
}
/**
 * Disables a feature in the extension configuration.
 *
 * This helper must be used after navigating to a YouTube page,
 * otherwise the extension context and injected APIs may not be available.
 *
 * @param page - The active Playwright page instance.
 * @param feature - The boolean feature key to disable.
 */
export async function disableFeature(
	page: Page,
	feature: FilterKeysByValueType<configuration, boolean>
) {
	await setFeatureValue(page, feature, false);
}
/**
 * Enables a feature in the extension configuration.
 *
 * This helper must be used after navigating to a YouTube page,
 * otherwise the extension context and injected APIs may not be available.
 *
 * @param page - The active Playwright page instance.
 * @param feature - The boolean feature key to enable.
 */
export async function enableFeature(
	page: Page,
	feature: FilterKeysByValueType<configuration, boolean>
) {
	await setFeatureValue(page, feature, true);
}
export async function setFeatureValue<K extends Path<configuration>>(
	page: Page,
	key: K,
	value: PathValue<configuration, K>
) {
	// Reject an out-of-bounds value before anything touches storage: the frontend enforces the
	// metadata's min/max/step on every user edit, so a write that skips that check would park
	// invalid config in storage and blame the product for whatever the spec asserts next.
	validateNumbers(pathValueObject(key, value), await numberConstraints());
	// Clear the signal so the wait observes this write's acknowledgement cycle. The embedded
	// script sets it to this write's nonce after reconciling a featureUpdate; the content
	// script sets it when the write produced nothing to reconcile (an identical value).
	// A live page can navigate mid-sweep (YouTube's reload storms), which destroys this
	// evaluate's execution context. Re-establish the re-injected document and re-send the
	// write rather than failing a long sequential sweep on a page that may navigate under
	// load (the every-feature live sweep is the main exposure, at ~50 writes wide).
	for (let attempt = 0; ; attempt++) {
		try {
			await page.evaluate(() => document.documentElement.removeAttribute("yte-config-processing"));
			break;
		} catch (error) {
			if (!isExecutionContextDestroyed(error) || attempt >= 2) throw error;
			// The fresh document carries no stale signal to clear; wait for the extension to
			// re-inject so the message below reaches a listening content script.
			await page.waitForSelector("html[yte-ready]", { timeout: 30_000 }).catch(() => {});
		}
	}
	// Interval polling instead of Playwright's rAF default, which can stall on throttled
	// background pages under full-suite load. 60 s (not the bare 30 s) so the every-feature
	// sweep - ~50 sequential writes, each waiting on its feature's onEnable reconcile, whose
	// player retries stretch under 5-worker load - does not read a legitimately slow enable
	// as a lost write. Each write carries a nonce and the acknowledgement is that nonce on
	// yte-config-processing: the embedded script sets it after reconciling this write's
	// featureUpdate, the content script sets it when there was nothing to reconcile, and the
	// content script answers `failed:<nonce>` when it could not forward the write at all. A
	// lost message is covered by one re-send carrying the same nonce, so whichever attempt
	// lands answers for it; a write that is never acknowledged fails with the key's name
	// instead of surfacing later as a mystery. A live page can navigate between the send and
	// the reconcile, dropping the message with no trace; that is what the re-send is for.
	const nonce = randomUUID();
	for (let send = 0; ; send++) {
		try {
			await sendYouTubeMessage(page, {
				action: "send_data",
				data: { key, nonce, value },
				source: "content",
				type: "test_setConfigValue"
			});
			const handle = await page.waitForFunction(
				(expected) => {
					const signal = document.documentElement.getAttribute("yte-config-processing");
					if (signal === expected) return "acknowledged";
					if (signal === `failed:${expected}`) return "rejected";
					return null;
				},
				nonce,
				{ polling: 100, timeout: 60_000 }
			);
			if ((await handle.jsonValue()) === "acknowledged") break;
			throw new Error(
				"the content script could not forward the write (it is not ready to accept one)"
			);
		} catch (error) {
			if (send >= 1) {
				throw new Error(
					`the config write for "${key}" was never acknowledged: ${
						error instanceof Error ? error.message : String(error)
					}`
				);
			}
			// A fresh document carries no stale signal; wait for the extension to re-inject so
			// the re-send reaches a listening content script.
			await page.waitForSelector("html[yte-ready]", { timeout: 30_000 }).catch(() => {});
		}
	}
	// No settle timer follows: the acknowledgement now arrives only after the write has
	// reconciled (or provably had nothing to reconcile), which is what the old 250 ms
	// was approximating.
}
/**
 * Sets a configuration option for the extension.
 *
 * This helper must be used after navigating to a YouTube page,
 * otherwise the extension context and injected APIs may not be available.
 *
 * @template P - The Playwright page type.
 * @template K - The configuration path key.
 * @template V - The value type for the provided configuration path.
 *
 * @param page - The active Playwright page instance.
 * @param id - The configuration option path to update.
 * @param value - The value to assign to the configuration option.
 */
export async function setOption<
	P extends Page,
	K extends Path<configuration>,
	V extends PathValue<configuration, K>
>(page: P, id: K, value: V) {
	await setFeatureValue(page, id, value);
}
let _cachedDefaultConfig: configuration | null = null;
/**
 * Enables the feature on a page outside its dependencies and proves the page gate keeps it
 * quiet there: the enable must land without an uncaught extension error and the armed
 * feature must not misfire against elements that page does not have.
 */
export async function expectFeatureSilentOnNonTargetPage(
	page: Page,
	featureKey: Parameters<typeof enableFeature>[1],
	pageType: PageType
): Promise<void> {
	const errors = watchExtensionErrors(page);
	await navigateToPageType(page, pageType);
	await enableFeature(page, featureKey);
	await page.waitForTimeout(2000);
	expect(errors, "the extension raised errors on the page").toEqual([]);
}

export async function loadDefaultConfig(): Promise<configuration> {
	if (_cachedDefaultConfig) return _cachedDefaultConfig;
	const vite = await import("vite");
	const server = await vite.createServer({
		appType: "custom",
		logLevel: "error",
		server: { watch: null }
	});
	try {
		await server.pluginContainer.buildStart({});
		const mod = (await server.ssrLoadModule("/src/utils/config/defaults.ts")) as {
			getDefaultConfiguration: () => configuration;
		};
		_cachedDefaultConfig = mod.getDefaultConfiguration();
		return _cachedDefaultConfig;
	} finally {
		await server.close();
	}
}

let _cachedNumberConstraints: ConstraintTree | null = null;
/**
 * The numeric constraint tree for every feature's settings, built from the same metadata files and
 * the same rules the frontend validates with. Loaded lazily once per worker: the registry cannot be
 * used here because its `import.meta.glob` only exists under Vite.
 */
async function numberConstraints(): Promise<ConstraintTree> {
	if (_cachedNumberConstraints) return _cachedNumberConstraints;
	const allMetadata = await loadAllFeatureMetadata();
	const allSettings: unknown[] = [];
	for (const metadata of allMetadata) {
		if (metadata.settings) allSettings.push(...metadata.settings);
	}
	_cachedNumberConstraints = buildNumberConstraints(allSettings);
	return _cachedNumberConstraints;
}
/** Wraps one dotted write as the single-key object the shared validator walks. */
function pathValueObject(key: string, value: unknown): Record<string, unknown> {
	const root: Record<string, unknown> = {};
	let cursor = root;
	const parts = key.split(".");
	for (const part of parts.slice(0, -1)) {
		cursor[part] = {};
		cursor = cursor[part] as Record<string, unknown>;
	}
	const { [parts.length - 1]: lastPart } = parts;
	cursor[lastPart] = value;
	return root;
}
