# Transcripts & Summaries

This system captures messages, produces transcripts, and generates summaries using either local or LLM-based processing.

---

## 🔄 Pipeline

Messages flow through the system in the following order:

1. **Messages**  
   Raw message events collected from the source (e.g., Discord).

2. **Transcript**  
   Messages are normalized, ordered, and grouped into a transcript with timestamps and metadata.

3. **Summary**  
   The transcript is summarized into a concise, human-readable format based on the selected mode.

---

## 🌍 Timezones

- Uses **IANA timezone identifiers** (e.g., `America/New_York`, `UTC`)
- Timestamps are normalized during transcript generation
- Display timezone can be adjusted without regenerating the transcript

---

## ⚙️ Modes

### Local
- Rule-based or heuristic summaries
- Fast and deterministic
- No external API calls
- Best for quick overviews or offline usage

### LLM
- Uses a language model to generate summaries
- Produces more contextual and natural summaries
- Requires external API access
- Best for detailed or narrative-style summaries

---

## 📝 Notes

- Transcripts are the source of truth
- Summaries can be regenerated without reprocessing messages
- Mode selection affects summary quality, not transcript integrity