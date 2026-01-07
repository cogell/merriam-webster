# merriam-webster-api

A fully-typed TypeScript client for the Merriam-Webster Dictionary and Thesaurus APIs.

## Features

- Full TypeScript types for all API responses
- Discriminated union result types for easy handling of found/not-found cases
- Helper functions for extracting definitions and synonyms
- Works in Node.js 18+, Bun, Deno, and edge runtimes (Cloudflare Workers, Vercel Edge)
- Tree-shakeable ESM and CommonJS builds
- Zero dependencies

## Installation

```bash
npm install merriam-webster-api
```

## Quick Start

> **Note:** API keys should be kept server-side. Do not embed them in client-side code or browser bundles.

```typescript
import { MerriamWebster } from 'merriam-webster-api';

const mw = new MerriamWebster({
  dictionaryKey: process.env.MW_DICTIONARY_KEY,
  thesaurusKey: process.env.MW_THESAURUS_KEY, // optional
});

// Look up a word
const result = await mw.define('test');

if (result.found) {
  console.log(result.entries[0].shortdef);
  // => ["a means by which the presence, quality, or genuineness of anything is determined"]
} else {
  console.log('Did you mean:', result.suggestions.join(', '));
}
```

## API Reference

### `MerriamWebster`

The main client class.

#### Constructor

```typescript
new MerriamWebster(config: MerriamWebsterConfig)
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `dictionaryKey` | `string` | No* | API key for the Collegiate Dictionary |
| `thesaurusKey` | `string` | No* | API key for the Collegiate Thesaurus |
| `timeout` | `number` | No | Request timeout in ms (default: 10000) |

*At least one of `dictionaryKey` or `thesaurusKey` is required.

Get your free API keys at [dictionaryapi.com](https://dictionaryapi.com/register/index).

#### `define(word, options?)`

Look up a word in the dictionary.

```typescript
const result = await mw.define('voluminous');

if (result.found) {
  // result.entries is DictionaryEntry[]
  const entry = result.entries[0];
  console.log(entry.fl);        // "adjective"
  console.log(entry.shortdef);  // Quick definitions
  console.log(entry.date);      // First known use
} else {
  // result.suggestions is string[]
  console.log('Suggestions:', result.suggestions);
}
```

#### `synonyms(word, options?)`

Look up a word in the thesaurus.

```typescript
const result = await mw.synonyms('happy');

if (result.found) {
  // result.entries is ThesaurusEntry[]
  const entry = result.entries[0];
  console.log(entry.meta.syns);  // Flattened synonym arrays
  console.log(entry.meta.ants);  // Flattened antonym arrays
}
```

### Helper Functions

#### `flattenDefinitions(entry, options?)`

Extract plain text definitions from the complex sseq structure.

```typescript
import { flattenDefinitions } from 'merriam-webster-api';

const result = await mw.define('test');
if (result.found) {
  const definitions = flattenDefinitions(result.entries[0]);
  // => ["a means by which the presence, quality...", "a procedure for..."]
}
```

Options:
- `preserveMarkup`: Keep MW markup in text (default: false)
- `includeSdsense`: Include subdivided senses (default: true)

#### `getSynonymsForSense(entry, senseNumber)`

Extract synonyms for a specific sense of a thesaurus entry.

```typescript
import { getSynonymsForSense } from 'merriam-webster-api';

const result = await mw.synonyms('happy');
if (result.found) {
  const syns = getSynonymsForSense(result.entries[0], '1');
  // => ["blissful", "cheerful", "delighted", ...]
}
```

#### `getWordListsForSense(entry, senseNumber)`

Get all word lists (synonyms, antonyms, related, etc.) for a sense.

```typescript
import { getWordListsForSense } from 'merriam-webster-api';

const lists = getWordListsForSense(entry, '1');
console.log(lists.synonyms);     // ["blissful", "cheerful", ...]
console.log(lists.antonyms);     // ["sad", "unhappy", ...]
console.log(lists.related);      // Related words
console.log(lists.nearAntonyms); // Near antonyms
console.log(lists.phrases);      // Phrase alternatives
```

#### `buildAudioUrl(sound)`

Build the full URL to a pronunciation audio file.

```typescript
import { buildAudioUrl } from 'merriam-webster-api';

const result = await mw.define('test');
if (result.found) {
  const entry = result.entries[0];
  const sound = entry.hwi.prs?.[0]?.sound;
  if (sound) {
    const audioUrl = buildAudioUrl(sound);
    // => "https://media.merriam-webster.com/audio/prons/en/us/mp3/t/test0001.mp3"
  }
}
```

#### `parseMarkup(text, options?)`

Convert MW's custom markup to plain text or HTML.

```typescript
import { parseMarkup } from 'merriam-webster-api';

parseMarkup('{bc}a means of {a_link|testing}');
// => ": a means of testing"

parseMarkup('{it}word{/it}', { format: 'html' });
// => "<i>word</i>"
```

#### `parseHeadword(hw)`

Remove syllable markers from a headword.

```typescript
import { parseHeadword } from 'merriam-webster-api';

parseHeadword('vol*u*mi*nous');
// => "voluminous"
```

### Type Guards

```typescript
import { isDictionaryEntries, isThesaurusEntries, isSuggestions } from 'merriam-webster-api';

// Use with raw API responses
const response = await fetch('...');
const data = await response.json();

if (isDictionaryEntries(data)) {
  // data is DictionaryEntry[]
}

if (isSuggestions(data)) {
  // data is string[]
}
```

## Error Handling

The client throws specific error types for different failure modes:

```typescript
import {
  MerriamWebster,
  TimeoutError,
  NetworkError,
  InvalidKeyError,
  APIError,
} from 'merriam-webster-api';

try {
  const result = await mw.define('test');
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log(`Request timed out after ${error.timeout}ms`);
  } else if (error instanceof InvalidKeyError) {
    console.log('Invalid API key - get one at dictionaryapi.com');
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  } else if (error instanceof APIError) {
    console.log(`API error: ${error.status} ${error.statusText}`);
  }
}
```

## Browser Usage & API Key Safety

This library is designed for **server-side use**. While it technically works in any JavaScript runtime with `fetch`, using it directly in browsers is not recommended:

### Why Not Browser?

1. **API Key Exposure**: Your Merriam-Webster API keys would be visible in browser DevTools, allowing anyone to steal and abuse them.

2. **CORS Restrictions**: The Merriam-Webster API does not include CORS headers, so browser requests will be blocked by the same-origin policy.

### Recommended Approach

For browser applications, create a thin server-side proxy:

```typescript
// Server (Node.js, Deno, Cloudflare Worker, etc.)
import { MerriamWebster } from 'merriam-webster-api';

const mw = new MerriamWebster({
  dictionaryKey: process.env.MW_DICTIONARY_KEY,
});

app.get('/api/define/:word', async (req, res) => {
  const result = await mw.define(req.params.word);
  res.json(result);
});
```

```typescript
// Browser client
const result = await fetch(`/api/define/${word}`).then(r => r.json());
```

This keeps your API keys secure on the server and avoids CORS issues.

## Types

All types are fully exported for use in your applications:

```typescript
import type {
  // Client types
  MerriamWebsterConfig,
  RequestOptions,
  DictionaryResult,
  ThesaurusResult,

  // Dictionary types
  DictionaryEntry,
  DictionaryMeta,
  HeadwordInfo,
  Definition,
  Sense,

  // Thesaurus types
  ThesaurusEntry,
  ThesaurusSense,
  ThesaurusWord,

  // Common types
  Pronunciation,
  SoundData,
  Inflection,
} from 'merriam-webster-api';
```

## License

MIT
