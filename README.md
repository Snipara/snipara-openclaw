# snipara-openclaw

[![npm version](https://img.shields.io/npm/v/snipara-openclaw.svg)](https://www.npmjs.com/package/snipara-openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**TypeScript adapters for Snipara context, memory and coordination in OpenClaw.**

This repository contains the `snipara-openclaw` library, skill adapters and its
bundled installer. Its source version is **0.1.1** and requires Node.js 18+.
The current onboarding wrapper and native hook package are separate packages;
their versions and configuration are not defined by this repository.

## Set up OpenClaw

For current Snipara onboarding, use the dedicated wrapper:

```bash
npx snipara-openclaw-install@latest --dry-run
npx snipara-openclaw-install@latest
```

It configures Hosted MCP and OpenClaw environment values directly, and
installs `snipara-openclaw-hooks`. Follow its
hook-enable and restart instructions. An installation or connection check does
not prove the running OpenClaw process has loaded the new hooks.

```bash
npx snipara-openclaw-hooks@latest status
openclaw hooks list --verbose
```

Supply `SNIPARA_API_KEY` through the shell/launch environment or the installer's
secret prompt and select `SNIPARA_PROJECT_SLUG` for the intended project. Do
not put credentials in source files, chat or committed configuration.
See the [OpenClaw integration guide](https://www.snipara.com/docs/integration/openclaw)
and the [installer package](https://www.npmjs.com/package/snipara-openclaw-install).

## Use the library

```bash
npm install snipara-openclaw
```

```typescript
import { SniparaClient } from "snipara-openclaw";

const apiKey = process.env.SNIPARA_API_KEY;
const projectSlug = process.env.SNIPARA_PROJECT_SLUG;
if (!apiKey || !projectSlug) {
  throw new Error("Configure SNIPARA_API_KEY and SNIPARA_PROJECT_SLUG first");
}

const snipara = new SniparaClient({ apiKey, projectSlug });
const context = await snipara.contextQuery("How does authentication work?", {
  maxTokens: 4000,
  searchMode: "hybrid",
});
const memories = await snipara.recall("authentication decisions", { limit: 5 });
```

The client calls Hosted APIs. Available operations depend on the selected
project, server version and access. These examples describe the checked-in
TypeScript API; they do not establish current end-to-end compatibility for
every server operation. Consult the server's advertised tools before relying
on an optional capability.

## Package surfaces

| Import | Purpose | Source |
| --- | --- | --- |
| `snipara-openclaw` | `SniparaClient` and public types | [Client](src/client.ts) |
| `snipara-openclaw/context-skill` | Retrieval, search and document helpers | [Context skill](src/context-skill/index.ts) |
| `snipara-openclaw/swarm-skill` | Resource claims, shared state, tasks and memory | [Swarm skill](src/swarm-skill/index.ts) |
| `snipara-openclaw/memory-plugin` | OpenClaw memory adapter | [Memory plugin](src/memory-plugin.ts) |
| `snipara-openclaw/execution-skill` | Python and agent execution API adapters | [Execution skill](src/execution-skill/index.ts) |

Skill functions receive an OpenClaw context. For a direct call, provide one
explicitly or supply the environment variables above:

```typescript
import { context_query } from "snipara-openclaw/context-skill";

const ctx = { config: {} }; // Reads the configured environment.
const result = await context_query(ctx, {
  query: "Which decisions constrain this change?",
  maxTokens: 2000,
});
```

## Memory and coordination

The memory adapter can be configured programmatically:

```typescript
import { createMemoryPlugin } from "snipara-openclaw/memory-plugin";

const apiKey = process.env.SNIPARA_API_KEY;
const projectSlug = process.env.SNIPARA_PROJECT_SLUG;
if (!apiKey || !projectSlug) throw new Error("Missing project credentials");

const memory = createMemoryPlugin({ apiKey, projectSlug });
const matches = await memory.search("project conventions", { limit: 5 });
```

Store reusable decisions and their evidence deliberately. Resource claims and
task dependencies coordinate participating agents; they do not prevent an
uncoordinated process from editing the same file. Claim release and failed
task handling remain part of the caller's workflow.

## Execution boundaries

The execution skill is a remote API adapter. It does not install or qualify a
local sandbox, and its presence does not prove the server supports the
requested execution tool. Isolation, allowed imports, timeouts and provider
requirements depend on the actual backend.

For deterministic repository tests, use
[Snipara Sandbox](https://github.com/Snipara/snipara-sandbox) with a reviewed
validation request, immutable sources and a prepared dependency image.
Do not treat a restricted Python snippet as a way to launch arbitrary shell
tests. Starting an autonomous agent is a separate explicit operation.

## Bundled installer compatibility

This library exports a historical `snipara-openclaw-install` executable from
`dist/cli/install.js`. To inspect that exact executable without confusing it
with the separate onboarding package:

```bash
npm exec --package=snipara-openclaw@0.1.1 -- snipara-openclaw-install --help
```

For new onboarding, use the dedicated package shown above. Do not copy the
historical `memory.provider`/`skills` configuration as the current native hook
setup. Read [package.json](package.json) for the actual exports and scripts.

## Development and support

The repository provides `build`, `type-check`, `lint` and `test:run` scripts.
Use the project's approved validation environment for executable checks.
Live integration checks require separately configured project access.

Get project credentials from the [Snipara dashboard](https://www.snipara.com/dashboard).
Use [current pricing](https://www.snipara.com/pricing) for service limits rather
than historical quotas copied into this README.

MIT licensed; see [LICENSE](LICENSE).
