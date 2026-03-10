"use client";

import type { DimensionScore, IterationEntry, IterationLog } from "@/lib/api";
import {
	ChevronDown,
	ChevronRight,
	Target,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface IterationTimelineProps {
	currentIteration: number;
	iterations: IterationEntry[];
	iterationLogs: IterationLog[];
}

function scoreColor(score: number) {
	if (score >= 7.5) return "text-green-400";
	if (score >= 7) return "text-yellow-400";
	return "text-red-400";
}

function scoreBgColor(score: number) {
	if (score >= 7.5) return "bg-green-400/10 border-green-400/30";
	if (score >= 7) return "bg-yellow-400/10 border-yellow-400/30";
	return "bg-red-400/10 border-red-400/30";
}

export function IterationTimeline({
	currentIteration,
	iterations,
	iterationLogs,
}: IterationTimelineProps) {
	const [expanded, setExpanded] = useState<number | null>(null);

	const previous = iterations.filter(
		(entry) => entry.ad.iteration < currentIteration,
	);

	if (previous.length === 0) return null;

	return (
		<div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
			<h2 className="mb-6 text-lg font-semibold">Iteration History</h2>
			<div className="relative ml-4 border-l-2 border-neutral-700 pl-6">
				{previous.map((entry, idx) => {
					const iter = entry.ad.iteration;
					const score = entry.evaluation?.weightedScore ?? null;
					const prev = idx > 0 ? previous[idx - 1] : undefined;
					const prevScore = prev?.evaluation?.weightedScore ?? null;
					const delta =
						score !== null && prevScore !== null ? score - prevScore : null;
					const log = iterationLogs.find((l) => l.iteration === iter);
					const isExpanded = expanded === iter;
					const dimensions = (entry.evaluation?.dimensions ??
						[]) as DimensionScore[];

					return (
						<div key={entry.ad.id} className="relative mb-6 last:mb-0">
							{/* Timeline dot */}
							<div className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-neutral-700 bg-neutral-900" />

							{/* Collapsed row */}
							<button
								type="button"
								onClick={() => setExpanded(isExpanded ? null : iter)}
								className="flex w-full items-center gap-3 text-left"
							>
								<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-neutral-300">
									{iter}
								</span>

								{score !== null && (
									<span
										className={`rounded-md border px-2 py-0.5 text-sm font-medium ${scoreBgColor(score)} ${scoreColor(score)}`}
									>
										{score.toFixed(2)}
									</span>
								)}

								{delta !== null && (
									<span
										className={`inline-flex items-center gap-0.5 text-xs ${delta >= 0 ? "text-green-400" : "text-red-400"}`}
									>
										{delta >= 0 ? (
											<TrendingUp className="h-3 w-3" />
										) : (
											<TrendingDown className="h-3 w-3" />
										)}
										{delta >= 0 ? "+" : ""}
										{delta.toFixed(2)}
									</span>
								)}

								{log ? (
									<span className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
										<Target className="h-3 w-3" />
										{log.weakestDimension}
									</span>
								) : (
									<span className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
										Initial
									</span>
								)}

								<span className="ml-auto">
									{isExpanded ? (
										<ChevronDown className="h-4 w-4 text-neutral-500" />
									) : (
										<ChevronRight className="h-4 w-4 text-neutral-500" />
									)}
								</span>
							</button>

							{/* Expanded detail */}
							{isExpanded && (
								<div className="mt-4 space-y-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
									{/* Ad copy */}
									<div className="grid gap-3 sm:grid-cols-2">
										<div>
											<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
												Primary Text
											</p>
											<p className="mt-1 text-sm text-neutral-300">
												{entry.ad.primaryText}
											</p>
										</div>
										<div>
											<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
												Headline
											</p>
											<p className="mt-1 text-sm text-neutral-300">
												{entry.ad.headline}
											</p>
										</div>
										<div>
											<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
												Description
											</p>
											<p className="mt-1 text-sm text-neutral-300">
												{entry.ad.description}
											</p>
										</div>
										<div>
											<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
												CTA
											</p>
											<p className="mt-1 text-sm text-neutral-300">
												{entry.ad.callToAction}
											</p>
										</div>
									</div>

									{/* Dimension scores */}
									{dimensions.length > 0 && (
										<div className="space-y-2">
											<p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
												Dimension Scores
											</p>
											{dimensions.map((dim) => (
												<div key={dim.dimension}>
													<div className="flex items-center justify-between text-sm">
														<span className="text-neutral-300">
															{dim.dimension}
														</span>
														<span className={scoreColor(dim.score)}>
															{dim.score.toFixed(1)}/10
														</span>
													</div>
													<div className="mt-1 h-1.5 w-full rounded-full bg-neutral-800">
														<div
															className={`h-1.5 rounded-full ${dim.score >= 7.5 ? "bg-green-400" : dim.score >= 7 ? "bg-yellow-400" : "bg-red-400"}`}
															style={{ width: `${(dim.score / 10) * 100}%` }}
														/>
													</div>
													{dim.rationale && (
														<p className="mt-1 text-xs text-neutral-500">
															{dim.rationale}
														</p>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
