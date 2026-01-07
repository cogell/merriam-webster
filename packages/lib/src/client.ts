/**
 * MerriamWebster API client.
 *
 * Main entry point for interacting with MW Dictionary and Thesaurus APIs.
 */

import type { DictionaryEntry, DictionaryResponse } from './types/dictionary.js';
import type { ThesaurusEntry, ThesaurusResponse } from './types/thesaurus.js';
import { isDictionaryEntries, isThesaurusEntries } from './guards.js';
import {
  TimeoutError,
  NetworkError,
  InvalidKeyError,
  APIError,
} from './errors.js';

/** Base URL for MW API endpoints */
const API_BASE_URL = 'https://www.dictionaryapi.com/api/v3/references';

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 10000;

/**
 * Configuration options for the MerriamWebster client.
 */
export interface MerriamWebsterConfig {
  /** API key for the Collegiate Dictionary */
  dictionaryKey?: string;
  /** API key for the Collegiate Thesaurus */
  thesaurusKey?: string;
  /** Default timeout for requests in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Options for individual API requests.
 */
export interface RequestOptions {
  /** Override the default timeout for this request */
  timeout?: number;
  /** Custom AbortSignal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Result returned when a word is found in the dictionary.
 */
export interface DictionaryFoundResult {
  found: true;
  entries: DictionaryEntry[];
}

/**
 * Result returned when a word is not found in the dictionary.
 */
export interface DictionaryNotFoundResult {
  found: false;
  suggestions: string[];
}

/**
 * Discriminated union result type for dictionary lookups.
 * Check the `found` property to determine if entries or suggestions are available.
 */
export type DictionaryResult = DictionaryFoundResult | DictionaryNotFoundResult;

/**
 * Result returned when a word is found in the thesaurus.
 */
export interface ThesaurusFoundResult {
  found: true;
  entries: ThesaurusEntry[];
}

/**
 * Result returned when a word is not found in the thesaurus.
 */
export interface ThesaurusNotFoundResult {
  found: false;
  suggestions: string[];
}

/**
 * Discriminated union result type for thesaurus lookups.
 * Check the `found` property to determine if entries or suggestions are available.
 */
export type ThesaurusResult = ThesaurusFoundResult | ThesaurusNotFoundResult;

/**
 * Merriam-Webster API client.
 *
 * Provides typed access to the Collegiate Dictionary and Thesaurus APIs.
 *
 * @example
 * ```ts
 * const mw = new MerriamWebster({
 *   dictionaryKey: 'your-dictionary-key',
 *   thesaurusKey: 'your-thesaurus-key',
 * });
 *
 * // Look up a word definition
 * const result = await mw.define('test');
 * if (result.found) {
 *   console.log(result.entries[0].shortdef);
 * } else {
 *   console.log('Did you mean:', result.suggestions.join(', '));
 * }
 *
 * // Look up synonyms
 * const synonyms = await mw.synonyms('happy');
 * ```
 */
export class MerriamWebster {
  private readonly dictionaryKey?: string;
  private readonly thesaurusKey?: string;
  private readonly defaultTimeout: number;

  /**
   * Create a new MerriamWebster client.
   *
   * @param config - Client configuration
   * @throws Error if neither dictionaryKey nor thesaurusKey is provided
   */
  constructor(config: MerriamWebsterConfig) {
    if (!config.dictionaryKey && !config.thesaurusKey) {
      throw new Error(
        'MerriamWebster: At least one of dictionaryKey or thesaurusKey is required'
      );
    }

    this.dictionaryKey = config.dictionaryKey;
    this.thesaurusKey = config.thesaurusKey;
    this.defaultTimeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Look up a word in the dictionary.
   *
   * @param word - The word to look up
   * @param options - Request options (timeout, signal)
   * @returns Result with entries if found, or suggestions if not found
   * @throws Error if dictionaryKey was not configured
   * @throws TimeoutError if request times out
   * @throws NetworkError if network request fails
   * @throws InvalidKeyError if API key is invalid
   * @throws APIError for other HTTP errors
   *
   * @example
   * ```ts
   * const result = await mw.define('test');
   * if (result.found) {
   *   console.log(result.entries[0].shortdef);
   * } else {
   *   console.log('Did you mean:', result.suggestions.join(', '));
   * }
   * ```
   */
  async define(word: string, options?: RequestOptions): Promise<DictionaryResult> {
    if (!this.dictionaryKey) {
      throw new Error('MerriamWebster: dictionaryKey is required for define()');
    }

    const response = await this.request<DictionaryResponse>(
      'collegiate',
      word,
      this.dictionaryKey,
      options
    );

    if (isDictionaryEntries(response)) {
      return { found: true, entries: response };
    }

    // Word not found - response is string[] suggestions (possibly empty)
    return { found: false, suggestions: response };
  }

  /**
   * Look up synonyms for a word in the thesaurus.
   *
   * @param word - The word to look up
   * @param options - Request options (timeout, signal)
   * @returns Result with entries if found, or suggestions if not found
   * @throws Error if thesaurusKey was not configured
   * @throws TimeoutError if request times out
   * @throws NetworkError if network request fails
   * @throws InvalidKeyError if API key is invalid
   * @throws APIError for other HTTP errors
   *
   * @example
   * ```ts
   * const result = await mw.synonyms('happy');
   * if (result.found) {
   *   console.log(result.entries[0].meta.syns);
   * }
   * ```
   */
  async synonyms(word: string, options?: RequestOptions): Promise<ThesaurusResult> {
    if (!this.thesaurusKey) {
      throw new Error('MerriamWebster: thesaurusKey is required for synonyms()');
    }

    const response = await this.request<ThesaurusResponse>(
      'thesaurus',
      word,
      this.thesaurusKey,
      options
    );

    if (isThesaurusEntries(response)) {
      return { found: true, entries: response };
    }

    // Word not found - response is string[] suggestions (possibly empty)
    return { found: false, suggestions: response };
  }

  /**
   * Make an API request with timeout handling.
   *
   * @param endpoint - API endpoint ('collegiate' or 'thesaurus')
   * @param word - Word to look up
   * @param apiKey - API key for authentication
   * @param options - Request options
   * @returns Parsed JSON response
   * @throws TimeoutError if request times out
   * @throws NetworkError if network request fails
   * @throws InvalidKeyError if API key is invalid (403)
   * @throws APIError for other HTTP errors
   */
  private async request<T>(
    endpoint: 'collegiate' | 'thesaurus',
    word: string,
    apiKey: string,
    options?: RequestOptions
  ): Promise<T> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const encodedWord = encodeURIComponent(word);
    const url = `${API_BASE_URL}/${endpoint}/json/${encodedWord}?key=${apiKey}`;

    // Create AbortController for timeout
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Set up timeout unless a custom signal was provided
    if (!options?.signal) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    // Use custom signal or our timeout controller
    const signal = options?.signal ?? controller.signal;

    try {
      const response = await fetch(url, { signal });

      // Handle specific HTTP error codes
      if (response.status === 403) {
        throw new InvalidKeyError(endpoint === 'collegiate' ? 'dictionary' : 'thesaurus');
      }

      if (!response.ok) {
        throw new APIError(response.status, response.statusText);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Re-throw our custom errors as-is
      if (
        error instanceof TimeoutError ||
        error instanceof NetworkError ||
        error instanceof InvalidKeyError ||
        error instanceof APIError
      ) {
        throw error;
      }

      // Handle timeout abort
      if (error instanceof Error && error.name === 'AbortError') {
        if (!options?.signal) {
          throw new TimeoutError(timeout);
        }
        // User-provided signal was aborted
        throw error;
      }

      // Wrap other errors as NetworkError
      if (error instanceof Error) {
        throw new NetworkError(error.message, error);
      }

      throw new NetworkError('Unknown network error');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
