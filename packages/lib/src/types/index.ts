// Type exports - re-exports all public types

export type {
  SoundData,
  Pronunciation,
  Inflection,
  AttributionQuote,
  VerbalIllustration,
  CalledAlso,
  CalledAlsoTarget,
  BiographicalName,
  RunInWord,
  RunIn,
  VariantSpelling,
  Quote,
} from './common.js';

export type {
  SupplementalNote,
  UsageNoteContent,
  UsageNote,
  DefiningText,
  Etymology,
  SubdividedSense,
  Sense,
  TruncatedSense,
  BindingSubstitute,
  ParallelSenseItem,
  SenseItem,
  SenseGroup,
  SenseSequence,
  Definition,
} from './sseq.js';

export type {
  RelatedWord,
  DefinedRunOn,
  Artwork,
  Table,
  DictionaryMeta,
  HeadwordInfo,
  DictionaryEntry,
  DictionaryResponse,
} from './dictionary.js';

export type {
  ThesaurusWord,
  ThesaurusWordVariant,
  ThesaurusSense,
  ThesaurusSenseGroup,
  ThesaurusDefinition,
  ThesaurusTarget,
  ThesaurusMeta,
  ThesaurusHeadwordInfo,
  ThesaurusEntry,
  ThesaurusResponse,
} from './thesaurus.js';
