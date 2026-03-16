"use client";

import { AdDetailDialog } from "@/components/ui/ad-detail-dialog";
import { CreativeCard } from "@/components/ui/creative-card";
import type { Ad, Evaluation } from "@/lib/api";
import { useCampaign } from "@/lib/api";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import Link from "next/link";
import { use, useState } from "react";

export default function CampaignDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { data, isLoading, error } = useCampaign(id);
	const [filter, setFilter] = useState<
		"all" | "generating" | "approved" | "discarded"
	>("all");
	const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="rounded-xl border border-red-900 bg-red-950 p-6 text-red-300">
				Failed to load campaign.
			</div>
		);
	}

	const { campaign, ads, evaluations } = data;

	const evalMap = new Map<string, Evaluation>();
	for (const ev of evaluations) {
		evalMap.set(ev.adId, ev);
	}

	const filteredAds =
		filter === "all" ? ads : ads.filter((ad: Ad) => ad.status === filter);

	const sortedAds = [...filteredAds].sort((a, b) => {
		if (a.status === "generating" && b.status !== "generating") return 1;
		if (a.status !== "generating" && b.status === "generating") return -1;
		return 0;
	});

	const statusColor =
		campaign.status === "generating"
			? "text-yellow-400"
			: campaign.status === "completed"
				? "text-green-400"
				: "text-red-400";

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<Link
					href="/"
					className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Campaigns
				</Link>
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold">{campaign.name}</h1>
						<p className="mt-1 text-sm text-neutral-400">{campaign.prompt}</p>
					</div>
					<div className="flex items-center gap-3">
						<span className={`text-sm font-medium ${statusColor}`}>
							{campaign.status === "generating" && (
								<Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
							)}
							{campaign.status}
						</span>
						{/* TODO: Re-enable when image generation (nanobanana) is integrated */}
					</div>
				</div>
			</div>

			{/* Campaign info */}
			<div className="flex gap-6 text-sm text-neutral-400">
				<span>
					{filter === "all"
						? `${ads.length} creatives`
						: `${filteredAds.length} of ${ads.length} creatives`}
				</span>
				<span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
			</div>

			{/* Filter */}
			<div className="flex gap-2">
				{(campaign.status === "generating"
					? (["all", "generating", "approved", "discarded"] as const)
					: (["all", "approved", "discarded"] as const)
				).map((value) => (
					<button
						key={value}
						type="button"
						onClick={() => setFilter(value)}
						className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
							filter === value
								? "bg-neutral-200 text-neutral-900"
								: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
						}`}
					>
						{value.charAt(0).toUpperCase() + value.slice(1)}
					</button>
				))}
			</div>

			{/* Creative gallery */}
			<LayoutGroup>
				{sortedAds.length === 0 ? (
					<div className="rounded-xl border border-dashed border-neutral-700 py-16 text-center">
						{campaign.status === "generating" ? (
							<div className="space-y-2">
								<Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />
								<p className="text-sm text-neutral-400">
									Generating creatives...
								</p>
							</div>
						) : (
							<div className="space-y-2">
								<Sparkles className="mx-auto h-8 w-8 text-neutral-600" />
								<p className="text-sm text-neutral-500">No creatives yet</p>
							</div>
						)}
					</div>
				) : (
					<div
						className="grid gap-4"
						style={{
							gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
						}}
					>
						{sortedAds.map((ad: Ad) => (
							<CreativeCard
								key={ad.id}
								ad={ad}
								evaluation={evalMap.get(ad.id)}
								mode="button"
								layoutId={`card-${ad.id}`}
								onClick={() => setSelectedAdId(ad.id)}
							/>
						))}
					</div>
				)}

				<AnimatePresence>
					{selectedAdId &&
						(() => {
							const freshAd = ads.find((a: Ad) => a.id === selectedAdId);
							if (!freshAd) return null;
							return (
								<AdDetailDialog
									ad={freshAd}
									evaluation={evalMap.get(freshAd.id)}
									onClose={() => setSelectedAdId(null)}
								/>
							);
						})()}
				</AnimatePresence>
			</LayoutGroup>
		</div>
	);
}
