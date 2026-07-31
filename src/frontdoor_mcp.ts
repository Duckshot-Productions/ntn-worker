import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";

export interface Env {
  INTERNAL_GATEWAY: { fetch: (url: string, init?: RequestInit) => Promise<Response> };
  HANDOFF_SECRET: string;
}

const worker = new Worker<Env>();

// Public Pacer: Rate-limit external AI agent requests (10 req/sec)
const publicPacer = worker.pacer("publicPacer", {
  allowedRequests: 10,
  intervalMs: 1000,
});

// Front-Door MCP Tool: Public API surface exposed to LLMs / agents
worker.tool("queryNotionSecure", {
  title: "Secure Notion Query",
  description: "Queries Notion databases via the Internal Security Gateway worker with cross-Notion vulnerability checks.",
  schema: j.object({
    query: j.string().describe("Search or query term for Notion."),
    databaseId: j.string().optional().describe("Target Notion database ID."),
  }),
  execute: async ({ query, databaseId }, env) => {
    await publicPacer.wait();

    // 1. Generate internal handoff token (Timestamped Handoff)
    const timestamp = Date.now().toString();
    const payload = JSON.stringify({ query, databaseId, timestamp });

    // 2. Service Binding fetch to Worker 2 (Internal Gateway) over Cloudflare private mesh
    const response = await env.INTERNAL_GATEWAY.fetch("http://internal-gateway/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Handoff": timestamp,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Internal Security Gateway rejected request: ${errorText}`);
    }

    return await response.json();
  },
});

export default worker;
