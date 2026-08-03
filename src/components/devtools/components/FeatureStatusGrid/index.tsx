import type { JSX } from "react";

import { useState } from "react";

import type { AllConfigsData } from "@/components/devtools/hooks/useDevToolsQuery";
import type { FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";

import ConfigSlideOver from "@/components/devtools/components/ConfigSlideOver";
import DevToolsLoader from "@/components/devtools/components/DevToolsLoader";
import { DevToolsError } from "@/components/devtools/components/DevToolsMessage";
import StateSlideOver from "@/components/devtools/components/StateSlideOver";

import type { FeatureInfo } from "./types";

import FeatureCard from "./FeatureCard";
import SearchAndFilter from "./SearchAndFilter";
import { useFeatureGridData } from "./useFeatureGridData";

export default function FeatureStatusGrid(): JSX.Element {
	const {
		configsQuery,
		disabledCount,
		enabledCount,
		expandedFeatures,
		featureListResult,
		filter,
		filteredFeatures,
		handleSubToggle,
		handleToggle,
		isTogglePending,
		searchTerm,
		setFilter,
		setSearchTerm,
		toggleExpanded
	} = useFeatureGridData();

	const [configFeatureId, setConfigFeatureId] = useState<FeatureKeys | null>(null);
	const [stateFeatureId, setStateFeatureId] = useState<FeatureKeysWithState | null>(null);

	const configs: AllConfigsData = configsQuery.data ?? {};

	const handleStateClick = (featureId: FeatureKeysWithState) => {
		setStateFeatureId(featureId);
	};

	const handleConfigClick = (featureId: FeatureKeys) => {
		setConfigFeatureId(featureId);
	};

	const handleConfigSaved = () => {
		void featureListResult.refetch();
		void configsQuery.refetch();
	};

	if (featureListResult.isPending) {
		return <DevToolsLoader message="Loading features..." />;
	}

	if (featureListResult.isError || configsQuery.isError) {
		const error = featureListResult.error ?? configsQuery.error;
		const message = error instanceof Error ? error.message : "Failed to load features";
		return <DevToolsError message={message} />;
	}

	return (
		<div className="space-y-4">
			<SearchAndFilter
				disabledCount={disabledCount}
				enabledCount={enabledCount}
				filter={filter}
				onFilterChange={setFilter}
				onSearchChange={setSearchTerm}
				searchTerm={searchTerm}
				totalCount={featureListResult.data?.length ?? 0}
			/>

			<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
				{filteredFeatures.map((feature: FeatureInfo) => (
					<FeatureCard
						feature={feature}
						isExpanded={expandedFeatures.has(feature.id)}
						isTogglePending={isTogglePending}
						key={feature.id}
						onConfigClick={handleConfigClick}
						onStateClick={handleStateClick}
						onSubToggle={(path, currentEnabled) => handleSubToggle(feature.id, path, currentEnabled)}
						onToggle={(path, currentEnabled) => handleToggle(feature.id, path, currentEnabled)}
						onToggleExpand={() => toggleExpanded(feature.id)}
					/>
				))}
			</div>

			{filteredFeatures.length === 0 && (
				<div className="py-8 text-center text-[#6b6b6b]">
					<p>No features found matching your criteria</p>
				</div>
			)}
			{configFeatureId && (
				<ConfigSlideOver
					allConfigs={configs}
					currentConfig={configs[configFeatureId] ?? null}
					featureId={configFeatureId}
					isOpen={!!configFeatureId}
					onClose={() => setConfigFeatureId(null)}
					onConfigSaved={handleConfigSaved}
				/>
			)}

			<StateSlideOver featureId={stateFeatureId} isOpen={!!stateFeatureId} onClose={() => setStateFeatureId(null)} />
		</div>
	);
}

export type { FeatureInfo, SubFeatureInfo } from "./types";
