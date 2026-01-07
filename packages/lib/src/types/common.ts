/**
 * Common types shared across dictionary and thesaurus responses.
 * These are the foundational building blocks used by all MW API types.
 */

/**
 * Sound data for pronunciation audio files.
 * Used to construct audio URLs via getAudioUrl().
 */
export interface SoundData {
  /** Audio filename (without extension) */
  audio: string;
  /** Subdirectory reference */
  ref: string;
  /** Status indicator */
  stat: string;
}

/**
 * Pronunciation information for a word or inflection.
 * Contains written pronunciation and optional audio reference.
 */
export interface Pronunciation {
  /** Written pronunciation in MW's notation (IPA-like) */
  mw: string;
  /** Optional label (e.g., "British", "also") */
  l?: string;
  /** Optional secondary label */
  l2?: string;
  /** Optional audio file reference */
  sound?: SoundData;
}

/**
 * Inflected form of a word (plurals, verb conjugations, etc.).
 */
export interface Inflection {
  /** Inflected form with syllable breaks (e.g., "test*ed") */
  if: string;
  /** Inflection cutback showing only the changed portion (e.g., "-ed") */
  ifc?: string;
  /** Inflection label (e.g., "also", "or") */
  il?: string;
  /** Pronunciations for this inflection */
  prs?: Pronunciation[];
}

/**
 * Attribution information for quoted material.
 * Used in verbal illustrations and quotes.
 */
export interface AttributionQuote {
  /** Author name */
  auth?: string;
  /** Source work title */
  source?: string;
  /** Publication date */
  aqdate?: string;
  /** Nested source info (e.g., essay within a collection) */
  subsource?: {
    source: string;
    aqdate?: string;
  };
}

/**
 * Verbal illustration (example sentence) showing word usage.
 */
export interface VerbalIllustration {
  /** Example text with markup (e.g., {wi}word{/wi} for the headword) */
  t: string;
  /** Attribution if this is a quote from a cited source */
  aq?: AttributionQuote;
}

/**
 * "Called also" note listing alternative names for a term.
 */
export interface CalledAlso {
  /** Introductory text (typically "called also") */
  intro: string;
  /** List of alternative names */
  cats: CalledAlsoTarget[];
}

/**
 * Individual target in a "called also" note.
 */
export interface CalledAlsoTarget {
  /** The alternative name */
  cat: string;
  /** Parenthesized sense number */
  pn?: string;
  /** Pronunciations for this alternative */
  prs?: Pronunciation[];
}

/**
 * Biographical name information for person entries.
 */
export interface BiographicalName {
  /** Personal/given name */
  pname?: string;
  /** Surname/family name */
  sname?: string;
  /** Alternate name (pen name, stage name, etc.) */
  altname?: string;
  /** Pronunciations */
  prs?: Pronunciation[];
}

/**
 * Run-in entry word, used primarily in geographic entries.
 */
export interface RunInWord {
  /** The run-in entry word */
  rie: string;
  /** Pronunciations */
  prs?: Pronunciation[];
}

/**
 * Container for run-in entry words.
 */
export interface RunIn {
  /** Array of run-in words with their data */
  riw: RunInWord[];
}

/**
 * Variant spelling of a word.
 */
export interface VariantSpelling {
  /** The variant form */
  va: string;
  /** Variant label (e.g., "or", "also") */
  vl?: string;
}

/**
 * Illustrative quotation with full attribution.
 */
export interface Quote {
  /** Quote text with markup (e.g., {qword}word{/qword} for the headword) */
  t: string;
  /** Attribution information */
  aq: AttributionQuote;
}
