"use client";

import { cn } from "@/lib/utils";

interface StatsCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	className?: string;
}

export function StatsCard({
	title,
	value,
	subtitle,
	className,
}: StatsCardProps) {
	return (
		<div
			className={cn(
				"rounded-xl border border-neutral-800 bg-neutral-900 p-6",
				className,
			)}
		>
			<p className="text-sm font-medium text-neutral-400">{title}</p>
			<p className="mt-2 text-3xl font-bold text-neutral-50">{value}</p>
			{subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
		</div>
	);
}
