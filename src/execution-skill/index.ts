/**
 * Snipara Execution Skill for OpenClaw
 *
 * Provides safe Python execution via RLM-Runtime including:
 * - Sandboxed Python execution
 * - Session-based variable persistence
 * - Autonomous agent runs
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
// EXECUTION TOOLS
// ============================================================

/**
 * Execute Python code in a sandboxed environment.
 */
export async function execute_python(
  ctx: SkillContext,
  params: {
    code: string;
    sessionId?: string;
    timeout?: number;
    profile?: "quick" | "default" | "analysis" | "extended";
  }
): Promise<{
  output: string;
  result: unknown;
  error?: string;
}> {
  const snipara = getClient(ctx);
  return snipara.executePython(params.code, {
    sessionId: params.sessionId,
    timeout: params.timeout,
    profile: params.profile,
  });
}

/**
 * Start an autonomous agent that iteratively solves a task.
 */
export async function agent_run(
  ctx: SkillContext,
  params: {
    task: string;
    maxIterations?: number;
    tokenBudget?: number;
    costLimit?: number;
  }
): Promise<{ runId: string; status: string }> {
  const snipara = getClient(ctx);
  return snipara.agentRun(params.task, {
    maxIterations: params.maxIterations,
    tokenBudget: params.tokenBudget,
    costLimit: params.costLimit,
  });
}

/**
 * Check the status of an autonomous agent run.
 */
export async function agent_status(
  ctx: SkillContext,
  params: {
    runId: string;
  }
): Promise<{
  runId: string;
  status: "running" | "completed" | "error";
  result?: unknown;
  error?: string;
}> {
  const snipara = getClient(ctx);
  return snipara.agentStatus(params.runId);
}

/**
 * Cancel a running autonomous agent.
 */
export async function agent_cancel(
  ctx: SkillContext,
  params: {
    runId: string;
  }
): Promise<{ cancelled: boolean }> {
  const snipara = getClient(ctx);
  return snipara.agentCancel(params.runId);
}

// ============================================================
// SKILL REGISTRATION
// ============================================================

/**
 * All tools exported by this skill.
 */
export const tools = {
  execute_python,
  agent_run,
  agent_status,
  agent_cancel,
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
