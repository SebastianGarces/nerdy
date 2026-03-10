"use client";

import type { Trend } from "@/lib/api";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface TrendChartProps {
	data: Trend[];
	dataKey?: string;
	label?: string;
	color?: string;
}

export function TrendChart({
	data,
	dataKey = "avgScore",
	label = "Avg Score",
	color = "#3b82f6",
}: TrendChartProps) {
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
					<YAxis tick={{ fill: "#a3a3a3", fontSize: 12 }} stroke="#525252" />
					<Tooltip
						contentStyle={{
							backgroundColor: "#171717",
							border: "1px solid #404040",
							borderRadius: "8px",
							color: "#f5f5f5",
						}}
					/>
					<Line
						type="monotone"
						dataKey={dataKey}
						name={label}
						stroke={color}
						strokeWidth={2}
						dot={{ fill: color, r: 4 }}
						activeDot={{ r: 6 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
