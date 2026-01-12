# @merriam-webster/skill

Claude Code skill for looking up word definitions and synonyms using Merriam-Webster Dictionary.

## Prerequisites

- The `@merriam-webster/endpoint` Cloudflare Worker must be deployed
- You need the `WORKER_API_KEY` from your endpoint configuration

## Installation

Create a symlink to make the skill available to Claude Code:

```bash
ln -s /path/to/merriam-webster/packages/skill ~/.claude/skills/dictionary
```

## Configuration

The skill requires two environment variables:

| Variable | Description |
|----------|-------------|
| `MW_ENDPOINT_URL` | Base URL of your deployed Cloudflare Worker |
| `MW_API_KEY` | Bearer token for authentication (your `WORKER_API_KEY`) |

### Option 1: Shell Profile

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export MW_ENDPOINT_URL="https://merriam-webster-api.your-account.workers.dev"
export MW_API_KEY="your-worker-api-key"
```

### Option 2: Local Config File

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your endpoint URL and API key.

## Usage

Once installed, invoke the skill in Claude Code:

```
/dictionary example
```

Or ask naturally:

- "Define ubiquitous"
- "What's a synonym for happy?"
- "How do you spell accommodate?"

## Testing

Test the script directly:

```bash
# Set env vars first, then:
./scripts/dictionary.sh example
```

Expected output for a found word:

```json
{
  "word": "example",
  "found": true,
  "definition": { "entries": [...], "cached": false },
  "synonyms": { "entries": [...], "cached": true },
  "rateLimit": { "remaining": 995, "limit": 1000, "resetsAt": "..." }
}
```

## Dependencies

- `curl` - for HTTP requests
- `jq` - for JSON processing

Both are typically pre-installed on macOS and most Linux distributions.

## Related Packages

- `@merriam-webster/lib` - Core TypeScript client library
- `@merriam-webster/endpoint` - Rate-limited Cloudflare Worker proxy
