/**
 * Snipara HTTP Client for OpenClaw
 *
 * Provides a unified interface to all Snipara MCP tools via HTTP.
 * Supports memory, swarms, context optimization, and Python execution.
 */

export interface SniparaConfig {
  apiKey: string;
  projectSlug: string;
  baseUrl?: string;
  timeout?: number;
}

export interface MemoryOptions {
  type?: "fact" | "decision" | "learning" | "preference" | "todo" | "context";
  scope?: "agent" | "project" | "team" | "user";
  category?: string;
  ttlDays?: number;
  relatedTo?: string[];
  documentRefs?: string[];
}

export interface RecallOptions {
  type?: string;
  scope?: string;
  category?: string;
  limit?: number;
  minRelevance?: number;
}

export interface ContextQueryOptions {
  maxTokens?: number;
  searchMode?: "keyword" | "semantic" | "hybrid";
  includeMetadata?: boolean;
  preferSummaries?: boolean;
}

export interface ExecutePythonOptions {
  sessionId?: string;
  timeout?: number;
  profile?: "quick" | "default" | "analysis" | "extended";
}

export interface SwarmConfig {
  description?: string;
  maxAgents?: number;
  config?: Record<string, unknown>;
}

export interface ClaimOptions {
  resourceType: "file" | "function" | "module" | "component" | "other";
  resourceId: string;
  timeoutSeconds?: number;
}

export interface TaskOptions {
  description?: string;
  priority?: number;
  dependsOn?: string[];
  metadata?: Record<string, unknown>;
}

interface McpResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Snipara client for OpenClaw integration.
 *
 * @example
 * ```typescript
 * const snipara = new SniparaClient({
 *   apiKey: process.env.SNIPARA_API_KEY,
 *   projectSlug: "my-project",
 * });
 *
 * // Memory
 * await snipara.remember("User prefers dark mode", { type: "preference" });
 * const memories = await snipara.recall("user preferences");
 *
 * // Context
 * const context = await snipara.contextQuery("how does auth work?");
 *
 * // Swarms
 * const swarm = await snipara.createSwarm("code-review");
 * await snipara.joinSwarm(swarm.swarmId, "agent-1");
 *
 * // Execution
 * const result = await snipara.executePython("print('Hello')");
 * ```
 */
export class SniparaClient {
  private readonly apiKey: string;
  private readonly projectSlug: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private requestId = 0;

  constructor(config: SniparaConfig) {
    if (!config.apiKey) {
      throw new Error("apiKey is required");
    }
    if (!config.projectSlug) {
      throw new Error("projectSlug is required");
    }

    this.apiKey = config.apiKey;
    this.projectSlug = config.projectSlug;
    this.baseUrl = config.baseUrl ?? "https://api.snipara.com";
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Make a JSON-RPC call to the Snipara MCP API.
   */
  private async call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/mcp/${this.projectSlug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.requestId,
        method: "tools/call",
        params: {
          name: method,
          arguments: params,
        },
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as McpResponse<T>;

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result as T;
  }

  // ============================================================
  // MEMORY TOOLS
  // ============================================================

  /**
   * Store a memory for later semantic recall.
   */
  async remember(
    content: string,
    options: MemoryOptions = {}
  ): Promise<{ memoryId: string; message: string }> {
    return this.call("rlm_remember", {
      content,
      type: options.type ?? "fact",
      scope: options.scope ?? "project",
      category: options.category,
      ttl_days: options.ttlDays,
      related_to: options.relatedTo,
      document_refs: options.documentRefs,
    });
  }

  /**
   * Semantically recall relevant memories.
   */
  async recall(
    query: string,
    options: RecallOptions = {}
  ): Promise<{ memories: Array<{ id: string; content: string; relevance: number }> }> {
    return this.call("rlm_recall", {
      query,
      type: options.type,
      scope: options.scope,
      category: options.category,
      limit: options.limit ?? 5,
      min_relevance: options.minRelevance ?? 0.5,
    });
  }

  /**
   * List memories with optional filters.
   */
  async listMemories(options: {
    type?: string;
    scope?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ memories: unknown[]; total: number }> {
    return this.call("rlm_memories", {
      type: options.type,
      scope: options.scope,
      category: options.category,
      search: options.search,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    });
  }

  /**
   * Delete memories by ID or filter criteria.
   */
  async forget(options: {
    memoryId?: string;
    type?: string;
    category?: string;
    olderThanDays?: number;
  }): Promise<{ deleted: number }> {
    return this.call("rlm_forget", {
      memory_id: options.memoryId,
      type: options.type,
      category: options.category,
      older_than_days: options.olderThanDays,
    });
  }

  // ============================================================
  // CONTEXT TOOLS
  // ============================================================

  /**
   * Query Snipara for optimized, relevant context.
   */
  async contextQuery(
    query: string,
    options: ContextQueryOptions = {}
  ): Promise<{
    sections: Array<{
      title: string;
      content: string;
      file: string;
      relevance_score: number;
    }>;
    total_tokens: number;
  }> {
    return this.call("rlm_context_query", {
      query,
      max_tokens: options.maxTokens ?? 4000,
      search_mode: options.searchMode ?? "hybrid",
      include_metadata: options.includeMetadata ?? true,
      prefer_summaries: options.preferSummaries ?? false,
    });
  }

  /**
   * Search documentation for a regex pattern.
   */
  async search(
    pattern: string,
    maxResults = 20
  ): Promise<{ matches: Array<{ file: string; line: number; content: string }> }> {
    return this.call("rlm_search", {
      pattern,
      max_results: maxResults,
    });
  }

  /**
   * Upload a document for indexing.
   */
  async uploadDocument(
    path: string,
    content: string
  ): Promise<{ documentId: string; indexed: boolean }> {
    return this.call("rlm_upload_document", {
      path,
      content,
    });
  }

  /**
   * Break a complex query into sub-queries.
   */
  async decompose(
    query: string,
    maxDepth = 2
  ): Promise<{
    sub_queries: Array<{
      query: string;
      depends_on: string[];
    }>;
  }> {
    return this.call("rlm_decompose", {
      query,
      max_depth: maxDepth,
    });
  }

  /**
   * Generate an execution plan for a complex question.
   */
  async plan(
    query: string,
    options: {
      maxTokens?: number;
      strategy?: "breadth_first" | "depth_first" | "relevance_first";
    } = {}
  ): Promise<{
    steps: Array<{
      step: number;
      action: string;
      query: string;
      depends_on: number[];
    }>;
  }> {
    return this.call("rlm_plan", {
      query,
      max_tokens: options.maxTokens ?? 16000,
      strategy: options.strategy ?? "relevance_first",
    });
  }

  /**
   * Execute multiple queries in one call.
   */
  async multiQuery(
    queries: Array<{ query: string; maxTokens?: number }>,
    totalMaxTokens = 8000
  ): Promise<{
    results: Array<{
      query: string;
      sections: unknown[];
    }>;
  }> {
    return this.call("rlm_multi_query", {
      queries,
      max_tokens: totalMaxTokens,
    });
  }

  // ============================================================
  // EXECUTION TOOLS (RLM-Runtime)
  // ============================================================

  /**
   * Execute Python code in a sandboxed environment.
   */
  async executePython(
    code: string,
    options: ExecutePythonOptions = {}
  ): Promise<{
    output: string;
    result: unknown;
    error?: string;
  }> {
    return this.call("execute_python", {
      code,
      session_id: options.sessionId ?? "default",
      timeout: options.timeout,
      profile: options.profile ?? "default",
    });
  }

  /**
   * Start an autonomous agent run.
   */
  async agentRun(
    task: string,
    options: {
      maxIterations?: number;
      tokenBudget?: number;
      costLimit?: number;
    } = {}
  ): Promise<{ runId: string; status: string }> {
    return this.call("rlm_agent_run", {
      task,
      max_iterations: options.maxIterations ?? 10,
      token_budget: options.tokenBudget ?? 50000,
      cost_limit: options.costLimit ?? 2,
    });
  }

  /**
   * Check status of an autonomous agent run.
   */
  async agentStatus(runId: string): Promise<{
    runId: string;
    status: "running" | "completed" | "error";
    result?: unknown;
    error?: string;
  }> {
    return this.call("rlm_agent_status", { run_id: runId });
  }

  /**
   * Cancel a running autonomous agent.
   */
  async agentCancel(runId: string): Promise<{ cancelled: boolean }> {
    return this.call("rlm_agent_cancel", { run_id: runId });
  }

  // ============================================================
  // SWARM TOOLS
  // ============================================================

  /**
   * Create a new agent swarm for coordination.
   */
  async createSwarm(
    name: string,
    options: SwarmConfig = {}
  ): Promise<{ swarmId: string; name: string }> {
    return this.call("rlm_swarm_create", {
      name,
      description: options.description,
      max_agents: options.maxAgents ?? 10,
      config: options.config,
    });
  }

  /**
   * Join an existing swarm as an agent.
   */
  async joinSwarm(
    swarmId: string,
    agentId: string,
    options: {
      role?: "coordinator" | "worker" | "observer";
      capabilities?: string[];
    } = {}
  ): Promise<{ joined: boolean; agentId: string }> {
    return this.call("rlm_swarm_join", {
      swarm_id: swarmId,
      agent_id: agentId,
      role: options.role ?? "worker",
      capabilities: options.capabilities,
    });
  }

  /**
   * Claim exclusive access to a resource.
   */
  async claim(
    swarmId: string,
    agentId: string,
    options: ClaimOptions
  ): Promise<{ claimId: string; granted: boolean }> {
    return this.call("rlm_claim", {
      swarm_id: swarmId,
      agent_id: agentId,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      timeout_seconds: options.timeoutSeconds ?? 300,
    });
  }

  /**
   * Release a claimed resource.
   */
  async release(
    swarmId: string,
    agentId: string,
    options: {
      claimId?: string;
      resourceType?: string;
      resourceId?: string;
    } = {}
  ): Promise<{ released: boolean }> {
    return this.call("rlm_release", {
      swarm_id: swarmId,
      agent_id: agentId,
      claim_id: options.claimId,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
    });
  }

  /**
   * Read shared swarm state.
   */
  async getState(
    swarmId: string,
    key: string
  ): Promise<{ value: unknown; version: number }> {
    return this.call("rlm_state_get", {
      swarm_id: swarmId,
      key,
    });
  }

  /**
   * Write shared swarm state with optimistic locking.
   */
  async setState(
    swarmId: string,
    agentId: string,
    key: string,
    value: unknown,
    expectedVersion?: number
  ): Promise<{ version: number; written: boolean }> {
    return this.call("rlm_state_set", {
      swarm_id: swarmId,
      agent_id: agentId,
      key,
      value,
      expected_version: expectedVersion,
    });
  }

  /**
   * Broadcast an event to all agents in the swarm.
   */
  async broadcast(
    swarmId: string,
    agentId: string,
    eventType: string,
    payload?: Record<string, unknown>
  ): Promise<{ delivered: number }> {
    return this.call("rlm_broadcast", {
      swarm_id: swarmId,
      agent_id: agentId,
      event_type: eventType,
      payload,
    });
  }

  /**
   * Create a task in the swarm's distributed task queue.
   */
  async createTask(
    swarmId: string,
    agentId: string,
    title: string,
    options: TaskOptions = {}
  ): Promise<{ taskId: string }> {
    return this.call("rlm_task_create", {
      swarm_id: swarmId,
      agent_id: agentId,
      title,
      description: options.description,
      priority: options.priority ?? 0,
      depends_on: options.dependsOn,
      metadata: options.metadata,
    });
  }

  /**
   * Claim a task from the queue.
   */
  async claimTask(
    swarmId: string,
    agentId: string,
    options: {
      taskId?: string;
      timeoutSeconds?: number;
    } = {}
  ): Promise<{
    taskId: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  } | null> {
    return this.call("rlm_task_claim", {
      swarm_id: swarmId,
      agent_id: agentId,
      task_id: options.taskId,
      timeout_seconds: options.timeoutSeconds ?? 600,
    });
  }

  /**
   * Mark a claimed task as completed or failed.
   */
  async completeTask(
    swarmId: string,
    agentId: string,
    taskId: string,
    options: {
      success?: boolean;
      result?: unknown;
    } = {}
  ): Promise<{ completed: boolean }> {
    return this.call("rlm_task_complete", {
      swarm_id: swarmId,
      agent_id: agentId,
      task_id: taskId,
      success: options.success ?? true,
      result: options.result,
    });
  }

  // ============================================================
  // UTILITY
  // ============================================================

  /**
   * Get documentation statistics.
   */
  async stats(): Promise<{
    documents: number;
    chunks: number;
    totalTokens: number;
  }> {
    return this.call("rlm_stats", {});
  }

  /**
   * List documentation sections.
   */
  async sections(options: {
    filter?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    sections: Array<{ title: string; file: string; tokens: number }>;
    total: number;
  }> {
    return this.call("rlm_sections", {
      filter: options.filter,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    });
  }
}
