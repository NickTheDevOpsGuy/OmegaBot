# Conversational Chat & LLM

OmegaBot can chat with users using an LLM (OpenAI or Anthropic Claude), with **conversation memory** so it remembers the last 20 messages per user. This doc explains how it works and how it’s stored.

---

## How to Chat

Users can start or continue a conversation in three ways:

1. **DM the bot** – Any message you send the bot in a direct message is treated as chat. The bot replies in the same DM.
2. **@mention the bot in a channel** – In a server channel, mention the bot (e.g. `@OmegaBot what’s the weather?`). The bot replies in that channel. The part of your message after the mention is the prompt.
3. **`/fun chat message:<text>`** – Slash command that sends a message into the **same** conversation thread as DM or @mention for that context (see below).

No slash command is required for normal chat; messaging the bot is enough.

---

## Conversation Threads (Keys)

Conversations are scoped so that:

- **DMs** – One thread per user. Key: `dm:<userId>`.
- **Channels** – One thread per user per channel. Key: `ch:<channelId>:<userId>`.

So if you DM the bot, that’s one thread. If you @mention it in `#general`, that’s a separate thread for you in that channel. If you use `/fun chat` in `#general`, it uses the same thread as @mentioning the bot in `#general`.

---

## Persistence (SQLite)

Conversation history is stored in **SQLite**, not in memory. It survives bot restarts.

- **Table:** `chat_messages`
- **Columns:** `id`, `conversation_key`, `role` (`user` | `assistant`), `content`, `created_at`
- **Migration:** `migrations/007_chat_messages.sql` (applied on startup)

Each message is one row. When you send a message and the bot replies, two rows are added (user + assistant). Older messages beyond the limit are trimmed (see below).

---

## History Limit & Trimming

- Only the **last 20 messages** per conversation key are used as context for the LLM.
- When new messages are appended, any older messages for that key are deleted so the table doesn’t grow forever.
- When you **clear** a conversation (see below), all rows for that key are deleted.

---

## Clearing a Conversation (“New Chat”)

If the user says any of the following (case-insensitive, at the start of the message), the bot clears that conversation and replies with something like “Started a new conversation”:

- `new chat`
- `clear`
- `reset`
- `start over`
- `clear conversation`
- `forget all`

Clearing deletes all `chat_messages` rows for that conversation key.

---

## LLM Provider & Env

- **OpenAI (preferred when set):** Uses `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-4o-mini`) from `.env`. Same token as used for `/fun chat` and summaries when `SUMMARY_MODE=llm`.
- **Anthropic (fallback):** If `OPENAI_API_KEY` is not set, uses `ANTHROPIC_API_KEY` for Claude.

If neither key is set, message-based chat is disabled (the handler is not registered). `/fun chat` (and DM/@mention) will reply that chat isn’t available and the server admin needs to set up an API key.

See [Environment Setup](setup-env.md) and `.env.example` for where to get API keys.

---

## Message Content Intent (Discord)

To read DM and channel message content, the bot needs the **Message Content** privileged intent. Enable it in the [Discord Developer Portal](https://discord.com/developers/applications) under your app → Bot → Privileged Gateway Intents. Your code already requests this intent when the bot starts. See [Discord Bot Setup](setup-discord.md#gateway-intents).

---

## Summary

| What           | Where / How                                    |
| -------------- | ---------------------------------------------- |
| Start chatting | DM the bot, @mention it, or `/fun chat`        |
| Threads        | One per user in DMs; one per user per channel  |
| Storage        | SQLite table `chat_messages`                   |
| Limit          | Last 20 messages per thread                    |
| Clear          | Say “new chat”, “clear”, “reset”, etc.         |
| Provider       | OpenAI if `OPENAI_API_KEY` set, else Anthropic |
