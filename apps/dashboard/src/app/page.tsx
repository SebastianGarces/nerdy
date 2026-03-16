"use client";

import { CampaignCard } from "@/components/ui/campaign-card";
import { PromptInput } from "@/components/ui/prompt-input";
import { StatsCard } from "@/components/ui/stats-card";
import { useCampaigns, useStats } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
	const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns();
	const { data: statsData } = useStats();

	return (
		<div className="space-y-8">
			<div>
				<h1 className="mb-2 text-2xl font-bold">Campaigns</h1>
				<p className="text-sm text-neutral-400">
					Describe your campaign and let AI generate ad creatives
				</p>
			</div>

			<PromptInput />

			{/* Compact Stats */}
			{statsData && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatsCard
						title="Total Ads"
						value={statsData.totalAds ?? 0}
						subtitle="Generated"
					/>
					<StatsCard
						title="Pass Rate"
						value={`${((statsData.passRate ?? 0) * 100).toFixed(1)}%`}
						subtitle="Quality threshold"
					/>
					<StatsCard
						title="Avg Score"
						value={(statsData.avgScore ?? 0).toFixed(2)}
						subtitle="Weighted"
					/>
					<StatsCard
						title="Cost"
						value={`$${(statsData.totalCost ?? 0).toFixed(4)}`}
						subtitle="API usage"
					/>
				</div>
			)}

			{/* Recent Campaigns */}
			<div>
				<h2 className="mb-4 text-lg font-semibold">Recent Campaigns</h2>
				{campaignsLoading ? (
					<div className="flex h-32 items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
					</div>
				) : campaignsData?.campaigns.length === 0 ? (
					<div className="rounded-xl border border-dashed border-neutral-700 py-12 text-center text-sm text-neutral-500">
						No campaigns yet. Create your first one above!
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{campaignsData?.campaigns.map((c) => (
							<CampaignCard key={c.id} campaign={c} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
