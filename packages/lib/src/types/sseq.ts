/**
 * Sense Sequence (sseq) types for MW dictionary definitions.
 *
 * The sseq structure is deeply nested and represents the hierarchical
 * organization of word definitions:
 *
 * sseq (SenseSequence)
 *   └── SenseGroup[] - array of related senses
 *         └── SenseItem[] - individual items in group
 *               ├── ["sense", Sense] - standard definition
 *               ├── ["sen", TruncatedSense] - label only, no definition
 *               ├── ["bs", { sense: Sense }] - binding substitute (intro)
 *               └── ["pseq", ParallelSenseItem[]] - numbered subsenses (1), (2)
 */

import type {
  Pronunciation,
  Inflection,
  VerbalIllustration,
  CalledAlso,
  BiographicalName,
  RunIn,
  VariantSpelling,
} from './common.js';

// ============================================
// DEFINING TEXT (dt) - core definition content
// ============================================

/**
 * Supplemental note tuple - additional information about a definition.
 */
export type SupplementalNote = ['t', string];

/**
 * Content types that can appear within a usage note.
 */
export type UsageNoteContent =
  | ['text', string]
  | ['vis', VerbalIllustration[]]
  | ['ri', RunIn[]];

/**
 * Usage note - provides context about word usage.
 * Contains an array of content items.
 */
export type UsageNote = UsageNoteContent[];

/**
 * Defining text element types.
 * These tuples make up the content of a definition.
 *
 * Common types:
 * - "text": The main definition text with markup
 * - "vis": Verbal illustrations (example sentences)
 * - "uns": Usage notes
 * - "ca": "Called also" references
 *
 * Less common types:
 * - "snote": Supplemental notes
 * - "ri": Run-in entry words
 * - "bnw": Biographical name wrapper
 * - "urefs"/"srefs": Cross-references (rare)
 */
export type DefiningText =
  | ['text', string]
  | ['vis', VerbalIllustration[]]
  | ['uns', UsageNote[]]
  | ['ca', CalledAlso]
  | ['snote', SupplementalNote[]]
  | ['ri', RunIn[]]
  | ['bnw', BiographicalName]
  | ['urefs', unknown[]]
  | ['srefs', unknown[]];

/**
 * Etymology - word origin information.
 * Simple tuple of type and text content.
 */
export type Etymology = ['text', string];

// ============================================
// SENSE - individual definition
// ============================================

/**
 * Subdivided sense - a secondary meaning within a sense.
 * Introduced by a sense divider like "specifically" or "broadly".
 */
export interface SubdividedSense {
  /** Sense divider label (e.g., "specifically", "broadly", "especially") */
  sd: string;
  /** Definition text for this subdivision */
  dt: DefiningText[];
}

/**
 * A complete sense (definition) within an entry.
 * This is the primary unit of meaning in MW dictionaries.
 */
export interface Sense {
  /** Sense number (e.g., "1", "1 a", "(1)", "b") */
  sn?: string;
  /** Definition text array */
  dt?: DefiningText[];
  /** Subject/status labels (e.g., ["chiefly British"]) */
  sls?: string[];
  /** General labels */
  lbs?: string[];
  /** Inflections specific to this sense */
  ins?: Inflection[];
  /** Pronunciations specific to this sense */
  prs?: Pronunciation[];
  /** Grammatical label for this sense */
  sgram?: string;
  /** Variant spellings */
  vrs?: VariantSpelling[];
  /** Etymology (rare at sense level) */
  et?: Etymology[];
  /** Subdivided sense with secondary meaning */
  sdsense?: SubdividedSense;
}

/**
 * Truncated sense - has a sense number and labels but no definition.
 * Used for regional or dialectal variants that refer elsewhere.
 */
export interface TruncatedSense {
  /** Sense number */
  sn?: string;
  /** Subject/status labels */
  sls?: string[];
}

// ============================================
// SENSE SEQUENCE STRUCTURE
// ============================================

/**
 * Binding substitute - wraps a sense that introduces subsenses.
 * The "bs" sense provides a broad definition that the following
 * senses elaborate on.
 */
export interface BindingSubstitute {
  sense: Sense;
}

/**
 * Items that can appear in a parallel sequence (pseq).
 * Parallel sequences contain numbered subsenses like (1), (2).
 */
export type ParallelSenseItem =
  | ['sense', Sense]
  | ['bs', BindingSubstitute];

/**
 * Sense item - the discriminated union of all items that can
 * appear in a sense group.
 *
 * Types:
 * - "sense": Standard sense with definition
 * - "sen": Truncated sense (label only, no definition)
 * - "bs": Binding substitute (introductory sense)
 * - "pseq": Parallel sequence of numbered subsenses
 */
export type SenseItem =
  | ['sense', Sense]
  | ['sen', TruncatedSense]
  | ['bs', BindingSubstitute]
  | ['pseq', ParallelSenseItem[]];

/**
 * Sense group - a collection of related senses.
 * Groups are separated by major sense numbers (1, 2, 3...).
 */
export type SenseGroup = SenseItem[];

/**
 * Sense sequence - the complete nested structure of definitions.
 * This is the top-level array containing all sense groups.
 */
export type SenseSequence = SenseGroup[];

// ============================================
// DEFINITION CONTAINER
// ============================================

/**
 * Definition object containing a sense sequence.
 * May include a verb divider for verbs with transitive/intransitive forms.
 */
export interface Definition {
  /** Verb divider (e.g., "transitive verb", "intransitive verb") */
  vd?: string;
  /** The sense sequence containing all definitions */
  sseq: SenseSequence;
}
