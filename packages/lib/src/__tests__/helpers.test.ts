import { describe, it, expect } from 'vitest';
import { flattenDefinitions } from '../helpers/definitions.js';
import {
  getSynonymsForSense,
  getAntonymsForSense,
  getWordListsForSense,
} from '../helpers/thesaurus.js';
import type { DictionaryEntry } from '../types/dictionary.js';
import type { ThesaurusEntry } from '../types/thesaurus.js';

describe('flattenDefinitions', () => {
  const createEntry = (sseq: unknown): DictionaryEntry => ({
    meta: {
      id: 'test',
      uuid: '123',
      sort: 'test',
      src: 'collegiate',
      section: 'alpha',
      stems: ['test'],
      offensive: false,
    },
    hwi: { hw: 'test' },
    shortdef: ['test def'],
    def: [{ sseq: sseq as NonNullable<DictionaryEntry['def']>[0]['sseq'] }],
  });

  it('extracts text from simple sense', () => {
    const entry = createEntry([
      [['sense', { dt: [['text', '{bc}a simple definition']] }]],
    ]);
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual(['a simple definition']);
  });

  it('extracts text from multiple senses', () => {
    const entry = createEntry([
      [['sense', { dt: [['text', '{bc}first definition']] }]],
      [['sense', { dt: [['text', '{bc}second definition']] }]],
    ]);
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual(['first definition', 'second definition']);
  });

  it('extracts text from binding substitute', () => {
    const entry = createEntry([
      [['bs', { sense: { dt: [['text', '{bc}intro definition']] } }]],
    ]);
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual(['intro definition']);
  });

  it('handles pseq (parallel sequence)', () => {
    const entry = createEntry([
      [
        [
          'pseq',
          [
            ['sense', { dt: [['text', '{bc}first subsense']] }],
            ['sense', { dt: [['text', '{bc}second subsense']] }],
          ],
        ],
      ],
    ]);
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual(['first subsense', 'second subsense']);
  });

  it('skips truncated senses (sen)', () => {
    const entry = createEntry([[['sen', { sn: '1' }]]]);
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual([]);
  });

  it('handles sdsense (subdivided sense)', () => {
    const entry = createEntry([
      [
        [
          'sense',
          {
            dt: [['text', '{bc}main definition']],
            sdsense: {
              sd: 'specifically',
              dt: [['text', '{bc}specific definition']],
            },
          },
        ],
      ],
    ]);
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual(['main definition', 'specific definition']);
  });

  it('excludes sdsense when includeSdsense is false', () => {
    const entry = createEntry([
      [
        [
          'sense',
          {
            dt: [['text', '{bc}main definition']],
            sdsense: {
              sd: 'specifically',
              dt: [['text', '{bc}specific definition']],
            },
          },
        ],
      ],
    ]);
    const defs = flattenDefinitions(entry, { includeSdsense: false });
    expect(defs).toEqual(['main definition']);
  });

  it('preserves markup when preserveMarkup is true', () => {
    const entry = createEntry([
      [['sense', { dt: [['text', '{bc}a {it}test{/it} definition']] }]],
    ]);
    const defs = flattenDefinitions(entry, { preserveMarkup: true });
    expect(defs).toEqual(['{bc}a {it}test{/it} definition']);
  });

  it('returns empty array for entry without definitions', () => {
    const entry: DictionaryEntry = {
      meta: {
        id: 'test',
        uuid: '123',
        sort: 'test',
        src: 'collegiate',
        section: 'alpha',
        stems: ['test'],
        offensive: false,
      },
      hwi: { hw: 'test' },
      shortdef: ['test def'],
    };
    const defs = flattenDefinitions(entry);
    expect(defs).toEqual([]);
  });
});

describe('getSynonymsForSense', () => {
  const createThesaurusEntry = (senses: unknown[]): ThesaurusEntry => ({
    meta: {
      id: 'happy',
      uuid: '456',
      src: 'coll_thes',
      section: 'alpha',
      stems: ['happy'],
      syns: [],
      ants: [],
      offensive: false,
    },
    hwi: { hw: 'happy' },
    def: [
      {
        sseq: senses.map((s) => [['sense', s]]) as ThesaurusEntry['def'][0]['sseq'],
      },
    ],
    shortdef: [],
  });

  it('extracts synonyms for matching sense number', () => {
    const entry = createThesaurusEntry([
      {
        sn: '1',
        syn_list: [[{ wd: 'joyful' }, { wd: 'glad' }], [{ wd: 'cheerful' }]],
      },
    ]);
    const syns = getSynonymsForSense(entry, '1');
    expect(syns).toEqual(['joyful', 'glad', 'cheerful']);
  });

  it('returns empty array for non-existent sense', () => {
    const entry = createThesaurusEntry([
      {
        sn: '1',
        syn_list: [[{ wd: 'joyful' }]],
      },
    ]);
    const syns = getSynonymsForSense(entry, '2');
    expect(syns).toEqual([]);
  });

  it('returns empty array when sense has no synonyms', () => {
    const entry = createThesaurusEntry([{ sn: '1' }]);
    const syns = getSynonymsForSense(entry, '1');
    expect(syns).toEqual([]);
  });
});

describe('getAntonymsForSense', () => {
  const createThesaurusEntry = (senses: unknown[]): ThesaurusEntry => ({
    meta: {
      id: 'happy',
      uuid: '456',
      src: 'coll_thes',
      section: 'alpha',
      stems: ['happy'],
      syns: [],
      ants: [],
      offensive: false,
    },
    hwi: { hw: 'happy' },
    def: [
      {
        sseq: senses.map((s) => [['sense', s]]) as ThesaurusEntry['def'][0]['sseq'],
      },
    ],
    shortdef: [],
  });

  it('extracts antonyms for matching sense number', () => {
    const entry = createThesaurusEntry([
      {
        sn: '1',
        ant_list: [[{ wd: 'sad' }, { wd: 'unhappy' }]],
      },
    ]);
    const ants = getAntonymsForSense(entry, '1');
    expect(ants).toEqual(['sad', 'unhappy']);
  });
});

describe('getWordListsForSense', () => {
  const createThesaurusEntry = (senses: unknown[]): ThesaurusEntry => ({
    meta: {
      id: 'happy',
      uuid: '456',
      src: 'coll_thes',
      section: 'alpha',
      stems: ['happy'],
      syns: [],
      ants: [],
      offensive: false,
    },
    hwi: { hw: 'happy' },
    def: [
      {
        sseq: senses.map((s) => [['sense', s]]) as ThesaurusEntry['def'][0]['sseq'],
      },
    ],
    shortdef: [],
  });

  it('returns all word lists for a sense', () => {
    const entry = createThesaurusEntry([
      {
        sn: '1',
        syn_list: [[{ wd: 'joyful' }]],
        ant_list: [[{ wd: 'sad' }]],
        rel_list: [[{ wd: 'pleased' }]],
        near_list: [[{ wd: 'displeased' }]],
        phrase_list: [[{ wd: 'on cloud nine' }]],
      },
    ]);
    const lists = getWordListsForSense(entry, '1');
    expect(lists.synonyms).toEqual(['joyful']);
    expect(lists.antonyms).toEqual(['sad']);
    expect(lists.related).toEqual(['pleased']);
    expect(lists.nearAntonyms).toEqual(['displeased']);
    expect(lists.phrases).toEqual(['on cloud nine']);
  });

  it('returns empty arrays for non-existent sense', () => {
    const entry = createThesaurusEntry([{ sn: '1' }]);
    const lists = getWordListsForSense(entry, '2');
    expect(lists.synonyms).toEqual([]);
    expect(lists.antonyms).toEqual([]);
    expect(lists.related).toEqual([]);
    expect(lists.nearAntonyms).toEqual([]);
    expect(lists.phrases).toEqual([]);
  });
});
