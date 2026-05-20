import type { JSX } from "react";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { PhaseGroup } from "../types";

type PhaseBarChartProps = {
	phaseBreakdown: PhaseGroup[];
};

export default function PhaseBarChart({ phaseBreakdown }: PhaseBarChartProps): JSX.Element {
	return (
		<ResponsiveContainer height={400} width="100%">
			<BarChart data={phaseBreakdown.map((p) => ({ avgTime: p.avgTime, name: p.phase, totalTime: p.totalTime }))}>
				<CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
				<XAxis angle={-45} dataKey="name" height={80} textAnchor="end" tick={{ fill: "#6b6b6b" }} />
				<YAxis label={{ angle: -90, fill: "#6b6b6b", position: "insideLeft", value: "Time (ms)" }} tick={{ fill: "#6b6b6b" }} />
				<Tooltip contentStyle={{ backgroundColor: "#1e1e1e", border: "none" }} formatter={(value) => `${Number(value).toFixed(2)}ms`} />
				<Legend />
				<Bar dataKey="totalTime" fill="#007acc" name="Total Time" radius={[4, 4, 0, 0]} />
				<Bar dataKey="avgTime" fill="#4ec9b0" name="Avg Time" radius={[4, 4, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}
