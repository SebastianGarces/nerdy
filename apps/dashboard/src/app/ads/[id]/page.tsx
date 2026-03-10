"use client";

import { DimensionRadarChart } from "@/components/ui/radar-chart";
import { useAd } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdDetailPage() {
	const params = useParams();
	const id = params.id as string;
	const { data, isLoading, error } = useAd(id);

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
				Failed to load ad detail.
			</div>
		);
	}

	const { ad, evaluations } = data;
	const latestEval = evaluations.length > 0 ? evaluations[0] : null;

	return (
		<div>
			<Link
				href="/ads"
				className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Ads
			</Link>

			<div className="mb-8">
				<h1 className="text-2xl font-bold">{ad.headline || "Untitled Ad"}</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Iteration {ad.iteration} &middot;{" "}
					{new Date(ad.createdAt).toLocaleDateString()}
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-6">
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
						<h2 className="mb-4 text-lg font-semibold">Ad Copy</h2>
						<div className="space-y-4">
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
									Primary Text
								</p>
								<p className="mt-1 text-neutral-200">{ad.primaryText}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
									Headline
								</p>
								<p className="mt-1 text-neutral-200">{ad.headline}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
									Description
								</p>
								<p className="mt-1 text-neutral-200">{ad.description}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
									Call to Action
								</p>
								<p className="mt-1 text-neutral-200">{ad.callToAction}</p>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					{latestEval && (
						<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
							<h2 className="mb-4 text-lg font-semibold">Evaluation Scores</h2>
							<div className="mb-4 flex items-center gap-4">
								<div>
									<p className="text-xs text-neutral-500">Weighted Score</p>
									<p className="text-2xl font-bold text-blue-400">
										{latestEval.weightedScore.toFixed(2)}
									</p>
								</div>
								<div>
									<p className="text-xs text-neutral-500">Confidence</p>
									<p className="text-2xl font-bold text-neutral-300">
										{(latestEval.confidence * 100).toFixed(0)}%
									</p>
								</div>
							</div>
							<DimensionRadarChart dimensions={latestEval.dimensions} />
						</div>
					)}

					{evaluations.length > 1 && (
						<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
							<h2 className="mb-4 text-lg font-semibold">Iteration History</h2>
							<div className="space-y-3">
								{evaluations.map((evaluation, idx) => (
									<div
										key={evaluation.id}
										className="flex items-center justify-between rounded-lg border border-neutral-800 px-4 py-3"
									>
										<span className="text-sm text-neutral-400">
											Eval #{evaluations.length - idx}
										</span>
										<span className="font-medium text-neutral-200">
											{evaluation.weightedScore.toFixed(2)}
										</span>
										<span className="text-xs text-neutral-500">
											{new Date(evaluation.createdAt).toLocaleDateString()}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{!latestEval && (
						<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-500">
							No evaluations yet
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
