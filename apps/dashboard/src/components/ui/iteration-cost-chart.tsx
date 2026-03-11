"use client";

import type { IterationCostData } from "@/lib/api";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface IterationCostChartProps {
	data: IterationCostData;
}

export function IterationCostChart({ data }: IterationCostChartProps) {
	return (
		<div className="space-y-4">
			<div className="h-80 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={data.iterations}>
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
						<YAxis tick={{ fill: "#a3a3a3", fontSize: 12 }} stroke="#525252" />
						<Tooltip
							contentStyle={{
								backgroundColor: "#171717",
								border: "1px solid #404040",
								borderRadius: "8px",
								color: "#f5f5f5",
							}}
						/>
						<Bar
							dataKey="adCount"
							name="Ads"
							fill="#3b82f6"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
			{data.costByOperation.length > 0 && (
				<div className="grid grid-cols-3 gap-4">
					{data.costByOperation.map((op) => (
						<div
							key={op.operation}
							className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-center"
						>
							<div className="text-xs text-neutral-500 capitalize">
								{op.operation}
							</div>
							<div className="text-lg font-semibold text-neutral-100">
								${op.avgCost.toFixed(4)}
							</div>
							<div className="text-xs text-neutral-500">avg cost/call</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
