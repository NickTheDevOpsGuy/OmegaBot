// src/commands/fun/subcommands/darts/gameLogic.ts
//
// Darts throw logic: weighted segment selection, formatting, callouts.

export type DartHit =
  | { kind: "single"; value: number }
  | { kind: "double"; value: number }
  | { kind: "triple"; value: number }
  | { kind: "outerBull"; value: 25 }
  | { kind: "innerBull"; value: 50 }
  | { kind: "miss"; value: 0 };

const SEGMENT_WEIGHTS: Array<{ kind: DartHit["kind"]; weight: number; value?: number }> = [
  { kind: "single", weight: 60 },
  { kind: "double", weight: 40 },
  { kind: "triple", weight: 40 },
  { kind: "outerBull", weight: 4, value: 25 },
  { kind: "innerBull", weight: 2, value: 50 },
  { kind: "miss", weight: 3, value: 0 },
];

const TOTAL_WEIGHT = SEGMENT_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);

export function throwDart(): DartHit {
  const roll = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const seg of SEGMENT_WEIGHTS) {
    cumulative += seg.weight;
    if (roll < cumulative) {
      if (seg.value !== undefined) {
        return { kind: seg.kind, value: seg.value } as DartHit;
      }
      const num = Math.floor(Math.random() * 20) + 1;
      const mult = seg.kind === "single" ? 1 : seg.kind === "double" ? 2 : 3;
      return { kind: seg.kind, value: num * mult } as DartHit;
    }
  }
  const num = Math.floor(Math.random() * 20) + 1;
  return { kind: "single", value: num };
}

export function formatHit(hit: DartHit): string {
  switch (hit.kind) {
    case "single":
      return `${hit.value}`;
    case "double":
      return `D${hit.value / 2}`;
    case "triple":
      return `T${hit.value / 3}`;
    case "outerBull":
      return "25 (outer bull)";
    case "innerBull":
      return "BULLSEYE!";
    case "miss":
      return "Miss";
  }
}

export function getHitEmoji(hit: DartHit): string {
  switch (hit.kind) {
    case "innerBull":
      return "🎯";
    case "outerBull":
      return "⭕";
    case "miss":
      return "💨";
    default:
      return "🎪";
  }
}

export function getRoundCallout(score: number, hits: DartHit[]): string {
  const hasBullseye = hits.some((h) => h.kind === "innerBull");
  const missCount = hits.filter((h) => h.kind === "miss").length;

  if (score === 180) return "🔥 **ONE-EIGHTY!** Maximum score!";
  if (score >= 150) return "🌟 **Ton-fifty!** Incredible throw!";
  if (score >= 100) return "💯 **Ton!** Solid round!";
  if (hasBullseye && score >= 100) return "🎯 **Bullseye + Ton!** Well aimed!";
  if (hasBullseye) return "🎯 **Bullseye!** Nailed it!";
  if (score === 0) return "😅 All three in the wall…";
  if (missCount === 2) return "🤷 Two down, one to go!";
  if (missCount === 1) return "📌 On the board at least!";

  return "🎪 Nice throw!";
}

export const DARTBOARD_ART = [
  "     ╭─────────╮",
  "    ╱   20 1   ╲",
  "   │ 19  ◆  2  │",
  "   │ 18  🎯 3  │",
  "   │ 17   ●  4 │",
  "    ╲ 16 … 5  ╱",
  "     ╰─────────╯",
].join("\n");

/** Throw 3 darts and return hits + score. */
export function doThrow(): { hits: DartHit[]; score: number; is180: boolean } {
  const hits: DartHit[] = [throwDart(), throwDart(), throwDart()];
  const score = hits.reduce((sum, h) => sum + h.value, 0);
  const is180 = score === 180;
  return { hits, score, is180 };
}

/** Format throw result as lines (without header). */
export function formatThrowLines(
  hits: DartHit[],
  score: number,
  label?: string,
): string[] {
  const dartLines = hits.map((h, i) => {
    const emoji = getHitEmoji(h);
    const fmt = formatHit(h);
    return `  Dart ${i + 1}: ${emoji} **${fmt}** → ${h.value} pts`;
  });
  const lines: string[] = [];
  if (label) lines.push(`**${label}**`);
  lines.push(...dartLines);
  lines.push(`**Round score: ${score}**`);
  lines.push(getRoundCallout(score, hits));
  return lines;
}
