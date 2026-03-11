// src/commands/fun/subcommands/quote.ts
// Guild quotes: add, random, list, search, remove. Uses quoteStore for persistence.
import { type ChatInputCommandInteraction, type User, EmbedBuilder } from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import { t, resolveLocale } from "../../../../../../i18n/index.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import {
  addQuote,
  ensureQuoteTable,
} from "../../../../../../services/stores/quotes/quoteStore.js";

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

type QuoteRow = {
  id: number;
  guild_id: string;
  author_id: string;
  quote_text: string;
  added_by: string;
  added_at: number;
  context: string | null;
};

type CountResult = { count: number };

function getRandomQuote(guildId: string, authorId?: string): QuoteRow | null {
  ensureQuoteTable();
  const db = getDb();

  if (authorId) {
    return db
      .prepare(
        `SELECT * FROM quotes WHERE guild_id = ? AND author_id = ? ORDER BY RANDOM() LIMIT 1`,
      )
      .get(guildId, authorId) as QuoteRow | null;
  }

  return db
    .prepare(`SELECT * FROM quotes WHERE guild_id = ? ORDER BY RANDOM() LIMIT 1`)
    .get(guildId) as QuoteRow | null;
}

function getQuoteById(guildId: string, id: number): QuoteRow | null {
  ensureQuoteTable();
  const db = getDb();

  return db
    .prepare(`SELECT * FROM quotes WHERE guild_id = ? AND id = ?`)
    .get(guildId, id) as QuoteRow | null;
}

function removeQuote(guildId: string, id: number): boolean {
  ensureQuoteTable();
  const db = getDb();

  const result = db
    .prepare(`DELETE FROM quotes WHERE guild_id = ? AND id = ?`)
    .run(guildId, id);

  return result.changes > 0;
}

function listQuotes(guildId: string, authorId?: string, limit = 10): QuoteRow[] {
  ensureQuoteTable();
  const db = getDb();

  if (authorId) {
    return db
      .prepare(
        `SELECT * FROM quotes WHERE guild_id = ? AND author_id = ? ORDER BY added_at DESC LIMIT ?`,
      )
      .all(guildId, authorId, limit) as QuoteRow[];
  }

  return db
    .prepare(`SELECT * FROM quotes WHERE guild_id = ? ORDER BY added_at DESC LIMIT ?`)
    .all(guildId, limit) as QuoteRow[];
}

function countQuotes(guildId: string, authorId?: string): number {
  ensureQuoteTable();
  const db = getDb();

  if (authorId) {
    const row = db
      .prepare(
        `SELECT COUNT(*) as count FROM quotes WHERE guild_id = ? AND author_id = ?`,
      )
      .get(guildId, authorId) as CountResult | undefined;
    return row?.count ?? 0;
  }

  const row = db
    .prepare(`SELECT COUNT(*) as count FROM quotes WHERE guild_id = ?`)
    .get(guildId) as CountResult | undefined;
  return row?.count ?? 0;
}

function searchQuotes(guildId: string, query: string, limit = 10): QuoteRow[] {
  ensureQuoteTable();
  const db = getDb();

  return db
    .prepare(
      `SELECT * FROM quotes WHERE guild_id = ? AND quote_text LIKE ? ORDER BY added_at DESC LIMIT ?`,
    )
    .all(guildId, `%${query}%`, limit) as QuoteRow[];
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(
  interaction: ChatInputCommandInteraction,
  action: "add" | "random" | "list" | "remove" | "search",
): Promise<void> {
  if (!interaction.guildId) {
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await interaction.editReply(t("quotes.guild_only", locale));
    return;
  }

  const guildId = interaction.guildId;

  try {
    switch (action) {
      case "add": {
        const author = interaction.options.getUser("author", true);
        const text = interaction.options.getString("text", true).trim();
        const context = interaction.options.getString("context")?.trim();

        if (text.length > 500) {
          await interaction.editReply("Quote is too long! Max 500 characters.");
          return;
        }

        const id = addQuote(guildId, author.id, text, interaction.user.id, context);

        await interaction.editReply({
          content: `✅ Quote #${id} saved!`,
          embeds: [
            new EmbedBuilder()
              .setDescription(`"${text}"`)
              .setAuthor({ name: author.username, iconURL: author.displayAvatarURL() })
              .setFooter({ text: `Quote #${id} • Added by ${interaction.user.username}` })
              .setColor(0x57f287),
          ],
        });
        break;
      }

      case "random": {
        const filterUser = interaction.options.getUser("author");
        const quote = getRandomQuote(guildId, filterUser?.id);

        if (!quote) {
          const msg = filterUser
            ? `No quotes found from ${filterUser}. Add one with \`/fun quote add\`!`
            : "No quotes saved yet! Add one with `/fun quote add`!";
          await interaction.editReply(msg);
          return;
        }

        let author: User | null = null;
        try {
          author = await interaction.client.users.fetch(quote.author_id);
        } catch {
          // User might not exist anymore
        }

        const embed = new EmbedBuilder()
          .setDescription(`"${quote.quote_text}"`)
          .setFooter({ text: `Quote #${quote.id}` })
          .setTimestamp(quote.added_at)
          .setColor(0x5865f2);

        if (author) {
          embed.setAuthor({ name: author.username, iconURL: author.displayAvatarURL() });
        } else {
          embed.setAuthor({ name: `User ${quote.author_id}` });
        }

        if (quote.context) {
          embed.addFields({ name: "Context", value: quote.context });
        }

        const total = countQuotes(guildId, filterUser?.id);
        await interaction.editReply({
          content: `📜 Random quote (1 of ${total}):`,
          embeds: [embed],
        });
        break;
      }

      case "list": {
        const filterUser = interaction.options.getUser("author");
        const limit = interaction.options.getInteger("limit") ?? 25;
        const quotes = listQuotes(guildId, filterUser?.id, limit);

        if (quotes.length === 0) {
          const msg = filterUser
            ? `No quotes found from ${filterUser}.`
            : "No quotes saved yet!";
          await interaction.editReply(msg);
          return;
        }

        const total = countQuotes(guildId, filterUser?.id);
        const lines = quotes.map(
          (q) =>
            `**#${q.id}** <@${q.author_id}>: "${q.quote_text.length > 50 ? q.quote_text.slice(0, 50) + "..." : q.quote_text}"`,
        );

        const title = filterUser
          ? `📜 Quotes from ${filterUser.username} (${total} total)`
          : `📜 Recent Quotes (${total} total)`;

        await interaction.editReply({
          content: `${title}\n\n${lines.join("\n")}`,
        });
        break;
      }

      case "remove": {
        const id = interaction.options.getInteger("id", true);
        const quote = getQuoteById(guildId, id);

        if (!quote) {
          await interaction.editReply(`Quote #${id} not found.`);
          return;
        }

        // Only allow removal by the person who added it or server admins
        const isAdmin = interaction.memberPermissions?.has("ManageMessages") ?? false;
        if (quote.added_by !== interaction.user.id && !isAdmin) {
          await interaction.editReply(
            "You can only remove quotes you added (or have Manage Messages permission).",
          );
          return;
        }

        const removed = removeQuote(guildId, id);
        if (removed) {
          await interaction.editReply(`✅ Quote #${id} removed.`);
        } else {
          await interaction.editReply(`We couldn't remove quote #${id}. Try again in a moment.`);
        }
        break;
      }

      case "search": {
        const query = interaction.options.getString("query", true).trim();
        const limit = interaction.options.getInteger("limit") ?? 10;

        if (query.length < 2) {
          await interaction.editReply("Search query must be at least 2 characters.");
          return;
        }

        const quotes = searchQuotes(guildId, query, limit);

        if (quotes.length === 0) {
          await interaction.editReply(`No quotes found matching "${query}".`);
          return;
        }

        const lines = quotes.map(
          (q) =>
            `**#${q.id}** <@${q.author_id}>: "${q.quote_text.length > 50 ? q.quote_text.slice(0, 50) + "..." : q.quote_text}"`,
        );

        await interaction.editReply({
          content: `📜 Quotes matching "${query}" (${quotes.length} found):\n\n${lines.join("\n")}`,
        });
        break;
      }
    }
  } catch (err) {
    logger.error({ err, action, guildId }, "[fun/quote] quote action threw");
    await interaction.editReply("We couldn't get or save that quote. Try again in a moment.");
  }
}
