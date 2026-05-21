import type { Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { ButtonPlacement, configuration, FeatureButtonId, FeatureMenuItemId, Path, PathValue } from "@/src/types";
import type { FilterKeysByValueType } from "@/src/utils/_tests/types";

import { expectFeatureButtonToBeIn } from "@/src/utils/_tests/assertions";
import { sendYouTubeMessage } from "@/src/utils/_tests/messaging";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";

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
export async function clickFeatureMenuItem(page: Page, pageType: PageType, featureId: FeatureMenuItemId) {
	await ensurePlayerControlsVisible(page, pageType);

	const menuButton = page.locator("#yte-feature-menu-button");
	await menuButton.waitFor({ state: "visible" });
	await menuButton.click();

	const item = page.locator(`#${featureId}`);
	await item.waitFor({ state: "visible" });
	await item.click();
}
export async function disableFeature(page: Page, feature: FilterKeysByValueType<configuration, boolean>) {
	await setFeatureValue(page, feature, false);
}
export async function enableFeature(page: Page, feature: FilterKeysByValueType<configuration, boolean>) {
	await setFeatureValue(page, feature, true);
}
export async function setFeatureValue<K extends Path<configuration>>(page: Page, key: K, value: PathValue<configuration, K>) {
	await sendYouTubeMessage(page, {
		action: "send_data",
		data: { key, value },
		source: "content",
		type: "test_setConfigValue"
	});
	await page.waitForTimeout(300);
}
export async function setOption<P extends Page, K extends Path<configuration>, V extends PathValue<configuration, K>>(page: P, id: K, value: V) {
	await setFeatureValue(page, id, value);
}
let _cachedDefaultConfig: configuration | null = null;
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
		const mod = (await server.ssrLoadModule("/src/utils/config/defaults.ts")) as { getDefaultConfiguration: () => configuration };
		_cachedDefaultConfig = mod.getDefaultConfiguration();
		return _cachedDefaultConfig;
	} finally {
		await server.close();
	}
}
