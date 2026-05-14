# Grafana Dashboard

OmegaBot exposes Prometheus metrics when `METRICS_PORT` is set. Import the pre-built dashboard to visualize them.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Import the Dashboard](#import-the-dashboard)
- [Panels](#panels)
- [Datasource](#datasource)

---

## Prerequisites

1. **Prometheus** – Scraping `http://<bot-host>:<METRICS_PORT>/metrics`
2. **Grafana** – Connected to that Prometheus datasource

---

## Build the Dashboard

OmegaBot does not keep dashboard JSON exports in the repo. Create a dashboard in
Grafana and add panels using the metrics below, then store any local dashboard
exports outside the repository.

---

## Panels

| Panel                         | Description                            |
| ----------------------------- | -------------------------------------- |
| Uptime (seconds)              | Bot process uptime                     |
| Commands (rate)               | Per-command execution rate (5m window) |
| Interaction recoveries (rate) | Collector/button error recovery rate   |

---

## Datasource

The dashboard uses a templated datasource variable. During import, select your Prometheus instance. If you haven't configured Prometheus yet, add it under **Connections** → **Data sources** → **Add data source** → **Prometheus**, then set the URL to your Prometheus server (e.g. `http://localhost:9090`).
