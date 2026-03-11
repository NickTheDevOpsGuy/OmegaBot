// src/services/statuspage/statuspageApi.ts
//
// Fetches status from Atlassian Statuspage v2 API (used by Vercel, Supabase, etc.)

const SUMMARY_URL = {
  vercel: "https://www.vercel-status.com/api/v2/summary.json",
  supabase: "https://status.supabase.com/api/v2/summary.json",
  chatgpt: "https://status.openai.com/api/v2/summary.json",
  claude: "https://status.anthropic.com/api/v2/summary.json",
  cursor: "https://status.cursor.com/api/v2/summary.json",
} as const;

export type StatusIndicator = "none" | "minor" | "major" | "critical" | "maintenance";

export type Component = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  group?: boolean;
};

export type Incident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink: string | null;
  created_at: string;
  incident_updates?: Array<{
    body: string;
    status: string;
    created_at: string;
  }>;
};

export type StatuspageSummary = {
  page: {
    id: string;
    name: string;
    url: string;
    updated_at: string;
  };
  status: {
    indicator: StatusIndicator;
    description: string;
  };
  components: Component[];
  incidents: Incident[];
  scheduled_maintenances: unknown[];
};

export type ServiceName = keyof typeof SUMMARY_URL;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Status check failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchStatuspageSummary(
  service: ServiceName,
): Promise<StatuspageSummary> {
  const url = SUMMARY_URL[service];
  return fetchJson<StatuspageSummary>(url);
}
