"use client";

import { TrendChart } from "@/components/ui/trend-chart";
import { useTrends } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function TrendsPage() {
	const { data, isLoading, error } = useTrends();

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
				Failed to load trends. Is the API running?
			</div>
		);
	}

	const trends = data?.trends ?? [];

	if (trends.length === 0) {
		return (
			<div>
				<h1 className="mb-8 text-2xl font-bold">Quality Trends</h1>
				<div className="flex h-64 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-500">
					No trend data available yet
				</div>
			</div>
		);
	}

	return (
		<div>
			<h1 className="mb-8 text-2xl font-bold">Quality Trends</h1>

			<div className="space-y-8">
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
					<h2 className="mb-4 text-lg font-semibold">
						Average Score Over Time
					</h2>
					<TrendChart
						data={trends}
						dataKey="avgScore"
						label="Avg Score"
						color="#3b82f6"
					/>
				</div>

				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
					<h2 className="mb-4 text-lg font-semibold">Ads Generated Per Day</h2>
					<TrendChart
						data={trends}
						dataKey="count"
						label="Count"
						color="#10b981"
					/>
				</div>
			</div>
		</div>
	);
}
