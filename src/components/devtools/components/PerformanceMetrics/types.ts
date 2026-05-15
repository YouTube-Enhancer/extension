import type { FeatureError, FeatureMetric } from "@/src/features/_registry/featurePerformanceTracker";

export type ChartType = "bar-feature" | "bar-phase" | "donut" | "timeline";

export type FeatureGroup = {
	avgTime: number;
	count: number;
	countedPhases?: Set<string>;
	id: string;
	metrics: FeatureMetric[];
	phaseGroups: { count: number; phase: string; totalTime: number }[];
	slowestMetric: { duration: number; phase: string };
	totalTime: number;
};

export type FeatureSlowest = {
	featureId: string;
	metrics: FeatureMetric[];
	slowestMetric: FeatureMetric;
};

export type PhaseGroup = {
	avgTime: number;
	count: number;
	metrics: FeatureMetric[];
	phase: string;
	slowestMetric: { duration: number; id: string };
	totalTime: number;
};

export type Stats = {
	avg: number;
	max: number;
	min: number;
};

export type ViewMode = "by-feature" | "by-phase" | "charts" | "errors" | "slowest" | "summary";

export type { FeatureError, FeatureMetric };
