"use client";

import { cn } from "@/lib/utils";
import {
	BarChart3,
	DollarSign,
	FileText,
	Home,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/", label: "Campaigns", icon: Home },
	{ href: "/ads", label: "Ads", icon: FileText },
	{ href: "/trends", label: "Trends", icon: TrendingUp },
	{ href: "/analytics", label: "Analytics", icon: DollarSign },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="flex h-screen w-60 flex-col border-r border-neutral-800 bg-neutral-950 px-3 py-6">
			<div className="mb-8 flex items-center gap-2 px-3">
				<BarChart3 className="h-6 w-6 text-blue-500" />
				<span className="text-lg font-bold text-neutral-50">Nerdy</span>
			</div>
			<nav className="flex flex-1 flex-col gap-1">
				{navItems.map((item) => {
					const isActive =
						item.href === "/"
							? pathname === "/"
							: pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
								isActive
									? "bg-neutral-800 text-neutral-50"
									: "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200",
							)}
						>
							<item.icon className="h-4 w-4" />
							{item.label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
