import type { FeatureError, FeatureMetric } from "@/src/features/_registry/featurePerformanceTracker";
import type { AnyFeatureBase, CoreFeatureKeys, FeatureKeys, FeatureKeysWithState, NonFeatureKeys } from "@/src/features/_registry/types";
import type { configuration, Nullable } from "@/src/types";

import { onDevToolsCacheInvalidate, sendDevToolsMessage } from "@/src/utils/messaging/devtools";

export type AllConfigsData = { [K in FeatureKeys]?: configuration[K] };

export type CoreConfigData = {
	config: configuration;
};

export type PerformanceMetricsData = {
	errors: FeatureError[];
	metrics: FeatureMetric[];
};

const STALE = 30 * 1000;
const GC = 5 * 60 * 1000;

export const featureListQuery = {
	gcTime: GC,
	queryFn: async (): Promise<AnyFeatureBase[]> => {
		const response = await sendDevToolsMessage("devtools_get_features", undefined);
		return response.data.features;
	},
	queryKey: ["devtools", "featureList"] as const,
	staleTime: STALE
} as const;

export const allConfigsQuery = {
	gcTime: GC,
	queryFn: async (): Promise<AllConfigsData> => {
		const response = await sendDevToolsMessage("devtools_get_all_feature_configs", undefined);
		return response.data.configs;
	},
	queryKey: ["devtools", "configs"] as const,
	staleTime: STALE
} as const;

export function featureConfigQuery(id: FeatureKeys) {
	return {
		gcTime: GC,
		queryFn: async () => {
			const response = await sendDevToolsMessage("devtools_get_feature_config", { id });
			return response.data;
		},
		queryKey: ["devtools", "config", id] as const,
		staleTime: STALE
	} as const;
}

export function featureConfigUpdateQuery(id: FeatureKeys, path: string, value: unknown) {
	return {
		gcTime: 0,
		queryFn: async () => {
			const response = await sendDevToolsMessage("devtools_update_feature_config", { id, path, value });
			return response.data;
		},
		queryKey: ["devtools", "configUpdate", id, path] as const,
		staleTime: 0
	} as const;
}

export function featureStateQuery(id: FeatureKeysWithState) {
	return {
		gcTime: GC,
		queryFn: async () => {
			const response = await sendDevToolsMessage("devtools_get_feature_state", { id });
			return response.data;
		},
		queryKey: ["devtools", "state", id] as const,
		staleTime: STALE
	} as const;
}
export const performanceMetricsQuery = {
	gcTime: GC,
	queryFn: async (): Promise<PerformanceMetricsData> => {
		const response = await sendDevToolsMessage("devtools_get_performance_metrics", undefined);
		const data = response.data as Nullable<PerformanceMetricsData>;
		return {
			errors: [...(data?.errors ?? [])],
			metrics: [...(data?.metrics ?? [])]
		};
	},
	queryKey: ["devtools", "performanceMetrics"] as const,
	refetchInterval: 5000,
	staleTime: 0
} as const;

export const coreConfigQuery = {
	gcTime: GC,
	queryFn: async (): Promise<CoreConfigData> => {
		const response = await sendDevToolsMessage("devtools_get_core_config", undefined);
		return response.data;
	},
	queryKey: ["devtools", "coreConfig"] as const,
	staleTime: STALE
} as const;

export function coreConfigUpdateMutation(path: CoreFeatureKeys | NonFeatureKeys, value: unknown) {
	return {
		gcTime: 0,
		mutationFn: async () => {
			const response = await sendDevToolsMessage("devtools_update_core_config", { path, value });
			return response.data;
		},
		mutationKey: ["devtools", "coreConfigUpdate", path] as const,
		staleTime: 0
	} as const;
}

let invalidateListener: (() => void) | null = null;
let messageListenerAdded = false;

export async function invalidateDevToolsCache(keys: string[]): Promise<void> {
	await sendDevToolsMessage("devtools_invalidate_cache", { keys });
}

export function setupDevToolsMessageListener(): void {
	if (messageListenerAdded) return;
	messageListenerAdded = true;

	window.addEventListener("message", (event: MessageEvent<{ queryKey?: [string, ...string[]]; type?: string }>) => {
		const { data } = event;
		if (data.type !== "invalidate-devtools-query") return;
		if (!Array.isArray(data.queryKey)) return;

		const {
			queryKey: [ns]
		} = data;
		if (ns !== "devtools") return;

		if (invalidateListener) {
			invalidateListener();
			invalidateListener = null;
		}
	});
}

export function useDevToolsCacheSync(): void {
	if (invalidateListener) return;

	invalidateListener = onDevToolsCacheInvalidate((keys: string[]) => {
		for (const key of keys) {
			if (key === "*" || key === "all") {
				window.postMessage({ queryKey: ["devtools", "configs"], type: "invalidate-devtools-query" }, "*");
				window.postMessage({ queryKey: ["devtools", "featureList"], type: "invalidate-devtools-query" }, "*");
			} else {
				window.postMessage({ queryKey: ["devtools", "configs", key], type: "invalidate-devtools-query" }, "*");
			}
		}
	});
}
