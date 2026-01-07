/**
 * Dictionary response types for the MW Collegiate Dictionary API.
 */

import type {
  Pronunciation,
  Inflection,
  Quote,
  VariantSpelling,
} from './common.js';
import type { Definition, DefiningText, Etymology } from './sseq.js';

/**
 * Related word (undefined run-on) - derived forms like "tester", "testable".
 * These are words derived from the headword that don't have their own entries.
 */
export interface RelatedWord {
  /** The related word with syllable breaks (e.g., "test*er") */
  ure: string;
  /** Part of speech (e.g., "noun", "adjective") */
  fl: string;
  /** Pronunciations */
  prs?: Pronunciation[];
  /** Usage text */
  utxt?: DefiningText[];
}

/**
 * Defined run-on - phrases containing the headword that have definitions.
 * Examples: "test the waters", "put to the test"
 */
export interface DefinedRunOn {
  /** The run-on phrase */
  drp: string;
  /** Definitions for this phrase */
  def: Definition[];
}

/**
 * Artwork reference for entries with illustrations.
 */
export interface Artwork {
  /** Artwork identifier */
  artid: string;
  /** Caption text */
  capt: string;
}

/**
 * Table reference for entries with tabular data.
 */
export interface Table {
  /** Table identifier */
  tableid: string;
  /** Display name */
  displayname: string;
}

/**
 * Metadata for a dictionary entry.
 */
export interface DictionaryMeta {
  /** Word identifier (e.g., "test:1" for first homograph) */
  id: string;
  /** Unique identifier */
  uuid: string;
  /** Sort key for ordering */
  sort: string;
  /** Source dictionary (e.g., "collegiate") */
  src: string;
  /** Section (e.g., "alpha", "biog", "geog") */
  section: string;
  /** All inflections and variants for search matching */
  stems: string[];
  /** Whether the word is considered offensive */
  offensive: boolean;
}

/**
 * Headword information - the main word being defined.
 */
export interface HeadwordInfo {
  /** Headword with syllable breaks (e.g., "vol*u*mi*nous") */
  hw: string;
  /** Pronunciations */
  prs?: Pronunciation[];
}

/**
 * A complete dictionary entry.
 * This is the main type returned by the dictionary API.
 */
export interface DictionaryEntry {
  /** Entry metadata */
  meta: DictionaryMeta;
  /** Homograph number (for words with multiple entries) */
  hom?: number;
  /** Headword information */
  hwi: HeadwordInfo;
  /** Functional label / part of speech (e.g., "noun", "verb") */
  fl?: string;
  /** Inflections (plurals, verb forms, etc.) */
  ins?: Inflection[];
  /** Definitions */
  def?: Definition[];
  /** Etymology (word origin) */
  et?: Etymology[];
  /** Date of first known use */
  date?: string;
  /** Short definitions (1-3 concise strings) - most useful for quick access */
  shortdef: string[];
  /** Undefined run-ons (derived forms) */
  uros?: RelatedWord[];
  /** Defined run-ons (phrases) */
  dros?: DefinedRunOn[];
  /** Illustrative quotations */
  quotes?: Quote[];
  /** Cross-reference notes */
  dxnls?: string[];
  /** General labels */
  lbs?: string[];
  /** Subject/status labels */
  sls?: string[];
  /** Variant spellings at entry level */
  vrs?: VariantSpelling[];
  /** Artwork reference */
  art?: Artwork;
  /** Table reference */
  table?: Table;
}

/**
 * Dictionary API response type.
 * Returns either an array of entries (word found) or an array of
 * string suggestions (word not found).
 */
export type DictionaryResponse = DictionaryEntry[] | string[];
