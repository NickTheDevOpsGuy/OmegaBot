# Transcripts & Summaries

This page explains the transcript pipeline and the two summary modes OmegaBot supports.

The key distinction is simple:

- transcripts are the stored record of source messages
- summaries are derived output generated from those transcripts

---

## Table of Contents

- [Pipeline](#pipeline)
- [Timezones](#timezones)
- [Modes](#modes)
- [Notes](#notes)

---

## Pipeline

Messages move through the system in this order:

1. **Messages**
   Raw messages are collected from the source, such as Discord.
2. **Transcript**
   Messages are normalized, ordered, and grouped with timestamps and metadata.
3. **Summary**
   The transcript is summarized into a shorter human-readable form using the selected summary mode.

This means the transcript is the durable source record, while the summary is a generated view of that record.

---

## Timezones

- OmegaBot uses IANA timezone identifiers such as `America/New_York` and `UTC`
- timestamps are normalized during transcript generation
- display timezone can change without regenerating the underlying transcript

---

## Modes

### Local

- heuristic or rule-based summaries
- fast and deterministic
- no external API calls
- useful for quick overviews or offline-friendly behavior

### LLM

- uses a language model to generate summaries
- produces more contextual and natural phrasing
- requires external API access and the related config
- useful when you want richer narrative summaries

---

## Notes

- transcripts remain the source of truth
- summaries can be regenerated without reprocessing the original message source
- changing summary mode affects summary style and quality, not transcript integrity
