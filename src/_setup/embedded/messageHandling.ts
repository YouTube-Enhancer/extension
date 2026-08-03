import type { ExtensionSendOnlyMessages, Messages } from "@/src/types";

import { registry } from "@/src/features/_registry/featureRegistry";

import { coreFeatures } from "./coreFeatures";

export function setupMessageListener(): () => void {
	const handler = (_event: Event) => {
		const provider = document.querySelector("div#yte-message-from-extension");
		if (!provider?.textContent) return;
		let message: ExtensionSendOnlyMessages | Messages["response"] | null = null;
		try {
			message = JSON.parse(provider.textContent) as ExtensionSendOnlyMessages | Messages["response"];
		} catch (error) {
			console.error("[Embedded] Failed to parse incoming message:", error);
			return;
		}
		if (!message) return;
		void routeMessage(message);
	};

	document.addEventListener("yte-message-from-extension", handler);
	return () => document.removeEventListener("yte-message-from-extension", handler);
}

async function routeMessage(message: ExtensionSendOnlyMessages | Messages["response"]) {
	switch (message.type) {
		case "featureConfigChange":
			await registry.notifyConfigChange(message.data.id, message.data.config);
			break;
		case "featureEnabledStateChange":
			await registry.updateFeatureEnabledState(message.data.id, message.data.enabled, message.data.config);
			break;
		case "featureMenuOpenTypeChange":
			coreFeatures.handleConfigChange("featureMenu", { featureMenuOpenType: message.data.featureMenuOpenType });
			break;
		case "languageChange":
			await coreFeatures.handleLanguageChange(message.data.language);
			break;
	}
}
