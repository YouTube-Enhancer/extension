import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { registerAllFeatures } from "@/src/features/_registry/autoRegister";
import { registry } from "@/src/features/_registry/featureRegistry";
import { i18nService } from "@/src/i18n";
import { fetchOptions, reconcileAfterPageLoaded, seed } from "@/src/ui/configProvider";
import { DEV_MODE } from "@/src/utils/config/env";
import { buttonColorCache, getButtonColor } from "@/src/utils/deep-dark-theme/index";
import { disconnectFromDomMutations } from "@/src/utils/dom/observers/domMutationBus";
import { sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/messaging";
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

	// Classify the page from the URL first so feature registration can enable
	// page-relevant features as chunks land, instead of waiting for every load phase.
	registry.initialize();

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

	await coreFeatures.register();
	// Enable any registered page-matching features that did not late-enable during import.
	// Off-page features stay disabled until navigation re-evaluates them.
	await registry.enableRegisteredForCurrentPage();

	if (DEV_MODE) {
		/**
		 * Dynamic import so production embedded bundles never pull the devtools listener.
		 * Rolldown drops the import when DEV_MODE is compile-time false.
		 */
		void import("@/src/utils/messaging/devtools.embedded")
			.then(({ setupDevToolsListener }) => {
				setupDevToolsListener();
				return undefined;
			})
			.catch(() => undefined);
	}

	const removeMessageListener = setupMessageListener();

	// Ready marker + pageLoaded: content forwards storage once either signal lands.
	// markReady is the liveness module's cross-world contract; the message stays for
	// any listeners that still key off the bus.
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
			/**
			 * Each teardown step runs even if an earlier one throws. A failed disableAll used to
			 * skip listener/history cleanup and left the next hot-reload instance stacked on top.
			 */
			if (options?.disableFeatures) {
				try {
					await registry.disableAll();
				} catch (error) {
					console.error("Teardown: disableAll failed:", error);
				}
			} else {
				/**
				 * Page teardown without disableAll still has to abort player retries and run feature
				 * disposers. Disabling first would call onDisable; disposeSessions is the lighter path.
				 */
				try {
					registry.disposeSessions();
				} catch (error) {
					console.error("Teardown: disposeSessions failed:", error);
				}
			}
			try {
				registry.destroyNavigationListener();
			} catch (error) {
				console.error("Teardown: destroyNavigationListener failed:", error);
			}
			try {
				eventManager.removeAllEventListeners();
			} catch (error) {
				console.error("Teardown: removeAllEventListeners failed:", error);
			}
			try {
				coreFeatures.destroy();
			} catch (error) {
				console.error("Teardown: coreFeatures.destroy failed:", error);
			}
			try {
				colorObserver.disconnect();
			} catch (error) {
				console.error("Teardown: colorObserver.disconnect failed:", error);
			}
			try {
				disconnectFromDomMutations();
			} catch (error) {
				console.error("Teardown: disconnectFromDomMutations failed:", error);
			}
			try {
				removeMessageListener();
			} catch (error) {
				console.error("Teardown: removeMessageListener failed:", error);
			}
		}
	};
}
