import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
const server = new McpServer({
	name: "Authless Calculator",
	version: "1.0.0",
});

server.tool(
	"add",
	{ a: z.number(), b: z.number() },
	async ({ a, b }: { a: number; b: number }) => ({
		content: [{ type: "text", text: String(a + b) }],
	})
);

server.tool(
	"calculate",
	{
		operation: z.enum(["add", "subtract", "multiply", "divide"]),
		a: z.number(),
		b: z.number(),
	},
	async ({ operation, a, b }: { operation: "add" | "subtract" | "multiply" | "divide"; a: number; b: number }) => {
		let result: number = 0;
		switch (operation) {
			case "add":
				result = a + b;
				break;
			case "subtract":
				result = a - b;
				break;
			case "multiply":
				result = a * b;
				break;
			case "divide":
				if (b === 0)
					return {
						content: [
							{
								type: "text",
								text: "Error: Cannot divide by zero",
							},
						],
					};
				result = a / b;
				break;
		}
		return { content: [{ type: "text", text: String(result) }] };
	}
);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			let isStream = false;
			try {
				if (request.headers.get("content-type")?.includes("application/json")) {
					const body = await request.clone().json();
					if (typeof body === "object" && body !== null && "stream" in body && body.stream === true) {
						isStream = true;
					}
				}
			} catch (e) {}
			if (isStream) {
				return server.serveSSE("/mcp").fetch(request, env, ctx);
			} else {
				return server.serve("/mcp").fetch(request, env, ctx);
			}
		}

		return new Response("Not found - this is a MCP server reply", { status: 404 });
	},
};
