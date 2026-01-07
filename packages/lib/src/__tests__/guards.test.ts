import { describe, it, expect } from 'vitest';
import {
  isDictionaryEntries,
  isThesaurusEntries,
  isSuggestions,
} from '../guards.js';
import type { DictionaryEntry } from '../types/dictionary.js';
import type { ThesaurusEntry } from '../types/thesaurus.js';

describe('isDictionaryEntries', () => {
  it('returns true for valid dictionary entries', () => {
    const entries: DictionaryEntry[] = [
      {
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
        shortdef: ['a definition'],
      },
    ];
    expect(isDictionaryEntries(entries)).toBe(true);
  });

  it('returns false for string suggestions', () => {
    const suggestions = ['test', 'testing', 'tested'];
    expect(isDictionaryEntries(suggestions)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isDictionaryEntries([])).toBe(false);
  });
});

describe('isThesaurusEntries', () => {
  it('returns true for valid thesaurus entries', () => {
    const entries: ThesaurusEntry[] = [
      {
        meta: {
          id: 'happy',
          uuid: '456',
          src: 'coll_thes',
          section: 'alpha',
          stems: ['happy'],
          syns: [['joyful', 'glad']],
          ants: [['sad', 'unhappy']],
          offensive: false,
        },
        hwi: { hw: 'happy' },
        def: [],
        shortdef: ['feeling pleasure'],
      },
    ];
    expect(isThesaurusEntries(entries)).toBe(true);
  });

  it('returns false for string suggestions', () => {
    const suggestions = ['happy', 'happily', 'happiness'];
    expect(isThesaurusEntries(suggestions)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isThesaurusEntries([])).toBe(false);
  });
});

describe('isSuggestions', () => {
  it('returns true for string array', () => {
    const suggestions = ['test', 'testing', 'tested'];
    expect(isSuggestions(suggestions)).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isSuggestions([])).toBe(true);
  });

  it('returns false for dictionary entries', () => {
    const entries: DictionaryEntry[] = [
      {
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
        shortdef: ['a definition'],
      },
    ];
    expect(isSuggestions(entries)).toBe(false);
  });

  it('returns false for thesaurus entries', () => {
    const entries: ThesaurusEntry[] = [
      {
        meta: {
          id: 'happy',
          uuid: '456',
          src: 'coll_thes',
          section: 'alpha',
          stems: ['happy'],
          syns: [['joyful']],
          ants: [['sad']],
          offensive: false,
        },
        hwi: { hw: 'happy' },
        def: [],
        shortdef: ['feeling pleasure'],
      },
    ];
    expect(isSuggestions(entries)).toBe(false);
  });
});
