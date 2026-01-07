/**
 * Helper functions for extracting definitions from MW dictionary entries.
 */

import type { DictionaryEntry } from '../types/dictionary.js';
import type {
  Definition,
  Sense,
  SenseItem,
  ParallelSenseItem,
  BindingSubstitute,
  DefiningText,
} from '../types/sseq.js';
import { parseMarkup } from '../utils/markup.js';

/**
 * Options for flattenDefinitions.
 */
export interface FlattenDefinitionsOptions {
  /** If true, keep MW markup in definitions. Default: false (strip markup) */
  preserveMarkup?: boolean;
  /** If true, include definitions from sdsense (subdivided senses). Default: true */
  includeSdsense?: boolean;
}

/**
 * Extract plain text definitions from a dictionary entry.
 *
 * MW's `sseq` (sense sequence) structure is deeply nested and complex.
 * This helper flattens it into simple strings, making definitions
 * easy to display without understanding MW's internal format.
 *
 * @param entry - A dictionary entry from the API
 * @param options - Extraction options
 * @returns Array of definition strings
 *
 * @example
 * ```ts
 * const entry = response[0];
 * const definitions = flattenDefinitions(entry);
 * // => ["a procedure for critical evaluation", "a means of testing", ...]
 *
 * // Keep markup for custom rendering
 * const withMarkup = flattenDefinitions(entry, { preserveMarkup: true });
 * // => ["{bc}a procedure for critical evaluation", ...]
 * ```
 */
export function flattenDefinitions(
  entry: DictionaryEntry,
  options?: FlattenDefinitionsOptions
): string[] {
  const definitions: string[] = [];
  const preserveMarkup = options?.preserveMarkup ?? false;
  const includeSdsense = options?.includeSdsense ?? true;

  if (!entry.def) {
    return definitions;
  }

  for (const def of entry.def) {
    extractFromDefinition(def, definitions, preserveMarkup, includeSdsense);
  }

  return definitions;
}

/**
 * Extract definitions from a Definition object.
 */
function extractFromDefinition(
  def: Definition,
  definitions: string[],
  preserveMarkup: boolean,
  includeSdsense: boolean
): void {
  for (const senseGroup of def.sseq) {
    for (const senseItem of senseGroup) {
      extractFromSenseItem(senseItem, definitions, preserveMarkup, includeSdsense);
    }
  }
}

/**
 * Extract definitions from a SenseItem.
 */
function extractFromSenseItem(
  item: SenseItem,
  definitions: string[],
  preserveMarkup: boolean,
  includeSdsense: boolean
): void {
  const [type, data] = item;

  switch (type) {
    case 'sense':
      extractFromSense(data as Sense, definitions, preserveMarkup, includeSdsense);
      break;

    case 'bs':
      // Binding substitute wraps a sense
      extractFromSense(
        (data as BindingSubstitute).sense,
        definitions,
        preserveMarkup,
        includeSdsense
      );
      break;

    case 'pseq':
      // Parallel sequence contains sense or bs items
      for (const subItem of data as ParallelSenseItem[]) {
        extractFromSenseItem(subItem, definitions, preserveMarkup, includeSdsense);
      }
      break;

    case 'sen':
      // Truncated sense - no definition text, skip
      break;
  }
}

/**
 * Extract definition text from a Sense object.
 */
function extractFromSense(
  sense: Sense,
  definitions: string[],
  preserveMarkup: boolean,
  includeSdsense: boolean
): void {
  if (sense.dt) {
    const text = extractTextFromDt(sense.dt, preserveMarkup);
    if (text) {
      definitions.push(text);
    }
  }

  // Handle subdivided senses (e.g., "specifically", "broadly")
  if (includeSdsense && sense.sdsense?.dt) {
    const text = extractTextFromDt(sense.sdsense.dt, preserveMarkup);
    if (text) {
      definitions.push(text);
    }
  }
}

/**
 * Extract text content from DefiningText array.
 */
function extractTextFromDt(dt: DefiningText[], preserveMarkup: boolean): string {
  const textParts: string[] = [];

  for (const item of dt) {
    const [type, content] = item;

    if (type === 'text' && typeof content === 'string') {
      let text = content;

      if (!preserveMarkup) {
        text = parseMarkup(text);
      }

      // Remove leading colon and whitespace that often starts definitions
      text = text.replace(/^:\s*/, '');

      if (text) {
        textParts.push(text);
      }
    }
  }

  return textParts.join(' ').trim();
}
