// src/commands/fun/fun.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

/**
 * Supported execution modes for Chuck Norris jokes.
 *
 * The parent command (fun.ts) decides which mode to use
 * based on slash command options.
 */
export type ChuckNorrisMode =
  | { kind: "random" }
  | { kind: "category"; category: string }
  | { kind: "search"; query: string };

type ChuckNorrisApiResponse = {
  value: string;
};

/**
 * Run handler for /fun chucknorris
 *
 * IMPORTANT:
 * - This file is NOT a slash command by itself
 * - It must NOT call reply() or deferReply()
 * - The parent command (fun.ts) owns the interaction lifecycle
 */
export async function run(
  interaction: ChatInputCommandInteraction,
  mode: ChuckNorrisMode,
): Promise<void> {
  try {
    let joke: string;

    switch (mode.kind) {
      case "category":
        joke = await fetchCategoryJoke(mode.category);
        break;

      case "search":
        joke = await fetchSearchJoke(mode.query);
        break;

      case "random":
      default:
        joke = await fetchRandomJoke();
        break;
    }

    await interaction.editReply(joke);

    logger.debug(
      {
        userId: interaction.user.id,
        mode: mode.kind,
      },
      "[fun/chucknorris] joke sent",
    );
  } catch (err) {
    logger.error({ err, mode }, "[fun/chucknorris] fetch failed");

    await interaction.editReply(
      "Chuck Norris is currently roundhouse kicking the API. Try again later.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                               API FETCHERS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch a random Chuck Norris joke.
 */
async function fetchRandomJoke(): Promise<string> {
  return fetchJoke("https://api.chucknorris.io/jokes/random");
}

/**
 * Fetch a random Chuck Norris joke from a specific category.
 */
async function fetchCategoryJoke(category: string): Promise<string> {
  const url = `https://api.chucknorris.io/jokes/random?category=${encodeURIComponent(
    category,
  )}`;

  return fetchJoke(url);
}

/**
 * Fetch a Chuck Norris joke matching a search query.
 *
 * NOTE:
 * The API returns an array for search results.
 * We pick the first result for simplicity.
 */
async function fetchSearchJoke(query: string): Promise<string> {
  const url = `https://api.chucknorris.io/jokes/search?query=${encodeURIComponent(
    query,
  )}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`Chuck Norris API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { result?: ChuckNorrisApiResponse[] };

  if (!data.result || data.result.length === 0) {
    throw new Error("No Chuck Norris jokes found for that search");
  }

  return data.result[0].value.trim();
}

/**
 * Shared helper for endpoints that return a single joke object.
 */
async function fetchJoke(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`Chuck Norris API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ChuckNorrisApiResponse;

  if (!data?.value || typeof data.value !== "string") {
    throw new Error("Chuck Norris API returned an unexpected response shape");
  }

  return data.value.trim();
}
