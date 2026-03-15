export interface Persona {
	id: string;
	name: string;
	description: string;
	psychology: string;
	sampleHooks: string[];
}

export const PERSONAS: Persona[] = [
	{
		id: "athlete-family",
		name: "The Athlete-Recruit Gatekeeper",
		description:
			"Almost always a mother calling on behalf of her 11th grade student athlete. The SAT is framed as a gating factor for scholarships, NCAA/NAIA eligibility, or coach support.",
		psychology:
			"Fear of missed recruiting window + urgency + identity (athlete dream)",
		sampleHooks: [
			"The coach wants him. The admissions office needs an SAT score.",
			"If the SAT is the only thing between your athlete and a scholarship... don't wait.",
			"Practice ends at 7. SAT tutoring starts at 9:30. No commute.",
			"Don't let a low SAT score be the reason the NCAA scholarship disappears.",
			"The recruiting clock is ticking. Is his SAT ready?",
		],
	},
	{
		id: "suburban-optimizer",
		name: "The Proactive Suburban Optimizer",
		description:
			"Upper-middle-class suburban parent of an 11th grader with 3.8+ GPA but disappointing SAT score. Motivated by a clear gap between classroom performance and test score.",
		psychology:
			"Control, optimization, fairness — child is capable but score doesn't reflect it",
		sampleHooks: [
			"3.8 GPA. 1260 SAT. Something's off.",
			"If she's capable of a 1450, why is she stuck in the 1200s?",
			"Most mid-1200s students are 3-4 fixes away from a 1400+.",
			"Stop studying everything. Start studying what actually moves points.",
			"Smart kids underestimate the SAT. That's why scores stall.",
		],
	},
	{
		id: "immigrant-navigator",
		name: "The Immigrant Family Navigator",
		description:
			"First- or second-generation immigrant family navigating the US college admissions system for the first time. Strong emphasis on education as the path to upward mobility.",
		psychology:
			"Overwhelm + unfamiliar system + fear of making the wrong choice",
		sampleHooks: [
			"The SAT process is confusing. We walk you through all of it.",
			"Not sure where your child stands on the SAT? That's the first thing we figure out.",
			"Your child deserves the same shot as kids whose parents grew up with this system.",
			"First time dealing with the SAT? Here's everything you need to know.",
			"You don't need to understand the SAT. That's our job.",
		],
	},
	{
		id: "cultural-investor",
		name: "The Education-First Cultural Investor",
		description:
			"Dual-income professional household with STEM backgrounds, already invested in multiple resources. Looking to consolidate under one effective system.",
		psychology:
			"Process-oriented + already investing + wants to consolidate and optimize",
		sampleHooks: [
			"Already tried Khan Academy, prep books, and a tutor — and the score hasn't moved?",
			"You've invested in every resource. Now invest in the one that actually works.",
			"Three apps, two tutors, and a prep book. Still stuck? There's a reason.",
			"You don't need more tools. You need one plan that ties everything together.",
			"Smart families try everything. The smartest ones stop trying everything and get a plan.",
		],
	},
	{
		id: "system-optimizer",
		name: "The System Optimizer",
		description:
			"Father in tech-centric region who approaches tutoring as a procurement decision. Leverages employer benefits. Values efficiency, measurable outcomes, self-service tools.",
		psychology:
			"Efficiency, process optimization, execution-focused — already decided tutoring is necessary",
		sampleHooks: [
			"Gap: 190 points. Timeline: 10 weeks. Result: Closed.",
			"Start with a free diagnostic. Know the gap before you spend a dollar.",
			"Princeton Review: $252/hr for group instruction. Varsity Tutors: 1:1 sessions, diagnostic-driven plan, 210-point avg gain. Do the math.",
		],
	},
	{
		id: "neurodivergent-advocate",
		name: "The Neurodivergent Advocate",
		description:
			"Mother of a student with ADHD, ASD, dyslexia, or processing differences. Deep knowledge of her child's diagnosis and accommodations. Values the right tutor fit over price.",
		psychology:
			'Protective + "my child learns differently" + fear of being misunderstood',
		sampleHooks: [
			"ADHD doesn't mean they can't score high. It means they need the right tutor.",
			"She has extended time. Now she needs a tutor who knows what to do with it.",
			"Most tutors teach content. Ours teach your child — the way they actually learn.",
			"The right tutor doesn't just know the SAT. They know how your child thinks.",
			"Standard SAT prep doesn't work for every kid. We know that.",
		],
	},
	{
		id: "burned-returner",
		name: "The Burned Returner",
		description:
			"Parent returning after a negative tutoring experience. Defining characteristic is disappointment, not geography or income. Often sets explicit conditions for returning.",
		psychology: "Trust deficit + urgency + conditional willingness",
		sampleHooks: [
			"Tutoring didn't work last time? That's why you're here.",
			"You already spent the money. The score didn't move. We hear you.",
			"Wasted $100/hr on a tutor who didn't move the needle? You're not alone.",
			"We match, we measure, and if it's not working we change course. That's the difference.",
			"Bad tutor experience? Here's what we do differently.",
		],
	},
];

export const PERSONA_IDS: string[] = PERSONAS.map((p) => p.id);

export function getPersona(id: string): Persona | undefined {
	return PERSONAS.find((p) => p.id === id);
}

export function getRandomPersona(): Persona {
	const index = Math.floor(Math.random() * PERSONAS.length);
	return PERSONAS[index] as Persona;
}
