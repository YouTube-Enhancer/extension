import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { registerAllFeatures } from "@/src/features/_registry/autoRegister";
import { registry } from "@/src/features/_registry/featureRegistry";
import { i18nService } from "@/src/i18n";
import {
	fetchOptions,
	reconcileAfterPageLoaded,
	reseedForNavigation,
	seed
} from "@/src/ui/configProvider";
import { DEV_MODE } from "@/src/utils/config/env";
import { buttonColorCache, getButtonColor } from "@/src/utils/deep-dark-theme/index";
import { disconnect as disconnectMutationBus } from "@/src/utils/dom/observers/domMutationBus";
import { sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/messaging";
import { setupDevToolsListener } from "@/src/utils/messaging/devtools.embedded";
import { ensureTrustedTypesPolicy } from "@/src/utils/security/trustedTypes";
import { isSupportedYouTubeHostname } from "@/src/utils/url/constants";

import { coreFeatures } from "./coreFeatures";
import { setupMessageListener } from "./messageHandling";

export interface CleanupHandle {
	dispose(options?: { disableFeatures?: boolean }): Promise<void>;
}

export async function setupYouTubePage(): Promise<CleanupHandle> {
	if (!isSupportedYouTubeHostname(window.location.hostname)) {
		return { dispose: async () => {} };
	}
	ensureTrustedTypesPolicy();

	const [options, { data: state }] = await Promise.all([
		fetchOptions(),
		waitForSpecificMessage("state", "request_data", "extension")
	]);
	seed(options);

	window.i18nextInstance = await i18nService(options.language ?? "en-US");

	await registerAllFeatures(state);

	getButtonColor();
	let colorDebounce: Nullable<ReturnType<typeof setTimeout>> = null;
	const colorObserver = new MutationObserver(() => {
		if (colorDebounce) clearTimeout(colorDebounce);
		colorDebounce = setTimeout(() => {
			buttonColorCache.clear();
			colorDebounce = null;
		}, 200);
	});
	colorObserver.observe(document.documentElement, {
		attributeFilter: ["dark"],
		attributes: true
	});

	await registry.initialize(async () => {
		const navOptions = await reseedForNavigation();
		await registry.enableAll(navOptions);
	});

	await coreFeatures.register();
	await registry.enableAll(options);

	if (DEV_MODE) {
		setupDevToolsListener();
	}

	const removeMessageListener = setupMessageListener();

	sendContentOnlyMessage("pageLoaded", undefined);

	/**
	 * The content script only forwards storage changes after it receives "pageLoaded", and the options above were
	 * read well before that. A setting changed while the page was still setting up (a few seconds on a slow load)
	 * would otherwise be lost until the next load. This second read, taken once forwarding is on, catches up on any
	 * such change. The baseline is the config the orchestrator last applied, not the options read above, so a change
	 * the forwarding has already delivered counts as applied and is not applied twice.
	 */
	await reconcileAfterPageLoaded({
		getAll: () => registry.getAll(),
		reconcile: (id, config, enabled) => registry.reconcileFeature(id, config, enabled)
	});

	return {
		async dispose(options?: { disableFeatures?: boolean }) {
			if (options?.disableFeatures) {
				try {
					await registry.disableAll();
				} catch (error) {
					console.error("Teardown: disableAll failed:", error);
				}
			}
			registry.destroyNavigationListener();
			eventManager.removeAllEventListeners();
			coreFeatures.destroy();
			colorObserver.disconnect();
			disconnectMutationBus();
			removeMessageListener();
		}
	};
}
