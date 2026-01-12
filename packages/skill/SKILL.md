---
name: dictionary
description: Look up word definitions and synonyms using Merriam-Webster Dictionary. Use when the user asks to define a word, find synonyms, check word meaning, look up a definition, or verify spelling.
compatibility: Requires MW_ENDPOINT_URL and MW_API_KEY environment variables.
metadata:
  author: cogell
  version: "0.1.0"
---

# Merriam-Webster Dictionary

Look up word definitions and synonyms from the Merriam-Webster Collegiate Dictionary and Thesaurus.

## Configuration

Set these environment variables in shell profile or `~/.claude/skills/dictionary/.env`:

```
MW_ENDPOINT_URL=https://your-worker.workers.dev
MW_API_KEY=your-bearer-token
```

## Scripts

### dictionary.sh

Look up a word's definition and synonyms.

```bash
scripts/dictionary.sh <word>
```

Run this script when the user asks to define a word or find synonyms. The script makes parallel requests to fetch both definition and synonyms, returning combined JSON output.

## Output Format

### Word Found

```json
{
  "word": "example",
  "found": true,
  "definition": {
    "entries": [...],
    "cached": false
  },
  "synonyms": {
    "entries": [...],
    "cached": true
  },
  "rateLimit": {
    "remaining": 995,
    "limit": 1000,
    "resetsAt": "2025-01-10T00:00:00Z"
  }
}
```

### Word Not Found

```json
{
  "word": "exampl",
  "found": false,
  "suggestions": ["example", "examples", "exemplar"],
  "rateLimit": {...}
}
```

## Presenting Results

When displaying results to the user:

1. **Show the headword and pronunciation** from `entries[].hwi.hw` (syllable breaks shown as `*`)
2. **Show part of speech** from `entries[].fl` (noun, verb, adjective, etc.)
3. **Use shortdef for concise definitions** from `entries[].shortdef` array
4. **Limit synonyms** to 10-15 most relevant unless user asks for more
5. **Show antonyms** from `entries[].meta.ants` if contextually useful
6. **Mention first known use** from `entries[].date` for etymology queries

### Example Formatted Output

```
**example** (ig-*zam-pəl) noun

1. one that serves as a pattern to be imitated or not to be imitated
2. a parallel or closely similar case especially when serving as a precedent
3. something that is representative of all of a group or type

**Synonyms:** case, illustration, instance, sample, specimen
**Antonyms:** counterexample

First known use: 14th century
```

## Error Handling

| Code | Meaning | Action |
|------|---------|--------|
| `MISSING_ARGUMENT` | No word provided | Prompt user for word |
| `MISSING_CONFIG` | Missing env vars | Check MW_ENDPOINT_URL and MW_API_KEY |
| `UNAUTHORIZED` | Invalid API key | Verify MW_API_KEY is correct |
| `RATE_LIMITED` | Daily limit exceeded | Show reset time, suggest cached words |
| `NETWORK_ERROR` | Cannot reach endpoint | Check MW_ENDPOINT_URL |
| `SERVER_ERROR` | Endpoint error | Retry or report issue |

When rate limited, the response includes `rateLimit.resetsAt` with the reset time. Cached lookups don't count against the rate limit.

## Tips

- **Compound words** may need hyphens: "well-being" vs "wellbeing"
- **Phrases**: Look up the main word. "kick the bucket" → look up "kick"
- **Misspellings**: When `found: false`, show suggestions to the user
- **Multiple entries**: Words with different etymologies have separate entries
- **Cached responses** don't count against rate limit - common words stay fast
