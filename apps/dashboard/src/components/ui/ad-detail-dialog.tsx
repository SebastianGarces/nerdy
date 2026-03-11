"use client";

import type { Ad, DimensionScore, Evaluation } from "@/lib/api";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CreativeCardContent } from "./creative-card";

function scoreColor(score: number) {
	if (score >= 7.5) return "text-green-400";
	if (score >= 7) return "text-yellow-400";
	return "text-red-400";
}

function barColor(score: number) {
	if (score >= 7.5) return "bg-green-400";
	if (score >= 7) return "bg-yellow-400";
	return "bg-red-400";
}

export function AdDetailDialog({
	ad,
	evaluation,
	onClose,
}: {
	ad: Ad;
	evaluation?: Evaluation;
	onClose: () => void;
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	const dimensions = (evaluation?.dimensions ?? []) as DimensionScore[];

	const overlay = (
		<>
			{/* Backdrop — portaled to body so it covers the full viewport */}
			<motion.div
				key="backdrop"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1, transition: { duration: 0.2 } }}
				exit={{ opacity: 0, transition: { duration: 0.1 } }}
				className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Centering wrapper — pointer-events-none so clicks fall through to backdrop */}
			<div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
				<motion.div
					layoutId={`card-${ad.id}`}
					className="pointer-events-auto relative flex w-[90vw] max-w-3xl items-stretch overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl"
					style={{ borderRadius: 16, maxHeight: "85vh" }}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === "Escape") onClose();
					}}
				>
					{/* Close button */}
					<motion.button
						type="button"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: { delay: 0.2 } }}
						exit={{ opacity: 0, transition: { duration: 0.08, delay: 0 } }}
						onClick={onClose}
						className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
					>
						<X className="h-4 w-4" />
					</motion.button>

					{/* Left: Card preview — fixed width, vertically centered */}
					<div
						className="hidden shrink-0 self-center p-5 sm:block"
						style={{ width: 280 }}
					>
						<CreativeCardContent ad={ad} evaluation={evaluation} />
					</div>

					{/* Right: Scores panel — fades in after the layout animation lands */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{
							opacity: 1,
							transition: { duration: 0.2, delay: 0.15 },
						}}
						exit={{ opacity: 0, transition: { duration: 0.08, delay: 0 } }}
						className="flex-1 overflow-y-auto border-l border-neutral-800 p-6"
						style={{ maxHeight: "85vh" }}
					>
						{/* Score header */}
						{evaluation && (
							<div className="mb-6">
								<div className="flex items-baseline gap-3">
									<span
										className={`text-3xl font-bold ${scoreColor(evaluation.weightedScore)}`}
									>
										{evaluation.weightedScore.toFixed(2)}
									</span>
									<span className="text-sm text-neutral-500">
										weighted score
									</span>
								</div>
								<p className="mt-1 text-sm text-neutral-500">
									Confidence: {(evaluation.confidence * 100).toFixed(0)}%
								</p>
							</div>
						)}

						{/* Dimension scores */}
						{dimensions.length > 0 && (
							<div className="space-y-4">
								<h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
									Dimension Scores
								</h3>
								{dimensions.map((dim) => (
									<div key={dim.dimension}>
										<div className="flex items-center justify-between text-sm">
											<span className="text-neutral-300">{dim.dimension}</span>
											<span className={scoreColor(dim.score)}>
												{dim.score.toFixed(1)}/10
											</span>
										</div>
										<div className="mt-1 h-1.5 w-full rounded-full bg-neutral-800">
											<div
												className={`h-1.5 rounded-full ${barColor(dim.score)}`}
												style={{
													width: `${(dim.score / 10) * 100}%`,
												}}
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

						{/* View Ad Page link */}
						<div className="mt-6 border-t border-neutral-800 pt-4">
							<Link
								href={`/ads/${ad.id}`}
								className="inline-flex items-center gap-1 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
							>
								View Ad Page &rarr;
							</Link>
						</div>
					</motion.div>
				</motion.div>
			</div>
		</>
	);

	return createPortal(overlay, document.body);
}
