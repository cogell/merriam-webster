#!/bin/bash
#
# dictionary.sh - Look up a word's definition and synonyms from Merriam-Webster
#
# Usage: dictionary.sh <word>
#
# Environment variables:
#   MW_ENDPOINT_URL - Base URL of the deployed endpoint (required)
#   MW_API_KEY      - Bearer token for API authentication (required)
#
# Exit codes:
#   0 - Success (word found or suggestions returned)
#   1 - Missing word argument
#   2 - Missing configuration
#   3 - Network/API error
#

set -euo pipefail

# Load .env file if it exists in the same directory as this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
if [[ -f "$SKILL_DIR/.env" ]]; then
  # shellcheck source=/dev/null
  source "$SKILL_DIR/.env"
fi

# Check for word argument
if [[ $# -lt 1 ]]; then
  echo '{"error": true, "code": "MISSING_ARGUMENT", "message": "Usage: dictionary.sh <word>"}' >&2
  exit 1
fi

WORD="$1"

# Check required environment variables
if [[ -z "${MW_ENDPOINT_URL:-}" || -z "${MW_API_KEY:-}" ]]; then
  MISSING_VARS=""
  [[ -z "${MW_ENDPOINT_URL:-}" ]] && MISSING_VARS="MW_ENDPOINT_URL"
  [[ -z "${MW_API_KEY:-}" ]] && MISSING_VARS="${MISSING_VARS:+$MISSING_VARS, }MW_API_KEY"

  cat >&2 <<EOF
{
  "error": true,
  "code": "MISSING_CONFIG",
  "message": "Missing required environment variables: $MISSING_VARS",
  "setup": {
    "instructions": "To use the Merriam-Webster Dictionary skill, configure these environment variables:",
    "variables": {
      "MW_ENDPOINT_URL": "Base URL of your deployed Merriam-Webster Cloudflare Worker (e.g., https://merriam-webster-api.your-account.workers.dev)",
      "MW_API_KEY": "Bearer token for API authentication (your WORKER_API_KEY from the endpoint)"
    },
    "options": [
      "Add to ~/.zshrc or ~/.bashrc: export MW_ENDPOINT_URL=... && export MW_API_KEY=...",
      "Or create a .env file in the plugin directory with MW_ENDPOINT_URL=... and MW_API_KEY=..."
    ],
    "note": "The endpoint must be deployed first. See @merriam-webster/endpoint package for setup."
  }
}
EOF
  exit 2
fi

# URL encode the word
ENCODED_WORD=$(printf '%s' "$WORD" | jq -sRr @uri)

# Create temp files for parallel requests
DEFINE_TMP=$(mktemp)
SYNONYMS_TMP=$(mktemp)
DEFINE_STATUS_TMP=$(mktemp)
SYNONYMS_STATUS_TMP=$(mktemp)

# Cleanup on exit
cleanup() {
  rm -f "$DEFINE_TMP" "$SYNONYMS_TMP" "$DEFINE_STATUS_TMP" "$SYNONYMS_STATUS_TMP"
}
trap cleanup EXIT

# Make parallel requests
{
  HTTP_CODE=$(curl -s -w "%{http_code}" -o "$DEFINE_TMP" \
    -H "Authorization: Bearer $MW_API_KEY" \
    "${MW_ENDPOINT_URL}/define/${ENCODED_WORD}")
  echo "$HTTP_CODE" > "$DEFINE_STATUS_TMP"
} &
DEFINE_PID=$!

{
  HTTP_CODE=$(curl -s -w "%{http_code}" -o "$SYNONYMS_TMP" \
    -H "Authorization: Bearer $MW_API_KEY" \
    "${MW_ENDPOINT_URL}/synonyms/${ENCODED_WORD}")
  echo "$HTTP_CODE" > "$SYNONYMS_STATUS_TMP"
} &
SYNONYMS_PID=$!

# Wait for both requests
wait $DEFINE_PID || true
wait $SYNONYMS_PID || true

DEFINE_STATUS=$(cat "$DEFINE_STATUS_TMP")
SYNONYMS_STATUS=$(cat "$SYNONYMS_STATUS_TMP")

# Read responses
DEFINE_RESPONSE=$(cat "$DEFINE_TMP")
SYNONYMS_RESPONSE=$(cat "$SYNONYMS_TMP")

# Handle errors
handle_error() {
  local status="$1"
  local response="$2"
  local endpoint="$3"

  case "$status" in
    000)
      echo "{\"error\": true, \"code\": \"NETWORK_ERROR\", \"message\": \"Cannot reach $endpoint endpoint\"}" >&2
      exit 3
      ;;
    401)
      echo '{"error": true, "code": "UNAUTHORIZED", "message": "Invalid or missing API key"}' >&2
      exit 3
      ;;
    429)
      # Extract rate limit info from response
      echo "$response" | jq '{error: true, code: "RATE_LIMITED", message: .error.message, rateLimit: .rateLimit}' 2>/dev/null || \
        echo '{"error": true, "code": "RATE_LIMITED", "message": "Rate limit exceeded"}' >&2
      exit 3
      ;;
    5*)
      echo "{\"error\": true, \"code\": \"SERVER_ERROR\", \"message\": \"Server error from $endpoint endpoint (HTTP $status)\"}" >&2
      exit 3
      ;;
  esac
}

# Check for critical errors (non-200/404)
if [[ "$DEFINE_STATUS" != "200" && "$DEFINE_STATUS" != "404" ]]; then
  handle_error "$DEFINE_STATUS" "$DEFINE_RESPONSE" "define"
fi

if [[ "$SYNONYMS_STATUS" != "200" && "$SYNONYMS_STATUS" != "404" ]]; then
  handle_error "$SYNONYMS_STATUS" "$SYNONYMS_RESPONSE" "synonyms"
fi

# Parse responses and combine
DEFINE_SUCCESS=$(echo "$DEFINE_RESPONSE" | jq -r '.success // false')
SYNONYMS_SUCCESS=$(echo "$SYNONYMS_RESPONSE" | jq -r '.success // false')

# Check if word was found in either endpoint
DEFINE_FOUND=$(echo "$DEFINE_RESPONSE" | jq -r '.data.found // false')
SYNONYMS_FOUND=$(echo "$SYNONYMS_RESPONSE" | jq -r '.data.found // false')

# Get rate limit info (prefer from define response)
RATE_LIMIT=$(echo "$DEFINE_RESPONSE" | jq '.rateLimit // null')
if [[ "$RATE_LIMIT" == "null" ]]; then
  RATE_LIMIT=$(echo "$SYNONYMS_RESPONSE" | jq '.rateLimit // null')
fi

# Build combined response
if [[ "$DEFINE_FOUND" == "true" || "$SYNONYMS_FOUND" == "true" ]]; then
  # Word found - return full results
  jq -n \
    --arg word "$WORD" \
    --argjson define "$DEFINE_RESPONSE" \
    --argjson synonyms "$SYNONYMS_RESPONSE" \
    --argjson rateLimit "$RATE_LIMIT" \
    '{
      word: $word,
      found: true,
      definition: {
        entries: (if $define.data.found then $define.data.entries else [] end),
        cached: ($define.cached // false)
      },
      synonyms: {
        entries: (if $synonyms.data.found then $synonyms.data.entries else [] end),
        cached: ($synonyms.cached // false)
      },
      rateLimit: $rateLimit
    }'
else
  # Word not found - return suggestions
  SUGGESTIONS=$(echo "$DEFINE_RESPONSE" | jq '.data.suggestions // []')
  if [[ "$SUGGESTIONS" == "[]" ]]; then
    SUGGESTIONS=$(echo "$SYNONYMS_RESPONSE" | jq '.data.suggestions // []')
  fi

  jq -n \
    --arg word "$WORD" \
    --argjson suggestions "$SUGGESTIONS" \
    --argjson rateLimit "$RATE_LIMIT" \
    '{
      word: $word,
      found: false,
      suggestions: $suggestions,
      rateLimit: $rateLimit
    }'
fi
