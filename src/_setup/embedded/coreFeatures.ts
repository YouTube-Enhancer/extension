import type { AvailableLocales } from "@/src/i18n/constants";
import type { Nullable } from "@/src/types";

import { registry } from "@/src/features/_registry/featureRegistry";
import {
	enableFeatureMenu,
	hasFeaturesInMenu,
	refreshAllLabels,
	setupFeatureMenuEventListeners,
	updateFeatureMenuTitle
} from "@/src/features/buttonController";
import { i18nService } from "@/src/i18n";

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
		cleanupListeners = setupFeatureMenuEventListeners(data.featureMenuOpenType);
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
