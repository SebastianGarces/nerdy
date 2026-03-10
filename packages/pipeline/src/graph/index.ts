import { END, StateGraph } from "@langchain/langgraph";
import type { createDb } from "../db/index.js";
import { type NodeOptions, createNodes } from "./nodes.js";
import { AdPipelineState } from "./state.js";

export { AdPipelineState } from "./state.js";
export type { AdPipelineStateType } from "./state.js";
export { createNodes } from "./nodes.js";
export type { NodeOptions } from "./nodes.js";

export function createAdPipelineGraph(
	db: ReturnType<typeof createDb>,
	options?: NodeOptions,
) {
	const nodes = createNodes(db, options);

	const graph = new StateGraph(AdPipelineState)
		.addNode("generate", nodes.generate)
		.addNode("evaluate", nodes.evaluate)
		.addNode("decide", nodes.decide)
		.addNode("regenerate", nodes.regenerate)
		.addNode("publish", nodes.publish)
		.addNode("discard", nodes.discard)
		.addEdge("__start__", "generate")
		.addEdge("generate", "evaluate")
		.addEdge("evaluate", "decide")
		.addConditionalEdges("decide", (state) => {
			if (state.status === "published") return "publish";
			if (state.status === "discarded") return "discard";
			return "regenerate";
		})
		.addEdge("regenerate", "evaluate")
		.addEdge("publish", "__end__")
		.addEdge("discard", "__end__");

	return graph.compile();
}
