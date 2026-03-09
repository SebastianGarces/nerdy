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
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
