// src/utils/colors.ts
// Consistent embed colors across the bot

export const EmbedColors = {
  // Primary colors
  Success: 0x00ae86, // Green - successful operations
  Error: 0xff0000, // Red - errors and failures
  Warning: 0xffa500, // Orange - warnings
  Info: 0x3498db, // Blue - informational

  // Feature-specific colors
  GitHub: 0x6e5494, // GitHub purple
  Fun: 0xffd700, // Gold for fun commands
  Moderation: 0xe74c3c, // Red for mod actions

  // Utility
  Default: 0x00ae86, // Default if unsure
} as const;

export type EmbedColor = (typeof EmbedColors)[keyof typeof EmbedColors];
