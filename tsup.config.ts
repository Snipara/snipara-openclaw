import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "memory-plugin": "src/memory-plugin.ts",
    "swarm-skill/index": "src/swarm-skill/index.ts",
    "context-skill/index": "src/context-skill/index.ts",
    "execution-skill/index": "src/execution-skill/index.ts",
    "cli/install": "src/cli/install.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  esbuildOptions(options, context) {
    // Add shebang to CLI entry for CJS format
    if (context.format === "cjs") {
      options.banner = {
        js: '// @ts-check',
      };
    }
  },
  onSuccess: async () => {
    // Add shebang to CLI entry
    const fs = await import("fs");
    const cliPath = "./dist/cli/install.js";
    if (fs.existsSync(cliPath)) {
      const content = fs.readFileSync(cliPath, "utf-8");
      if (!content.startsWith("#!/usr/bin/env node")) {
        fs.writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
      }
    }
  },
});
