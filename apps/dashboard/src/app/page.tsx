"use client";

import { StatsCard } from "@/components/ui/stats-card";
import { useStats } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
	const { data, isLoading, error } = useStats();

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
				Failed to load stats. Is the API running?
			</div>
		);
	}

	return (
		<div>
			<h1 className="mb-8 text-2xl font-bold">Dashboard</h1>
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Ads"
					value={data?.totalAds ?? 0}
					subtitle="Generated ad copies"
				/>
				<StatsCard
					title="Pass Rate"
					value={`${((data?.passRate ?? 0) * 100).toFixed(1)}%`}
					subtitle="Meeting quality threshold"
				/>
				<StatsCard
					title="Avg Score"
					value={(data?.avgScore ?? 0).toFixed(2)}
					subtitle="Weighted evaluation score"
				/>
				<StatsCard
					title="Total Cost"
					value={`$${(data?.totalCost ?? 0).toFixed(4)}`}
					subtitle="API usage cost"
				/>
			</div>
		</div>
	);
}
