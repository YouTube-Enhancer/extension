import type { JSX } from "react";

import { cn } from "@/src/utils/style";

import type { ChartType, FeatureGroup, PhaseGroup } from "./types";

import DonutChart from "./charts/DonutChart";
import FeatureBarChart from "./charts/FeatureBarChart";
import PhaseBarChart from "./charts/PhaseBarChart";
import TimelineChart from "./charts/TimelineChart";

type ChartsContainerProps = {
	chartType: ChartType;
	featureBreakdown: FeatureGroup[];
	phaseBreakdown: PhaseGroup[];
	setChartType: (type: ChartType) => void;
	timelineData: unknown[];
};

export default function ChartsContainer({
	chartType,
	featureBreakdown,
	phaseBreakdown,
	setChartType,
	timelineData
}: ChartsContainerProps): JSX.Element {
	const chartTypes: { id: ChartType; label: string }[] = [
		{ id: "bar-phase", label: "Phase Bar" },
		{ id: "bar-feature", label: "Feature Bar" },
		{ id: "donut", label: "Donut" },
		{ id: "timeline", label: "Timeline" }
	];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{chartTypes.map((type) => (
					<button
						className={cn(
							"rounded px-3 py-1.5 text-sm",
							chartType === type.id ? "bg-[#007acc] text-white" : "bg-[#2d2d2d] text-[#d4d4d4] hover:bg-[#3c3c3c]"
						)}
						key={type.id}
						onClick={() => setChartType(type.id)}
					>
						{type.label}
					</button>
				))}
			</div>

			{chartType === "bar-phase" && <PhaseBarChart phaseBreakdown={phaseBreakdown} />}
			{chartType === "bar-feature" && <FeatureBarChart featureBreakdown={featureBreakdown} />}
			{chartType === "donut" && <DonutChart phaseBreakdown={phaseBreakdown} />}
			{chartType === "timeline" && <TimelineChart timelineData={timelineData} />}
		</div>
	);
}
