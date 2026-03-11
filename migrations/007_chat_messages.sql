-- chat_messages: conversational LLM chat history (DM / @mention, /fun chat)
-- One row per message; conversation_key = "dm:userId" or "ch:channelId:userId".
-- Trimmed to last 20 messages per key in application code.
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_key TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_key ON chat_messages(conversation_key);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(conversation_key, created_at);
