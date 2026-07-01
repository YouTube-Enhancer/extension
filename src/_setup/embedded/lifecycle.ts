import eventManager from "@/src/events/EventManager";
import { registerAllFeatures } from "@/src/features/_registry/autoRegister";
import { registry } from "@/src/features/_registry/featureRegistry";
import { i18nService } from "@/src/i18n";
import { DEV_MODE } from "@/src/utils/config/env";
import { buttonColorCache, getButtonColor } from "@/src/utils/deep-dark-theme/index";
import { sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/messaging";
import { setupDevToolsListener } from "@/src/utils/messaging/devtools.embedded";

import { coreFeatures } from "./coreFeatures";
import { setupMessageListener } from "./messageHandling";

export interface CleanupHandle {
	dispose(): void;
}

export async function setupYouTubePage(): Promise<CleanupHandle> {
	const element = document.createElement("div");
	element.style.display = "none";
	element.id = "yte-message-from-youtube";
	document.documentElement.appendChild(element);

	const [
		{
			data: { options }
		},
		{ data: state }
	] = await Promise.all([waitForSpecificMessage("options", "request_data", "content"), waitForSpecificMessage("state", "request_data", "extension")]);

	window.i18nextInstance = await i18nService(options.language ?? "en-US");

	await registerAllFeatures(state);

	await getButtonColor();
	const colorObserver = new MutationObserver(() => {
		buttonColorCache.clear();
	});
	colorObserver.observe(document.documentElement, {
		attributeFilter: ["dark"],
		attributes: true
	});

	await registry.initialize(async () => {
		const {
			data: { options: navOptions }
		} = await waitForSpecificMessage("options", "request_data", "content");
		await registry.enableAll(navOptions);
	});

	await coreFeatures.register();
	await registry.enableAll(options);

	if (DEV_MODE) {
		setupDevToolsListener();
	}

	const removeMessageListener = setupMessageListener();

	sendContentOnlyMessage("pageLoaded", undefined);

	return {
		dispose() {
			registry.destroyNavigationListener();
			eventManager.removeAllEventListeners();
			coreFeatures.destroy();
			colorObserver.disconnect();
			removeMessageListener();
			element.remove();
		}
	};
}
