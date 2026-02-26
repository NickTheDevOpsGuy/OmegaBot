#!/usr/bin/env node
/**
 * Verifies discord.js is in the 14.x range (compatible with OmegaBot).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "node_modules", "discord.js", "package.json");

try {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const v = pkg.version || "0.0.0";
  const major = parseInt(v.split(".")[0], 10);
  if (major !== 14) {
    console.error(`discord.js v${v} detected. OmegaBot expects discord.js v14.x.`);
    process.exit(1);
  }
  console.log(`discord.js v${v} OK`);
} catch (err) {
  console.error("Could not verify discord.js version:", err.message);
  process.exit(1);
}
