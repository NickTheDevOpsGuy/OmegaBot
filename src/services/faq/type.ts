//src/services/faq/types.ts

export type FaqEntry = {
  key: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  usageCount: number;
};

export type FaqStoreV1 = {
  version: 1;
  entries: Record<string, FaqEntry>;
};
