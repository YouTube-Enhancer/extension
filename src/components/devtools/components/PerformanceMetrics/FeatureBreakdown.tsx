import type { JSX } from "react";

import { cn } from "@/src/utils/style";

import type { FeatureGroup } from "./types";

type FeatureBreakdownProps = {
	expandedFeatures: Set<string>;
	featureBreakdown: FeatureGroup[];
	toggleFeature: (id: string) => void;
	totalTime: number;
};

export default function FeatureBreakdown({ expandedFeatures, featureBreakdown, toggleFeature, totalTime }: FeatureBreakdownProps): JSX.Element {
	return (
		<div className="space-y-2">
			{featureBreakdown.length === 0 ?
				<div className="py-8 text-center text-[#6b6b6b]">No metrics recorded</div>
			:	featureBreakdown.map((group) => {
					const isExpanded = expandedFeatures.has(group.id);
					const barWidth = totalTime > 0 ? (group.totalTime / totalTime) * 100 : 0;
					return (
						<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d]" key={group.id}>
							<button className="w-full cursor-pointer p-3 text-left hover:bg-[#3c3c3c]" onClick={() => toggleFeature(group.id)}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<span className="font-medium text-[#d4d4d4]">{group.id}</span>
										<span className="text-xs text-[#6b6b6b]">{group.count} metrics</span>
									</div>
									<div className="text-right">
										<span className={cn("font-mono", group.totalTime > 100 ? "text-[#ce9178]" : "text-[#4ec9b0]")}>
											{group.totalTime.toFixed(2)}ms
										</span>
										<span className="ml-2 text-xs text-[#6b6b6b]">avg {group.avgTime.toFixed(2)}ms</span>
									</div>
								</div>
								<div className="mt-2 h-1.5 w-full rounded-full bg-[#1e1e1e]">
									<div className="h-1.5 rounded-full bg-[#007acc]" style={{ width: `${barWidth}%` }} />
								</div>
								{group.slowestMetric.duration > 0 && (
									<div className="mt-1 text-xs text-[#6b6b6b]">
										Slowest: {group.slowestMetric.phase} ({group.slowestMetric.duration.toFixed(2)}ms)
									</div>
								)}
								{group.phaseGroups.length > 1 && (
									<div className="mt-1.5 flex flex-wrap gap-1.5">
										{group.phaseGroups.map((pg) => (
											<span className="rounded bg-[#3c3c3c] px-1.5 py-0.5 text-xs text-[#6b6b6b]" key={pg.phase}>
												{pg.phase}: {pg.totalTime.toFixed(1)}ms
											</span>
										))}
									</div>
								)}
							</button>
							{isExpanded && (
								<div className="border-t border-[#3c3c3c] px-3 pb-3">
									{group.metrics.map((m, i) => (
										<div className="flex items-center justify-between py-1.5" key={`${m.phase}-${i}`}>
											<div className="flex items-center gap-2">
												<span className="text-xs text-[#6b6b6b]">{m.phase}</span>
											</div>
											<span className={cn("font-mono text-sm", m.exclusiveDuration > 100 ? "text-[#ce9178]" : "text-[#4ec9b0]")}>
												{m.exclusiveDuration.toFixed(2)}ms
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					);
				})
			}
		</div>
	);
}
