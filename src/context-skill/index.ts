/**
 * Snipara Context Skill for OpenClaw
 *
 * Provides context optimization tools including:
 * - Semantic search with token budgeting
 * - Document upload and indexing
 * - Query decomposition
 * - Execution planning
 * - Multi-query batching
 */

import { SniparaClient, type SniparaConfig } from "../client";

// Re-export types
export type { SniparaConfig } from "../client";

/**
 * Skill context provided by OpenClaw.
 */
export interface SkillContext {
  config: {
    apiKey?: string;
    projectSlug?: string;
  };
}

let client: SniparaClient | null = null;

/**
 * Initialize the Snipara client from skill context.
 */
function getClient(ctx: SkillContext): SniparaClient {
  if (client) return client;

  const apiKey = ctx.config.apiKey ?? process.env.SNIPARA_API_KEY;
  const projectSlug = ctx.config.projectSlug ?? process.env.SNIPARA_PROJECT_SLUG;

  if (!apiKey) {
    throw new Error("SNIPARA_API_KEY required");
  }
  if (!projectSlug) {
    throw new Error("SNIPARA_PROJECT_SLUG required");
  }

  client = new SniparaClient({ apiKey, projectSlug });
  return client;
}

// ============================================================
// CONTEXT TOOLS
// ============================================================

/**
 * Query documentation for relevant context with semantic search.
 */
export async function context_query(
  ctx: SkillContext,
  params: {
    query: string;
    maxTokens?: number;
    searchMode?: "keyword" | "semantic" | "hybrid";
    includeMetadata?: boolean;
  }
): Promise<{
  sections: Array<{
    title: string;
    content: string;
    file: string;
    relevance_score: number;
  }>;
  total_tokens: number;
}> {
  const snipara = getClient(ctx);
  return snipara.contextQuery(params.query, {
    maxTokens: params.maxTokens,
    searchMode: params.searchMode,
    includeMetadata: params.includeMetadata,
  });
}

/**
 * Upload a document for indexing.
 */
export async function upload_document(
  ctx: SkillContext,
  params: {
    path: string;
    content: string;
  }
): Promise<{ documentId: string; indexed: boolean }> {
  const snipara = getClient(ctx);
  return snipara.uploadDocument(params.path, params.content);
}

/**
 * Search documentation for a regex pattern.
 */
export async function search(
  ctx: SkillContext,
  params: {
    pattern: string;
    maxResults?: number;
  }
): Promise<{ matches: Array<{ file: string; line: number; content: string }> }> {
  const snipara = getClient(ctx);
  return snipara.search(params.pattern, params.maxResults);
}

/**
 * Break a complex query into sub-queries.
 */
export async function decompose(
  ctx: SkillContext,
  params: {
    query: string;
    maxDepth?: number;
  }
): Promise<{
  sub_queries: Array<{
    query: string;
    depends_on: string[];
  }>;
}> {
  const snipara = getClient(ctx);
  return snipara.decompose(params.query, params.maxDepth);
}

/**
 * Generate an execution plan for a complex question.
 */
export async function plan(
  ctx: SkillContext,
  params: {
    query: string;
    maxTokens?: number;
    strategy?: "breadth_first" | "depth_first" | "relevance_first";
  }
): Promise<{
  steps: Array<{
    step: number;
    action: string;
    query: string;
    depends_on: number[];
  }>;
}> {
  const snipara = getClient(ctx);
  return snipara.plan(params.query, {
    maxTokens: params.maxTokens,
    strategy: params.strategy,
  });
}

/**
 * Execute multiple queries in one call.
 */
export async function multi_query(
  ctx: SkillContext,
  params: {
    queries: Array<{ query: string; maxTokens?: number }>;
    totalMaxTokens?: number;
  }
): Promise<{
  results: Array<{
    query: string;
    sections: unknown[];
  }>;
}> {
  const snipara = getClient(ctx);
  return snipara.multiQuery(params.queries, params.totalMaxTokens);
}

/**
 * List documentation sections.
 */
export async function sections(
  ctx: SkillContext,
  params: {
    filter?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  sections: Array<{ title: string; file: string; tokens: number }>;
  total: number;
}> {
  const snipara = getClient(ctx);
  return snipara.sections(params);
}

/**
 * Get documentation statistics.
 */
export async function stats(
  ctx: SkillContext,
  _params: Record<string, never> = {}
): Promise<{
  documents: number;
  chunks: number;
  totalTokens: number;
}> {
  const snipara = getClient(ctx);
  return snipara.stats();
}

// ============================================================
// SKILL REGISTRATION
// ============================================================

/**
 * All tools exported by this skill.
 */
export const tools = {
  context_query,
  upload_document,
  search,
  decompose,
  plan,
  multi_query,
  sections,
  stats,
};

/**
 * OpenClaw skill registration.
 */
export function register(openclaw: {
  registerTool: (name: string, fn: (...args: unknown[]) => Promise<unknown>) => void;
  config: SniparaConfig & Record<string, unknown>;
}): void {
  // Initialize client with OpenClaw config
  const apiKey = openclaw.config.apiKey ?? process.env.SNIPARA_API_KEY;
  const projectSlug = openclaw.config.projectSlug ?? process.env.SNIPARA_PROJECT_SLUG;

  if (apiKey && projectSlug) {
    client = new SniparaClient({ apiKey, projectSlug });
  }

  // Register all tools
  const ctx: SkillContext = { config: openclaw.config };

  for (const [name, fn] of Object.entries(tools)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    openclaw.registerTool(name, (params: unknown) => (fn as any)(ctx, params));
  }
}

export default tools;
