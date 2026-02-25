// src/services/dashboard/dashboard.ts
// Simple HTML dashboard for health, metrics, and backup trigger.

import type { Client } from "discord.js";
import { getDb } from "../database/db.js";

export type DashboardContext = {
  dbOk: boolean;
  discordConnected: boolean;
  uptimeSeconds: number;
  metricsPort: number;
};

export function getDashboardContext(client: Client | null): DashboardContext {
  let dbOk = false;
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const start =
    (globalThis as { __omegabotStartTime?: number }).__omegabotStartTime ?? Date.now();
  const uptimeSeconds = Math.floor((Date.now() - start) / 1000);

  return {
    dbOk,
    discordConnected: client?.isReady() ?? false,
    uptimeSeconds,
    metricsPort: parseInt(process.env.METRICS_PORT ?? "0", 10),
  };
}

export function renderDashboardHtml(ctx: DashboardContext): string {
  const status = ctx.dbOk && ctx.discordConnected ? "ok" : "degraded";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmegaBot Admin</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 800px; background: #0f172a; color: #e2e8f0; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    .card { background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
    .status.ok { background: #22c55e; }
    .status.degraded { background: #ef4444; }
    .row { display: flex; justify-content: space-between; margin: 0.5rem 0; }
    a { color: #60a5fa; }
    pre { background: #0f172a; padding: 0.5rem; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🤖 OmegaBot Admin Dashboard</h1>
  <div class="card">
    <h2 style="margin-top:0">Health</h2>
    <div class="row"><span><span class="status ${status}"></span> Overall</span><strong>${status.toUpperCase()}</strong></div>
    <div class="row"><span>Database</span><span>${ctx.dbOk ? "✅ OK" : "❌ Error"}</span></div>
    <div class="row"><span>Discord</span><span>${ctx.discordConnected ? "✅ Connected" : "❌ Disconnected"}</span></div>
    <div class="row"><span>Uptime</span><span>${formatUptime(ctx.uptimeSeconds)}</span></div>
  </div>
  <div class="card">
    <h2 style="margin-top:0">Endpoints</h2>
    <div class="row"><a href="/health">/health</a><span>JSON health check</span></div>
    <div class="row"><a href="/metrics">/metrics</a><span>Prometheus scrape</span></div>
  </div>
</body>
</html>`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
