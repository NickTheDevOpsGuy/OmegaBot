# FAQ System Design

This document defines how FAQs are stored, identified, and managed inside **OmegaBot**.

The goal is to keep FAQs:

- Easy to manage
- Safe for Discord limits
- Auditable
- Simple to migrate to a database later

---

## Storage Model

FAQs are stored in a file-based JSON store:

```
data/faqs.json
```

This file is the single source of truth for all FAQ entries.

---

## FAQ Entry Schema

Each FAQ entry follows this schema:

```ts
type FaqEntry = {
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

type FaqStore = {
  version: 1;
  entries: Record<string, FaqEntry>;
};
```

---

## Key Format and Limits

- Lowercase only
- Letters, numbers, and dashes only
- No spaces
- Immutable once created
- Max length: 48 characters

---

## Size Limits

| Field | Limit      |
| ----- | ---------- |
| title | 80 chars   |
| body  | 4000 chars |
| tags  | 10 max     |

---

## Command Expectations

- `/faq add` validates input and initializes metadata
- `/faq get` increments usage count
- `/faq list` shows keys + titles
- `/faq remove` deletes entry (permission-gated)

---

## Future Plans

- Database storage
- Search
- Role-based visibility
- Audit history

FAQs are treated as shared operational knowledge.
