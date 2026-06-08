import type { JSX } from "react";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { cn } from "@/src/utils/style";

import { featureListQuery } from "../hooks/useDevToolsQuery";
import DevToolsLoader from "./DevToolsLoader";

type FeatureDependencyInfo = {
	excludePages?: readonly PageType[];
	id: string;
	includePages?: readonly PageType[];
};

const PAGE_TYPES: PageType[] = ["channel_home", "channel_videos", "home", "live", "playlist", "search", "shorts", "subscriptions", "watch"];

export default function DependencyGraph(): JSX.Element {
	const { data: featuresData, isLoading } = useQuery(featureListQuery);
	const [selectedFeature, setSelectedFeature] = useState<Nullable<string>>(null);

	const features = featuresData ?? [];

	const featuresWithDependencies = useMemo((): FeatureDependencyInfo[] => {
		return features
			.map((feature) => ({
				excludePages: feature.dependencies?.excludePages,
				id: feature.id,
				includePages: feature.dependencies?.includePages
			}))
			.filter((f) => f.includePages?.length || f.excludePages?.length);
	}, [features]);

	const selectedFeatureData = useMemo(() => {
		if (!selectedFeature) return null;
		return featuresWithDependencies.find((f) => f.id === selectedFeature) ?? null;
	}, [selectedFeature, featuresWithDependencies]);

	if (isLoading) {
		return <DevToolsLoader message="Loading features..." />;
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="space-y-2">
					<h3 className="text-sm font-medium text-[#6b6b6b]">Features with Dependencies</h3>
					<div className="max-h-96 space-y-1 overflow-auto rounded border border-[#3c3c3c] bg-[#2d2d2d] p-2">
						{featuresWithDependencies.length === 0 ?
							<p className="p-2 text-sm text-[#6b6b6b]">No features with page dependencies</p>
						:	featuresWithDependencies.map((feature) => (
								<button
									className={cn(
										"w-full rounded p-2 text-left transition-colors",
										selectedFeature === feature.id ? "bg-[#007acc] text-white" : "bg-[#252526] text-[#d4d4d4] hover:bg-[#2a2d2e]"
									)}
									key={feature.id}
									onClick={() => setSelectedFeature(feature.id)}
								>
									<p className="font-medium">{feature.id}</p>
								</button>
							))
						}
					</div>
				</div>

				<div className="space-y-2">
					<h3 className="text-sm font-medium text-[#6b6b6b]">Page Types</h3>
					<div className="grid grid-cols-3 gap-2">
						{PAGE_TYPES.map((page: PageType) => (
							<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-2 text-center text-xs text-[#6b6b6b]" key={page}>
								{page}
							</div>
						))}
					</div>

					{selectedFeatureData && (
						<>
							<h3 className="text-sm font-medium text-[#6b6b6b]">Selected Feature Details</h3>
							<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
								<p className="mb-2 text-lg font-medium text-[#d4d4d4]">{selectedFeatureData.id}</p>
								<div className="space-y-2">
									<div>
										<p className="text-xs text-[#6b6b6b]">Include Pages</p>
										{selectedFeatureData.includePages && selectedFeatureData.includePages.length > 0 ?
											<div className="mt-1 flex flex-wrap gap-1">
												{selectedFeatureData.includePages.map((page: PageType) => (
													<span className="rounded bg-[#4ec9b0] px-2 py-0.5 text-xs text-[#1e1e1e]" key={page}>
														{page}
													</span>
												))}
											</div>
										:	<p className="text-sm text-[#969696]">All pages</p>}
									</div>
									<div>
										<p className="text-xs text-[#6b6b6b]">Exclude Pages</p>
										{selectedFeatureData.excludePages && selectedFeatureData.excludePages.length > 0 ?
											<div className="mt-1 flex flex-wrap gap-1">
												{selectedFeatureData.excludePages.map((page: PageType) => (
													<span className="rounded bg-[#ce9178] px-2 py-0.5 text-xs text-[#1e1e1e]" key={page}>
														{page}
													</span>
												))}
											</div>
										:	<p className="text-sm text-[#969696]">None</p>}
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="flex justify-end pt-2">
				<button className="rounded bg-[#2d2d2d] px-3 py-1.5 text-sm text-[#d4d4d4] hover:bg-[#3c3c3c]" onClick={() => setSelectedFeature(null)}>
					Clear Selection
				</button>
			</div>
		</div>
	);
}
