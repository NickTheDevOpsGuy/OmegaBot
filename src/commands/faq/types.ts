// src/services/faq/types.ts

// Constants (values live here so they can be imported as real values)
export const MAX_KEY_LEN = 48;
export const MAX_TITLE_LEN = 80; // pick something reasonable
export const MAX_BODY_LEN = 4000; // pick something reasonable
export const MAX_TAGS = 10;
export const MAX_TAG_LEN = 24;

export type FaqEntry = {
  key: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string; // user id or "system"
  updatedBy: string; // user id or "system"
  usageCount: number;
};

export type FaqStoreV1 = {
  version: 1;
  entries: Record<string, FaqEntry>; // key -> entry
};

export type CreateFaqInput = {
  key: string;
  title: string;
  body: string;
  tags?: string[];
  actor: string;
};

export type UpdateFaqPatch = Partial<Pick<FaqEntry, "title" | "body" | "tags">> & {
  actor: string;
};
