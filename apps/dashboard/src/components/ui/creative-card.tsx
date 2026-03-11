"use client";

import type { Ad, Evaluation } from "@/lib/api";
import { motion } from "motion/react";
import Link from "next/link";

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return Math.abs(hash);
}

const gradients = [
	"from-blue-600 to-purple-700",
	"from-emerald-600 to-teal-700",
	"from-orange-600 to-red-700",
	"from-pink-600 to-rose-700",
	"from-indigo-600 to-blue-700",
	"from-violet-600 to-purple-700",
	"from-cyan-600 to-blue-700",
	"from-amber-600 to-orange-700",
];

export function CreativeCardContent({
	ad,
	evaluation,
	className,
	style,
}: {
	ad: Ad;
	evaluation?: Evaluation;
	className?: string;
	style?: React.CSSProperties;
}) {
	const gradientIndex = hashCode(ad.id) % gradients.length;
	const gradient = gradients[gradientIndex];
	const score = evaluation?.weightedScore;

	return (
		<div
			className={`flex flex-col overflow-hidden rounded-xl border border-neutral-800 ${className ?? ""}`}
			style={{ aspectRatio: "9/16", ...style }}
		>
			<div
				className={`flex flex-1 flex-col justify-between bg-gradient-to-br ${gradient} p-5`}
			>
				{score != null && (
					<div className="flex justify-end">
						<span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
							{score.toFixed(1)}
						</span>
					</div>
				)}

				<div className="mt-auto space-y-3">
					<h3 className="text-lg font-bold leading-tight text-white">
						{ad.headline}
					</h3>
					<p className="text-sm text-white/80 line-clamp-3">{ad.primaryText}</p>
				</div>

				<div className="mt-4">
					<span className="inline-block rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
						{ad.callToAction}
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
				<span>Iteration {ad.iteration}</span>
				<span
					className={
						ad.status === "published"
							? "text-green-400"
							: ad.status === "discarded"
								? "text-red-400"
								: "text-neutral-400"
					}
				>
					{ad.status}
				</span>
			</div>
		</div>
	);
}

export function CreativeCard({
	ad,
	evaluation,
	mode = "link",
	onClick,
	layoutId,
}: {
	ad: Ad;
	evaluation?: Evaluation;
	mode?: "link" | "button";
	onClick?: () => void;
	layoutId?: string;
}) {
	if (mode === "button") {
		return (
			<motion.button
				type="button"
				layoutId={layoutId}
				onClick={onClick}
				className="cursor-pointer overflow-hidden text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
				style={{ borderRadius: 12 }}
			>
				<CreativeCardContent ad={ad} evaluation={evaluation} />
			</motion.button>
		);
	}

	return (
		<Link
			href={`/ads/${ad.id}`}
			className="group transition-all hover:shadow-lg"
		>
			<CreativeCardContent
				ad={ad}
				evaluation={evaluation}
				className="transition-colors hover:border-neutral-600"
			/>
		</Link>
	);
}
