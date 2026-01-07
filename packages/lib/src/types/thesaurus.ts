/**
 * Thesaurus response types for the MW Collegiate Thesaurus API.
 */

import type { Pronunciation } from './common.js';
import type { DefiningText } from './sseq.js';

/**
 * A word entry in thesaurus word lists.
 * Includes the word itself plus optional labels and variants.
 */
export interface ThesaurusWord {
  /** The word */
  wd: string;
  /** Subject/status labels (e.g., ["British", "informal"]) */
  wsls?: string[];
  /** Word variants */
  wvrs?: ThesaurusWordVariant[];
}

/**
 * Variant form of a thesaurus word.
 */
export interface ThesaurusWordVariant {
  /** The variant word */
  wva: string;
  /** Variant label (e.g., "also", "or") */
  wvl?: string;
}

/**
 * A sense (meaning) in a thesaurus entry.
 * Contains word lists for synonyms, antonyms, and related words.
 */
export interface ThesaurusSense {
  /** Sense number (e.g., "1", "2") */
  sn?: string;
  /** Definition text with examples */
  dt?: DefiningText[];
  /** Synonym groups */
  syn_list?: ThesaurusWord[][];
  /** Related word groups */
  rel_list?: ThesaurusWord[][];
  /** Near antonym groups */
  near_list?: ThesaurusWord[][];
  /** Antonym groups */
  ant_list?: ThesaurusWord[][];
  /** Phrase alternatives */
  phrase_list?: ThesaurusWord[][];
}

/**
 * Sense group tuple in thesaurus definitions.
 * Always a "sense" type with ThesaurusSense data.
 */
export type ThesaurusSenseGroup = ['sense', ThesaurusSense];

/**
 * Definition container in thesaurus entries.
 */
export interface ThesaurusDefinition {
  /** Nested sense sequence */
  sseq: ThesaurusSenseGroup[][];
}

/**
 * Target reference linking to the dictionary entry.
 */
export interface ThesaurusTarget {
  /** Target UUID */
  tuuid: string;
  /** Target source */
  tsrc: string;
}

/**
 * Metadata for a thesaurus entry.
 */
export interface ThesaurusMeta {
  /** Word identifier */
  id: string;
  /** Unique identifier */
  uuid: string;
  /** Source (always "coll_thes") */
  src: string;
  /** Section */
  section: string;
  /** Link to corresponding dictionary entry */
  target?: ThesaurusTarget;
  /** All forms for search matching */
  stems: string[];
  /** Flattened synonym groups - quick access without parsing sseq */
  syns: string[][];
  /** Flattened antonym groups - quick access without parsing sseq */
  ants: string[][];
  /** Whether the word is considered offensive */
  offensive: boolean;
}

/**
 * Headword information for thesaurus entries.
 */
export interface ThesaurusHeadwordInfo {
  /** Headword with syllable breaks */
  hw: string;
  /** Pronunciations */
  prs?: Pronunciation[];
}

/**
 * A complete thesaurus entry.
 * This is the main type returned by the thesaurus API.
 */
export interface ThesaurusEntry {
  /** Entry metadata */
  meta: ThesaurusMeta;
  /** Headword information */
  hwi: ThesaurusHeadwordInfo;
  /** Functional label / part of speech */
  fl?: string;
  /** Definitions with word lists */
  def: ThesaurusDefinition[];
  /** Short definitions (1-3 concise strings) */
  shortdef: string[];
}

/**
 * Thesaurus API response type.
 * Returns either an array of entries (word found) or an array of
 * string suggestions (word not found).
 */
export type ThesaurusResponse = ThesaurusEntry[] | string[];
