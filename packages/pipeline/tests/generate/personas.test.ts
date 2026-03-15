import { describe, expect, test } from "bun:test";
import {
	PERSONAS,
	PERSONA_IDS,
	getPersona,
	getRandomPersona,
} from "../../src/generate/personas";

describe("personas", () => {
	test("PERSONAS array has 7 entries", () => {
		expect(PERSONAS).toHaveLength(7);
	});

	test("all personas have non-empty fields", () => {
		for (const persona of PERSONAS) {
			expect(persona.id).toBeTruthy();
			expect(persona.name).toBeTruthy();
			expect(persona.description).toBeTruthy();
			expect(persona.psychology).toBeTruthy();
			expect(persona.sampleHooks.length).toBeGreaterThanOrEqual(3);
			for (const hook of persona.sampleHooks) {
				expect(hook).toBeTruthy();
			}
		}
	});

	test("getPersona returns correct persona by id", () => {
		const persona = getPersona("athlete-family");
		expect(persona).toBeDefined();
		expect(persona?.name).toBe("The Athlete-Recruit Gatekeeper");

		const optimizer = getPersona("suburban-optimizer");
		expect(optimizer).toBeDefined();
		expect(optimizer?.name).toBe("The Proactive Suburban Optimizer");
	});

	test("getPersona returns undefined for unknown id", () => {
		expect(getPersona("nonexistent")).toBeUndefined();
		expect(getPersona("")).toBeUndefined();
	});

	test("getRandomPersona returns a valid persona", () => {
		const persona = getRandomPersona();
		expect(persona).toBeDefined();
		expect(persona.id).toBeTruthy();
		expect(PERSONA_IDS).toContain(persona.id);
	});

	test("PERSONA_IDS matches PERSONAS ids", () => {
		const idsFromPersonas = PERSONAS.map((p) => p.id);
		expect(PERSONA_IDS).toEqual(idsFromPersonas);
		expect(PERSONA_IDS).toHaveLength(7);
	});
});
