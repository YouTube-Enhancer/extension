import eventManager from "@/src/events/EventManager";
import { registerAllFeatures } from "@/src/features/_registry/autoRegister";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { i18nService } from "@/src/i18n";
import { setOnScreenDisplayConfig } from "@/src/ui/onScreenDisplayConfigStore";
import { DEV_MODE } from "@/src/utils/config/env";
import { buttonColorCache, getButtonColor } from "@/src/utils/deep-dark-theme/index";
import { sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/messaging";
import { setupDevToolsListener } from "@/src/utils/messaging/devtools.embedded";
import { ensureTrustedTypesPolicy } from "@/src/utils/security/trustedTypes";
import { isSupportedYouTubeHostname } from "@/src/utils/url/constants";

import { coreFeatures } from "./coreFeatures";
import { setupMessageListener } from "./messageHandling";

export interface CleanupHandle {
	dispose(): void;
}

export async function setupYouTubePage(): Promise<CleanupHandle> {
	if (!isSupportedYouTubeHostname(window.location.hostname)) {
		return { dispose: () => {} };
	}
	ensureTrustedTypesPolicy();
	let element = document.getElementById("yte-message-from-youtube");
	if (!element) {
		element = document.createElement("div");
		element.style.display = "none";
		element.id = "yte-message-from-youtube";
		document.documentElement.appendChild(element);
	}

	const [
		{
			data: { options }
		},
		{ data: state }
	] = await Promise.all([waitForSpecificMessage("options", "request_data", "content"), waitForSpecificMessage("state", "request_data", "extension")]);

	window.i18nextInstance = await i18nService(options.language ?? "en-US");

	setOnScreenDisplayConfig(options.onScreenDisplay);

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
		setOnScreenDisplayConfig(navOptions.onScreenDisplay);
		await registry.enableAll(navOptions);
	});

	await coreFeatures.register();
	await registry.enableAll(options);

	if (DEV_MODE) {
		setupDevToolsListener();
	}

	const removeMessageListener = setupMessageListener();

	sendContentOnlyMessage("pageLoaded", undefined);

	// The content script only forwards storage changes from "pageLoaded" on, and the options above were read
	// well before that, so a setting changed while this page was setting up (a few seconds on a slow load) would
	// otherwise be lost until the next load. A second read after the forwarding is on catches up on any such change.
	// The baseline is the config the orchestrator last applied, not the options read above: a change the forwarding
	// has already delivered by now is then seen as applied instead of being applied a second time.
	const {
		data: { options: currentOptions }
	} = await waitForSpecificMessage("options", "request_data", "content");
	// The on-screen display is a core feature outside the registry, so the loop below does not cover its settings.
	setOnScreenDisplayConfig(currentOptions.onScreenDisplay);
	for (const feature of registry.getAll()) {
		const { id } = feature;
		const { [id]: current } = currentOptions;
		if (!current || !featureConfigManager.hasChanged(featureConfigManager.getLast(id), current)) continue;
		await registry.notifyConfigChange(id, current);
		await registry.updateFeatureEnabledState(id, resolveEnabled(current), current);
	}

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
