"use client";

import type { LatencyOverTime } from "@/lib/api";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface LatencyChartProps {
	data: LatencyOverTime[];
}

export function LatencyChart({ data }: LatencyChartProps) {
	return (
		<div className="h-80 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" stroke="#404040" />
					<XAxis
						dataKey="date"
						tick={{ fill: "#a3a3a3", fontSize: 12 }}
						stroke="#525252"
					/>
					<YAxis
						tick={{ fill: "#a3a3a3", fontSize: 12 }}
						stroke="#525252"
						tickFormatter={(v: number) =>
							v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`
						}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: "#171717",
							border: "1px solid #404040",
							borderRadius: "8px",
							color: "#f5f5f5",
						}}
						formatter={(value: number, name: string) => [
							value >= 1000
								? `${(value / 1000).toFixed(2)}s`
								: `${Math.round(value)}ms`,
							name,
						]}
					/>
					<Legend />
					<Line
						type="monotone"
						dataKey="avgGenerationMs"
						name="Generation"
						stroke="#3b82f6"
						strokeWidth={2}
						dot={{ fill: "#3b82f6", r: 4 }}
						activeDot={{ r: 6 }}
					/>
					<Line
						type="monotone"
						dataKey="avgEvaluationMs"
						name="Evaluation"
						stroke="#10b981"
						strokeWidth={2}
						dot={{ fill: "#10b981", r: 4 }}
						activeDot={{ r: 6 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
