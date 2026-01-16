// src/commands/fun/subcommands/dadjoke.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

type DadJokeRandomResponse = {
  id: string;
  joke: string;
  status: number;
};

type DadJokeSearchResponse = {
  current_page: number;
  limit: number;
  next_page: number;
  previous_page: number;
  results: Array<{
    id: string;
    joke: string;
  }>;
  search_term: string;
  status: number;
  total_jokes: number;
  total_pages: number;
};

export type DadJokeMode = { kind: "random" } | { kind: "search"; query: string };

type DadJokeErrorCode = "NO_RESULTS" | "RATE_LIMIT" | "UPSTREAM" | "TIMEOUT" | "BAD_SHAPE";

class DadJokeError extends Error {
  public code: DadJokeErrorCode;

  constructor(code: DadJokeErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const USER_AGENT = "OmegaBot";
const API_ROOT = "https://icanhazdadjoke.com";
const FETCH_TIMEOUT_MS = 7_000;

/**
 * Run handler for /fun dadjoke
 *
 * IMPORTANT:
 * - This file is NOT a slash command by itself
 * - It must NOT call reply() or deferReply()
 * - The parent command (fun.ts) owns the interaction lifecycle
 */
export async function run(
  interaction: ChatInputCommandInteraction,
  mode: DadJokeMode,
): Promise<void> {
  try {
    const joke = await fetchDadJoke(mode);

    await interaction.editReply(joke);

    logger.debug({ userId: interaction.user.id, mode: mode.kind }, "[fun/dadjoke] sent");
  } catch (err) {
    logger.error({ err, mode }, "[fun/dadjoke] failed");

    // Friendly, specific messages for expected cases
    if (err instanceof DadJokeError) {
      if (err.code === "NO_RESULTS") {
        await interaction.editReply(
          "No jokes found for that search. Try a different word, or run `/fun dadjoke` with no query.",
        );
        return;
      }

      if (err.code === "RATE_LIMIT") {
        await interaction.editReply("Too many requests right now. Try again in a minute.");
        return;
      }

      if (err.code === "TIMEOUT") {
        await interaction.editReply("Dad Joke API took too long to respond. Try again.");
        return;
      }

      // UPSTREAM / BAD_SHAPE
      await interaction.editReply("Dad Joke API is having issues. Try again later.");
      return;
    }

    // Unknown error type
    await interaction.editReply("Dad Joke API is being dramatic. Try again later.");
  }
}

async function fetchDadJoke(mode: DadJokeMode): Promise<string> {
  if (mode.kind === "random") {
    return fetchRandom();
  }

  const q = mode.query.trim();
  if (!q) {
    return fetchRandom();
  }

  // Optional guard: avoids silly calls and often improves UX
  if (q.length < 2) {
    return fetchRandom();
  }

  return fetchSearch(q);
}

function baseHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { headers: baseHeaders(), signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new DadJokeError("TIMEOUT", `Dad Joke API timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

function mapHttpError(res: Response): never {
  if (res.status === 429) {
    throw new DadJokeError("RATE_LIMIT", "Dad Joke API rate limited (429)");
  }

  // Treat any non-OK as upstream trouble for the user, but keep details in logs via error message.
  throw new DadJokeError("UPSTREAM", `Dad Joke API error: ${res.status} ${res.statusText}`);
}

/**
 * Random joke
 * Docs: https://icanhazdadjoke.com/api
 */
async function fetchRandom(): Promise<string> {
  const res = await fetchWithTimeout(`${API_ROOT}/`);

  if (!res.ok) {
    mapHttpError(res);
  }

  let data: DadJokeRandomResponse;
  try {
    data = (await res.json()) as DadJokeRandomResponse;
  } catch {
    throw new DadJokeError("BAD_SHAPE", "Dad Joke API returned invalid JSON");
  }

  if (!data?.joke || typeof data.joke !== "string") {
    throw new DadJokeError("BAD_SHAPE", "Dad Joke API returned an unexpected response shape");
  }

  return data.joke.trim();
}

/**
 * Search jokes (we pick a random result from the first page)
 */
async function fetchSearch(query: string): Promise<string> {
  const url = `${API_ROOT}/search?term=${encodeURIComponent(query)}`;

  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    mapHttpError(res);
  }

  let data: DadJokeSearchResponse;
  try {
    data = (await res.json()) as DadJokeSearchResponse;
  } catch {
    throw new DadJokeError("BAD_SHAPE", "Dad Joke API returned invalid JSON");
  }

  const results = data?.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new DadJokeError("NO_RESULTS", `No results for "${query}"`);
  }

  const pick = results[Math.floor(Math.random() * results.length)];
  if (!pick?.joke || typeof pick.joke !== "string") {
    throw new DadJokeError("BAD_SHAPE", "Dad Joke API returned an unexpected response shape");
  }

  return pick.joke.trim();
}