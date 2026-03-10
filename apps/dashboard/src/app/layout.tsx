import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Nerdy Ad Engine",
	description: "AI-powered ad copy generation and evaluation",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body
				className="bg-neutral-950 text-neutral-50 antialiased"
				style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
			>
				<Providers>
					<div className="flex h-screen">
						<Sidebar />
						<main className="flex-1 overflow-y-auto p-8">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
