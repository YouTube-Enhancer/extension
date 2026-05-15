import type { JSX } from "react";

import { cn } from "@/src/utils/style";

import ChartsContainer from "./ChartsContainer";
import ErrorsList from "./ErrorsList";
import FeatureBreakdown from "./FeatureBreakdown";
import PhaseBreakdown from "./PhaseBreakdown";
import SearchBar from "./SearchBar";
import SlowestList from "./SlowestList";
import StatsSummary from "./StatsSummary";
import { usePerformanceData } from "./usePerformanceData";
import ViewModeToggle from "./ViewModeToggle";

export default function PerformanceMetrics(): JSX.Element {
	const {
		autoRefreshPaused,
		chartType,
		clearMutation,
		errors,
		expandedFeatures,
		expandedPhases,
		featureBreakdown,
		isLoading,
		metrics,
		phaseBreakdown,
		refetch,
		searchTerm,
		setAutoRefreshPaused,
		setChartType,
		setSearchTerm,
		setViewMode,
		slowestByFeature,
		stats,
		timelineData,
		toggleExpandedFeatures,
		toggleExpandedPhases,
		totalTime,
		viewMode
	} = usePerformanceData();

	const handleClear = () => {
		clearMutation();
	};

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center text-[#6b6b6b]">
				<p>Loading metrics...</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{viewMode !== "summary" && <SearchBar onSearchChange={setSearchTerm} searchTerm={searchTerm} />}
			<ViewModeToggle errorCount={errors.length} onViewModeChange={setViewMode} viewMode={viewMode} />

			{viewMode === "summary" && (
				<StatsSummary
					autoRefreshPaused={autoRefreshPaused}
					errorCount={errors.length}
					metricsCount={metrics.length}
					onToggleAutoRefresh={() => setAutoRefreshPaused(!autoRefreshPaused)}
					stats={stats}
					totalTime={totalTime}
				/>
			)}

			{viewMode === "slowest" && (
				<SlowestList expandedFeatures={expandedFeatures} slowestByFeature={slowestByFeature} toggleFeature={toggleExpandedFeatures} />
			)}

			{viewMode === "errors" && <ErrorsList errors={errors} />}

			{viewMode === "by-phase" && (
				<PhaseBreakdown expandedPhases={expandedPhases} phaseBreakdown={phaseBreakdown} togglePhase={toggleExpandedPhases} totalTime={totalTime} />
			)}

			{viewMode === "by-feature" && (
				<FeatureBreakdown
					expandedFeatures={expandedFeatures}
					featureBreakdown={featureBreakdown}
					toggleFeature={toggleExpandedFeatures}
					totalTime={totalTime}
				/>
			)}

			{viewMode === "charts" && (
				<ChartsContainer
					chartType={chartType}
					featureBreakdown={featureBreakdown}
					phaseBreakdown={phaseBreakdown}
					setChartType={setChartType}
					timelineData={timelineData}
				/>
			)}

			<div className="flex justify-end gap-2 pt-2">
				<button className={cn("rounded px-3 py-1.5 text-sm", "bg-[#2d2d2d] text-[#d4d4d4] hover:bg-[#3c3c3c]")} onClick={handleClear}>
					Clear Metrics
				</button>
				<button
					className={cn("rounded px-3 py-1.5 text-sm", "bg-[#2d2d2d] text-[#d4d4d4] hover:bg-[#3c3c3c]")}
					onClick={() => {
						void refetch();
					}}
				>
					Refresh
				</button>
			</div>
		</div>
	);
}

export type { ChartType, FeatureGroup, PhaseGroup, Stats, ViewMode } from "./types";
