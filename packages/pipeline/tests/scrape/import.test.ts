import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../src/db/schema.js";
import { importScrapedAds } from "../../src/scrape/import.js";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON;");
	const db = drizzle(sqlite, { schema });

	sqlite.exec(`
		CREATE TABLE competitor_ads (
			id TEXT PRIMARY KEY,
			advertiser TEXT NOT NULL,
			primary_text TEXT NOT NULL,
			headline TEXT NOT NULL,
			description TEXT NOT NULL,
			start_date TEXT NOT NULL,
			end_date TEXT NOT NULL,
			duration_days INTEGER NOT NULL,
			platform TEXT NOT NULL,
			scraped_at TEXT NOT NULL
		);
	`);

	return { db, sqlite };
}

const FIXTURE = {
	scrapedAt: "2026-03-10T00:00:00.000Z",
	advertisers: ["Varsity Tutors", "Chegg"],
	totalAdsRaw: 3,
	totalAds: 3,
	ads: [
		{
			id: "ad-1",
			advertiser: "Varsity Tutors",
			primaryText: "Find the perfect tutor for your child",
			headline: "Expert Tutoring",
			description: "1-on-1 personalized learning",
			startDate: "2026-01-01",
			endDate: "2026-02-01",
			durationDays: 31,
			platform: "facebook",
			scrapedAt: "2026-03-10T00:00:00.000Z",
		},
		{
			id: "ad-2",
			advertiser: "Chegg",
			primaryText: "Study smarter, not harder",
			headline: "Chegg Study",
			description: "Get homework help now",
			startDate: "2026-01-15",
			endDate: "2026-02-15",
			durationDays: 31,
			platform: "instagram",
			scrapedAt: "2026-03-10T00:00:00.000Z",
		},
		{
			id: "ad-3",
			advertiser: "Varsity Tutors",
			primaryText: "Summer learning programs",
			headline: "Summer Tutoring",
			description: "Keep kids learning all summer",
			startDate: "2026-02-01",
			endDate: "2026-03-01",
			durationDays: 28,
			platform: "facebook",
			scrapedAt: "2026-03-10T00:00:00.000Z",
		},
	],
};

const tempFiles: string[] = [];

afterEach(() => {
	for (const f of tempFiles) {
		try {
			require("node:fs").unlinkSync(f);
		} catch {
			// ignore
		}
	}
	tempFiles.length = 0;
});

function writeTempJson(data: unknown): string {
	const filePath = join(tmpdir(), `import-test-${Date.now()}.json`);
	writeFileSync(filePath, JSON.stringify(data));
	tempFiles.push(filePath);
	return filePath;
}

describe("importScrapedAds", () => {
	test("imports ads from JSON file into database", async () => {
		const { db } = createTestDb();
		const filePath = writeTempJson(FIXTURE);

		const count = await importScrapedAds(filePath, db);

		expect(count).toBe(3);

		const rows = db.select().from(schema.competitorAds).all();
		expect(rows).toHaveLength(3);
	});

	test("correctly maps all fields", async () => {
		const { db } = createTestDb();
		const filePath = writeTempJson(FIXTURE);

		await importScrapedAds(filePath, db);

		const rows = db.select().from(schema.competitorAds).all();
		const first = rows.find((r) => r.id === "ad-1");

		expect(first).toBeDefined();
		expect(first?.advertiser).toBe("Varsity Tutors");
		expect(first?.primaryText).toBe("Find the perfect tutor for your child");
		expect(first?.headline).toBe("Expert Tutoring");
		expect(first?.description).toBe("1-on-1 personalized learning");
		expect(first?.startDate).toBe("2026-01-01");
		expect(first?.endDate).toBe("2026-02-01");
		expect(first?.durationDays).toBe(31);
		expect(first?.platform).toBe("facebook");
		expect(first?.scrapedAt).toBe("2026-03-10T00:00:00.000Z");
	});

	test("returns 0 for empty ads array", async () => {
		const { db } = createTestDb();
		const filePath = writeTempJson({ ...FIXTURE, ads: [] });

		const count = await importScrapedAds(filePath, db);

		expect(count).toBe(0);

		const rows = db.select().from(schema.competitorAds).all();
		expect(rows).toHaveLength(0);
	});
});
