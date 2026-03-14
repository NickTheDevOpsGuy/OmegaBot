export function findLeaderboardRank<T>(
  rows: T[],
  matches: (row: T) => boolean,
): number | null {
  const idx = rows.findIndex(matches);
  return idx >= 0 ? idx + 1 : null;
}

export function formatOrdinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function buildRankTeaser(
  rank: number | null,
  label: string,
  options: { topCutoff?: number } = {},
): string | undefined {
  if (!rank) return undefined;
  const { topCutoff = 10 } = options;
  if (rank > topCutoff) return undefined;
  return `📈 You're now ${formatOrdinal(rank)} on the ${label} leaderboard.`;
}

export function buildMilestoneLine(
  before: number,
  after: number,
  milestones: readonly number[],
  label: string,
): string | undefined {
  const hit = milestones.find((milestone) => before < milestone && after >= milestone);
  if (!hit) return undefined;
  return `🎉 Milestone: ${hit} ${label}!`;
}
