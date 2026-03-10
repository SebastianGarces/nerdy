import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";
import { pipelineRoutes } from "../src/routes/pipeline.js";

interface PipelineRunResponse {
	jobId: string;
	status: string;
	briefCount: number;
}

interface PipelineStatusResponse {
	status: string;
}

// Mock the pipeline functions to avoid actual API calls
mock.module("@nerdy/pipeline", () => ({
	generateBriefs: (count: number) =>
		Array.from({ length: count }, () => ({
			audience: "parent",
			product: "Varsity Tutors",
			campaignGoal: "conversion",
			emotionalAngle: "aspiration",
			hookStyle: "question",
			bodyPattern: "problem-agitate-solution",
			offerType: "Free consultation",
			brandVoice: ["empowering"],
		})),
	runPipeline: async () => [],
}));

function createTestApp() {
	return new Elysia().use(pipelineRoutes());
}

describe("pipeline routes", () => {
	describe("POST /api/pipeline/run", () => {
		it("should return 202 with job info", async () => {
			const app = createTestApp();
			const response = await app.handle(
				new Request("http://localhost/api/pipeline/run", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ count: 2 }),
				}),
			);
			const body = (await response.json()) as PipelineRunResponse;
			expect(response.status).toBe(202);
			expect(body).toHaveProperty("jobId");
			expect(body).toHaveProperty("status", "started");
			expect(body).toHaveProperty("briefCount", 2);
		});

		it("should accept briefs in request body", async () => {
			const app = createTestApp();
			const response = await app.handle(
				new Request("http://localhost/api/pipeline/run", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						briefs: [
							{
								audience: "student",
								product: "Varsity Tutors",
								campaignGoal: "awareness",
								emotionalAngle: "aspiration",
								hookStyle: "stat",
								bodyPattern: "testimonial-benefit",
								offerType: "Free practice test",
								brandVoice: ["knowledgeable"],
							},
						],
					}),
				}),
			);
			const body = (await response.json()) as PipelineRunResponse;
			expect(response.status).toBe(202);
			expect(body.briefCount).toBe(1);
		});
	});

	describe("GET /api/pipeline/status/:jobId", () => {
		it("should return not_found for unknown job", async () => {
			const app = createTestApp();
			const response = await app.handle(
				new Request("http://localhost/api/pipeline/status/unknown-id"),
			);
			const body = (await response.json()) as PipelineStatusResponse;
			expect(body.status).toBe("not_found");
		});
	});
});
