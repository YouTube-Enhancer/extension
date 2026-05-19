import type { JSX } from "react";

import { cn } from "@/src/utils/style";

import type { FeatureSlowest } from "./types";

type SlowestListProps = {
	expandedFeatures?: Set<string>;
	slowestByFeature?: FeatureSlowest[];
	toggleFeature?: (id: string) => void;
};

export default function SlowestList({ expandedFeatures, slowestByFeature, toggleFeature }: SlowestListProps): JSX.Element {
	if (slowestByFeature && slowestByFeature.length > 0) {
		return (
			<div className="space-y-2">
				{slowestByFeature.map((feature, index) => {
					const isExpanded = expandedFeatures?.has(feature.featureId) ?? false;
					return (
						<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d]" key={feature.featureId}>
							<button className="w-full cursor-pointer p-3 text-left hover:bg-[#3c3c3c]" onClick={() => toggleFeature?.(feature.featureId)}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<span className="text-sm text-[#6b6b6b]">#{index + 1}</span>
										<span className="font-medium text-[#d4d4d4]">{feature.featureId}</span>
									</div>
									<span className={cn("font-mono", feature.slowestMetric.exclusiveDuration > 100 ? "text-[#ce9178]" : "text-[#4ec9b0]")}>
										{feature.slowestMetric.exclusiveDuration.toFixed(2)}ms
									</span>
								</div>
								<div className="mt-1 text-xs text-[#6b6b6b]">Slowest: {feature.slowestMetric.phase}</div>
							</button>
							{isExpanded && (
								<div className="border-t border-[#3c3c3c] px-3 pb-3">
									{feature.metrics
										.sort((a, b) => b.exclusiveDuration - a.exclusiveDuration)
										.map((m, i) => (
											<div className="flex items-center justify-between py-1.5" key={`${m.phase}-${i}`}>
												<div className="flex items-center gap-2">
													<span className="text-xs text-[#6b6b6b]">d{m.depth}</span>
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
				})}
			</div>
		);
	}

	return <div className="py-8 text-center text-[#6b6b6b]">No metrics recorded</div>;
}
