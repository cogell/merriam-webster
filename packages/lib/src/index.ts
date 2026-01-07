// Main entry point - re-exports all public API

// Client
export { MerriamWebster } from './client.js';
export type {
  MerriamWebsterConfig,
  RequestOptions,
  DictionaryResult,
  DictionaryFoundResult,
  DictionaryNotFoundResult,
  ThesaurusResult,
  ThesaurusFoundResult,
  ThesaurusNotFoundResult,
} from './client.js';

// Errors
export {
  MerriamWebsterError,
  TimeoutError,
  NetworkError,
  InvalidKeyError,
  APIError,
} from './errors.js';

// Types
export * from './types/index.js';

// Type guards
export {
  isDictionaryEntries,
  isThesaurusEntries,
  isSuggestions,
} from './guards.js';

// Utilities
export * from './utils/index.js';

// Helpers
export * from './helpers/index.js';
