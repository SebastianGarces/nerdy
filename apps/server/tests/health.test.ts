import { describe, expect, it } from "bun:test";
import { app } from "../src/index.js";

describe("health endpoint", () => {
	it("should return ok status", async () => {
		const response = await app.handle(new Request("http://localhost/health"));
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body).toEqual({ status: "ok" });
	});
});
