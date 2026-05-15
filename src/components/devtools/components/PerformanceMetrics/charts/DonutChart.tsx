import type { JSX } from "react";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { PhaseGroup } from "../types";

type DonutChartProps = {
	phaseBreakdown: PhaseGroup[];
};

export default function DonutChart({ phaseBreakdown }: DonutChartProps): JSX.Element {
	return (
		<ResponsiveContainer height={400} width="100%">
			<PieChart>
				<Pie
					cornerRadius={4}
					cx="50%"
					cy="50%"
					data={phaseBreakdown.map((p, index) => ({
						fill: ["#007acc", "#4ec9b0", "#ce9178", "#9cdcfe", "#dcdcaa", "#c586c0", "#f48771"][index % 7],
						name: p.phase,
						value: p.totalTime
					}))}
					dataKey="value"
					fill="#8884d8"
					fillOpacity={1}
					innerRadius={100}
					label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(1)}%`}
					nameKey="name"
					outerRadius={140}
					paddingAngle={3}
				/>
				<Tooltip contentStyle={{ backgroundColor: "#1e1e1e", border: "none" }} formatter={(value) => `${Number(value).toFixed(2)}ms`} />
			</PieChart>
		</ResponsiveContainer>
	);
}
