import { describe, expect, it } from "bun:test";

describe("pipeline", () => {
	it("should import the module", async () => {
		const pipeline = await import("../src/index.js");
		expect(pipeline).toBeDefined();
	});
});
