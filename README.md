# snipara-openclaw

Multi-agent swarms, context optimization, and safe code execution for OpenClaw.

[![npm version](https://badge.fury.io/js/%40snipara%2Fopenclaw.svg)](https://www.npmjs.com/package/snipara-openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Snipara for OpenClaw?

OpenClaw's multi-agent setup lacks coordination primitives. When running 3+ agents, you face real problems:

| Problem | Without Snipara | With Snipara |
|---------|-----------------|--------------|
| Two agents edit same file | Merge conflicts | `claim_resource()` locks file |
| No task dependencies | Agents work out of order | `task_create()` with dependencies |
| No shared state | Agents repeat work | `get_state()` / `set_state()` |
| Can't test code safely | Agent says "should work" | `execute_python()` in sandbox |
| Context overload | 500K tokens, 8K window | `context_query()` returns 4K relevant |
| Memory is MEMORY.md | Weak, file-based | Semantic memory with `remember()` / `recall()` |

## Quick Start

### One-Command Install

```bash
npx snipara-openclaw-install
```

This will:
1. Detect your OpenClaw installation
2. Prompt for your Snipara API key (or open signup)
3. Configure all three skills automatically
4. Test the connection

### Manual Installation

```bash
npm install snipara-openclaw
```

## Features

### 1. Multi-Agent Swarm Coordination

Coordinate multiple agents working on the same codebase.

```typescript
import { swarm_create, swarm_join, claim_resource, task_create } from "snipara-openclaw/swarm-skill";

// Create a swarm for code review
const swarm = await swarm_create(ctx, { name: "code-review" });

// Agent joins the swarm
await swarm_join(ctx, {
  swarmId: swarm.swarmId,
  agentId: "reviewer-1",
  role: "worker"
});

// Claim exclusive access to a file
await claim_resource(ctx, {
  swarmId: swarm.swarmId,
  agentId: "reviewer-1",
  resourceType: "file",
  resourceId: "src/auth.ts"
});

// Create task with dependencies
await task_create(ctx, {
  swarmId: swarm.swarmId,
  agentId: "reviewer-1",
  title: "Review auth changes",
  dependsOn: ["task_setup_complete"]
});
```

**12 Swarm Tools:**
- `swarm_create`, `swarm_join` - Create and join swarms
- `claim_resource`, `release_resource` - Distributed locks
- `get_state`, `set_state` - Shared state with optimistic locking
- `broadcast` - Send events to all agents
- `task_create`, `task_claim`, `task_complete` - Distributed task queue
- `remember`, `recall` - Persistent semantic memory

### 2. Context Optimization

Query your documentation with semantic search and token budgeting.

```typescript
import { context_query, upload_document, plan } from "snipara-openclaw/context-skill";

// Upload project documentation
await upload_document(ctx, {
  path: "docs/architecture.md",
  content: "# Architecture\n..."
});

// Query with token budget
const context = await context_query(ctx, {
  query: "How does authentication work?",
  maxTokens: 4000,
  searchMode: "hybrid"
});

// Plan complex queries
const executionPlan = await plan(ctx, {
  query: "Implement OAuth 2.0 integration",
  maxTokens: 16000,
  strategy: "relevance_first"
});
```

**8 Context Tools:**
- `context_query` - Semantic search with token budgeting
- `upload_document` - Add documentation to index
- `search` - Regex pattern search
- `decompose` - Break complex queries into sub-queries
- `plan` - Generate execution plans
- `multi_query` - Batch multiple queries
- `sections` - List indexed sections
- `stats` - Documentation statistics

### 3. Safe Python Execution

Execute Python code in a secure sandbox via RLM-Runtime.

```typescript
import { execute_python, agent_run, agent_status } from "snipara-openclaw/execution-skill";

// Test code in sandbox
const result = await execute_python(ctx, {
  code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

result = [fibonacci(i) for i in range(10)]
print(f"Fibonacci: {result}")
  `,
  profile: "default"  // 30s timeout
});

// Start autonomous agent for complex tasks
const run = await agent_run(ctx, {
  task: "Implement and test a binary search function with edge cases",
  maxIterations: 10
});

// Check status
const status = await agent_status(ctx, { runId: run.runId });
```

**4 Execution Tools:**
- `execute_python` - Sandboxed Python execution
- `agent_run` - Start autonomous agent
- `agent_status` - Check agent progress
- `agent_cancel` - Stop running agent

**Allowed imports:** `json`, `re`, `math`, `datetime`, `collections`, `itertools`, `functools`, `operator`, `string`, `random`, `hashlib`, `base64`, `urllib.parse`

**Blocked (for safety):** `os`, `subprocess`, `socket`, file I/O, network access

### 4. Persistent Memory (via Swarm Skill)

Replace MEMORY.md with semantic memory.

```typescript
import { remember, recall } from "snipara-openclaw/swarm-skill";

// Store a decision
await remember(ctx, {
  content: "User prefers functional components over class components",
  type: "preference",
  category: "coding-style",
  ttlDays: 90
});

// Recall relevant memories
const memories = await recall(ctx, {
  query: "user preferences for React",
  limit: 5,
  minRelevance: 0.7
});
```

## Memory Plugin

Use Snipara as OpenClaw's memory backend:

```typescript
import { createMemoryPlugin } from "snipara-openclaw/memory-plugin";

const memoryPlugin = createMemoryPlugin({
  apiKey: process.env.SNIPARA_API_KEY,
  projectSlug: "my-project"
});

// Store memory
await memoryPlugin.store("user-preferences", {
  theme: "dark",
  language: "typescript"
});

// Search memories
const results = await memoryPlugin.search("user preferences", { limit: 10 });
```

## Configuration

### Environment Variables

```bash
export SNIPARA_API_KEY="rlm_your_key_here"
export SNIPARA_PROJECT_SLUG="your-project"
```

### OpenClaw Configuration

After running `npx snipara-openclaw-install`, your `~/.openclaw/openclaw.json` will include:

```json
{
  "memory": {
    "provider": "snipara-openclaw/memory-plugin",
    "config": {
      "apiKey": "rlm_...",
      "projectSlug": "your-project"
    }
  },
  "skills": {
    "snipara-swarm": {
      "enabled": true,
      "config": { "apiKey": "rlm_...", "projectSlug": "your-project" }
    },
    "snipara-context": {
      "enabled": true,
      "config": { "apiKey": "rlm_...", "projectSlug": "your-project" }
    },
    "snipara-execution": {
      "enabled": true,
      "config": { "apiKey": "rlm_...", "projectSlug": "your-project" }
    }
  }
}
```

## Direct Client Usage

For programmatic access:

```typescript
import { SniparaClient } from "snipara-openclaw";

const snipara = new SniparaClient({
  apiKey: process.env.SNIPARA_API_KEY,
  projectSlug: "my-project"
});

// Memory
await snipara.remember("User prefers dark mode", { type: "preference" });
const memories = await snipara.recall("user preferences");

// Context
const context = await snipara.contextQuery("how does auth work?");

// Execution
const result = await snipara.executePython("print('Hello!')");

// Swarms
const swarm = await snipara.createSwarm("code-review");
await snipara.joinSwarm(swarm.swarmId, "agent-1");
await snipara.claim(swarm.swarmId, "agent-1", {
  resourceType: "file",
  resourceId: "src/auth.ts"
});
```

## CLI Commands

```bash
# Install (default command)
npx snipara-openclaw-install

# Check status
npx snipara-openclaw-install status

# Uninstall
npx snipara-openclaw-install uninstall

# Preview without changes
npx snipara-openclaw-install --dry-run

# Force reconfiguration
npx snipara-openclaw-install --force
```

## Example: 3-Agent Code Review Swarm

```typescript
// coordinator.ts
const swarm = await swarm_create(ctx, { name: "pr-review-123" });

// Create review tasks
await task_create(ctx, { swarmId, agentId: "coordinator", title: "Review auth changes", priority: 10 });
await task_create(ctx, { swarmId, agentId: "coordinator", title: "Review API routes", priority: 5 });
await task_create(ctx, { swarmId, agentId: "coordinator", title: "Run test suite", dependsOn: ["auth", "api"] });

// agent-1.ts (reviewer)
await swarm_join(ctx, { swarmId, agentId: "reviewer-1", role: "worker" });
const task = await task_claim(ctx, { swarmId, agentId: "reviewer-1" });
await claim_resource(ctx, { swarmId, agentId: "reviewer-1", resourceType: "file", resourceId: task.metadata.file });

// Get relevant context
const context = await context_query(ctx, { query: `review ${task.title}`, maxTokens: 4000 });

// Do review work...
await task_complete(ctx, { swarmId, agentId: "reviewer-1", taskId: task.taskId, success: true });
await release_resource(ctx, { swarmId, agentId: "reviewer-1", resourceId: task.metadata.file });

// agent-2.ts (test runner)
await swarm_join(ctx, { swarmId, agentId: "tester-1", role: "worker" });
const testTask = await task_claim(ctx, { swarmId, agentId: "tester-1" });

// Run tests in sandbox
const result = await execute_python(ctx, {
  code: "import subprocess; result = subprocess.run(['pytest'], capture_output=True)",
  profile: "extended"  // 5 minute timeout
});

await task_complete(ctx, { swarmId, agentId: "tester-1", taskId: testTask.taskId, success: !result.error });
```

## Get Your API Key

1. Visit [snipara.com/dashboard](https://snipara.com/dashboard)
2. Create or select a project
3. Go to Settings > API Keys
4. Generate a new key

**Free tier:** 100 queries/month
**Pro tier:** 5,000 queries/month
**Team tier:** 20,000 queries/month

## Documentation

- [Full Integration Guide](https://snipara.com/docs/integration/openclaw)
- [Swarm Skill Reference](https://snipara.com/docs/tools/swarm)
- [Context Skill Reference](https://snipara.com/docs/tools/context)
- [Execution Skill Reference](https://snipara.com/docs/tools/execution)
- [Memory Plugin API](https://snipara.com/docs/plugins/memory)

## License

MIT
