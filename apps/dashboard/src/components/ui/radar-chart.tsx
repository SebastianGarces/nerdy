"use client";

import type { DimensionScore } from "@/lib/api";
import {
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
} from "recharts";

interface DimensionRadarChartProps {
	dimensions: DimensionScore[];
}

export function DimensionRadarChart({ dimensions }: DimensionRadarChartProps) {
	const data = dimensions.map((d) => ({
		dimension: d.dimension,
		score: d.score,
		fullMark: 10,
	}));

	return (
		<div className="h-80 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
					<PolarGrid stroke="#404040" />
					<PolarAngleAxis
						dataKey="dimension"
						tick={{ fill: "#a3a3a3", fontSize: 12 }}
					/>
					<PolarRadiusAxis
						angle={90}
						domain={[0, 10]}
						tick={{ fill: "#737373", fontSize: 10 }}
					/>
					<Radar
						name="Score"
						dataKey="score"
						stroke="#3b82f6"
						fill="#3b82f6"
						fillOpacity={0.3}
					/>
				</RadarChart>
			</ResponsiveContainer>
		</div>
	);
}
