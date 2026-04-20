# Conversational Chat & LLM

OmegaBot can chat with users using an LLM (OpenAI or Anthropic Claude), with **conversation memory** so it remembers the last 20 messages per user. It is tuned for friendly, supportive catch-up style conversation, but it is **not** a therapist or crisis service. This doc explains how it works and how it’s stored.

---

## Table of Contents

- [How to Chat](#how-to-chat)
- [Conversation Threads (Keys)](#conversation-threads-keys)
- [Persistence (SQLite)](#persistence-sqlite)
- [History Limit & Trimming](#history-limit--trimming)
- [Clearing a Conversation ("New Chat")](#clearing-a-conversation-new-chat)
- [Chat Modes](#chat-modes)
- [Supportive / Mental Health Guardrails](#supportive--mental-health-guardrails)
- [LLM Provider & Env](#llm-provider--env)
- [Message Content Intent (Discord)](#message-content-intent-discord)
- [Summary](#summary)

---

## How to Chat

Users can start or continue a conversation in three ways:

1. **DM the bot** – Any message you send the bot in a direct message is treated as chat. The bot replies in the same DM.
2. **@mention the bot in a channel** – In a server channel, mention the bot (e.g. `@OmegaBot what’s the weather?`). The bot replies in that channel. The part of your message after the mention is the prompt.
   Messages that include `@everyone` or `@here` are ignored so the bot does not join mass callouts.
3. **`/fun utility chat`** – Slash command tools that use the **same** conversation thread as DM or @mention for that context (see below).

Common slash chat actions:

- `action:send` – Normal message in the same thread
- `action:checkin` – Ask the bot to lead a gentle emotional check-in
- `action:recap` – Get a recap of saved context and recent turns
- `action:remember` – Save a note for future catch-ups in that conversation
- `action:forget` – Clear saved context for that conversation

No slash command is required for normal chat; messaging the bot is enough.

---

## Conversation Threads (Keys)

Conversations are scoped so that:

- **DMs** – One thread per user. Key: `dm:<userId>`.
- **Channels** – One thread per user per channel. Key: `ch:<channelId>:<userId>`.

So if you DM the bot, that’s one thread. If you @mention it in `#general`, that’s a separate thread for you in that channel. If you use `/fun utility chat` in `#general`, it uses the same thread as @mentioning the bot in `#general`.

Each conversation also has a lightweight profile with:

- preferred **mode** (`supportive`, `casual`, `practical`, `grounding`)
- optional saved context notes
- memory enabled/disabled state

---

## Persistence (SQLite)

Conversation history is stored in **SQLite**, not in memory. It survives bot restarts.

- **Table:** `chat_messages`
- **Columns:** `id`, `conversation_key`, `role` (`user` | `assistant`), `content`, `created_at`
- **Table:** `chat_profiles`
- **Columns:** `conversation_key`, `preferred_mode`, `memory_summary`, `memory_enabled`, `updated_at`
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

It also clears saved mode/context for that conversation.

---

## Chat Modes

The slash chat command can set a preferred mode per conversation:

- **supportive** – warm, reflective, gentle follow-up questions
- **casual** – lighter, more relaxed conversation
- **practical** – concrete next steps and problem-solving
- **grounding** – calmer tone, grounding and stabilization style replies

If you set a mode in one conversation, that mode is reused in the same thread until you change it or reset the conversation.

---

## Supportive / Mental Health Guardrails

OmegaBot can be more helpful for supportive conversations, catch-ups, and emotional check-ins, but:

- it is **not** a therapist
- it should not be treated as medical or psychiatric advice
- it uses stronger safety guidance when messages suggest distress or crisis

For higher-risk messages, the bot is instructed to respond with empathy, encourage reaching out to trusted people or local crisis/professional support, and avoid harmful detail.

---

## LLM Provider & Env

- **OpenAI (preferred when set):** Uses `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-4o-mini`) from `.env`. Same token as used for `/fun utility chat` and summaries when `SUMMARY_MODE=llm`.
- **Anthropic (fallback):** If `OPENAI_API_KEY` is not set, uses `ANTHROPIC_API_KEY` for Claude.

If neither key is set, message-based chat is disabled (the handler is not registered). `/fun utility chat` (and DM/@mention) will reply that chat isn’t available and the server admin needs to set up an API key.

See [Environment Setup](setup-env.md) and `.env.example` for where to get API keys.

---

## Message Content Intent (Discord)

To read DM and channel message content, the bot needs the **Message Content** privileged intent. Enable it in the [Discord Developer Portal](https://discord.com/developers/applications) under your app → Bot → Privileged Gateway Intents. Your code already requests this intent when the bot starts. See [Discord Bot Setup](setup-discord.md#gateway-intents).

---

## Summary

| What           | Where / How                                        |
| -------------- | -------------------------------------------------- |
| Start chatting | DM the bot, @mention it, or `/fun utility chat`    |
| Threads        | One per user in DMs; one per user per channel      |
| Storage        | SQLite table `chat_messages`                       |
| Profile        | Per-thread mode + saved context in `chat_profiles` |
| Limit          | Last 20 messages per thread                        |
| Clear          | Say “new chat”, “clear”, “reset”, etc.             |
| Provider       | OpenAI if `OPENAI_API_KEY` set, else Anthropic     |
