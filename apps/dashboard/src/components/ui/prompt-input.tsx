"use client";

import { useCreateCampaign } from "@/lib/api";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const COUNT_OPTIONS = [5, 10, 25, 50];

export function PromptInput() {
	const [prompt, setPrompt] = useState("");
	const [count, setCount] = useState(10);
	const router = useRouter();
	const mutation = useCreateCampaign();

	const handleSubmit = async () => {
		if (!prompt.trim()) return;
		const result = await mutation.mutateAsync({
			prompt: prompt.trim(),
			count,
		});
		setPrompt("");
		router.push(`/campaigns/${result.id}`);
	};

	return (
		<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
			<div className="mb-4 flex items-center gap-2">
				<Sparkles className="h-5 w-5 text-blue-400" />
				<h2 className="text-lg font-semibold">Create Campaign</h2>
			</div>
			<textarea
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
				placeholder="Describe your ad campaign... e.g. 'Back to school campaign targeting parents worried about their kids falling behind in math'"
				className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				rows={3}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						handleSubmit();
					}
				}}
			/>
			<div className="mt-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-sm text-neutral-400">Creatives:</span>
					<div className="flex gap-1">
						{COUNT_OPTIONS.map((n) => (
							<button
								key={n}
								type="button"
								onClick={() => setCount(n)}
								className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
									count === n
										? "bg-blue-600 text-white"
										: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
								}`}
							>
								{n}
							</button>
						))}
					</div>
				</div>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!prompt.trim() || mutation.isPending}
					className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{mutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Sparkles className="h-4 w-4" />
					)}
					Generate Campaign
				</button>
			</div>
		</div>
	);
}
