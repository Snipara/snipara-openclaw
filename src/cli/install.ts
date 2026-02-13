#!/usr/bin/env node
/**
 * Snipara OpenClaw Installer
 *
 * One-command setup for Snipara integration with OpenClaw.
 *
 * Usage:
 *   npx snipara-openclaw-install
 *   npx @snipara/openclaw install
 *
 * What it does:
 *   1. Detects OpenClaw installation
 *   2. Prompts for Snipara API key (or opens browser for signup)
 *   3. Updates OpenClaw configuration
 *   4. Installs skills
 *   5. Tests connection
 */

import { Command } from "commander";
import Conf from "conf";
import chalk from "chalk";
import open from "open";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SNIPARA_SIGNUP_URL = "https://snipara.com/signup?utm_source=openclaw-installer";
const SNIPARA_DASHBOARD_URL = "https://snipara.com/dashboard";
const SNIPARA_API_URL = "https://api.snipara.com";

interface OpenClawConfig {
  memory?: {
    provider?: string;
    config?: Record<string, unknown>;
  };
  skills?: Record<string, {
    enabled?: boolean;
    config?: Record<string, unknown>;
  }>;
  env?: Record<string, string>;
}

const config = new Conf<{
  apiKey?: string;
  projectSlug?: string;
}>({
  projectName: "snipara-openclaw",
});

/**
 * Prompt user for input.
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Find OpenClaw configuration directory.
 */
function findOpenClawDir(): string | null {
  const possiblePaths = [
    path.join(os.homedir(), ".openclaw"),
    path.join(os.homedir(), ".config", "openclaw"),
    path.join(process.cwd(), ".openclaw"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Read OpenClaw configuration.
 */
function readOpenClawConfig(configPath: string): OpenClawConfig {
  const configFile = path.join(configPath, "openclaw.json");

  if (fs.existsSync(configFile)) {
    const content = fs.readFileSync(configFile, "utf-8");
    return JSON.parse(content) as OpenClawConfig;
  }

  return {};
}

/**
 * Write OpenClaw configuration.
 */
function writeOpenClawConfig(configPath: string, openclawConfig: OpenClawConfig): void {
  const configFile = path.join(configPath, "openclaw.json");
  fs.writeFileSync(configFile, JSON.stringify(openclawConfig, null, 2));
}

/**
 * Test Snipara API connection.
 */
async function testConnection(apiKey: string, projectSlug: string): Promise<boolean> {
  try {
    const response = await fetch(`${SNIPARA_API_URL}/mcp/${projectSlug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { error?: unknown };
    return !data.error;
  } catch {
    return false;
  }
}

/**
 * Main install command.
 */
async function install(options: { dryRun?: boolean; force?: boolean }): Promise<void> {
  console.log(chalk.bold.cyan("\n🚀 Snipara OpenClaw Installer\n"));
  console.log(chalk.gray("Multi-agent swarms, context optimization, and persistent memory for OpenClaw.\n"));

  // Step 1: Find OpenClaw installation
  console.log(chalk.blue("1. Detecting OpenClaw installation..."));

  let openclawDir = findOpenClawDir();

  if (!openclawDir) {
    console.log(chalk.yellow("   OpenClaw not found. Creating config directory..."));
    openclawDir = path.join(os.homedir(), ".openclaw");

    if (!options.dryRun) {
      fs.mkdirSync(openclawDir, { recursive: true });
    }
    console.log(chalk.green(`   ✓ Created ${openclawDir}`));
  } else {
    console.log(chalk.green(`   ✓ Found OpenClaw at ${openclawDir}`));
  }

  // Step 2: Get API key
  console.log(chalk.blue("\n2. Configuring Snipara API key..."));

  let apiKey = config.get("apiKey") || process.env.SNIPARA_API_KEY;

  if (!apiKey || options.force) {
    console.log(chalk.gray("   You'll need a Snipara API key. Free tier: 100 queries/month.\n"));

    const hasKey = await prompt("   Do you have a Snipara API key? (y/n): ");

    if (hasKey.toLowerCase() === "y") {
      apiKey = await prompt("   Enter your API key: ");
    } else {
      console.log(chalk.gray("\n   Opening Snipara signup page in your browser..."));
      await open(SNIPARA_SIGNUP_URL);
      console.log(chalk.gray("   After signing up, get your API key from the dashboard.\n"));
      apiKey = await prompt("   Enter your API key: ");
    }
  } else {
    console.log(chalk.green(`   ✓ Using saved API key`));
  }

  if (!apiKey || !apiKey.startsWith("rlm_")) {
    console.log(chalk.red("   ✗ Invalid API key. Keys start with 'rlm_'."));
    console.log(chalk.gray(`   Get a key at: ${SNIPARA_DASHBOARD_URL}`));
    process.exit(1);
  }

  // Step 3: Get project slug
  console.log(chalk.blue("\n3. Configuring project..."));

  let projectSlug = config.get("projectSlug") || process.env.SNIPARA_PROJECT_SLUG;

  if (!projectSlug || options.force) {
    projectSlug = await prompt("   Enter your Snipara project slug: ");
  } else {
    console.log(chalk.green(`   ✓ Using saved project: ${projectSlug}`));
  }

  if (!projectSlug) {
    console.log(chalk.red("   ✗ Project slug required."));
    console.log(chalk.gray(`   Create a project at: ${SNIPARA_DASHBOARD_URL}`));
    process.exit(1);
  }

  // Step 4: Test connection
  console.log(chalk.blue("\n4. Testing connection..."));

  const connected = await testConnection(apiKey, projectSlug);

  if (!connected) {
    console.log(chalk.red("   ✗ Could not connect to Snipara API."));
    console.log(chalk.gray("   Check your API key and project slug."));
    process.exit(1);
  }

  console.log(chalk.green("   ✓ Connection successful!"));

  // Step 5: Update OpenClaw config
  console.log(chalk.blue("\n5. Updating OpenClaw configuration..."));

  if (options.dryRun) {
    console.log(chalk.yellow("   [DRY RUN] Would update configuration"));
  } else {
    const openclawConfig = readOpenClawConfig(openclawDir);

    // Configure memory plugin
    openclawConfig.memory = {
      provider: "@snipara/openclaw/memory-plugin",
      config: {
        apiKey,
        projectSlug,
      },
    };

    // Configure skills
    openclawConfig.skills = openclawConfig.skills || {};

    openclawConfig.skills["snipara-swarm"] = {
      enabled: true,
      config: { apiKey, projectSlug },
    };

    openclawConfig.skills["snipara-context"] = {
      enabled: true,
      config: { apiKey, projectSlug },
    };

    openclawConfig.skills["snipara-execution"] = {
      enabled: true,
      config: { apiKey, projectSlug },
    };

    // Set environment variables
    openclawConfig.env = openclawConfig.env || {};
    openclawConfig.env.SNIPARA_API_KEY = apiKey;
    openclawConfig.env.SNIPARA_PROJECT_SLUG = projectSlug;

    writeOpenClawConfig(openclawDir, openclawConfig);

    // Save to local config for future use
    config.set("apiKey", apiKey);
    config.set("projectSlug", projectSlug);

    console.log(chalk.green("   ✓ Configuration updated"));
  }

  // Step 6: Success!
  console.log(chalk.bold.green("\n✅ Installation complete!\n"));

  console.log(chalk.white("Installed features:"));
  console.log(chalk.gray("  • Multi-agent swarm coordination (resource claims, task queues)"));
  console.log(chalk.gray("  • Context optimization (semantic search, token budgeting)"));
  console.log(chalk.gray("  • Safe Python execution (RLM-Runtime sandbox)"));
  console.log(chalk.gray("  • Persistent semantic memory (replacing MEMORY.md)"));

  console.log(chalk.white("\nNext steps:"));
  console.log(chalk.gray("  1. Restart OpenClaw to load the new configuration"));
  console.log(chalk.gray("  2. Try: swarm_create('my-swarm') to create a swarm"));
  console.log(chalk.gray("  3. Try: context_query('how does X work?') for semantic search"));
  console.log(chalk.gray("  4. Try: remember('important fact', type='decision') for memory"));

  console.log(chalk.white("\nDocumentation:"));
  console.log(chalk.cyan("  https://snipara.com/docs/integration/openclaw\n"));
}

/**
 * Uninstall command.
 */
async function uninstall(): Promise<void> {
  console.log(chalk.bold.cyan("\n🗑️  Snipara OpenClaw Uninstaller\n"));

  const openclawDir = findOpenClawDir();

  if (!openclawDir) {
    console.log(chalk.yellow("OpenClaw configuration not found. Nothing to uninstall."));
    return;
  }

  const openclawConfig = readOpenClawConfig(openclawDir);

  // Remove Snipara configuration
  delete openclawConfig.memory;

  if (openclawConfig.skills) {
    delete openclawConfig.skills["snipara-swarm"];
    delete openclawConfig.skills["snipara-context"];
    delete openclawConfig.skills["snipara-execution"];
  }

  if (openclawConfig.env) {
    delete openclawConfig.env.SNIPARA_API_KEY;
    delete openclawConfig.env.SNIPARA_PROJECT_SLUG;
  }

  writeOpenClawConfig(openclawDir, openclawConfig);

  // Clear saved config
  config.clear();

  console.log(chalk.green("✓ Snipara configuration removed from OpenClaw."));
  console.log(chalk.gray("  Your Snipara account and data are still available at snipara.com\n"));
}

/**
 * Status command.
 */
async function status(): Promise<void> {
  console.log(chalk.bold.cyan("\n📊 Snipara OpenClaw Status\n"));

  const apiKey = config.get("apiKey") || process.env.SNIPARA_API_KEY;
  const projectSlug = config.get("projectSlug") || process.env.SNIPARA_PROJECT_SLUG;

  console.log(chalk.white("Configuration:"));
  console.log(chalk.gray(`  API Key: ${apiKey ? chalk.green("✓ Set") : chalk.red("✗ Not set")}`));
  console.log(chalk.gray(`  Project: ${projectSlug ? chalk.green(projectSlug) : chalk.red("Not set")}`));

  const openclawDir = findOpenClawDir();
  console.log(chalk.gray(`  OpenClaw: ${openclawDir ? chalk.green(openclawDir) : chalk.yellow("Not found")}`));

  if (apiKey && projectSlug) {
    console.log(chalk.white("\nConnection:"));
    const connected = await testConnection(apiKey, projectSlug);
    console.log(chalk.gray(`  API: ${connected ? chalk.green("✓ Connected") : chalk.red("✗ Failed")}`));
  }

  console.log("");
}

// CLI setup
const program = new Command();

program
  .name("snipara-openclaw-install")
  .description("Snipara integration installer for OpenClaw")
  .version("0.1.0");

program
  .command("install", { isDefault: true })
  .description("Install Snipara integration for OpenClaw")
  .option("--dry-run", "Preview changes without writing")
  .option("--force", "Force reconfiguration even if already set up")
  .action(install);

program
  .command("uninstall")
  .description("Remove Snipara integration from OpenClaw")
  .action(uninstall);

program
  .command("status")
  .description("Show current Snipara configuration status")
  .action(status);

program.parse();
