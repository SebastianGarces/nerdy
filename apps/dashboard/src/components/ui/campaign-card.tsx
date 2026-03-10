import type { Campaign } from "@/lib/api";
import { Clock, FileText } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
	generating: "bg-yellow-500/20 text-yellow-400",
	completed: "bg-green-500/20 text-green-400",
	failed: "bg-red-500/20 text-red-400",
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
	return (
		<Link
			href={`/campaigns/${campaign.id}`}
			className="group rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-700 hover:bg-neutral-800/50"
		>
			<div className="mb-3 flex items-start justify-between">
				<h3 className="font-semibold text-neutral-100 line-clamp-1 group-hover:text-white">
					{campaign.name}
				</h3>
				<span
					className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[campaign.status] ?? ""}`}
				>
					{campaign.status}
				</span>
			</div>
			<p className="mb-4 text-sm text-neutral-400 line-clamp-2">
				{campaign.description}
			</p>
			<div className="flex items-center gap-4 text-xs text-neutral-500">
				<span className="flex items-center gap-1">
					<FileText className="h-3 w-3" />
					{campaign.adCount} ads
				</span>
				<span className="flex items-center gap-1">
					<Clock className="h-3 w-3" />
					{new Date(campaign.createdAt).toLocaleDateString()}
				</span>
			</div>
		</Link>
	);
}
