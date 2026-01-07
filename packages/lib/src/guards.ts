/**
 * Type guards for discriminating MW API responses.
 *
 * These guards enable TypeScript to narrow union types,
 * letting users check if a response contains entries or suggestions.
 */

import type { DictionaryEntry, DictionaryResponse } from './types/dictionary.js';
import type { ThesaurusEntry, ThesaurusResponse } from './types/thesaurus.js';

/**
 * Check if a dictionary response contains entries (word was found).
 *
 * Note: If using the MerriamWebster client, you don't need this guard -
 * just check `result.found`. This guard is for raw API responses.
 *
 * @param response - Raw dictionary API response
 * @returns True if response contains DictionaryEntry objects
 *
 * @example
 * ```ts
 * // For raw API responses (not using the client):
 * const response = await fetch('...').then(r => r.json());
 * if (isDictionaryEntries(response)) {
 *   // TypeScript knows response is DictionaryEntry[]
 *   console.log(response[0].shortdef);
 * }
 * ```
 */
export function isDictionaryEntries(
  response: DictionaryResponse
): response is DictionaryEntry[] {
  if (!Array.isArray(response) || response.length === 0) {
    return false;
  }
  // Dictionary entries have a 'meta' object with 'id' and 'uuid'
  return typeof response[0] === 'object' && response[0] !== null && 'meta' in response[0];
}

/**
 * Check if a thesaurus response contains entries (word was found).
 *
 * Note: If using the MerriamWebster client, you don't need this guard -
 * just check `result.found`. This guard is for raw API responses.
 *
 * @param response - Raw thesaurus API response
 * @returns True if response contains ThesaurusEntry objects
 *
 * @example
 * ```ts
 * // For raw API responses (not using the client):
 * const response = await fetch('...').then(r => r.json());
 * if (isThesaurusEntries(response)) {
 *   // TypeScript knows response is ThesaurusEntry[]
 *   console.log(response[0].meta.syns);
 * }
 * ```
 */
export function isThesaurusEntries(
  response: ThesaurusResponse
): response is ThesaurusEntry[] {
  if (!Array.isArray(response) || response.length === 0) {
    return false;
  }
  // Thesaurus entries have a 'meta' object with 'id' and 'uuid'
  return typeof response[0] === 'object' && response[0] !== null && 'meta' in response[0];
}

/**
 * Check if a response contains string suggestions (word not found).
 *
 * This works for both dictionary and thesaurus responses.
 * Returns true for empty arrays as well, since no entries means
 * no word was found.
 *
 * Note: If using the MerriamWebster client, you don't need this guard -
 * just check `result.found`. This guard is for raw API responses.
 *
 * @param response - Raw API response
 * @returns True if response contains string suggestions or is empty
 *
 * @example
 * ```ts
 * // For raw API responses (not using the client):
 * const response = await fetch('...').then(r => r.json());
 * if (isSuggestions(response)) {
 *   // TypeScript knows response is string[]
 *   console.log('Did you mean:', response.join(', '));
 * }
 * ```
 */
export function isSuggestions(
  response: DictionaryResponse | ThesaurusResponse
): response is string[] {
  if (!Array.isArray(response)) {
    return false;
  }
  // Empty array = no matches found (treat as suggestions case)
  if (response.length === 0) {
    return true;
  }
  // Suggestions are plain strings
  return typeof response[0] === 'string';
}
