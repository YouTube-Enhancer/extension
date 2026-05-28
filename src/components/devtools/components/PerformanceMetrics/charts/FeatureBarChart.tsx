import type { JSX } from "react";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { FeatureGroup } from "../types";

type FeatureBarChartProps = {
	featureBreakdown: FeatureGroup[];
};

export default function FeatureBarChart({ featureBreakdown }: FeatureBarChartProps): JSX.Element {
	return (
		<ResponsiveContainer height={Math.max(400, featureBreakdown.slice(0, 15).length * 30)} width="100%">
			<BarChart data={featureBreakdown.slice(0, 15)} layout="vertical">
				<CartesianGrid stroke="#3c3c3c" strokeDasharray="3 3" />
				<XAxis label={{ fill: "#6b6b6b", position: "insideBottom", value: "Time (ms)" }} tick={{ fill: "#6b6b6b" }} type="number" />
				<YAxis dataKey="id" tick={{ fill: "#6b6b6b", fontSize: 12 }} type="category" width={150} />
				<Tooltip contentStyle={{ backgroundColor: "#1e1e1e", border: "none" }} formatter={(value) => `${Number(value).toFixed(2)}ms`} />
				<Legend />
				<Bar dataKey="totalTime" fill="#9cdcfe" name="Total Time" radius={[0, 4, 4, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}
