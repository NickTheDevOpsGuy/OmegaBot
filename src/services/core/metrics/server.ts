// src/services/metrics/server.ts
// HTTP server for /health, /metrics (Prometheus), and /dashboard.

import http from "node:http";
import type { Client } from "discord.js";
import { Registry, collectDefaultMetrics, Counter, Gauge } from "prom-client";
import { getDb } from "../database/db.js";
import { logger } from "../../../utils/logger.js";
import { getDashboardContext, renderDashboardHtml } from "../dashboard/dashboard.js";

const METRICS_PORT = parseInt(process.env.METRICS_PORT ?? "0", 10);

export const metricsRegistry = new Registry();

// Default Node.js metrics (event loop, heap, etc.)
collectDefaultMetrics({ register: metricsRegistry, prefix: "omegabot_" });

export const interactionFailedRecoveryTotal = new Counter({
  name: "omegabot_interaction_failed_recovery_total",
  help: "Number of times we recovered from collector/button errors to prevent 'interaction failed'",
  labelNames: ["handler"] as const,
  registers: [metricsRegistry],
});

export const commandsExecutedTotal = new Counter({
  name: "omegabot_commands_executed_total",
  help: "Total slash commands executed",
  labelNames: ["command"] as const,
  registers: [metricsRegistry],
});

export const rateLimitHitsTotal = new Counter({
  name: "omegabot_rate_limit_hits_total",
  help: "Number of times a user hit a command cooldown (rate limited)",
  labelNames: ["handler"] as const,
  registers: [metricsRegistry],
});

/** Call when a user is blocked by rate limit (before showing cooldown message). */
export function recordRateLimitHit(handler: string): void {
  rateLimitHitsTotal.inc({ handler });
}

export const uptimeGauge = new Gauge({
  name: "omegabot_uptime_seconds",
  help: "Bot process uptime in seconds",
  registers: [metricsRegistry],
});

/** Call when recovering from a collector/button error to prevent "interaction failed". */
export function recordInteractionRecovery(handler: string): void {
  interactionFailedRecoveryTotal.inc({ handler });
}

const startTime =
  (globalThis as { __omegabotStartTime?: number }).__omegabotStartTime ?? Date.now();

function checkDatabase(): boolean {
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}

let discordClient: Client | null = null;

export function setDiscordClient(client: Client | null): void {
  discordClient = client;
}

function handleHealth(res: http.ServerResponse): void {
  const dbOk = checkDatabase();
  const discordOk = discordClient?.isReady() ?? false;
  const ok = dbOk && discordOk;
  const status = ok ? 200 : 503;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: ok ? "ok" : "degraded",
      database: dbOk ? "ok" : "error",
      discord: discordOk ? "connected" : "disconnected",
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    }),
  );
}

function handleMetrics(res: http.ServerResponse): void {
  uptimeGauge.set(Math.floor((Date.now() - startTime) / 1000));

  metricsRegistry
    .metrics()
    .then((output: string) => {
      res.writeHead(200, { "Content-Type": metricsRegistry.contentType });
      res.end(output);
    })
    .catch((err: unknown) => {
      logger.warn({ err }, "[metrics] failed to collect");
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Failed to collect metrics");
    });
}

function requireDashboardAuth(req: http.IncomingMessage): boolean {
  const token = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
  if (!token) return true; // No token configured: allow access (local/dev)

  const q = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?") + 1) : "";
  const params = new URLSearchParams(q);
  return params.get("token") === token;
}

function handleDashboard(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (!requireDashboardAuth(req)) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Unauthorized. Set ?token=<ADMIN_DASHBOARD_TOKEN> to access.");
    return;
  }

  const ctx = getDashboardContext(discordClient);
  const html = renderDashboardHtml(ctx);
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = req.url?.split("?")[0] ?? "/";

  if (url === "/health" || url === "/healthz") {
    handleHealth(res);
    return;
  }
  if (url === "/metrics") {
    handleMetrics(res);
    return;
  }
  if (url === "/dashboard" || url === "/") {
    handleDashboard(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

let server: http.Server | null = null;

export function startMetricsServer(client?: Client): void {
  if (METRICS_PORT <= 0) return;
  discordClient = client ?? null;

  server = http.createServer(handleRequest);
  server.listen(METRICS_PORT, () => {
    logger.info({ port: METRICS_PORT }, "[metrics] HTTP server listening");
  });
}

export function stopMetricsServer(): void {
  if (server) {
    server.close();
    server = null;
  }
  setDiscordClient(null);
}
