import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

const port = process.env.SERVER_PORT ?? 3001;

const app = new Elysia()
	.use(cors())
	.get("/health", () => ({ status: "ok" }))
	.listen(port);

console.log(`Server running at http://localhost:${port}`);

export type App = typeof app;
export { app };
