import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { AnyFeatureBase, FeatureKeys, FeatureSettingNode } from "@/src/features/_registry/types";
import type { configuration, Path, PathValue } from "@/src/types";

import { type AllConfigsData, allConfigsQuery, featureListQuery } from "@/components/devtools/hooks/useDevToolsQuery";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { resolveEnabled } from "@/src/features/_registry/featureRegistry";
import { updateConfigAtPath } from "@/src/utils/config/utils";
import { sendDevToolsMessage } from "@/src/utils/messaging/devtools";
import { getPathValue } from "@/src/utils/misc";
import { textMatcher } from "@/src/utils/string";

import type { FeatureInfo, FilterType } from "./types";

import { getEnabledPathFromMetadata, getEnabledPathsFromMetadata, getSubFeatures, hasAnyConfigurableSettings, hasButtonPlacement } from "./utils";

export function useFeatureGridData() {
	const queryClient = useQueryClient();
	const [filter, setFilter] = useState<FilterType>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [expandedFeatures, setExpandedFeatures] = useState<Set<FeatureKeys>>(new Set());

	const toggleExpanded = (id: FeatureKeys) => {
		setExpandedFeatures((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const featureListResult = useQuery(featureListQuery);
	const configsQuery = useQuery(allConfigsQuery);

	const toggleMutation = useMutation({
		mutationFn: async ({ enabled, id, path }: { enabled: boolean; id: FeatureKeys; path: string }) => {
			const response = await sendDevToolsMessage("devtools_toggle_feature", { enabled, id, path });
			return response.data;
		},
		onError: (error) => {
			console.error("[FeatureGrid] Toggle mutation failed:", error);
		},
		onSuccess: (_data, { enabled, path }) => {
			queryClient.setQueryData<AllConfigsData>(allConfigsQuery.queryKey, (old) => {
				if (!old) return old;
				const newConfig = updateConfigAtPath(
					old as unknown as configuration,
					path as Path<configuration>,
					enabled as PathValue<configuration, Path<configuration>>
				);
				return newConfig;
			});
		}
	});

	const featureList = featureListResult.data ?? [];
	const configs = configsQuery.data ?? {};

	const features: FeatureInfo[] = useMemo(() => {
		return featureList.map((feature: AnyFeatureBase) => {
			const { id } = feature;
			const { [id]: config } = configs;
			const metadata = metadataRegistry.get(id);
			const settings = metadata?.settings ?? [];
			const enabledPath = getEnabledPathFromMetadata(settings as FeatureSettingNode<FeatureKeys>[], id);
			const subFeaturePaths = getEnabledPathsFromMetadata(settings as FeatureSettingNode<FeatureKeys>[], id);
			const hasNested = subFeaturePaths.length > 1;
			const hasConfigSettings = hasAnyConfigurableSettings(settings) || hasButtonPlacement(config);
			const finalSubFeatures =
				hasNested ?
					subFeaturePaths.map((sf) => ({
						...sf,
						enabled: config ? Boolean(getPathValue(config, sf.path.replace(`${id}.`, "") as Path<configuration[FeatureKeys]>)) : false
					}))
				:	getSubFeatures(config);
			return {
				config: config ?? null,
				enabled: config ? resolveEnabled(config) : false,
				enabledPath,
				hasConfigurableSettings: hasConfigSettings,
				hasNestedEnabled: hasNested,
				hasState: Boolean(feature.stateSchemaInput),
				id,
				subFeatures: finalSubFeatures
			};
		});
	}, [featureList, configs]);

	const { disabledCount, enabledCount } = useMemo(() => {
		return features.reduce(
			(acc, feature) => {
				if (feature.enabled) {
					acc.enabledCount++;
				} else {
					acc.disabledCount++;
				}
				return acc;
			},
			{ disabledCount: 0, enabledCount: 0 }
		);
	}, [features]);

	const filteredFeatures = useMemo(() => {
		const matchesText = textMatcher(searchTerm);
		return features.filter(({ enabled, id, subFeatures }) => {
			const matchesSearch = matchesText(id) || subFeatures?.some((sf) => matchesText(sf.key)) || false;
			if (filter === "enabled") return matchesSearch && enabled;
			if (filter === "disabled") return matchesSearch && !enabled;
			return matchesSearch;
		});
	}, [features, searchTerm, filter]);

	const handleToggle = async (id: FeatureKeys, path: string, currentEnabled: boolean) => {
		const newEnabled = !currentEnabled;
		const fullPath = path.startsWith(`${id}.`) ? path : `${id}.${path}`;
		try {
			await toggleMutation.mutateAsync({ enabled: newEnabled, id, path: fullPath });
		} catch (err) {
			console.error("[FeatureGrid] Failed to toggle feature:", { enabled: newEnabled, error: err, id, path: fullPath });
		}
	};

	const handleSubToggle = async (id: FeatureKeys, path: string, currentEnabled: boolean) => {
		const newEnabled = !currentEnabled;
		const fullPath = path.startsWith(`${id}.`) ? path : `${id}.${path}`;
		try {
			await toggleMutation.mutateAsync({ enabled: newEnabled, id, path: fullPath });
		} catch (err) {
			console.error("[FeatureGrid] Failed to toggle sub-feature:", { enabled: newEnabled, error: err, id, path: fullPath });
		}
	};

	return {
		configsQuery,
		disabledCount,
		enabledCount,
		expandedFeatures,
		featureListResult,
		filter,
		filteredFeatures,
		handleSubToggle,
		handleToggle,
		isTogglePending: toggleMutation.isPending,
		searchTerm,
		setFilter,
		setSearchTerm,
		toggleExpanded
	};
}
