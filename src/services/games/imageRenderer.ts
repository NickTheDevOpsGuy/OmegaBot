// src/services/games/imageRenderer.ts
//
// Placeholder for future image-based game rendering (e.g. slots, blackjack, roulette).
// Possible implementations: node-canvas, satori, or external render service.
// Commands can attach rendered images to embeds via AttachmentBuilder.

/** Placeholder: render a game state to a buffer (e.g. PNG). Not implemented. */
export async function renderGameImage(
  _gameType: string,
  _state: unknown,
): Promise<Buffer | null> {
  return null;
}

/** Placeholder: whether image rendering is available. */
export function isImageRenderingAvailable(): boolean {
  return false;
}
