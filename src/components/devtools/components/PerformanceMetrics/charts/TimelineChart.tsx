import type { JSX } from "react";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TimelineChartProps = {
	timelineData: unknown[];
};

export default function TimelineChart({ timelineData }: TimelineChartProps): JSX.Element {
	return (
		<ResponsiveContainer height={400} width="100%">
			<LineChart data={timelineData}>
				<CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
				<XAxis
					dataKey="timestamp"
					domain={["auto", "auto"]}
					label={{ fill: "#6b6b6b", position: "insideBottom", value: "Time" }}
					tick={{ fill: "#6b6b6b", fontSize: 12 }}
					tickFormatter={(ts) => new Date(Number(ts)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
					type="number"
				/>
				<YAxis label={{ angle: -90, fill: "#6b6b6b", position: "insideLeft", value: "Duration (ms)" }} tick={{ fill: "#6b6b6b" }} />
				<Tooltip
					contentStyle={{ backgroundColor: "#1e1e1e", border: "none" }}
					formatter={(value) => `${Number(value).toFixed(2)}ms`}
					labelFormatter={(ts) => new Date(Number(ts)).toLocaleString()}
				/>
				<Legend />
				<Line activeDot={{ r: 5 }} dataKey="duration" dot={{ r: 3 }} stroke="#8884d8" type="monotone" />
			</LineChart>
		</ResponsiveContainer>
	);
}
