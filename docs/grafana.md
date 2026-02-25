# Grafana Dashboard

OmegaBot exposes Prometheus metrics when `METRICS_PORT` is set. Import the pre-built dashboard to visualize them.

---

## Prerequisites

1. **Prometheus** – Scraping `http://<bot-host>:<METRICS_PORT>/metrics`
2. **Grafana** – Connected to that Prometheus datasource

---

## Import the Dashboard

1. In Grafana, go to **Dashboards** → **Import**.
2. Click **Upload JSON file**.
3. Select `grafana/omegabot-dashboard.json` from this repo.
4. Pick your Prometheus datasource.
5. Click **Import**.

---

## Panels

| Panel | Description |
|-------|-------------|
| Uptime (seconds) | Bot process uptime |
| Commands (rate) | Per-command execution rate (5m window) |
| Interaction recoveries (rate) | Collector/button error recovery rate |

---

## Datasource

The dashboard uses a templated datasource variable. During import, select your Prometheus instance. If you haven't configured Prometheus yet, add it under **Connections** → **Data sources** → **Add data source** → **Prometheus**, then set the URL to your Prometheus server (e.g. `http://localhost:9090`).
