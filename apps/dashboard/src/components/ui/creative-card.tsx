"use client";

import { type Ad, type Evaluation, useGenerateImage } from "@/lib/api";
import { motion } from "motion/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return Math.abs(hash);
}

function VarsityTutorsLogo({ className }: { className?: string }) {
	return (
		<svg
			role="img"
			aria-label="Varsity Tutors"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 301 50"
			className={className}
		>
			<ellipse cx="20.37" cy="19.22" fill="#ff616e" rx="7.89" ry="7.92" />
			<path
				d="m29.94 30.92a15.06 15.06 0 0 1 -22.32-3.62 18.93 18.93 0 0 1 -2.62-8 14.81 14.81 0 0 1 .73-6.08 27.39 27.39 0 0 1 3-5.66c.62-1 .77-1.76-.89-1.06a14.28 14.28 0 0 0 -5.44 5.65 21.92 21.92 0 0 0 -2.23 6.39c-.11.62-1.46 10 5.7 16.22a17.36 17.36 0 0 0 4.31 2.59 19.86 19.86 0 0 0 8.92 1.41 17.9 17.9 0 0 0 6-1.77 13 13 0 0 0 1.27-.77 15.56 15.56 0 0 0 5.69-7.43 15.25 15.25 0 0 1 -2.12 2.13z"
				fill="#8fcbe0"
			/>
			<g fill="#3a53a2">
				<path d="m45.51 11.17a17.94 17.94 0 0 0 -5.64-8.56 11.3 11.3 0 0 0 -9.74-2.28c-1.45.39-3 1.53-2.81 3a4.12 4.12 0 0 0 1.36 2.11 22.83 22.83 0 0 1 5 23.59 17 17 0 0 1 -6.43 8.51 16.91 16.91 0 0 1 -9.64 2.88 21.59 21.59 0 0 1 -8.07-1.6 18.78 18.78 0 0 1 -4.47-2.64 22.69 22.69 0 0 0 9.42 6.47 24.47 24.47 0 0 0 17.33-.5 24.61 24.61 0 0 0 11.49-10.22 24.21 24.21 0 0 0 1.33-2.58 25.62 25.62 0 0 0 .87-18.18z" />
				<path d="m212.05 6h-25.05v3.35h10.56v28.46h3.93v-28.46h10.56zm11.37 23.31c-2.49 3.47-5.95 5.92-8.25 5.92-1.83 0-2.59-1.11-2.59-3.8v-15.43h-3.58v16.37c0 4 2 6.12 5.8 6.12 3.27 0 6.1-1.69 8.64-5.2v4.52h3.65v-21.81h-3.65zm16 5.49c-.76 0-1.15-.34-1.24-1-.05-.39-.15-2.22-.15-2.41v-12.39h5.76v-3h-5.76v-6.36h-3.6v6.36l-3.64.91v2.09h3.64v14.58c0 2.89 1.68 4.86 4.18 4.86 1.72 0 2.92-.63 5.47-2.74l-1.49-2.41c-1.5 1.15-2.22 1.54-3.13 1.54zm16.86-19.41c-5.91 0-10.75 5.2-10.75 11.51s4.84 11.51 10.75 11.51 10.72-5.22 10.72-11.48-4.83-11.51-10.68-11.51zm0 19.79c-3.84 0-6.82-3.66-6.82-8.28s3-8.28 6.82-8.28 6.76 3.66 6.76 8.28-2.93 8.31-6.72 8.31zm18.37-15.18v-4h-3.6v21.81h3.6v-13c2.06-3.76 3.79-5.73 5.13-5.73.43 0 .82.24 1.54.87l1.77-3a4.35 4.35 0 0 0 -2.78-1.49c-1.63-.04-2.98 1.02-5.66 4.54zm20.45 5.39c-3.94-1.64-4.51-2-5.38-2.84a1.92 1.92 0 0 1 -.52-1.35c0-1.64 1.58-2.74 4-2.74a9.24 9.24 0 0 1 2.49.38 9.64 9.64 0 0 1 3.12 1.45l1.78-2.94a11.5 11.5 0 0 0 -4.23-1.64 13.75 13.75 0 0 0 -2.78-.24c-5.09 0-8.25 2.36-8.25 6.16 0 2.65 1.44 4.15 5.66 5.93 3.89 1.59 4.89 2.21 5.76 3.47a2.85 2.85 0 0 1 .43 1.49c0 1.68-1.63 2.89-3.84 2.89a12.08 12.08 0 0 1 -5.52-1.49l-1.1-.58-1.49 3a15.18 15.18 0 0 0 5.14 1.83 17.93 17.93 0 0 0 3 .29c4.75 0 7.58-2.36 7.58-6.26.05-3.44-1.25-4.93-5.85-6.86zm-215.97-19.39-9 24.8a4.21 4.21 0 0 0 -.28 1.54 6.42 6.42 0 0 0 -.34-1.54l-9.39-24.8h-4.22l12.48 32.6h2.4l12.28-32.6zm19.14 28.25v-13.39c0-3.37-2.73-5.44-7.1-5.44-4.65 0-7.82 2-7.82 4.86a2.2 2.2 0 0 0 .38 1.35l3.65-.77a2.22 2.22 0 0 1 -.19-.82c0-1.25 1-1.88 3.31-1.88 2.78 0 4.13.92 4.13 2.7v3.95l-7.54 1.78a5.8 5.8 0 0 0 -4.84 6.07 5.42 5.42 0 0 0 5.8 5.73 9.74 9.74 0 0 0 4.61-1.25 11.45 11.45 0 0 0 2.34-1.73c.19 2.07 1.25 2.84 4.22 3l.87-3c-1.15-.2-1.72-.58-1.82-1.16zm-3.64-1.88c-3.12 2.27-4.23 2.8-5.86 2.8a2.71 2.71 0 0 1 -2.93-2.85 4.28 4.28 0 0 1 .63-2.32l8.16-2.11zm13.19-12.37v-4h-3.6v21.81h3.6v-13c2.07-3.76 3.79-5.73 5.14-5.73.43 0 .81.24 1.53.87l1.78-3a4.34 4.34 0 0 0 -2.79-1.49c-1.63-.04-2.97 1.02-5.66 4.54zm20.06 5.39c-3.93-1.64-4.51-2-5.37-2.84a1.89 1.89 0 0 1 -.53-1.35c0-1.64 1.58-2.74 4-2.74a9.19 9.19 0 0 1 2.49.38 9.64 9.64 0 0 1 3.12 1.45l1.78-2.94a11.4 11.4 0 0 0 -4.22-1.64 13.91 13.91 0 0 0 -2.79-.24c-5.08 0-8.25 2.36-8.25 6.16 0 2.65 1.44 4.15 5.66 5.93 3.89 1.59 4.9 2.21 5.76 3.47a2.85 2.85 0 0 1 .43 1.49c0 1.68-1.63 2.89-3.84 2.89a12 12 0 0 1 -5.51-1.49l-1.11-.58-1.49 3a15.18 15.18 0 0 0 5.14 1.83 17.93 17.93 0 0 0 3 .29c4.75 0 7.58-2.36 7.58-6.26.05-3.44-1.24-4.93-5.85-6.86zm11.61-19.39a2.36 2.36 0 1 0 2.35 2.36 2.36 2.36 0 0 0 -2.35-2.36zm-1.82 31.78h3.6v-21.78h-3.6zm17.08-3c-.76 0-1.15-.34-1.24-1 0-.39-.15-2.22-.15-2.41v-12.37h5.76v-3h-5.76v-6.36h-3.6v6.36h-3.64v3h3.64v14.58c0 2.89 1.68 4.86 4.18 4.86 1.72 0 2.92-.63 5.47-2.74l-1.49-2.41c-1.54 1.15-2.26 1.54-3.17 1.54zm21.5-18.78-4.46 13.34-.48 2.12-.72-2.12-5.23-13.34h-4l8.06 19.41a40.42 40.42 0 0 1 -3 6.74 25 25 0 0 1 -4.13 5.63l2.83 2.22a42.29 42.29 0 0 0 3.26-4.58 32.45 32.45 0 0 0 3-6.4l8.62-23.02z" />
			</g>
		</svg>
	);
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
	onGenerateImage,
	isGeneratingImage,
}: {
	ad: Ad;
	evaluation?: Evaluation;
	className?: string;
	style?: React.CSSProperties;
	onGenerateImage?: () => void;
	isGeneratingImage?: boolean;
}) {
	const gradientIndex = hashCode(ad.id) % gradients.length;
	const gradient = gradients[gradientIndex];
	const score = evaluation?.weightedScore;

	return (
		<div
			className={`flex flex-col overflow-hidden rounded-xl border border-neutral-800 ${className ?? ""}`}
			style={style}
		>
			{/* Ad content — 9:16 ratio */}
			<div className="flex flex-col" style={{ aspectRatio: "9/16" }}>
				{/* Header — logo + sponsored label, like Facebook */}
				<div className="flex items-center gap-2 bg-neutral-900 px-3 pt-3 pb-1">
					<VarsityTutorsLogo className="h-3.5 w-auto" />
					<span className="text-[10px] text-neutral-500">Sponsored</span>
				</div>

				{/* Primary text — above the image, like Facebook */}
				<div className="bg-neutral-900 px-3 pt-1 pb-2">
					<p className="text-xs leading-snug text-neutral-200 line-clamp-3">
						{ad.primaryText}
					</p>
				</div>

				{/* Gradient area — image placeholder, fills remaining space */}
				<div
					className={`relative flex flex-1 items-center justify-center bg-gradient-to-br ${gradient}${ad.status === "generating" ? " animate-pulse" : ""}`}
				>
					{ad.imageUrl && (
						<img
							src={`${API_URL}${ad.imageUrl}`}
							alt={ad.headline}
							className="absolute inset-0 h-full w-full object-cover"
						/>
					)}
					{!ad.imageUrl && ad.status === "approved" && onGenerateImage && (
						<div
							role="button"
							tabIndex={0}
							aria-disabled={isGeneratingImage || undefined}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!isGeneratingImage) onGenerateImage();
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									if (!isGeneratingImage) onGenerateImage();
								}
							}}
							className={`z-10 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30 ${isGeneratingImage ? "opacity-60" : "cursor-pointer"}`}
						>
							{isGeneratingImage ? (
								<span className="flex items-center gap-1.5">
									<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
									Generating...
								</span>
							) : (
								"Generate Image"
							)}
						</div>
					)}
					{score != null ? (
						<span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
							{score.toFixed(1)}
						</span>
					) : ad.status === "generating" ? (
						<span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-xs text-white/70 backdrop-blur-sm">
							<span className="inline-block h-2 w-2 animate-spin rounded-full border border-white/40 border-t-white" />
							Evaluating
						</span>
					) : null}
				</div>

				{/* Info section — site+CTA, headline, description */}
				<div className="space-y-1 bg-neutral-900 px-4 py-3">
					<div className="flex items-center justify-between">
						<p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
							varsitytutors.com
						</p>
						<span className="max-w-[5.5rem] shrink-0 truncate rounded-md bg-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-300">
							{ad.callToAction}
						</span>
					</div>
					<h3 className="text-xs font-bold leading-tight text-neutral-200 line-clamp-2">
						{ad.headline}
					</h3>
					{ad.description && (
						<p className="text-xs text-neutral-400 line-clamp-1">
							{ad.description}
						</p>
					)}
				</div>
			</div>

			{/* Footer — iteration + status (outside 9:16 ratio) */}
			<div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
				<span>Iteration {ad.iteration}</span>
				<span
					className={
						ad.status === "generating"
							? "text-yellow-400"
							: ad.status === "approved"
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
	const generateImage = useGenerateImage(ad.id);

	if (mode === "button") {
		return (
			<motion.button
				type="button"
				layoutId={layoutId}
				onClick={onClick}
				className="cursor-pointer overflow-hidden text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
				style={{ borderRadius: 12 }}
			>
				<CreativeCardContent
					ad={ad}
					evaluation={evaluation}
					onGenerateImage={() => generateImage.mutate()}
					isGeneratingImage={generateImage.isPending}
				/>
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
				onGenerateImage={() => generateImage.mutate()}
				isGeneratingImage={generateImage.isPending}
			/>
		</Link>
	);
}
