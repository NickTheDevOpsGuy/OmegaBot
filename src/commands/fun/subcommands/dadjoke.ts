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

  return fetchSearch(q);
}

/**
 * Random joke
 * Docs: https://icanhazdadjoke.com/api
 */
async function fetchRandom(): Promise<string> {
  const res = await fetch("https://icanhazdadjoke.com/", {
    headers: {
      Accept: "application/json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`Dad Joke API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as DadJokeRandomResponse;

  if (!data?.joke || typeof data.joke !== "string") {
    throw new Error("Dad Joke API returned an unexpected response shape");
  }

  return data.joke.trim();
}

/**
 * Search jokes (we pick a random result from the first page)
 */
async function fetchSearch(query: string): Promise<string> {
  const url = `https://icanhazdadjoke.com/search?term=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`Dad Joke API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as DadJokeSearchResponse;

  const results = data?.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No results for that search");
  }

  const pick = results[Math.floor(Math.random() * results.length)];
  if (!pick?.joke || typeof pick.joke !== "string") {
    throw new Error("Dad Joke API returned an unexpected response shape");
  }

  return pick.joke.trim();
}
