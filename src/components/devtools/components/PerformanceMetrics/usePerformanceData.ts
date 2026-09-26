import { useMutation, useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";

import type { FeatureError, FeatureMetric } from "@/src/features/_registry/featurePerformanceTracker";

import { type PerformanceMetricsData, performanceMetricsQuery } from "@/components/devtools/hooks/useDevToolsQuery";
import { sendDevToolsMessage } from "@/src/utils/messaging/devtools";

import type { ChartType, FeatureGroup, FeatureSlowest, PhaseGroup, Stats, ViewMode } from "./types";

export function usePerformanceData(): {
	autoRefreshPaused: boolean;
	chartType: ChartType;
	clearMutation: ReturnType<typeof useMutation<unknown, Error, void, unknown>>["mutate"];
	data: PerformanceMetricsData | undefined;
	errors: FeatureError[];
	expandedFeatures: Set<string>;
	expandedPhases: Set<string>;
	featureBreakdown: FeatureGroup[];
	isLoading: boolean;
	metrics: FeatureMetric[];
	phaseBreakdown: PhaseGroup[];
	refetch: () => void;
	searchTerm: string;
	setAutoRefreshPaused: (paused: boolean) => void;
	setChartType: (type: ChartType) => void;
	setExpandedFeatures: React.Dispatch<React.SetStateAction<Set<string>>>;
	setExpandedPhases: React.Dispatch<React.SetStateAction<Set<string>>>;
	setSearchTerm: (term: string) => void;
	setViewMode: (mode: ViewMode) => void;
	slowestByFeature: FeatureSlowest[];
	stats: Stats;
	timelineData: FeatureMetric[];
	toggleExpandedFeatures: (id: string) => void;
	toggleExpandedPhases: (phase: string) => void;
	totalTime: number;
	viewMode: ViewMode;
} {
	const [viewMode, setViewMode] = useState<ViewMode>("summary");
	const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
	const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
	const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);

	const { data, isLoading, refetch } = useQuery({
		...performanceMetricsQuery,
		enabled: !autoRefreshPaused,
		refetchInterval: autoRefreshPaused ? false : 5000
	});

	const metrics = data?.metrics ?? [];
	const errors = data?.errors ?? [];

	const [searchTerm, setSearchTerm] = useState("");
	const filteredMetrics = useMemo(() => {
		if (!searchTerm) return metrics;
		const fuse = new Fuse(metrics, { ignoreLocation: true, keys: ["id", "phase"], threshold: 0.3 });
		return fuse.search(searchTerm).map((r) => r.item);
	}, [metrics, searchTerm]);

	const stats = useMemo((): Stats => {
		if (metrics.length === 0) return { avg: 0, max: 0, min: 0 };
		// For stats, use duration for depth 0 (includes nested), exclusive for nested
		const durations = filteredMetrics.map((m) => (m.depth === 0 ? m.duration : m.exclusiveDuration));
		// Calculate wall-clock time for avg using concurrency groups
		const rootMetrics = filteredMetrics.filter((m) => m.depth === 0);
		const groups = new Map<number, number>();
		for (const m of rootMetrics) {
			const group = m.concurrencyGroup ?? 0;
			const current = groups.get(group) ?? 0;
			groups.set(group, Math.max(current, m.duration));
		}
		const wallClockTotal = Array.from(groups.values()).reduce((sum, d) => sum + d, 0);
		const groupCount = groups.size || 1;
		return {
			avg: wallClockTotal / groupCount,
			max: Math.max(...durations),
			min: Math.min(...durations)
		};
	}, [filteredMetrics, metrics.length]);

	const totalTime = useMemo(() => {
		// Calculate wall-clock time from concurrency groups:
		// Features in the same group run sequentially (sum durations).
		// Features in different groups run in parallel (take max within each group, then sum across groups).
		const rootMetrics = filteredMetrics.filter((m) => m.depth === 0);
		const groups = new Map<number, number>();
		for (const m of rootMetrics) {
			const group = m.concurrencyGroup ?? 0;
			const current = groups.get(group) ?? 0;
			groups.set(group, Math.max(current, m.duration));
		}
		return Array.from(groups.values()).reduce((sum, groupDuration) => sum + groupDuration, 0);
	}, [filteredMetrics]);

	const phaseBreakdown = useMemo((): PhaseGroup[] => {
		const groups = new Map<string, PhaseGroup>();

		for (const m of filteredMetrics) {
			const { phase } = m;
			if (!groups.has(phase)) {
				groups.set(phase, {
					avgTime: 0,
					count: 0,
					metrics: [],
					phase,
					slowestMetric: { duration: 0, id: "" },
					totalTime: 0
				});
			}
			const g = groups.get(phase)!;
			g.count++;
			g.metrics.push(m);
			if (m.exclusiveDuration > g.slowestMetric.duration) {
				g.slowestMetric = { duration: m.exclusiveDuration, id: String(m.id) };
			}
		}

		const result = Array.from(groups.values());
		for (const g of result) {
			// Compute wall-clock time: features run in parallel, so within each concurrency group
			// take the max duration across features, then sum across concurrency groups.
			const concurrencyGroups = new Map<number, Map<string, number>>();
			for (const m of g.metrics) {
				const concurrencyGroup = m.concurrencyGroup ?? 0;
				if (!concurrencyGroups.has(concurrencyGroup)) {
					concurrencyGroups.set(concurrencyGroup, new Map());
				}
				const featureMap = concurrencyGroups.get(concurrencyGroup)!;
				const featureId = String(m.id);
				const time = m.depth === 0 ? m.duration : m.exclusiveDuration;
				featureMap.set(featureId, Math.max(featureMap.get(featureId) ?? 0, time));
			}
			let wallClock = 0;
			for (const featureMap of concurrencyGroups.values()) {
				wallClock += Math.max(...featureMap.values(), 0);
			}
			g.totalTime = wallClock;
			g.avgTime = g.count > 0 ? g.totalTime / g.count : 0;
			g.metrics.sort((a, b) => b.exclusiveDuration - a.exclusiveDuration);
		}
		result.sort((a, b) => b.totalTime - a.totalTime);
		return result;
	}, [filteredMetrics]);

	const featureBreakdown = useMemo((): FeatureGroup[] => {
		const groups = new Map<string, FeatureGroup>();

		for (const m of filteredMetrics) {
			const id = String(m.id);
			if (!groups.has(id)) {
				groups.set(id, {
					avgTime: 0,
					count: 0,
					countedPhases: new Set<string>(),
					id,
					metrics: [],
					phaseGroups: [],
					slowestMetric: { duration: 0, phase: "" },
					totalTime: 0
				});
			}
			const g = groups.get(id)!;
			// Only count depth 0 once per phase - nested work already included in parent duration
			if (m.depth === 0) {
				if (!g.countedPhases!.has(m.phase)) {
					g.totalTime += m.duration;
					g.countedPhases!.add(m.phase);
				}
			}
			// depth > 0: DON'T add - it's nested inside depth 0 parent, already counted
			g.count++;
			g.metrics.push(m);
			if (m.exclusiveDuration > g.slowestMetric.duration) {
				g.slowestMetric = { duration: m.exclusiveDuration, phase: m.phase };
			}
		}

		// Clean up countedPhases before returning
		for (const g of groups.values()) {
			delete g.countedPhases;
		}

		for (const g of groups.values()) {
			const phaseMap = new Map<string, { count: number; totalTime: number }>();
			for (const m of g.metrics) {
				const entry = phaseMap.get(m.phase) ?? { count: 0, totalTime: 0 };
				const timeToAdd = m.depth === 0 ? m.duration : m.exclusiveDuration;
				entry.totalTime += timeToAdd;
				entry.count++;
				phaseMap.set(m.phase, entry);
			}
			g.phaseGroups = Array.from(phaseMap.entries()).map(([phase, data]) => ({
				count: data.count,
				phase,
				totalTime: data.totalTime
			}));
			g.phaseGroups.sort((a, b) => b.totalTime - a.totalTime);
			g.avgTime = g.count > 0 ? g.totalTime / g.count : 0;
			g.metrics.sort((a, b) => b.exclusiveDuration - a.exclusiveDuration);
		}

		return Array.from(groups.values()).sort((a, b) => b.totalTime - a.totalTime);
	}, [filteredMetrics]);

	const [chartType, setChartType] = useState<ChartType>("bar-phase");

	const timelineData = useMemo(() => {
		return [...filteredMetrics].sort((a, b) => a.timestamp - b.timestamp);
	}, [filteredMetrics]);

	const slowestByFeature = useMemo((): FeatureSlowest[] => {
		const featureMap = new Map<string, FeatureMetric[]>();
		for (const m of filteredMetrics) {
			const id = String(m.id);
			if (!featureMap.has(id)) {
				featureMap.set(id, []);
			}
			featureMap.get(id)!.push(m);
		}
		const result: FeatureSlowest[] = [];
		for (const [featureId, metrics] of featureMap) {
			const slowest = metrics.reduce((slowest, m) => (m.exclusiveDuration > slowest.exclusiveDuration ? m : slowest), metrics[0]);
			result.push({ featureId, metrics, slowestMetric: slowest });
		}
		return result.sort((a, b) => b.slowestMetric.exclusiveDuration - a.slowestMetric.exclusiveDuration).slice(0, 10);
	}, [filteredMetrics]);

	const togglePhase = (phase: string) => {
		setExpandedPhases((prev) => {
			const next = new Set(prev);
			if (next.has(phase)) next.delete(phase);
			else next.add(phase);
			return next;
		});
	};

	const toggleFeature = (id: string) => {
		setExpandedFeatures((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const clearMutation = useMutation({
		mutationFn: async () => {
			await sendDevToolsMessage("devtools_clear_performance_metrics", undefined);
		},
		onSuccess: () => {
			void refetch();
		}
	});

	return {
		autoRefreshPaused,
		chartType,
		clearMutation: clearMutation.mutate,
		data,
		errors,
		expandedFeatures,
		expandedPhases,
		featureBreakdown,
		isLoading,
		metrics: filteredMetrics,
		phaseBreakdown,
		refetch: () => {
			void refetch();
		},
		searchTerm,
		setAutoRefreshPaused,
		setChartType,
		setExpandedFeatures,
		setExpandedPhases,
		setSearchTerm,
		setViewMode,
		slowestByFeature,
		stats,
		timelineData,
		toggleExpandedFeatures: toggleFeature,
		toggleExpandedPhases: togglePhase,
		totalTime,
		viewMode
	};
}
