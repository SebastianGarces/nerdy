/**
 * CLI entry point for the Meta Ad Library scraper.
 *
 * Usage:
 *   bun run scrape --advertiser "Varsity Tutors"
 *   bun run scrape --advertiser "Chegg" --maxScrollDepth 5
 *   bun run scrape:all
 *   bun run scrape --advertiser "Varsity Tutors" --stdout
 *   bun run scrape --advertiser "Varsity Tutors" -o custom/path.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { COMPETITORS } from "./config.js";
import type { ScrapeConfig } from "./config.js";
import { scrapeCompetitorAds } from "./index.js";

function parseArgs(argv: string[]): {
	advertisers: string[];
	config: ScrapeConfig;
	outputPath: string | null;
	useStdout: boolean;
	usedAll: boolean;
} {
	const args = argv.slice(2);
	const advertisers: string[] = [];
	const config: ScrapeConfig = {};
	let outputPath: string | null = null;
	let useStdout = false;
	let usedAll = false;

	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		if (arg === "--advertiser" && i + 1 < args.length) {
			advertisers.push(args[i + 1] as string);
			i += 2;
		} else if (arg === "--all") {
			advertisers.push(...COMPETITORS);
			usedAll = true;
			i += 1;
		} else if ((arg === "--output" || arg === "-o") && i + 1 < args.length) {
			outputPath = args[i + 1] as string;
			i += 2;
		} else if (arg === "--stdout") {
			useStdout = true;
			i += 1;
		} else if (arg === "--headless" && i + 1 < args.length) {
			config.headless = args[i + 1] === "true";
			i += 2;
		} else if (arg === "--scrollDelay" && i + 1 < args.length) {
			config.scrollDelay = Number.parseInt(args[i + 1] as string, 10);
			i += 2;
		} else if (arg === "--maxScrollDepth" && i + 1 < args.length) {
			config.maxScrollDepth = Number.parseInt(args[i + 1] as string, 10);
			i += 2;
		} else if (arg === "--pageTimeout" && i + 1 < args.length) {
			config.pageTimeout = Number.parseInt(args[i + 1] as string, 10);
			i += 2;
		} else if (arg === "--help" || arg === "-h") {
			console.log(`Meta Ad Library Scraper

Usage:
  bun run scrape --advertiser "Company Name"
  bun run scrape:all
  bun run scrape --advertiser "Varsity Tutors" --stdout
  bun run scrape --advertiser "Varsity Tutors" -o custom/path.json

Options:
  --advertiser <name>       Advertiser to scrape (can be repeated)
  --all                     Scrape all known competitors
  --output, -o <path>       Custom output file path
  --stdout                  Print JSON to stdout instead of writing a file
  --headless <true|false>   Run headless (default: true)
  --scrollDelay <ms>        Delay between scrolls (default: 2000)
  --maxScrollDepth <n>      Max scroll attempts (default: 10)
  --pageTimeout <ms>        Page timeout (default: 30000)
  --help, -h                Show this help

Output:
  By default, results are written to data/scrapes/<timestamp>-<slug>.json
  Use --stdout to print to stdout, or -o to specify a custom path.
`);
			process.exit(0);
		} else {
			console.error(`Unknown argument: ${arg}`);
			process.exit(1);
		}
	}

	if (advertisers.length === 0) {
		console.error(
			"Error: specify --advertiser <name> or --all. Use --help for usage.",
		);
		process.exit(1);
	}

	return { advertisers, config, outputPath, useStdout, usedAll };
}

function slugify(name: string): string {
	return name.toLowerCase().replace(/\s+/g, "-");
}

function formatTimestamp(date: Date): string {
	const y = date.getFullYear();
	const mo = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	const h = String(date.getHours()).padStart(2, "0");
	const mi = String(date.getMinutes()).padStart(2, "0");
	const s = String(date.getSeconds()).padStart(2, "0");
	return `${y}${mo}${d}-${h}${mi}${s}`;
}

async function main() {
	const { advertisers, config, outputPath, useStdout, usedAll } = parseArgs(
		process.argv,
	);

	console.error(
		`Scraping ${advertisers.length} advertiser(s): ${advertisers.join(", ")}`,
	);

	const allAds = [];

	for (const advertiser of advertisers) {
		console.error(`\nScraping: ${advertiser}...`);
		const ads = await scrapeCompetitorAds(advertiser, config);
		console.error(`  Found ${ads.length} ads`);
		allAds.push(...ads);
	}

	console.error(`\nTotal ads scraped: ${allAds.length}`);

	const now = new Date();
	const artifact = {
		scrapedAt: now.toISOString(),
		advertisers,
		totalAds: allAds.length,
		ads: allAds,
	};

	if (useStdout) {
		console.log(JSON.stringify(artifact, null, 2));
		return;
	}

	const slug = usedAll ? "all" : advertisers.map(slugify).join("_");
	const defaultPath = resolve(
		"data/scrapes",
		`${formatTimestamp(now)}-${slug}.json`,
	);
	const finalPath = outputPath ? resolve(outputPath) : defaultPath;

	mkdirSync(dirname(finalPath), { recursive: true });
	writeFileSync(finalPath, JSON.stringify(artifact, null, 2));
	console.error(`\nOutput written to: ${finalPath}`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
