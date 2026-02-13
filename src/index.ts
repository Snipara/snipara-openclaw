/**
 * @snipara/openclaw - Snipara integration for OpenClaw
 *
 * Multi-agent swarms, context optimization, safe code execution, and persistent memory.
 *
 * @example
 * ```typescript
 * import { SniparaClient } from "@snipara/openclaw";
 *
 * const snipara = new SniparaClient({
 *   apiKey: process.env.SNIPARA_API_KEY,
 *   projectSlug: "my-project",
 * });
 *
 * // Memory
 * await snipara.remember("User prefers dark mode", { type: "preference" });
 * const memories = await snipara.recall("user preferences");
 *
 * // Context optimization
 * const context = await snipara.contextQuery("how does auth work?");
 *
 * // Multi-agent swarms
 * const swarm = await snipara.createSwarm("code-review");
 * await snipara.joinSwarm(swarm.swarmId, "agent-1");
 * await snipara.claim(swarm.swarmId, "agent-1", { resourceType: "file", resourceId: "src/auth.ts" });
 *
 * // Safe Python execution
 * const result = await snipara.executePython("print('Hello from sandbox!')");
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { SniparaClient } from "./client";
export type {
  SniparaConfig,
  MemoryOptions,
  RecallOptions,
  ContextQueryOptions,
  ExecutePythonOptions,
  SwarmConfig,
  ClaimOptions,
  TaskOptions,
} from "./client";

// Memory plugin for OpenClaw
export { createMemoryPlugin, register as registerMemoryPlugin } from "./memory-plugin";
export type { MemoryEntry, StoreOptions, SearchOptions, OpenClawMemorySlot } from "./memory-plugin";

// Skills
export * as swarmSkill from "./swarm-skill";
export * as contextSkill from "./context-skill";
export * as executionSkill from "./execution-skill";

// Re-export skill tools for convenience
export {
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
} from "./swarm-skill";

export {
  context_query,
  upload_document,
  search,
  decompose,
  plan,
  multi_query,
  sections,
  stats,
} from "./context-skill";

export {
  execute_python,
  agent_run,
  agent_status,
  agent_cancel,
} from "./execution-skill";
