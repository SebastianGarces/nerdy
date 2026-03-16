"use client";

import { Button } from "@/components/ui/button";
import { useAds } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PAGE_SIZE = 25;

const statusFilters = ["all", "generating", "approved", "discarded"] as const;

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				status === "approved" && "bg-green-900/50 text-green-300",
				status === "generating" && "bg-yellow-900/50 text-yellow-300",
				status === "discarded" && "bg-red-900/50 text-red-300",
			)}
		>
			{status}
		</span>
	);
}

export default function AdsPage() {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [page, setPage] = useState(0);
	const { data, isLoading, error } = useAds({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
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
							onClick={() => {
								setStatusFilter(status);
								setPage(0);
							}}
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
				<div className="mt-4 flex items-center justify-between">
					<p className="text-sm text-neutral-500">
						Showing {data.ads.length === 0 ? 0 : page * PAGE_SIZE + 1}–
						{page * PAGE_SIZE + data.ads.length} of {data.total} ads
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p - 1)}
							disabled={page === 0}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<span className="text-sm text-neutral-400">
							Page {page + 1} of{" "}
							{Math.max(1, Math.ceil((data.total ?? 0) / PAGE_SIZE))}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p + 1)}
							disabled={page * PAGE_SIZE + data.ads.length >= (data.total ?? 0)}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
