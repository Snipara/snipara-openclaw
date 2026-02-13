# Snipara Swarm Skill for OpenClaw

Multi-agent coordination, distributed task queues, and persistent memory powered by Snipara.

## When to Use This Skill

Use the Snipara Swarm skill when:

1. **Multiple agents are working together** - Coordinate work, prevent conflicts
2. **Files need exclusive access** - Claim resources before editing to prevent merge conflicts
3. **Tasks have dependencies** - Create task queues where some tasks must complete before others
4. **Agents need shared state** - Store and retrieve coordination data
5. **Decisions should persist** - Remember important context across sessions

## Core Concepts

### Swarms

A **swarm** is a coordination group for multiple agents. Create one swarm per project or task.

```
swarm_create("code-review")
→ { swarmId: "swarm_abc123" }

swarm_join(swarmId, "agent-1", role="worker", capabilities=["code", "test"])
swarm_join(swarmId, "agent-2", role="worker", capabilities=["review"])
swarm_join(swarmId, "agent-3", role="coordinator")
```

### Resource Claims

**Claims** provide exclusive access to resources. ALWAYS claim before editing shared files.

```
# Before editing a file
claim_resource(swarmId, agentId, "file", "src/auth.ts", timeoutSeconds=300)
→ { claimId: "claim_xyz", granted: true }

# If another agent already claimed it:
→ { claimId: null, granted: false, holder: "agent-2" }

# After editing, release the claim
release_resource(swarmId, agentId, resourceType="file", resourceId="src/auth.ts")
```

### Task Queues

**Tasks** are work items with optional dependencies and priorities.

```
# Create tasks with dependencies
task_create(swarmId, agentId, "Write unit tests", dependsOn=["task_impl"])
task_create(swarmId, agentId, "Implement feature", priority=10)  # Higher priority
task_create(swarmId, agentId, "Code review", dependsOn=["task_tests"])

# Claim next available task
task = task_claim(swarmId, agentId)
→ { taskId: "task_impl", title: "Implement feature", ... }

# Complete the task
task_complete(swarmId, agentId, taskId, success=true, result={files: ["src/feature.ts"]})
```

### Shared State

**State** is shared data accessible by all agents. Uses optimistic locking for safety.

```
# Read state
get_state(swarmId, "progress")
→ { value: { completed: 2, total: 5 }, version: 3 }

# Write state (with optimistic locking)
set_state(swarmId, agentId, "progress", { completed: 3, total: 5 }, expectedVersion=3)
→ { version: 4, written: true }

# If version mismatch (another agent updated first):
→ { version: 4, written: false, conflict: true }
```

### Broadcasting

**Broadcast** sends events to all agents in the swarm.

```
# Announce completion
broadcast(swarmId, agentId, "task_completed", { taskId: "task_123", result: "success" })

# Request help
broadcast(swarmId, agentId, "help_needed", { issue: "Can't parse JSON config" })

# Signal all done
broadcast(swarmId, agentId, "all_done", { summary: "Feature implemented and tested" })
```

### Memory

**Memory** persists context across sessions with semantic search.

```
# Store important decisions
remember("Chose JWT over sessions for auth because of stateless scaling", type="decision")

# Store learnings
remember("Auth middleware must be applied before rate limiting", type="learning")

# Recall relevant memories
recall("authentication approach")
→ [{ content: "Chose JWT over sessions...", relevance: 0.92 }]
```

## Best Practices

### 1. Always Claim Before Editing

```
# WRONG - May conflict with other agents
edit_file("src/auth.ts", ...)

# RIGHT - Claim first
claim = claim_resource(swarmId, agentId, "file", "src/auth.ts")
if claim.granted:
    edit_file("src/auth.ts", ...)
    release_resource(swarmId, agentId, resourceType="file", resourceId="src/auth.ts")
else:
    # Wait or work on something else
```

### 2. Use Task Dependencies

```
# Define clear dependencies
task_create(swarmId, agentId, "1. Design API", priority=10)
task_create(swarmId, agentId, "2. Implement API", dependsOn=["task_1"])
task_create(swarmId, agentId, "3. Write tests", dependsOn=["task_2"])
task_create(swarmId, agentId, "4. Review", dependsOn=["task_3"])
```

### 3. Remember Decisions

```
# After making an architectural decision
remember(
    "Decided to use PostgreSQL with pgvector for embeddings because it supports hybrid search",
    type="decision",
    category="architecture"
)
```

### 4. Use Optimistic Locking

```
# Read current state
state = get_state(swarmId, "config")

# Modify and write back with expected version
state.value.newSetting = true
set_state(swarmId, agentId, "config", state.value, expectedVersion=state.version)
```

### 5. Broadcast Status Updates

```
# Keep other agents informed
broadcast(swarmId, agentId, "status_update", {
    currentTask: "Implementing auth",
    progress: "50%",
    eta: "5 minutes"
})
```

## Common Patterns

### Code Review Swarm

```
# Coordinator creates swarm and tasks
swarm = swarm_create("pr-review-123")
task_create(swarm.swarmId, "coordinator", "Review auth changes", metadata={ files: ["src/auth.ts"] })
task_create(swarm.swarmId, "coordinator", "Review tests", metadata={ files: ["tests/"] })
task_create(swarm.swarmId, "coordinator", "Check performance", metadata={ type: "perf" })

# Workers join and claim tasks
swarm_join(swarm.swarmId, "reviewer-1", capabilities=["security"])
swarm_join(swarm.swarmId, "reviewer-2", capabilities=["testing"])

task = task_claim(swarm.swarmId, "reviewer-1")
# ... do review ...
task_complete(swarm.swarmId, "reviewer-1", task.taskId, result={ approved: true, comments: [] })
```

### Feature Implementation Team

```
# Create swarm with roles
swarm = swarm_create("feature-oauth")
swarm_join(swarm.swarmId, "architect", role="coordinator")
swarm_join(swarm.swarmId, "developer-1", role="worker", capabilities=["backend"])
swarm_join(swarm.swarmId, "developer-2", role="worker", capabilities=["frontend"])
swarm_join(swarm.swarmId, "tester", role="worker", capabilities=["testing"])

# Architect sets shared state
set_state(swarm.swarmId, "architect", "design", {
    endpoints: ["/auth/login", "/auth/callback"],
    storage: "JWT in httpOnly cookie"
})

# Workers read design and implement
design = get_state(swarm.swarmId, "design")
# ... implement based on design ...

# Remember decisions for future reference
remember("OAuth callback uses PKCE for security", type="decision", category="oauth")
```

## Error Handling

```
# Handle claim failures gracefully
claim = claim_resource(swarmId, agentId, "file", "src/critical.ts")
if not claim.granted:
    # Option 1: Wait and retry
    # Option 2: Work on a different task
    # Option 3: Notify coordinator
    broadcast(swarmId, agentId, "blocked", { resource: "src/critical.ts", holder: claim.holder })

# Handle state conflicts
result = set_state(swarmId, agentId, "progress", newValue, expectedVersion=oldVersion)
if not result.written:
    # Re-read state and retry
    fresh = get_state(swarmId, "progress")
    # Merge changes and retry with new version
```

## Configuration

Set these environment variables:

```bash
export SNIPARA_API_KEY="rlm_your_key_here"
export SNIPARA_PROJECT_SLUG="your-project"
```

Or configure in OpenClaw:

```json
{
  "skills": {
    "snipara-swarm": {
      "apiKey": "rlm_...",
      "projectSlug": "your-project"
    }
  }
}
```

## Get Your API Key

1. Visit https://snipara.com/dashboard
2. Create or select a project
3. Go to Settings → API Keys
4. Generate a new key

Free tier includes 100 queries/month. Upgrade for more at https://snipara.com/pricing
