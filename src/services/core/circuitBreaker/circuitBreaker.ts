// src/services/circuitBreaker/circuitBreaker.ts
// Circuit breaker pattern: fail fast when an external API is repeatedly failing.

import { logger } from "../../../utils/logger.js";

type State = "closed" | "open" | "half-open";

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_MS = 30_000;

export class CircuitOpenError extends Error {
  constructor(public readonly name: string) {
    super(`Circuit "${name}" is open — API temporarily unavailable`);
    this.name = "CircuitOpenError";
  }
}

export function createCircuitBreaker(options: {
  name: string;
  failureThreshold?: number;
  resetMs?: number;
}) {
  const name = options.name;
  const threshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const resetMs = options.resetMs ?? DEFAULT_RESET_MS;

  let state: State = "closed";
  let failures = 0;
  let _lastFailureTime = 0;
  let nextAttemptTime = 0;

  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (state === "open") {
      if (now < nextAttemptTime) {
        throw new CircuitOpenError(name);
      }
      state = "half-open";
    }

    try {
      const result = await fn();
      if (state === "half-open") {
        state = "closed";
        failures = 0;
        logger.info({ circuit: name }, "[circuitBreaker] closed after successful call");
      }
      return result;
    } catch (err) {
      failures++;
      _lastFailureTime = now;

      if (state === "half-open" || failures >= threshold) {
        state = "open";
        nextAttemptTime = now + resetMs;
        logger.warn(
          { circuit: name, failures, nextAttemptMs: resetMs, lastError: err },
          "[circuitBreaker] opened",
        );
        throw new CircuitOpenError(name);
      }
      // Failures below threshold: rethrow original error
      throw err;
    }
  }

  return { execute };
}
