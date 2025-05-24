import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
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
	}
}

const agent = new MyMCP();
// 注意：Cloudflare Worker/Edge Runtime 不能在顶层用 await，需在 fetch 里保证 init 只执行一次
let agentReady: Promise<void> | null = null;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		if (!agentReady) {
			agentReady = agent.init();
		}
		await agentReady;

		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			let isStream = false;
			try {
				if (request.headers.get("content-type")?.includes("application/json")) {
					const body = await request.clone().json();
					if (body && body.stream === true) {
						isStream = true;
					}
				}
			} catch (e) {}
			if (isStream) {
				return agent.serveSSE("/mcp").fetch(request, env, ctx);
			} else {
				return agent.serve("/mcp").fetch(request, env, ctx);
			}
		}

		return new Response("Not found", { status: 404 });
	},
};
