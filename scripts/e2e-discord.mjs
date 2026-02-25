#!/usr/bin/env node
/**
 * E2E test: starts the bot, waits for Discord "ready", then shuts down.
 * Requires DISCORD_TOKEN and DISCORD_APP_ID. Uses in-memory DB.
 *
 * Usage:
 *   npm run test:e2e   (loads from .env)
 *   DISCORD_TOKEN=... DISCORD_APP_ID=... npm run test:e2e
 */

import "dotenv/config";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const botPath = join(projectRoot, "dist", "bot.js");

if (!existsSync(botPath)) {
  console.error("Run 'npm run build' first.");
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;

if (!token || !appId) {
  console.error("DISCORD_TOKEN and DISCORD_APP_ID are required for e2e.");
  console.error("Set them in .env or pass as env vars.");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_PATH: ":memory:",
  LOG_LEVEL: "info",
  METRICS_PORT: "0",
  DISCORD_TOKEN: token,
  DISCORD_APP_ID: appId,
};

const READY_MARKER = "OmegaBot is online";
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS ?? 90_000);

const child = spawn("node", [botPath], {
  cwd: projectRoot,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

let resolved = false;
let exitCode = 1;

let lastLines = [];
const MAX_LINES = 50;
function remember(line){
  lastLines.push(line);
  if(lastLines.length>MAX_LINES) lastLines.shift();
}


function done(success, message) {
  if (resolved) return;
  resolved = true;
  exitCode = success ? 0 : 1;
  child.kill("SIGTERM");
  if (success) {
    console.log("E2E passed:", message);
  } else {
    console.error("E2E failed:", message);
  }
}

child.on("close", (code) => {
  if (resolved) {
    process.exit(exitCode);
  } else {
    clearTimeout(timeout);
    resolved = true;
    console.error(
      "E2E failed: bot exited before ready",
      code != null ? `(code ${code})` : "",
    );
    process.exit(1);
  }
});

const timeout = setTimeout(() => {
  done(false, `timeout after ${TIMEOUT_MS / 1000}s waiting for ready. Last output:\n${lastLines.join("\n")}`);
}, TIMEOUT_MS);

const onLine = (line) => {
  remember(line);
  if (line.includes(READY_MARKER)) {
    clearTimeout(timeout);
    done(true, "bot reached ready state");
  }
};

const rlOut = createInterface({ input: child.stdout, crlfDelay: Infinity });
const rlErr = createInterface({ input: child.stderr, crlfDelay: Infinity });

rlOut.on("line", onLine);
rlErr.on("line", (line) => {
  onLine(line);
  // Log stderr for debugging (pino logs to stderr)
  if (!line.includes(READY_MARKER)) {
    console.error("[bot]", line);
  }
});

child.on("error", (err) => {
  clearTimeout(timeout);
  done(false, `spawn error: ${err.message}`);
});

child.on("exit", (code, signal) => {
  if (!resolved) {
    clearTimeout(timeout);
    resolved = true;
    if (code === 0) {
      done(true, "bot exited cleanly");
    } else {
      done(false, `bot exited with code ${code ?? signal}`);
    }
  }
});
