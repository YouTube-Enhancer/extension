import type { JSX } from "react";

import { cn } from "@/src/utils/style";

import type { Stats } from "./types";

type StatsSummaryProps = {
	autoRefreshPaused: boolean;
	errorCount: number;
	metricsCount: number;
	onToggleAutoRefresh: () => void;
	stats: Stats;
	totalTime: number;
};

export default function StatsSummary({
	autoRefreshPaused,
	errorCount,
	metricsCount,
	onToggleAutoRefresh,
	stats,
	totalTime
}: StatsSummaryProps): JSX.Element {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<button
						className={cn(
							"rounded px-3 py-1.5 text-sm",
							!autoRefreshPaused ? "bg-[#4ec9b0] text-[#1e1e1e]" : "bg-[#2d2d2d] text-[#d4d4d4] hover:bg-[#3c3c3c]"
						)}
						onClick={onToggleAutoRefresh}
					>
						{autoRefreshPaused ? "Resume" : "Pause"} Auto-Refresh
					</button>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
					<p className="text-sm text-[#6b6b6b]">Total Time</p>
					<p className="text-2xl font-bold text-[#4ec9b0]">{totalTime.toFixed(2)}ms</p>
				</div>
				<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
					<p className="text-sm text-[#6b6b6b]">Metrics Count</p>
					<p className="text-2xl font-bold text-[#9cdcfe]">{metricsCount}</p>
				</div>
				<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
					<p className="text-sm text-[#6b6b6b]">Min Duration</p>
					<p className="text-2xl font-bold text-[#dcdcaa]">{stats.min.toFixed(2)}ms</p>
				</div>
				<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
					<p className="text-sm text-[#6b6b6b]">Max Duration</p>
					<p className="text-2xl font-bold text-[#ce9178]">{stats.max.toFixed(2)}ms</p>
				</div>
				<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
					<p className="text-sm text-[#6b6b6b]">Avg Duration</p>
					<p className="text-2xl font-bold text-[#d4d4d4]">{stats.avg.toFixed(2)}ms</p>
				</div>
				<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
					<p className="text-sm text-[#6b6b6b]">Error Count</p>
					<p className="text-2xl font-bold text-[#ce9178]">{errorCount}</p>
				</div>
			</div>
		</div>
	);
}
