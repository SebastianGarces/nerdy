"use client";

import type { CostByOperation } from "@/lib/api";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

const COLORS: Record<string, string> = {
	generate: "#3b82f6",
	evaluate: "#10b981",
	regenerate: "#f59e0b",
};

interface CostBreakdownChartProps {
	data: CostByOperation[];
}

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
	return (
		<div className="h-80 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={data}
						dataKey="totalCost"
						nameKey="operation"
						cx="50%"
						cy="50%"
						outerRadius={120}
						label={({ operation, percent }) =>
							`${operation} ${(percent * 100).toFixed(0)}%`
						}
					>
						{data.map((entry) => (
							<Cell
								key={entry.operation}
								fill={COLORS[entry.operation] ?? "#8b5cf6"}
							/>
						))}
					</Pie>
					<Tooltip
						contentStyle={{
							backgroundColor: "#e5e5e5",
							border: "1px solid #d4d4d4",
							borderRadius: "8px",
							color: "#171717",
						}}
						formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
					/>
					<Legend />
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}
