# OmegaBot Commands

This document lists all available slash commands supported by OmegaBot.

---

## General Commands

### /ping

Checks whether the bot is online and reports latency.

**Usage**

```
/ping
```

---

## History & Summary Commands

### /history

Fetches recent messages from the current channel and sends them to you via DM.

**Options**

- `count` (optional): Number of messages to fetch (default: 50)

---

### /summary

Generates a summary of recent channel activity and sends it via DM.

**Notes**

- Uses local summarization by default
- LLM-based summarization may be enabled via configuration

---

## GitHub Commands

These commands use the GitHub REST API with authenticated requests.

### /gh issue

Fetch a single GitHub issue by number.

**Usage**

```
/gh issue owner:<org|user> repo:<repo> number:<issue_number>
```

---

### /gh issues

List open issues for a repository.

**Usage**

```
/gh issues owner:<org|user> repo:<repo> limit:<n> labels:<comma,separated>
```

**Notes**

- Defaults to open issues
- Pull requests are filtered out by default

---

### /pr

Fetch a GitHub pull request by number.

**Usage**

```
/pr owner:<org|user> repo:<repo> number:<pr_number>
```

---

## Notes

- GitHub commands require a valid GitHub Personal Access Token
- Results are returned as ephemeral responses by default
- Errors are handled gracefully and reported to the user
