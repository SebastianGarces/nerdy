/**
 * CLI entry point for the Meta Ad Library scraper.
 *
 * Usage:
 *   bun run packages/pipeline/src/scrape/cli.ts --advertiser "Varsity Tutors"
 *   bun run packages/pipeline/src/scrape/cli.ts --advertiser "Chegg" --maxScrollDepth 5
 *   bun run packages/pipeline/src/scrape/cli.ts --all
 */

import { COMPETITORS } from "./config.js";
import type { ScrapeConfig } from "./config.js";
import { scrapeCompetitorAds } from "./index.js";

function parseArgs(argv: string[]): {
	advertisers: string[];
	config: ScrapeConfig;
} {
	const args = argv.slice(2);
	const advertisers: string[] = [];
	const config: ScrapeConfig = {};

	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		if (arg === "--advertiser" && i + 1 < args.length) {
			advertisers.push(args[i + 1] as string);
			i += 2;
		} else if (arg === "--all") {
			advertisers.push(...COMPETITORS);
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
  bun run packages/pipeline/src/scrape/cli.ts --advertiser "Company Name"
  bun run packages/pipeline/src/scrape/cli.ts --all

Options:
  --advertiser <name>       Advertiser to scrape (can be repeated)
  --all                     Scrape all known competitors
  --headless <true|false>   Run headless (default: true)
  --scrollDelay <ms>        Delay between scrolls (default: 2000)
  --maxScrollDepth <n>      Max scroll attempts (default: 10)
  --pageTimeout <ms>        Page timeout (default: 30000)
  --help, -h                Show this help
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

	return { advertisers, config };
}

async function main() {
	const { advertisers, config } = parseArgs(process.argv);

	console.log(
		`Scraping ${advertisers.length} advertiser(s): ${advertisers.join(", ")}`,
	);

	const allAds = [];

	for (const advertiser of advertisers) {
		console.log(`\nScraping: ${advertiser}...`);
		const ads = await scrapeCompetitorAds(advertiser, config);
		console.log(`  Found ${ads.length} ads`);
		allAds.push(...ads);
	}

	console.log(`\nTotal ads scraped: ${allAds.length}`);
	console.log(JSON.stringify(allAds, null, 2));
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
