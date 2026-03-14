export const BASE_XP_PER_LEVEL = 100;
export const XP_PER_LEVEL_GROWTH = 50;

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += BASE_XP_PER_LEVEL + (current - 1) * XP_PER_LEVEL_GROWTH;
  }
  return total;
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export function buildProgressBar(current: number, total: number, width = 10): string {
  if (total <= 0) return "█".repeat(width);
  const filled = Math.max(0, Math.min(width, Math.round((current / total) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}
