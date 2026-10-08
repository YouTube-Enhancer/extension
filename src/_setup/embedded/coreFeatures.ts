import type { AvailableLocales } from "@/src/i18n/constants";
import type { Nullable } from "@/src/types";

import { registry } from "@/src/features/_registry/featureRegistry";
import {
	bindFeatureMenuEventListeners,
	enableFeatureMenu,
	hasFeaturesInMenu,
	refreshAllLabels,
	resolveButtonConfig,
	updateFeatureMenuTitle
} from "@/src/features/buttonController";
import { i18nService } from "@/src/i18n";
import { isWatchPage } from "@/src/utils/url";

let cleanupListeners: Nullable<() => void> = null;

export const coreFeatures = {
	destroy() {
		if (cleanupListeners) {
			cleanupListeners();
			cleanupListeners = null;
		}
	},

	handleConfigChange(_id: string, data: { featureMenuOpenType: "click" | "hover" }) {
		if (cleanupListeners) {
			cleanupListeners();
			cleanupListeners = null;
		}
		cleanupListeners = bindFeatureMenuEventListeners(data.featureMenuOpenType);
		// Menu items lost to a player re-render stay lost until some unrelated config change
		// re-reconciles their feature; the openType switch is when the menu is being touched, so
		// re-verify placement for every enabled feature whose buttons live in the menu.
		reverifyMenuButtonPlacement();
	},

	async handleLanguageChange(language: AvailableLocales) {
		window.i18nextInstance = await i18nService(language);
		refreshAllLabels();
		await registry.notifyLanguageChange();
		const {
			i18nextInstance: { t }
		} = window;
		if (hasFeaturesInMenu()) {
			updateFeatureMenuTitle(t((tr) => tr.pages.content.features.featureMenu.button.label));
		}
	},

	async register() {
		await enableFeatureMenu();
	}
};

/** Re-runs button placement for enabled features with menu-placed buttons, so lost menu items return. */
function reverifyMenuButtonPlacement() {
	if (!isWatchPage()) return;
	for (const feature of registry.getAll()) {
		if (!registry.isFeatureEnabled(feature.id)) continue;
		if (!registry.hasButtons(feature, feature.id)) continue;
		const config = registry.getConfigOr(feature.id, feature.defaults);
		const menuPlaced = feature.buttons.some(
			(button) => resolveButtonConfig(config, feature.id, button.name)?.placement === "feature_menu"
		);
		if (!menuPlaced) continue;
		// Config is unchanged, so the reconcile is placement-only: the enabled state does not move.
		void registry.reconcileFeature(feature.id, config, true);
	}
}
