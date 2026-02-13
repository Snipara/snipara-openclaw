# Snipara Context Skill for OpenClaw

Document chunking, semantic search, and context optimization powered by Snipara.

## When to Use This Skill

Use the Snipara Context skill when:

1. **You need to understand a codebase** - Query docs instead of reading entire files
2. **Context window is limited** - Get relevant sections within token budget
3. **Searching for patterns** - Find implementations, usage examples
4. **Complex questions** - Break them into sub-queries for better results
5. **Multiple lookups needed** - Batch queries for efficiency

## The Problem This Solves

```
WITHOUT Snipara:
- Agent asks "how does auth work?"
- Reads entire auth.ts (2000 lines, 8K tokens)
- Plus auth.test.ts (500 lines, 2K tokens)
- Plus middleware.ts (300 lines, 1K tokens)
- Total: 11K tokens, mostly irrelevant

WITH Snipara:
- Agent calls context_query("how does auth work?")
- Gets 20 relevant lines from 3 files (400 tokens)
- Includes relevance scores and file paths
- Total: 400 tokens, all relevant
```

## Core Tools

### context_query

The primary tool for finding relevant documentation.

```
context_query("how does authentication work?")
→ {
    sections: [
      {
        title: "Authentication Middleware",
        content: "The auth middleware validates JWT tokens...",
        file: "src/middleware/auth.ts",
        relevance_score: 0.94
      },
      {
        title: "Login Flow",
        content: "Users authenticate via OAuth2...",
        file: "docs/auth.md",
        relevance_score: 0.87
      }
    ],
    total_tokens: 450
  }
```

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| query | string | required | Question or topic |
| maxTokens | number | 4000 | Token budget |
| searchMode | string | "hybrid" | "keyword", "semantic", or "hybrid" |
| includeMetadata | boolean | true | Include file paths, scores |

### upload_document

Index a document for future queries.

```
upload_document(
  path="docs/api.md",
  content="# API Reference\n\n## Authentication\n..."
)
→ { documentId: "doc_123", indexed: true }
```

### search

Find exact pattern matches (regex).

```
search("TODO|FIXME")
→ {
    matches: [
      { file: "src/auth.ts", line: 42, content: "// TODO: Add rate limiting" },
      { file: "src/api.ts", line: 108, content: "// FIXME: Handle edge case" }
    ]
  }
```

### decompose

Break complex questions into sub-queries.

```
decompose("How do I add a new API endpoint with authentication and tests?")
→ {
    sub_queries: [
      { query: "How to create API endpoint", depends_on: [] },
      { query: "How authentication middleware works", depends_on: [] },
      { query: "How to write API tests", depends_on: ["How to create API endpoint"] }
    ]
  }
```

### plan

Generate an execution plan for complex tasks.

```
plan("Implement user registration with email verification")
→ {
    steps: [
      { step: 1, action: "query", query: "user model schema", depends_on: [] },
      { step: 2, action: "query", query: "email service setup", depends_on: [] },
      { step: 3, action: "query", query: "registration endpoint pattern", depends_on: [1] },
      { step: 4, action: "query", query: "email verification flow", depends_on: [2, 3] }
    ]
  }
```

### multi_query

Execute multiple queries efficiently.

```
multi_query([
  { query: "database schema" },
  { query: "API endpoints" },
  { query: "test patterns" }
], totalMaxTokens=6000)
→ {
    results: [
      { query: "database schema", sections: [...], tokens: 1800 },
      { query: "API endpoints", sections: [...], tokens: 2100 },
      { query: "test patterns", sections: [...], tokens: 1500 }
    ]
  }
```

### sections

Browse indexed documentation.

```
sections(filter="auth", limit=10)
→ {
    sections: [
      { title: "Authentication Middleware", file: "src/middleware/auth.ts", tokens: 450 },
      { title: "Auth Configuration", file: "docs/auth.md", tokens: 320 },
      ...
    ],
    total: 15
  }
```

### stats

Get project documentation statistics.

```
stats()
→ {
    documents: 47,
    chunks: 312,
    totalTokens: 125000
  }
```

## Search Modes

| Mode | Best For | How It Works |
|------|----------|--------------|
| **keyword** | Exact matches, code | Finds exact terms |
| **semantic** | Concepts, meaning | Vector similarity |
| **hybrid** | General use | Combines both |

```
# Find exact function name
context_query("handleUserLogin", searchMode="keyword")

# Find conceptual match
context_query("user authentication flow", searchMode="semantic")

# Best of both (default)
context_query("how does login work?", searchMode="hybrid")
```

## Token Budgeting

Control how much context you receive:

```
# Limited budget (for quick lookups)
context_query("auth", maxTokens=1000)

# Generous budget (for comprehensive research)
context_query("entire auth system", maxTokens=8000)

# Batch with shared budget
multi_query([
  { query: "auth", maxTokens: 2000 },
  { query: "database", maxTokens: 2000 }
], totalMaxTokens=4000)
```

## Best Practices

### 1. Use Hybrid Search for General Queries

```
# Good - uses hybrid by default
context_query("how does auth work?")

# Good - explicit hybrid
context_query("authentication flow", searchMode="hybrid")
```

### 2. Use Keyword Search for Code

```
# Good - finds exact function name
context_query("validateToken", searchMode="keyword")

# Good - finds specific patterns
search("async function.*Auth")
```

### 3. Decompose Complex Questions

```
# Instead of one complex query
context_query("How do I implement OAuth2 with refresh tokens and store them securely?")

# Break it down
decompose("How do I implement OAuth2 with refresh tokens and store them securely?")
# Then execute each sub-query
```

### 4. Budget Your Tokens

```
# Leave room for your response
# If context window is 8K, use max 4K for context
context_query("complex topic", maxTokens=4000)
```

### 5. Upload Important Docs First

```
# Before querying, make sure docs are indexed
upload_document("README.md", readFile("README.md"))
upload_document("ARCHITECTURE.md", readFile("docs/ARCHITECTURE.md"))

# Now queries will include this content
context_query("project architecture")
```

## Common Patterns

### Research Before Coding

```
# Understand existing patterns
result = context_query("existing API endpoint implementation")

# Then implement following the pattern
```

### Multi-Step Research

```
# Plan the research
plan = plan("implement user notifications")

# Execute each step
for step in plan.steps:
    result = context_query(step.query)
    # Use result...
```

### Find Examples

```
# Find usage examples
context_query("example of using AuthMiddleware", searchMode="hybrid")

# Find test patterns
context_query("test for API endpoint", searchMode="hybrid")
```

### Explore Structure

```
# List what's indexed
all_sections = sections(limit=100)

# Filter by area
auth_sections = sections(filter="auth")
api_sections = sections(filter="api")
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
    "snipara-context": {
      "apiKey": "rlm_...",
      "projectSlug": "your-project"
    }
  }
}
```

## Indexing Your Project

For best results, index your project documentation:

```bash
# Using the CLI
snipara-openclaw-install

# Or manually upload key files
upload_document("README.md", content)
upload_document("docs/architecture.md", content)
upload_document("src/types.ts", content)
```

## Get Your API Key

1. Visit https://snipara.com/dashboard
2. Create or select a project
3. Go to Settings → API Keys
4. Generate a new key

Free tier includes 100 queries/month. Upgrade for more at https://snipara.com/pricing
