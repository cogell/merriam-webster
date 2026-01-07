// Helper exports - re-exports all helper functions

export { flattenDefinitions } from './definitions.js';
export type { FlattenDefinitionsOptions } from './definitions.js';

export {
  getSynonymsForSense,
  getAntonymsForSense,
  getWordListsForSense,
} from './thesaurus.js';
export type { WordLists } from './thesaurus.js';
