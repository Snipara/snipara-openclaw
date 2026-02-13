/**
 * Snipara Swarm Skill for OpenClaw
 *
 * Provides multi-agent coordination tools including:
 * - Swarm creation and management
 * - Resource claims (distributed locks)
 * - Shared state with optimistic locking
 * - Task queues with dependencies
 * - Event broadcasting
 * - Persistent memory
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
// SWARM TOOLS
// ============================================================

/**
 * Create a new agent swarm for coordination.
 */
export async function swarm_create(
  ctx: SkillContext,
  params: {
    name: string;
    description?: string;
    maxAgents?: number;
  }
): Promise<{ swarmId: string; name: string }> {
  const snipara = getClient(ctx);
  return snipara.createSwarm(params.name, {
    description: params.description,
    maxAgents: params.maxAgents,
  });
}

/**
 * Join an existing swarm as an agent.
 */
export async function swarm_join(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    role?: "coordinator" | "worker" | "observer";
    capabilities?: string[];
  }
): Promise<{ joined: boolean; agentId: string }> {
  const snipara = getClient(ctx);
  return snipara.joinSwarm(params.swarmId, params.agentId, {
    role: params.role,
    capabilities: params.capabilities,
  });
}

/**
 * Claim exclusive access to a resource.
 */
export async function claim_resource(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    resourceType: "file" | "function" | "module" | "component" | "other";
    resourceId: string;
    timeoutSeconds?: number;
  }
): Promise<{ claimId: string; granted: boolean }> {
  const snipara = getClient(ctx);
  return snipara.claim(params.swarmId, params.agentId, {
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    timeoutSeconds: params.timeoutSeconds,
  });
}

/**
 * Release a claimed resource.
 */
export async function release_resource(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    resourceType?: string;
    resourceId?: string;
    claimId?: string;
  }
): Promise<{ released: boolean }> {
  const snipara = getClient(ctx);
  return snipara.release(params.swarmId, params.agentId, {
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    claimId: params.claimId,
  });
}

/**
 * Read shared swarm state.
 */
export async function get_state(
  ctx: SkillContext,
  params: {
    swarmId: string;
    key: string;
  }
): Promise<{ value: unknown; version: number }> {
  const snipara = getClient(ctx);
  return snipara.getState(params.swarmId, params.key);
}

/**
 * Write shared swarm state with optimistic locking.
 */
export async function set_state(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    key: string;
    value: unknown;
    expectedVersion?: number;
  }
): Promise<{ version: number; written: boolean }> {
  const snipara = getClient(ctx);
  return snipara.setState(
    params.swarmId,
    params.agentId,
    params.key,
    params.value,
    params.expectedVersion
  );
}

/**
 * Broadcast an event to all agents in the swarm.
 */
export async function broadcast(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    eventType: string;
    payload?: Record<string, unknown>;
  }
): Promise<{ delivered: number }> {
  const snipara = getClient(ctx);
  return snipara.broadcast(
    params.swarmId,
    params.agentId,
    params.eventType,
    params.payload
  );
}

/**
 * Create a task in the swarm's distributed task queue.
 */
export async function task_create(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    title: string;
    description?: string;
    priority?: number;
    dependsOn?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<{ taskId: string }> {
  const snipara = getClient(ctx);
  return snipara.createTask(params.swarmId, params.agentId, params.title, {
    description: params.description,
    priority: params.priority,
    dependsOn: params.dependsOn,
    metadata: params.metadata,
  });
}

/**
 * Claim a task from the queue.
 */
export async function task_claim(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    taskId?: string;
    timeoutSeconds?: number;
  }
): Promise<{
  taskId: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
} | null> {
  const snipara = getClient(ctx);
  return snipara.claimTask(params.swarmId, params.agentId, {
    taskId: params.taskId,
    timeoutSeconds: params.timeoutSeconds,
  });
}

/**
 * Mark a claimed task as completed or failed.
 */
export async function task_complete(
  ctx: SkillContext,
  params: {
    swarmId: string;
    agentId: string;
    taskId: string;
    success?: boolean;
    result?: unknown;
  }
): Promise<{ completed: boolean }> {
  const snipara = getClient(ctx);
  return snipara.completeTask(params.swarmId, params.agentId, params.taskId, {
    success: params.success,
    result: params.result,
  });
}

// ============================================================
// MEMORY TOOLS
// ============================================================

/**
 * Store a memory for later semantic recall.
 */
export async function remember(
  ctx: SkillContext,
  params: {
    content: string;
    type?: "fact" | "decision" | "learning" | "preference" | "todo" | "context";
    category?: string;
    ttlDays?: number;
  }
): Promise<{ memoryId: string; message: string }> {
  const snipara = getClient(ctx);
  return snipara.remember(params.content, {
    type: params.type,
    category: params.category,
    ttlDays: params.ttlDays,
  });
}

/**
 * Semantically recall relevant memories.
 */
export async function recall(
  ctx: SkillContext,
  params: {
    query: string;
    type?: string;
    category?: string;
    limit?: number;
    minRelevance?: number;
  }
): Promise<{ memories: Array<{ id: string; content: string; relevance: number }> }> {
  const snipara = getClient(ctx);
  return snipara.recall(params.query, {
    type: params.type,
    category: params.category,
    limit: params.limit,
    minRelevance: params.minRelevance,
  });
}

// ============================================================
// SKILL REGISTRATION
// ============================================================

/**
 * All tools exported by this skill.
 */
export const tools = {
  swarm_create,
  swarm_join,
  claim_resource,
  release_resource,
  get_state,
  set_state,
  broadcast,
  task_create,
  task_claim,
  task_complete,
  remember,
  recall,
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
