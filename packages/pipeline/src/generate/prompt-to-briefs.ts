import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {
	type AdBrief,
	AdBriefSchema,
	type PipelineConfig,
} from "../types/index.js";
import { generateBriefs } from "./briefs.js";
import { PERSONA_IDS } from "./personas.js";
import { getProofPoints } from "./proof-points.js";

const MODEL = "google/gemini-2.0-flash-001";

const BRIEF_SYSTEM_PROMPT = `You are an expert ad strategist for Varsity Tutors. Given a user's campaign description, generate varied ad briefs.

Each brief must use these exact enum values:
- audience: "parent" | "student" | "family"
- campaignGoal: "awareness" | "conversion"
- emotionalAngle: "aspiration" | "anxiety-relief" | "social-proof" | "urgency"
- hookStyle: "question" | "stat" | "story" | "fear"
- bodyPattern: "problem-agitate-solution" | "testimonial-benefit" | "stat-context-offer"
- product: always "Varsity Tutors"
- offerType: a short string like "Free diagnostic", "Free practice test", "Book Diagnostic", "Talk to an SAT specialist"
- brandVoice: array of strings like ["empowering", "knowledgeable", "approachable", "results-focused"]
- persona: one of ${JSON.stringify(PERSONA_IDS)} — match the persona to the campaign description and audience. Vary across personas for diversity.

Do NOT generate proofPoints — they will be added automatically from verified data.

## Messaging Rules
- Say "your child" not "your student"
- Say "SAT tutoring" not "SAT prep"
- Never use fake scarcity ("spots filling fast", "limited enrollment")
- Use real calendar urgency (test dates, weeks remaining)

Vary the briefs across different audiences, angles, styles, and personas for maximum diversity.`;

export interface PromptToBriefsOptions {
	llm?: ChatOpenAI;
}

export async function promptToBriefs(
	prompt: string,
	count: number,
	config: PipelineConfig,
	options?: PromptToBriefsOptions,
): Promise<AdBrief[]> {
	const llm =
		options?.llm ??
		new ChatOpenAI({
			modelName: MODEL,
			temperature: 0.8,
			openAIApiKey: config.openRouterApiKey,
			configuration: { baseURL: config.openRouterBaseUrl },
		});

	const BriefsArraySchema = z.object({
		briefs: z.array(AdBriefSchema).min(1),
	});

	const structuredLlm = llm.withStructuredOutput(BriefsArraySchema);

	try {
		const result = await structuredLlm.invoke([
			{ role: "system", content: BRIEF_SYSTEM_PROMPT },
			{
				role: "user",
				content: `Generate ${Math.ceil(count * 1.15)} varied ad briefs for this campaign:\n\n"${prompt}"`,
			},
		]);
		// Attach real proof points from verified VT data
		const briefs = result.briefs.slice(0, count).map((brief) => ({
			...brief,
			proofPoints: getProofPoints(3),
		}));
		return briefs;
	} catch {
		// Fallback to combinatorial matrix
		return generateBriefs(count);
	}
}
