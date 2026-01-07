# Merriam-Webster TypeScript API Client

A small, well-typed TypeScript library for the Merriam-Webster Dictionary API.

## Goals

- Fully typed responses with TypeScript
- Support Collegiate Dictionary and Collegiate Thesaurus
- Zero runtime dependencies (use native fetch)
- Universal runtime support (Node 18+, Browser, Cloudflare Workers, Bun, Deno)
- Clean, ergonomic API
- Handle edge cases (word not found, suggestions, rate limits)

## Package Info

- **Name:** `merriam-webster-api`
- **Build:** tsup (ESM + CJS dual output)
- **Target:** ES2020+ with native fetch

## API Endpoints

Base URL: `https://www.dictionaryapi.com/api/v3/references`

| Product | Endpoint |
|---------|----------|
| Collegiate Dictionary | `/collegiate/json/{word}?key={key}` |
| Collegiate Thesaurus | `/thesaurus/json/{word}?key={key}` |

---

## Complete Response Types

### Common Types

```typescript
// ============================================
// PRONUNCIATION
// ============================================
interface Pronunciation {
  mw: string;              // written pronunciation (IPA-like)
  l?: string;              // label (e.g., "British")
  l2?: string;             // secondary label
  sound?: {
    audio: string;         // audio filename
    ref: string;           // subdirectory reference
    stat: string;          // status
  };
}

// ============================================
// INFLECTIONS
// ============================================
interface Inflection {
  if: string;              // inflected form with syllable breaks
  ifc?: string;            // inflection cutback (e.g., "-ed")
  il?: string;             // inflection label (e.g., "also")
  prs?: Pronunciation[];
}

// ============================================
// ATTRIBUTION (for quotes)
// ============================================
interface AttributionQuote {
  auth?: string;           // author name
  source?: string;         // source work
  aqdate?: string;         // date
  subsource?: {
    source: string;
    aqdate?: string;
  };
}

// ============================================
// VERBAL ILLUSTRATION (example sentences)
// ============================================
interface VerbalIllustration {
  t: string;               // example text with {wi}word{/wi} markup
  aq?: AttributionQuote;   // attribution for quotes
}

// ============================================
// CALLED-ALSO NOTE
// ============================================
interface CalledAlso {
  intro: string;           // "called also"
  cats: {
    cat: string;           // the alternate name
    pn?: string;           // parenthesized number
    prs?: Pronunciation[];
  }[];
}

// ============================================
// BIOGRAPHICAL NAME WRAPPER
// ============================================
interface BiographicalName {
  pname?: string;          // personal name
  sname?: string;          // surname
  altname?: string;        // alternate name (pen name, etc.)
  prs?: Pronunciation[];
}

// ============================================
// RUN-IN ENTRY
// ============================================
interface RunIn {
  riw: {
    rie: string;           // run-in entry word
    prs?: Pronunciation[];
  }[];
}

// ============================================
// SUPPLEMENTAL NOTE
// ============================================
type SupplementalNote = ["t", string];

// ============================================
// USAGE NOTE (nested - can contain text, vis, ri)
// ============================================
type UsageNoteContent =
  | ["text", string]
  | ["vis", VerbalIllustration[]]
  | ["ri", RunIn[]];

type UsageNote = UsageNoteContent[];

// ============================================
// DEFINING TEXT (dt) - the core definition content
// ============================================
type DefiningText =
  | ["text", string]               // main definition text with markup
  | ["vis", VerbalIllustration[]]  // usage examples
  | ["uns", UsageNote[]]           // usage notes (nested arrays)
  | ["ca", CalledAlso]             // "called also X"
  | ["snote", SupplementalNote[]]  // supplemental info
  | ["ri", RunIn[]]                // run-in entry words
  | ["bnw", BiographicalName]      // biographical name wrapper
  | ["urefs", unknown[]]           // usage cross-references (rare)
  | ["srefs", unknown[]];          // synonym cross-references (rare)

// ============================================
// ETYMOLOGY
// ============================================
type Etymology = ["text", string]; // text with {it}italic{/it} markup

// ============================================
// RELATED WORD (undefined run-on)
// ============================================
interface RelatedWord {
  ure: string;             // the related word with syllable breaks
  fl: string;              // part of speech
  prs?: Pronunciation[];
  utxt?: DefiningText[];   // usage text
}

// ============================================
// QUOTE (illustrative quotation)
// ============================================
interface Quote {
  t: string;               // quote text with {qword}word{/qword} markup
  aq: AttributionQuote;
}
```

### Sense Sequence Types (sseq)

```typescript
// ============================================
// SENSE - individual definition sense
// ============================================
interface Sense {
  sn?: string;             // sense number: "1", "1 a", "(1)", "b", etc.
  dt?: DefiningText[];     // definition text array
  sls?: string[];          // subject/status labels ["chiefly British"]
  lbs?: string[];          // labels
  ins?: Inflection[];      // inflections within sense
  prs?: Pronunciation[];   // pronunciations within sense
  sgram?: string;          // sense-specific grammatical label
  vrs?: VariantSpelling[]; // variant spellings
  et?: Etymology[];        // etymology (rare at sense level)
  sdsense?: {              // subdivided sense
    sd: string;            // sense divider label ("specifically", "broadly")
    dt: DefiningText[];
  };
}

interface VariantSpelling {
  va: string;              // variant
  vl?: string;             // variant label
}

// ============================================
// TRUNCATED SENSE (label only, no definition)
// ============================================
interface TruncatedSense {
  sn?: string;
  sls?: string[];
}

// ============================================
// SENSE SEQUENCE ITEM TYPES
// ============================================
type SenseItem =
  | ["sense", Sense]                    // standard sense
  | ["sen", TruncatedSense]             // truncated sense (no dt)
  | ["bs", { sense: Sense }]            // binding substitute (intro sense)
  | ["pseq", ParallelSenseItem[]];      // parenthesized subsenses

type ParallelSenseItem =
  | ["sense", Sense]
  | ["bs", { sense: Sense }];

// A sense group contains related senses
type SenseGroup = SenseItem[];

// The full sense sequence
type SenseSequence = SenseGroup[];
```

### Dictionary Entry

```typescript
interface DictionaryEntry {
  meta: {
    id: string;            // word identifier (e.g., "test:1" for homograph)
    uuid: string;
    sort: string;          // sort key
    src: string;           // source dictionary ("collegiate")
    section: string;       // section ("alpha", "biog", "geog")
    stems: string[];       // inflections/variants
    offensive: boolean;
  };
  hom?: number;            // homograph number
  hwi: {
    hw: string;            // headword with syllable breaks ("vol*u*mi*nous")
    prs?: Pronunciation[];
  };
  fl?: string;             // functional label (part of speech)
  ins?: Inflection[];      // inflections
  def?: Definition[];
  et?: Etymology[];        // etymology
  date?: string;           // first known use
  shortdef: string[];      // concise definitions (usually 1-3)
  uros?: RelatedWord[];    // undefined run-ons (derived forms)
  dros?: DefinedRunOn[];   // defined run-ons (phrases)
  quotes?: Quote[];        // illustrative quotations
  dxnls?: string[];        // directional cross-reference notes
  lbs?: string[];          // labels
  sls?: string[];          // subject/status labels
  art?: {                  // artwork
    artid: string;
    capt: string;
  };
  table?: {                // table data
    tableid: string;
    displayname: string;
  };
}

interface Definition {
  vd?: string;             // verb divider ("transitive verb", "intransitive verb")
  sseq: SenseSequence;
}

interface DefinedRunOn {
  drp: string;             // defined run-on phrase
  def: Definition[];
}
```

### Thesaurus Entry

```typescript
interface ThesaurusEntry {
  meta: {
    id: string;
    uuid: string;
    src: string;           // "coll_thes"
    section: string;
    target?: {             // link to dictionary entry
      tuuid: string;
      tsrc: string;
    };
    stems: string[];
    syns: string[][];      // synonym groups (flattened)
    ants: string[][];      // antonym groups (flattened)
    offensive: boolean;
  };
  hwi: {
    hw: string;
    prs?: Pronunciation[];
  };
  fl?: string;             // part of speech
  def: ThesaurusDefinition[];
  shortdef: string[];
}

interface ThesaurusDefinition {
  sseq: ThesaurusSenseGroup[][];
}

type ThesaurusSenseGroup = ["sense", ThesaurusSense];

interface ThesaurusSense {
  sn?: string;             // sense number
  dt?: DefiningText[];     // definition with examples
  syn_list?: ThesaurusWord[][]; // synonyms (grouped)
  rel_list?: ThesaurusWord[][]; // related words
  near_list?: ThesaurusWord[][]; // near antonyms
  ant_list?: ThesaurusWord[][];  // antonyms
  phrase_list?: ThesaurusWord[][]; // phrase alternatives
}

interface ThesaurusWord {
  wd: string;              // the word
  wsls?: string[];         // subject labels ["British"]
  wvrs?: {                 // word variants
    wva: string;           // variant word
    wvl?: string;          // variant label ("also", "or")
  }[];
}
```

### Response Discrimination

```typescript
// Both APIs return arrays - either entries or string suggestions
type DictionaryResponse = DictionaryEntry[] | string[];
type ThesaurusResponse = ThesaurusEntry[] | string[];

// Type guard for checking if response contains entries
function isEntryArray<T extends { meta: { id: string } }>(
  response: T[] | string[]
): response is T[] {
  return (
    response.length > 0 &&
    typeof response[0] === "object" &&
    response[0] !== null &&
    "meta" in response[0]
  );
}
```

---

## Text Markup Reference

MW uses inline markup in definition text that needs parsing:

| Markup | Meaning | Example |
|--------|---------|---------|
| `{bc}` | bold colon | Definition separator |
| `{sx\|word\|\|}` | synonym cross-ref | Link to synonym |
| `{a_link\|word}` | auto-link | Link to related word |
| `{d_link\|word\|sense}` | definition link | Link to specific sense |
| `{dxt\|word\|\|}` | cross-ref target | |
| `{dx_ety}...{/dx_ety}` | etymology cross-ref | |
| `{it}...{/it}` | italic | Foreign words, titles |
| `{wi}...{/wi}` | word illustration | Headword in example |
| `{qword}...{/qword}` | quote word | Headword in quote |
| `{sc}...{/sc}` | small caps | |
| `{inf}...{/inf}` | subscript | |
| `{sup}...{/sup}` | superscript | |

---

## Library API Design

```typescript
import { MerriamWebster } from "merriam-webster-api";

const mw = new MerriamWebster({
  dictionaryKey: process.env.MW_DICTIONARY_API_KEY,
  thesaurusKey: process.env.MW_THESAURUS_API_KEY, // optional
});

// Dictionary lookup
const result = await mw.define("ubiquitous");

if (result.found) {
  console.log(result.entries);           // DictionaryEntry[]
  console.log(result.entries[0].shortdef); // Quick definitions

  // Use helper to flatten complex sseq
  const definitions = mw.flattenDefinitions(result.entries[0]);
  console.log(definitions); // string[] - just the definition texts
} else {
  console.log(result.suggestions);       // string[]
}

// Thesaurus lookup
const thesaurus = await mw.synonyms("happy");

if (thesaurus.found) {
  const entry = thesaurus.entries[0];
  console.log(entry.meta.syns);          // Quick synonym access

  // Get synonyms for a specific sense
  const sense1Syns = mw.getSynonymsForSense(entry, "1");
}

// Audio URL helper
const audioUrl = mw.getAudioUrl(entry.hwi.prs[0].sound);
// => https://media.merriam-webster.com/audio/prons/en/us/mp3/u/ubiqui03.mp3

// Parse markup helper
const plainText = mw.parseMarkup("{bc}a means of {a_link|testing}");
// => ": a means of testing"
```

---

## File Structure

```
merriam-webster-api/
├── src/
│   ├── index.ts              # main exports
│   ├── client.ts             # MerriamWebster class
│   ├── types/
│   │   ├── dictionary.ts     # dictionary response types
│   │   ├── thesaurus.ts      # thesaurus response types
│   │   ├── common.ts         # shared types (Pronunciation, etc.)
│   │   └── sseq.ts           # sense sequence types
│   ├── utils/
│   │   ├── audio.ts          # audio URL builder
│   │   ├── markup.ts         # markup parser
│   │   └── flatten.ts        # flattenDefinitions helper
│   └── guards.ts             # type guards
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## Implementation Plan

### Phase 1: Core Types
- [ ] Define common types (`types/common.ts`)
- [ ] Define sseq types (`types/sseq.ts`)
- [ ] Define dictionary response types (`types/dictionary.ts`)
- [ ] Define thesaurus response types (`types/thesaurus.ts`)
- [ ] Add type guards (`guards.ts`)

### Phase 2: Client Implementation
- [ ] Create `MerriamWebster` client class
- [ ] Implement `define()` method for dictionary lookups
- [ ] Implement `synonyms()` method for thesaurus lookups
- [ ] Handle word-not-found (suggestions) response
- [ ] Add error handling for network/API errors
- [ ] Add configurable timeout support

### Phase 3: Utilities
- [ ] Audio URL builder (`utils/audio.ts`)
- [ ] `flattenDefinitions()` helper - extract plain definition strings from sseq
- [ ] `getSynonymsForSense()` helper - get synonyms for specific sense number
- [ ] `parseMarkup()` helper - convert MW markup to plain text
- [ ] `parseHeadword()` helper - remove syllable markers from hw

### Phase 4: Build & Polish
- [ ] Configure tsup for ESM + CJS dual output
- [ ] Configure package.json for npm publishing
- [ ] Add JSDoc comments
- [ ] Write README with usage examples
- [ ] Add basic tests (unit tests with mocked responses)

---

## Audio URL Format

MW audio files follow this pattern:
```
https://media.merriam-webster.com/audio/prons/en/us/mp3/{subdir}/{filename}.mp3
```

Subdirectory rules:
- If filename begins with "bix", subdir = "bix"
- If filename begins with "gg", subdir = "gg"
- If filename begins with a number or punctuation, subdir = "number"
- Otherwise, subdir = first letter of filename

```typescript
function getAudioSubdir(filename: string): string {
  if (filename.startsWith("bix")) return "bix";
  if (filename.startsWith("gg")) return "gg";
  if (/^[0-9]/.test(filename) || /^[^a-z]/i.test(filename)) return "number";
  return filename[0].toLowerCase();
}
```

---

## Notes

- MW Terms of Service limit usage to 2 API products max
- API keys are free for non-commercial use at dictionaryapi.com
- Rate limits are generous but undocumented
- The `shortdef` array provides quick access without parsing sseq
- For thesaurus, `meta.syns` and `meta.ants` provide flattened quick access
