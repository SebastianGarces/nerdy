"use client";

import { CostBreakdownChart } from "@/components/ui/cost-breakdown-chart";
import { IterationCostChart } from "@/components/ui/iteration-cost-chart";
import { TrendChart } from "@/components/ui/trend-chart";
import {
	useAnalyticsSummary,
	useCostByOperation,
	useCostOverTime,
	useEfficiencyOverTime,
	useIterationCost,
} from "@/lib/api";
import { Loader2 } from "lucide-react";

function formatCost(value: number) {
	return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

function formatNumber(value: number) {
	return value.toLocaleString();
}

export default function AnalyticsPage() {
	const { data: summary, isLoading, error } = useAnalyticsSummary();
	const { data: costOverTime } = useCostOverTime();
	const { data: costByOp } = useCostByOperation();
	const { data: efficiency } = useEfficiencyOverTime();
	const { data: iterationCost } = useIterationCost();

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-xl border border-red-900 bg-red-950 p-6 text-red-300">
				Failed to load analytics. Is the API running?
			</div>
		);
	}

	if (!summary) return null;

	const statCards = [
		{ label: "Cost / Ad", value: formatCost(summary.costPerAd) },
		{
			label: "Cost / Passing Ad",
			value: formatCost(summary.costPerPassingAd),
		},
		{ label: "Quality / $", value: summary.qualityPerDollar.toFixed(1) },
		{ label: "Total Tokens", value: formatNumber(summary.totalTokens) },
		{ label: "Total Cost", value: formatCost(summary.totalCost) },
	];

	return (
		<div>
			<h1 className="mb-8 text-2xl font-bold">Performance Analytics</h1>

			<div className="space-y-8">
				{/* Summary stat cards */}
				<div className="grid grid-cols-5 gap-4">
					{statCards.map((stat) => (
						<div
							key={stat.label}
							className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center"
						>
							<div className="text-sm text-neutral-400">{stat.label}</div>
							<div className="mt-1 text-2xl font-bold text-neutral-50">
								{stat.value}
							</div>
						</div>
					))}
				</div>

				{/* Daily API Cost chart */}
				{costOverTime && costOverTime.length > 0 && (
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
						<h2 className="mb-4 text-lg font-semibold">Daily API Cost</h2>
						<TrendChart
							data={costOverTime}
							dataKey="dailyCost"
							label="Daily Cost ($)"
							color="#3b82f6"
						/>
					</div>
				)}

				{/* Cost by Operation pie chart */}
				{costByOp && costByOp.length > 0 && (
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
						<h2 className="mb-4 text-lg font-semibold">Cost by Operation</h2>
						<CostBreakdownChart data={costByOp} />
					</div>
				)}

				{/* Two-column row */}
				<div className="grid grid-cols-2 gap-8">
					{/* Cost per Quality Point */}
					{efficiency && efficiency.length > 0 && (
						<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
							<h2 className="mb-4 text-lg font-semibold">
								Cost per Quality Point
							</h2>
							<TrendChart
								data={efficiency}
								dataKey="costPerQualityPoint"
								label="$/Quality Point"
								color="#f59e0b"
							/>
						</div>
					)}

					{/* Iteration Cost */}
					{iterationCost && (
						<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
							<h2 className="mb-4 text-lg font-semibold">Ads by Iteration</h2>
							<IterationCostChart data={iterationCost} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
