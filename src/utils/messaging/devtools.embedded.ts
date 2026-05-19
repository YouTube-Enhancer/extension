import type { CoreFeatureKeys, FeatureKeys, NonFeatureKeys } from "@/src/features/_registry/types";
import type {
	configuration,
	configurationKeys,
	DevToolsDataResponseMessage,
	DevToolsMessageMappings,
	DevToolsMessages,
	DevToolsMessageType,
	Nullable,
	Path,
	PathValue
} from "@/src/types";

import { featurePerformanceTracker } from "@/src/features/_registry/featurePerformanceTracker";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { updateConfigAtPath } from "@/src/utils/config/utils";
import { waitForSpecificMessage } from "@/src/utils/messaging";

let devToolsListenerAdded = false;

type NonFeatureConfigKeys = Exclude<configurationKeys, FeatureKeys>;

function validateCoreConfigKey(key: NonFeatureConfigKeys): void {
	switch (key) {
		case "featureMenu":
		case "language":
		case "onScreenDisplay":
		case "openSettingsOnMajorOrMinorVersionChange":
		case "youtubeDataApiV3Key":
			return;
		default:
			key satisfies never;
	}
}

const handleDevToolsMessage = async <T extends DevToolsMessageType>(
	message: DevToolsMessageMappings[T]["request"],
	tabId: number,
	extensionId: string
) => {
	const { requestId } = message as { requestId: string };
	const messageBase = {
		action: "data_response",
		extensionId,
		requestId,
		source: "extension",
		tabId,
		type: message.type
	} as const;
	return (await (async () => {
		switch (message.type) {
			case "devtools_clear_performance_metrics": {
				featurePerformanceTracker.clear();

				return {
					...messageBase,
					data: { cleared: true }
				};
			}

			case "devtools_get_all_feature_configs": {
				const features = registry.getAll();
				const configs = {} as { [K in FeatureKeys]?: configuration[K] };
				for (const feature of features) {
					(configs as Record<string, configuration[FeatureKeys]>)[feature.id] = registry.configManager.getLast(feature.id) ?? feature.defaults;
				}

				return {
					...messageBase,
					data: { configs }
				};
			}

			case "devtools_get_core_config": {
				const {
					data: { options }
				} = await waitForSpecificMessage("options", "request_data", "extension");

				return {
					...messageBase,
					data: { config: options }
				};
			}

			case "devtools_get_feature_config": {
				const feature = registry.getFeature(message.data.id);
				const config = feature ? (registry.configManager.getLast(message.data.id) ?? feature.defaults) : undefined;

				return {
					...messageBase,
					data: {
						config,
						id: message.data.id
					}
				};
			}

			case "devtools_get_feature_state": {
				const state = registry.stateManager.getFeatureState(message.data.id);

				return {
					...messageBase,
					data: {
						id: message.data.id,
						state
					}
				};
			}

			case "devtools_get_features": {
				return {
					...messageBase,
					data: { features: registry.getAll() }
				};
			}

			case "devtools_get_performance_metrics": {
				return {
					...messageBase,
					data: {
						errors: featurePerformanceTracker.getErrors(),
						metrics: featurePerformanceTracker.getMetrics()
					}
				};
			}

			case "devtools_invalidate_cache": {
				// Invalidation is handled by the content script/registry
				return {
					...messageBase,
					data: { ok: true }
				};
			}

			case "devtools_toggle_feature": {
				const feature = registry.getFeature(message.data.id);
				if (!feature) return null;

				const {
					data: { options }
				} = await waitForSpecificMessage("options", "request_data", "extension");

				const featureConfig = options[message.data.id] ?? feature.defaults;
				const fullConfig = { ...options, [message.data.id]: featureConfig };
				const {
					data: { enabled, path }
				} = message;
				try {
					const { [message.data.id]: newConfig } = updateConfigAtPath(
						fullConfig,
						path as Path<configuration>,
						enabled as PathValue<configuration, Path<configuration>>
					);
					window.postMessage(
						{
							action: "request_storage_update",
							data: { [message.data.id]: newConfig },
							source: "injected"
						},
						"*"
					);
				} catch (error) {
					console.error("[DevTools InjectedScript] Failed to toggle feature config:", {
						enabled: message.data.enabled,
						error,
						featureId: message.data.id,
						path: message.data.path
					});
					// Still return a response to avoid hanging the DevTools request
					return {
						...messageBase,
						data: {
							enabled: message.data.enabled,
							id: message.data.id
						}
					};
				}

				return {
					...messageBase,
					data: {
						enabled: message.data.enabled,
						id: message.data.id
					}
				};
			}

			case "devtools_update_core_config": {
				const {
					data: { path, value }
				} = message;
				const defaults = getDefaultConfiguration();
				validateCoreConfigKey(path);

				window.postMessage(
					{
						action: "request_storage_update",
						data: { [path]: value },
						source: "injected"
					},
					"*"
				);

				return {
					...messageBase,
					data: {
						config: { ...defaults, [path]: value } as Pick<configuration, CoreFeatureKeys | NonFeatureKeys>
					}
				};
			}

			case "devtools_update_feature_config": {
				const {
					data: { id, path, value }
				} = message;
				const {
					data: { options }
				} = await waitForSpecificMessage("options", "request_data", "extension");
				let updatedConfig: configuration | null = null;
				try {
					updatedConfig = updateConfigAtPath(options, path as Path<configuration>, value as PathValue<configuration, Path<configuration>>);
					window.postMessage(
						{
							action: "request_storage_update",
							data: { [id]: updatedConfig[id] },
							source: "injected"
						},
						"*"
					);
				} catch (error) {
					console.error("[DevTools InjectedScript] Failed to update feature config path:", { error, id, path, value });
					// Still return a response to avoid hanging the DevTools request
					return {
						...messageBase,
						data: {
							config: options,
							id: id
						}
					};
				}

				return {
					...messageBase,
					data: {
						config: updatedConfig,
						id: id
					}
				};
			}
		}
	})()) satisfies Nullable<DevToolsDataResponseMessage<DevToolsMessageType, DevToolsMessageMappings[DevToolsMessageType]["response"]["data"]>>;
};

export const setupDevToolsListener = () => {
	if (devToolsListenerAdded) return;
	devToolsListenerAdded = true;

	window.addEventListener("message", (event: MessageEvent) => {
		const rawData = event.data as { action?: string; extensionId?: string; requestId?: string; source?: string; tabId?: number; type?: string };
		if (!rawData || rawData.source !== "content_script") return;

		const { extensionId, requestId, tabId, type } = rawData;
		if (!type || !requestId || !extensionId || tabId === undefined) return;
		void (async () => {
			const data = rawData as DevToolsMessages["request"];
			const response = await handleDevToolsMessage(data, tabId, extensionId);
			if (!response) return;

			const serializedResponse = JSON.parse(JSON.stringify(response));
			const messageToSend = Object.assign({}, serializedResponse, { source: "injected" as const });

			window.postMessage(messageToSend, "*");
		})();
	});
};
