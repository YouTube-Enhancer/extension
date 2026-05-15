import eventManager from "@/src/events/EventManager";
import { registerAllFeatures } from "@/src/features/_registry/autoRegister";
import { registry } from "@/src/features/_registry/featureRegistry";
import { setupFeatureMenuEventListeners } from "@/src/features/featureMenu";
import { featuresInMenu, updateFeatureMenuTitle } from "@/src/features/featureMenu/utils";
import { i18nService } from "@/src/i18n";
import { type ExtensionSendOnlyMessages, type Messages } from "@/src/types";
import { DEV_MODE } from "@/src/utils/config/env";
import { buttonColorCache, getButtonColor } from "@/src/utils/deep-dark-theme/index";
import { browserColorLog } from "@/src/utils/logging";
import { sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/messaging";
import { setupDevToolsListener } from "@/src/utils/messaging/devtools.embedded";
import { formatError } from "@/utils/format/error";
// TODO: Add always show progressbar feature
let isFirstLoad = true;
let isInitializing = false;
/**
 * Creates a hidden div element with a specific ID that can be used to receive messages from YouTube.
 * The element is appended to the document's root element.
 */
const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-youtube";
document.documentElement.appendChild(element);

let isEnablingFeatures = false;
let cleanupFeatureMenuListeners: (() => void) | null = null;

const enableFeatures = async () => {
	// Don't enable features if already enabling
	if (isEnablingFeatures) return;
	isEnablingFeatures = true;
	browserColorLog(`Enabling features...`, "FgMagenta");
	try {
		const {
			data: { options }
		} = await waitForSpecificMessage("options", "request_data", "content");
		await registry.enableAll(options);
	} finally {
		isEnablingFeatures = false;
	}
};

const initialize = function () {
	void (async () => {
		if (isInitializing) return;
		isInitializing = true;
		try {
			const {
				data: {
					options: { language }
				}
			} = await waitForSpecificMessage("options", "request_data", "content");
			const i18nextInstance = await i18nService(language);
			window.i18nextInstance = i18nextInstance;
			if (isFirstLoad) {
				await registerAllFeatures();
				await getButtonColor();
				await registry.initialize(enableFeatures);
				new MutationObserver(() => {
					buttonColorCache.clear();
				}).observe(document.documentElement, { attributeFilter: ["dark"], attributes: true });
				await enableFeatures();
			}
			isFirstLoad = false;
		} finally {
			isInitializing = false;
		}

		if (DEV_MODE) {
			setupDevToolsListener();
		}
		/**
		 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
		 *
		 * @returns {void}
		 */
		document.addEventListener("yte-message-from-extension", () => {
			void (async () => {
				const provider = document.querySelector("div#yte-message-from-extension");
				if (!provider) return;
				const { textContent: stringifiedMessage } = provider;
				if (!stringifiedMessage) return;
				let message;
				try {
					message = JSON.parse(stringifiedMessage) as ExtensionSendOnlyMessages | Messages["response"];
				} catch (error) {
					console.error("[Embedded] Failed to parse incoming message:", error);
					return;
				}
				if (!message) return;
				switch (message.type) {
					case "featureConfigChange": {
						await registry.notifyConfigChange(message.data.id, message.data.config);
						break;
					}
					case "featureEnabledStateChange": {
						await registry.updateFeatureEnabledState(message.data.id, message.data.enabled, message.data.config);
						break;
					}
					case "featureMenuOpenTypeChange": {
						const {
							data: { featureMenuOpenType }
						} = message;
						// Cleanup previous listeners if they exist
						if (cleanupFeatureMenuListeners) {
							cleanupFeatureMenuListeners();
							cleanupFeatureMenuListeners = null;
						}
						// Setup new listeners and store cleanup function
						cleanupFeatureMenuListeners = setupFeatureMenuEventListeners(featureMenuOpenType);
						break;
					}
					case "languageChange": {
						const {
							data: { language }
						} = message;
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
						break;
					}
					default: {
						return;
					}
				}
			})();
		});
		sendContentOnlyMessage("pageLoaded", undefined);
	})();
};

if (window.self === window.top) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}
}

window.addEventListener("pagehide", () => {
	registry.destroyNavigationListener();
	eventManager.removeAllEventListeners();
	window.cleanupFeatureMenuListeners?.();
	element.remove();
});
window.addEventListener("pageshow", initialize);

// Error handling
window.addEventListener("error", (event: ErrorEvent) => {
	event.preventDefault();
	const errorLine =
		event.error instanceof Error && typeof event.error.stack === "string" ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`;
	const errorMessage = event.error instanceof Error ? formatError(event.error) : event.message || "Unknown error";
	browserColorLog(`${errorMessage}\nAt: ${errorLine}`, "FgRed");
});

window.addEventListener("unhandledrejection", (event) => {
	event.preventDefault();
	const errorLine = event.reason instanceof Error && event.reason?.stack ? event.reason.stack : "Stack trace not available";
	browserColorLog(`Unhandled rejection: ${event.reason}\nAt: ${errorLine}`, "FgRed");
});
