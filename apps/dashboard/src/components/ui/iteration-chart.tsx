"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface IterationTrend {
	iteration: number;
	avgScoreBefore: number;
	avgScoreAfter: number;
	count: number;
}

interface IterationChartProps {
	data: IterationTrend[];
}

export function IterationChart({ data }: IterationChartProps) {
	return (
		<div className="h-80 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data}>
					<CartesianGrid strokeDasharray="3 3" stroke="#404040" />
					<XAxis
						dataKey="iteration"
						tick={{ fill: "#a3a3a3", fontSize: 12 }}
						stroke="#525252"
						label={{
							value: "Iteration",
							position: "insideBottom",
							offset: -5,
							fill: "#a3a3a3",
						}}
					/>
					<YAxis
						tick={{ fill: "#a3a3a3", fontSize: 12 }}
						stroke="#525252"
						domain={[0, 10]}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: "#171717",
							border: "1px solid #404040",
							borderRadius: "8px",
							color: "#f5f5f5",
						}}
					/>
					<Legend />
					<Bar
						dataKey="avgScoreBefore"
						name="Score Before"
						fill="#ef4444"
						radius={[4, 4, 0, 0]}
					/>
					<Bar
						dataKey="avgScoreAfter"
						name="Score After"
						fill="#22c55e"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
