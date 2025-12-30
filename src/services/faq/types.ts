// src/services/faq/types.ts

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Maximum length of an FAQ key after normalization.
 *
 * Keys are used as:
 * - slash command arguments
 * - map keys in the JSON store
 * - human-readable identifiers
 *
 * Keeping this short prevents abuse and awkward UX.
 */
export const MAX_KEY_LEN = 48;

/**
 * Max title length after trimming.
 * Keep this short so list views stay readable.
 */
export const MAX_TITLE_LEN = 80;

/**
 * Max body length after trimming.
 * 4000 is a reasonable starting point and stays under typical Discord limits
 * once you add formatting and headers.
 */
export const MAX_BODY_LEN = 4000;

/**
 * Max number of tags allowed on an entry.
 * Prevents spam and keeps list filters usable.
 */
export const MAX_TAGS = 10;

/**
 * Max length per tag after trimming.
 * Keeps tags compact for list output.
 */
export const MAX_TAG_LEN = 24;

/* -------------------------------------------------------------------------- */
/* Core Types                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A single FAQ entry as stored and returned by the service layer.
 *
 * Notes:
 * - `key` is normalized (lowercase, kebab-case).
 * - timestamps are ISO strings for easy JSON storage.
 * - usageCount is incremented when an FAQ is retrieved.
 */
export type FaqEntry = {
  key: string;
  title: string;
  body: string;
  tags: string[];

  createdAt: string;
  updatedAt: string;

  createdBy: string; // user id or "system"
  updatedBy: string; // user id or "system"

  usageCount: number;
};

/**
 * On-disk FAQ store format (v1).
 *
 * Versioning lets us migrate later without breaking users.
 */
export type FaqStoreV1 = {
  version: 1;
  entries: Record<string, FaqEntry>;
};

/* -------------------------------------------------------------------------- */
/* Input Types                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Input required to create a new FAQ.
 *
 * Validation rules:
 * - key is normalized and validated by the service layer
 * - title/body are trimmed
 * - tags are optional and normalized if provided
 */
export type CreateFaqInput = {
  key: string;
  title: string;
  body: string;
  tags?: string[];
  actor: string; // user id or "system"
};

/**
 * Allowed fields when updating an FAQ entry.
 *
 * Notes:
 * - actor is required so updatedBy is always attributable.
 * - patch fields are optional and validated by the service layer if present.
 */
export type UpdateFaqPatch = Partial<Pick<FaqEntry, "title" | "body" | "tags">> & {
  actor: string;
};
