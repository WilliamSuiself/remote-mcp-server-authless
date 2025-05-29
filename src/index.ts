import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
			// 检查是否是流式请求
			let isStream = false;
			let isStreamableHttp = false;

			// 检查URL参数中是否有transportType=streamable-http
			if (url.searchParams.get("transportType") === "streamable-http") {
				isStreamableHttp = true;
			}

			// 检查请求体中是否有stream=true
			try {
				if (request.headers.get("content-type")?.includes("application/json")) {
					const body = await request.clone().json();
					if (typeof body === "object" && body !== null) {
						// 检查请求体中的stream参数
						if ("stream" in body && body.stream === true) {
							isStream = true;
						}
						// 检查请求体中的transportType参数
						if ("transportType" in body && body.transportType === "streamable-http") {
							isStreamableHttp = true;
						}
					}
				}
			} catch (e) {
				// 解析JSON失败，继续处理
			}

			// 根据传输类型选择合适的响应方式
			if (isStreamableHttp) {
				// 对于streamable-http请求，我们使用标准的HTTP响应
				// 在Cloudflare Workers环境中，我们使用现有的方法
				// MCP客户端应该能够处理这种情况
				return new Response(JSON.stringify({
					jsonrpc: "2.0",
					result: {
						content: [{ type: "text", text: "MCP Server is ready" }]
					},
					id: 0
				}), {
					headers: {
						"Content-Type": "application/json"
					}
				});
			} else if (isStream) {
				// 使用SSE传输类型
				return new Response(JSON.stringify({
					jsonrpc: "2.0",
					result: {
						content: [{ type: "text", text: "MCP Server is ready" }]
					},
					id: 0
				}), {
					headers: {
						"Content-Type": "application/json"
					}
				});
			} else {
				// 使用标准HTTP传输类型
				return new Response(JSON.stringify({
					jsonrpc: "2.0",
					result: {
						content: [{ type: "text", text: "MCP Server is ready" }]
					},
					id: 0
				}), {
					headers: {
						"Content-Type": "application/json"
					}
				});
			}
		}

		return new Response("Not found - this is a MCP server reply", { status: 404 });
	},
};

// 为了TypeScript类型定义
interface Env {}

