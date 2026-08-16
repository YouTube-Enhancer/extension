import type { AvailableLocales } from "@/src/i18n/constants";
import type { Nullable } from "@/src/types";

import { registry } from "@/src/features/_registry/featureRegistry";
import { enableFeatureMenu, featuresInMenu, setupFeatureMenuEventListeners, updateFeatureMenuTitle } from "@/src/features/buttonController";
import { i18nService } from "@/src/i18n";
import { waitForSpecificMessage } from "@/src/utils/messaging";

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
		const {
			data: { options }
		} = await waitForSpecificMessage("options", "request_data", "content");
		const {
			i18nextInstance: { t }
		} = window;
		await registry.disableAll();
		await registry.enableAll(options);
		if (featuresInMenu.size > 0) {
			updateFeatureMenuTitle(t((tr) => tr.pages.content.features.featureMenu.button.label));
		}
	},

	async register() {
		await enableFeatureMenu();
	}
};
