// src/commands/fun/subcommands/chucknorris.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

type ChuckNorrisApiResponse = {
  value: string;
};

export type ChuckNorrisMode =
  | { kind: "random" }
  | { kind: "category"; category: string }
  | { kind: "search"; query: string };

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
    const joke = await fetchChuckNorris(mode);

    await interaction.editReply(joke);

    logger.debug(
      { userId: interaction.user.id, mode: mode.kind },
      "[fun/chucknorris] sent",
    );
  } catch (err) {
    logger.error({ err, mode }, "[fun/chucknorris] failed");
    await interaction.editReply(
      "Chuck Norris is currently roundhouse kicking the API. Try again later.",
    );
  }
}

async function fetchChuckNorris(mode: ChuckNorrisMode): Promise<string> {
  if (mode.kind === "random")
    return fetchSingle("https://api.chucknorris.io/jokes/random");

  if (mode.kind === "category") {
    const url = `https://api.chucknorris.io/jokes/random?category=${encodeURIComponent(
      mode.category,
    )}`;
    return fetchSingle(url);
  }

  // mode.kind === "search"
  const url = `https://api.chucknorris.io/jokes/search?query=${encodeURIComponent(
    mode.query,
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
  const first = data.result?.[0]?.value;

  if (!first || typeof first !== "string") {
    throw new Error("No results for that search");
  }

  return first.trim();
}

async function fetchSingle(url: string): Promise<string> {
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
