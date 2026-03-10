import { DIMENSION_WEIGHTS } from "../evaluate/index.js";
import type {
	AdGraphState,
	Evaluation,
	EvaluationDimension,
} from "../types/index.js";

/**
 * Returns the dimension with the lowest score.
 * On ties, returns the one with higher weight (more impactful to fix).
 */
export function diagnoseWeakness(evaluation: Evaluation): EvaluationDimension {
	if (evaluation.dimensions.length === 0) {
		return "clarity";
	}
	let weakest: EvaluationDimension = "clarity";
	let lowestScore = Number.POSITIVE_INFINITY;
	let highestWeight = 0;

	for (const dim of evaluation.dimensions) {
		const weight = DIMENSION_WEIGHTS[dim.dimension];
		if (
			dim.score < lowestScore ||
			(dim.score === lowestScore && weight > highestWeight)
		) {
			weakest = dim.dimension;
			lowestScore = dim.score;
			highestWeight = weight;
		}
	}

	return weakest;
}

/**
 * Returns true if the pipeline should retry generating an ad.
 * Retries when iterationCount < maxIterations AND status is "iterating".
 */
export function shouldRetry(state: AdGraphState): boolean {
	return (
		state.iterationCount < state.maxIterations && state.status === "iterating"
	);
}
