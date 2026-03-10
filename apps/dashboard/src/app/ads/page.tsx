"use client";

import { useAds } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const statusFilters = ["all", "draft", "published", "discarded"] as const;

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				status === "published" && "bg-green-900/50 text-green-300",
				status === "draft" && "bg-yellow-900/50 text-yellow-300",
				status === "discarded" && "bg-red-900/50 text-red-300",
			)}
		>
			{status}
		</span>
	);
}

export default function AdsPage() {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const { data, isLoading, error } = useAds({
		limit: 50,
		status: statusFilter,
	});

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Ads</h1>
				<div className="flex gap-2">
					{statusFilters.map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={cn(
								"rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
								statusFilter === status
									? "bg-neutral-700 text-neutral-50"
									: "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
							)}
						>
							{status.charAt(0).toUpperCase() + status.slice(1)}
						</button>
					))}
				</div>
			</div>

			{isLoading && (
				<div className="flex h-64 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
				</div>
			)}

			{error && (
				<div className="rounded-xl border border-red-900 bg-red-950 p-6 text-red-300">
					Failed to load ads. Is the API running?
				</div>
			)}

			{data && data.ads.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center text-neutral-500">
					<FileText className="mb-2 h-12 w-12" />
					<p>No ads found</p>
				</div>
			)}

			{data && data.ads.length > 0 && (
				<div className="overflow-hidden rounded-xl border border-neutral-800">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-neutral-800 bg-neutral-900">
							<tr>
								<th className="px-4 py-3 font-medium text-neutral-400">
									Headline
								</th>
								<th className="px-4 py-3 font-medium text-neutral-400">
									Status
								</th>
								<th className="px-4 py-3 font-medium text-neutral-400">
									Iteration
								</th>
								<th className="px-4 py-3 font-medium text-neutral-400">Date</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-800">
							{data.ads.map((ad) => (
								<tr
									key={ad.id}
									className="transition-colors hover:bg-neutral-900"
								>
									<td className="px-4 py-3">
										<Link
											href={`/ads/${ad.id}`}
											className="font-medium text-blue-400 hover:text-blue-300"
										>
											{ad.headline || "Untitled"}
										</Link>
									</td>
									<td className="px-4 py-3">
										<StatusBadge status={ad.status} />
									</td>
									<td className="px-4 py-3 text-neutral-400">{ad.iteration}</td>
									<td className="px-4 py-3 text-neutral-400">
										{new Date(ad.createdAt).toLocaleDateString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{data && (
				<p className="mt-4 text-sm text-neutral-500">
					Showing {data.ads.length} of {data.total} ads
				</p>
			)}
		</div>
	);
}
