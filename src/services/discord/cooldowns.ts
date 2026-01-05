// src/services/discord/cooldowns.ts

/**
 * In-memory cooldown store.
 *
 * Key format: `${userId}:${commandName}`
 * Value: timestamp (ms) when the command can be used again
 */
const cooldowns = new Map<string, number>();

function makeKey(userId: string, commandName: string): string {
  return `${userId}:${commandName}`;
}

/**
 * Returns remaining cooldown time in milliseconds.
 * Returns 0 if no cooldown is active.
 */
export function getCooldownRemainingMs(
  userId: string,
  commandName: string,
): number {
  const key = makeKey(userId, commandName);
  const expiresAt = cooldowns.get(key);

  if (!expiresAt) return 0;

  const remaining = expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Sets a cooldown for a user + command.
 */
export function setCooldown(
  userId: string,
  commandName: string,
  durationMs: number,
): void {
  if (durationMs <= 0) return;

  const key = makeKey(userId, commandName);
  cooldowns.set(key, Date.now() + durationMs);
}