// src/commands/fun/subcommands/chucknorris.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

type ChuckNorrisApiResponse = {
  value: string;
};

type ChuckNorrisSearchResponse = {
  total?: number;
  result?: ChuckNorrisApiResponse[];
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
    const userMessage = toUserMessage(err);

    logger.error({ err, mode, userMessage }, "[fun/chucknorris] failed");
    await interaction.editReply(userMessage);
  }
}

class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

function toUserMessage(err: unknown): string {
  if (err instanceof UserFacingError) return err.message;

  // Keep the fun fallback, but also provide a tiny bit of “why” for non-user errors.
  if (err instanceof Error) {
    // Avoid leaking raw internals; give a short category of failure.
    if (err.message.toLowerCase().includes("network")) {
      return "I couldn’t reach the Chuck Norris API (network issue). Try again in a bit.";
    }
    if (err.message.toLowerCase().includes("api error")) {
      return "The Chuck Norris API returned an error. Try again later.";
    }
  }

  return "Chuck Norris is currently roundhouse kicking the API. Try again later.";
}

async function fetchChuckNorris(mode: ChuckNorrisMode): Promise<string> {
  if (mode.kind === "random")
    return fetchSingle("https://api.chucknorris.io/jokes/random");

  if (mode.kind === "category") {
    const category = mode.category.trim();
    if (!category) {
      throw new UserFacingError("Please provide a category.");
    }

    const url = `https://api.chucknorris.io/jokes/random?category=${encodeURIComponent(
      category,
    )}`;

    // fetchSingle throws on non-OK; we intercept 404 here to explain “why”.
    try {
      return await fetchSingle(url);
    } catch (err) {
      if (isHttpError(err, 404)) {
        const categories = await safeFetchCategories();
        const hint = categories?.length
          ? `Valid categories include: ${categories
              .slice(0, 12)
              .map((c) => `\`${c}\``)
              .join(", ")}`
          : "Try something like `dev`, `movie`, or `science`.";

        throw new UserFacingError(
          `That category was not found: \`${category}\`. ${hint}`,
        );
      }
      throw err;
    }
  }

  // mode.kind === "search"
  const query = mode.query.trim();
  if (!query) {
    throw new UserFacingError("Please provide a search query.");
  }

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
    // For search, a 400 usually means bad query; treat as user-facing
    if (res.status === 400) {
      throw new UserFacingError(
        "That search query didn’t work. Try a simpler word or phrase.",
      );
    }
    throw new Error(`Chuck Norris API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ChuckNorrisSearchResponse;
  const results = Array.isArray(data.result) ? data.result : [];

  if (!results.length) {
    throw new UserFacingError(`No results for \`${query}\`. Try something broader.`);
  }

  // Pick a random result so it feels fresh
  const pick = results[Math.floor(Math.random() * results.length)];
  const joke = pick?.value;

  if (!joke || typeof joke !== "string") {
    throw new Error("Chuck Norris API returned an unexpected response shape");
  }

  return joke.trim();
}

async function fetchSingle(url: string): Promise<string> {
  let res: Response;

  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "OmegaBot",
      },
    });
  } catch (err) {
    throw new Error(
      `Network error calling Chuck Norris API: ${(err as Error)?.message ?? String(err)}`,
    );
  }

  if (!res.ok) {
    throw new HttpError(
      `Chuck Norris API error: ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as ChuckNorrisApiResponse;

  if (!data?.value || typeof data.value !== "string") {
    throw new Error("Chuck Norris API returned an unexpected response shape");
  }

  return data.value.trim();
}

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function isHttpError(err: unknown, status: number): boolean {
  return err instanceof HttpError && err.status === status;
}

async function safeFetchCategories(): Promise<string[] | null> {
  try {
    const res = await fetch("https://api.chucknorris.io/jokes/categories", {
      headers: {
        Accept: "application/json",
        "User-Agent": "OmegaBot",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as unknown;

    if (!Array.isArray(data) || !data.every((x) => typeof x === "string")) {
      return null;
    }

    return data as string[];
  } catch {
    return null;
  }
}