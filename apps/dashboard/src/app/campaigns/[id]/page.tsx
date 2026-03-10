"use client";

import { CreativeCard } from "@/components/ui/creative-card";
import { useAddCreatives, useCampaign } from "@/lib/api";
import type { Ad, Evaluation } from "@/lib/api";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function CampaignDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { data, isLoading, error } = useCampaign(id);
	const addCreatives = useAddCreatives(id);

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
						<button
							type="button"
							onClick={() => addCreatives.mutate()}
							disabled={
								addCreatives.isPending || campaign.status === "generating"
							}
							className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{addCreatives.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							Add Creatives
						</button>
					</div>
				</div>
			</div>

			{/* Campaign info */}
			<div className="flex gap-6 text-sm text-neutral-400">
				<span>{ads.length} creatives</span>
				<span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
			</div>

			{/* Creative gallery */}
			{ads.length === 0 ? (
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
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{ads.map((ad: Ad) => (
						<CreativeCard key={ad.id} ad={ad} evaluation={evalMap.get(ad.id)} />
					))}
				</div>
			)}
		</div>
	);
}
