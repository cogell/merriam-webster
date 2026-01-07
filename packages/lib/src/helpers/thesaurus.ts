/**
 * Helper functions for extracting data from MW thesaurus entries.
 */

import type {
  ThesaurusEntry,
  ThesaurusSense,
  ThesaurusWord,
} from '../types/thesaurus.js';

/**
 * All word lists from a thesaurus sense.
 */
export interface WordLists {
  /** Synonym words */
  synonyms: string[];
  /** Related words */
  related: string[];
  /** Near antonyms */
  nearAntonyms: string[];
  /** Antonyms */
  antonyms: string[];
  /** Phrase alternatives */
  phrases: string[];
}

/**
 * Extract all word lists from a specific sense of a thesaurus entry.
 *
 * @param entry - A thesaurus entry from the API
 * @param senseNumber - The sense number to find (e.g., "1", "2")
 * @returns All word types for that sense, or empty arrays if not found
 *
 * @example
 * ```ts
 * const entry = response[0];
 * const lists = getWordListsForSense(entry, "1");
 * console.log('Synonyms:', lists.synonyms);
 * console.log('Antonyms:', lists.antonyms);
 * ```
 */
export function getWordListsForSense(
  entry: ThesaurusEntry,
  senseNumber: string
): WordLists {
  const emptyResult: WordLists = {
    synonyms: [],
    related: [],
    nearAntonyms: [],
    antonyms: [],
    phrases: [],
  };

  const sense = findSenseByNumber(entry, senseNumber);
  if (!sense) {
    return emptyResult;
  }

  return {
    synonyms: flattenWordList(sense.syn_list),
    related: flattenWordList(sense.rel_list),
    nearAntonyms: flattenWordList(sense.near_list),
    antonyms: flattenWordList(sense.ant_list),
    phrases: flattenWordList(sense.phrase_list),
  };
}

/**
 * Extract synonyms for a specific sense of a thesaurus entry.
 *
 * This is a convenience wrapper around getWordListsForSense
 * for when you only need synonyms.
 *
 * @param entry - A thesaurus entry from the API
 * @param senseNumber - The sense number to find (e.g., "1", "2")
 * @returns Array of synonym words, or empty array if sense not found
 *
 * @example
 * ```ts
 * const entry = response[0];
 * const synonyms = getSynonymsForSense(entry, "1");
 * // => ["joyful", "cheerful", "glad", ...]
 * ```
 */
export function getSynonymsForSense(
  entry: ThesaurusEntry,
  senseNumber: string
): string[] {
  return getWordListsForSense(entry, senseNumber).synonyms;
}

/**
 * Extract antonyms for a specific sense of a thesaurus entry.
 *
 * @param entry - A thesaurus entry from the API
 * @param senseNumber - The sense number to find (e.g., "1", "2")
 * @returns Array of antonym words, or empty array if sense not found
 *
 * @example
 * ```ts
 * const entry = response[0];
 * const antonyms = getAntonymsForSense(entry, "1");
 * // => ["sad", "unhappy", "miserable", ...]
 * ```
 */
export function getAntonymsForSense(
  entry: ThesaurusEntry,
  senseNumber: string
): string[] {
  return getWordListsForSense(entry, senseNumber).antonyms;
}

/**
 * Find a sense by its sense number within an entry.
 */
function findSenseByNumber(
  entry: ThesaurusEntry,
  senseNumber: string
): ThesaurusSense | null {
  for (const def of entry.def) {
    for (const senseGroup of def.sseq) {
      for (const [type, sense] of senseGroup) {
        if (type === 'sense' && sense.sn === senseNumber) {
          return sense;
        }
      }
    }
  }
  return null;
}

/**
 * Flatten a nested word list into plain strings.
 *
 * MW groups words in nested arrays. This extracts
 * just the word strings (wd property).
 */
function flattenWordList(list?: ThesaurusWord[][]): string[] {
  if (!list) {
    return [];
  }

  const words: string[] = [];
  for (const group of list) {
    for (const word of group) {
      words.push(word.wd);
    }
  }
  return words;
}
