// src/services/circuitBreaker/breakers.ts
// Shared circuit breaker instances for external APIs.

import { createCircuitBreaker } from "./circuitBreaker.js";

export const githubCircuit = createCircuitBreaker({
  name: "github",
  failureThreshold: 5,
  resetMs: 30_000,
});

export const weatherCircuit = createCircuitBreaker({
  name: "weather",
  failureThreshold: 5,
  resetMs: 30_000,
});

export const openaiCircuit = createCircuitBreaker({
  name: "openai",
  failureThreshold: 5,
  resetMs: 30_000,
});
