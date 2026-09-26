import type { ExtensionSendOnlyMessages, Messages, Nullable } from "@/src/types";

import { registry } from "@/src/features/_registry/featureRegistry";
import { setFeatureMenuConfig, setOnScreenDisplayConfig } from "@/src/ui/coreConfigStore";
import { MESSAGE_ORIGIN } from "@/src/utils/messaging";

import { coreFeatures } from "./coreFeatures";

export function setupMessageListener(): () => void {
	const handler = (event: MessageEvent) => {
		if (event.source !== window) return;
		const message = event.data as Nullable<ExtensionSendOnlyMessages | Messages["response"]>;
		if (message?.origin !== MESSAGE_ORIGIN) return;
		void routeMessage(message);
	};

	window.addEventListener("message", handler);
	return () => window.removeEventListener("message", handler);
}

async function routeMessage(message: ExtensionSendOnlyMessages | Messages["response"]) {
	switch (message.type) {
		case "featureMenuOpenTypeChange":
			setFeatureMenuConfig({ openType: message.data.featureMenuOpenType });
			coreFeatures.handleConfigChange("featureMenu", { featureMenuOpenType: message.data.featureMenuOpenType });
			break;
		case "featureUpdate":
			await registry.reconcileFeature(message.data.id, message.data.config, message.data.enabled);
			break;
		case "languageChange":
			await coreFeatures.handleLanguageChange(message.data.language);
			break;
		case "onScreenDisplayConfigChange":
			setOnScreenDisplayConfig(message.data.onScreenDisplay);
			break;
	}
}
