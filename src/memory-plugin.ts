/**
 * Snipara Memory Plugin for OpenClaw
 *
 * Implements OpenClaw's memory slot interface using Snipara's semantic memory system.
 * Replaces the default MEMORY.md with proper vector search and confidence decay.
 *
 * @example
 * ```typescript
 * // In your OpenClaw configuration
 * import { createMemoryPlugin } from "@snipara/openclaw/memory-plugin";
 *
 * const memoryPlugin = createMemoryPlugin({
 *   apiKey: process.env.SNIPARA_API_KEY,
 *   projectSlug: "my-project",
 * });
 *
 * // Use in OpenClaw
 * openclaw.use(memoryPlugin);
 * ```
 */

import { SniparaClient, type SniparaConfig } from "./client";

/**
 * Memory entry as returned by OpenClaw's memory interface.
 */
export interface MemoryEntry {
  id: string;
  content: string;
  type: string;
  category?: string;
  relevance?: number;
  createdAt: string;
  accessedAt?: string;
}

/**
 * Options for storing a memory.
 */
export interface StoreOptions {
  type?: "fact" | "decision" | "learning" | "preference" | "todo" | "context";
  category?: string;
  ttlDays?: number;
}

/**
 * Options for searching memories.
 */
export interface SearchOptions {
  type?: string;
  category?: string;
  limit?: number;
  minRelevance?: number;
}

/**
 * OpenClaw memory slot interface.
 * This interface matches what OpenClaw expects from a memory plugin.
 */
export interface OpenClawMemorySlot {
  /**
   * Store a memory for later recall.
   */
  store(content: string, options?: StoreOptions): Promise<MemoryEntry>;

  /**
   * Search for relevant memories using semantic search.
   */
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;

  /**
   * Get a specific memory by ID.
   */
  get(id: string): Promise<MemoryEntry | null>;

  /**
   * Delete a memory by ID.
   */
  delete(id: string): Promise<boolean>;

  /**
   * List all memories with optional filters.
   */
  list(options?: { type?: string; category?: string; limit?: number }): Promise<MemoryEntry[]>;

  /**
   * Clear all memories (use with caution).
   */
  clear(): Promise<number>;
}

/**
 * Snipara-backed memory plugin for OpenClaw.
 */
class SniparaMemoryPlugin implements OpenClawMemorySlot {
  private client: SniparaClient;

  constructor(config: SniparaConfig) {
    this.client = new SniparaClient(config);
  }

  async store(content: string, options: StoreOptions = {}): Promise<MemoryEntry> {
    const result = await this.client.remember(content, {
      type: options.type ?? "fact",
      category: options.category,
      ttlDays: options.ttlDays,
    });

    return {
      id: result.memoryId,
      content,
      type: options.type ?? "fact",
      category: options.category,
      createdAt: new Date().toISOString(),
    };
  }

  async search(query: string, options: SearchOptions = {}): Promise<MemoryEntry[]> {
    const result = await this.client.recall(query, {
      type: options.type,
      category: options.category,
      limit: options.limit ?? 5,
      minRelevance: options.minRelevance ?? 0.5,
    });

    return result.memories.map((m) => ({
      id: m.id,
      content: m.content,
      type: "unknown", // Snipara recall doesn't return type
      relevance: m.relevance,
      createdAt: new Date().toISOString(),
    }));
  }

  async get(id: string): Promise<MemoryEntry | null> {
    // Snipara doesn't have a direct get-by-id endpoint,
    // so we list with a search that might match
    const result = await this.client.listMemories({ limit: 100 });

    const memories = result.memories as Array<Record<string, unknown>>;
    const memory = memories.find((m) => m.id === id);

    if (!memory) return null;

    return {
      id: memory.id as string,
      content: memory.content as string,
      type: (memory.type as string) ?? "unknown",
      category: memory.category as string | undefined,
      createdAt: (memory.createdAt as string) ?? new Date().toISOString(),
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.forget({ memoryId: id });
    return result.deleted > 0;
  }

  async list(
    options: { type?: string; category?: string; limit?: number } = {}
  ): Promise<MemoryEntry[]> {
    const result = await this.client.listMemories({
      type: options.type,
      category: options.category,
      limit: options.limit ?? 20,
    });

    const memories = result.memories as Array<Record<string, unknown>>;
    return memories.map((m) => ({
      id: m.id as string,
      content: m.content as string,
      type: (m.type as string) ?? "unknown",
      category: m.category as string | undefined,
      createdAt: (m.createdAt as string) ?? new Date().toISOString(),
    }));
  }

  async clear(): Promise<number> {
    // Delete all memories by using a very old date filter
    // This is a safety measure - requires explicit action
    const result = await this.client.forget({ olderThanDays: 0 });
    return result.deleted;
  }
}

/**
 * Create a Snipara memory plugin for OpenClaw.
 *
 * @param config - Snipara API configuration
 * @returns OpenClaw-compatible memory slot
 *
 * @example
 * ```typescript
 * import { createMemoryPlugin } from "@snipara/openclaw/memory-plugin";
 *
 * const memory = createMemoryPlugin({
 *   apiKey: "rlm_...",
 *   projectSlug: "my-project",
 * });
 *
 * // Store a memory
 * await memory.store("User prefers dark mode", { type: "preference" });
 *
 * // Search memories
 * const results = await memory.search("user preferences");
 * ```
 */
export function createMemoryPlugin(config: SniparaConfig): OpenClawMemorySlot {
  return new SniparaMemoryPlugin(config);
}

/**
 * OpenClaw plugin registration function.
 * This is called by OpenClaw when the plugin is loaded.
 */
export function register(openclaw: {
  setMemorySlot: (slot: OpenClawMemorySlot) => void;
  config: { sniparaApiKey?: string; sniparaProjectSlug?: string };
}): void {
  const apiKey = openclaw.config.sniparaApiKey ?? process.env.SNIPARA_API_KEY;
  const projectSlug =
    openclaw.config.sniparaProjectSlug ?? process.env.SNIPARA_PROJECT_SLUG;

  if (!apiKey) {
    throw new Error(
      "Snipara API key required. Set SNIPARA_API_KEY environment variable or config.sniparaApiKey"
    );
  }

  if (!projectSlug) {
    throw new Error(
      "Snipara project slug required. Set SNIPARA_PROJECT_SLUG environment variable or config.sniparaProjectSlug"
    );
  }

  const plugin = createMemoryPlugin({ apiKey, projectSlug });
  openclaw.setMemorySlot(plugin);
}

export default createMemoryPlugin;
