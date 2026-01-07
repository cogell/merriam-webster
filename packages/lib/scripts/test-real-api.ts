/**
 * Integration test against the real MW API.
 * Run with: npx tsx scripts/test-real-api.ts
 */

import {
  MerriamWebster,
  flattenDefinitions,
  getSynonymsForSense,
  getWordListsForSense,
  buildAudioUrl,
  parseMarkup,
  parseHeadword,
  TimeoutError,
  InvalidKeyError,
} from '../src/index.js';

const DICTIONARY_KEY = process.env.MW_DICTIONARY_API_KEY;
const THESAURUS_KEY = process.env.MW_THESAURUS_API_KEY;

if (!DICTIONARY_KEY || !THESAURUS_KEY) {
  console.error('Missing API keys. Set MW_DICTIONARY_API_KEY and MW_THESAURUS_API_KEY');
  process.exit(1);
}

const mw = new MerriamWebster({
  dictionaryKey: DICTIONARY_KEY,
  thesaurusKey: THESAURUS_KEY,
  timeout: 15000,
});

async function testDictionary() {
  console.log('\n=== DICTIONARY TEST ===\n');

  // Test 1: Look up a valid word
  console.log('1. Looking up "voluminous"...');
  const result = await mw.define('voluminous');

  if (!result.found) {
    console.error('  FAIL: Expected to find "voluminous"');
    return false;
  }

  const entry = result.entries[0];
  console.log('  Found:', entry?.meta.id);
  console.log('  Part of speech:', entry?.fl);
  console.log('  Short defs:', entry?.shortdef);

  // Test headword parsing
  if (entry?.hwi.hw) {
    const cleanHw = parseHeadword(entry.hwi.hw);
    console.log('  Headword:', entry.hwi.hw, '->', cleanHw);
  }

  // Test flattenDefinitions
  if (entry) {
    const defs = flattenDefinitions(entry);
    console.log('  Flattened definitions:', defs.length, 'found');
    if (defs.length > 0) {
      console.log('    First:', defs[0]?.substring(0, 80) + '...');
    }
  }

  // Test audio URL builder
  const sound = entry?.hwi.prs?.[0]?.sound;
  if (sound) {
    const audioUrl = buildAudioUrl(sound);
    console.log('  Audio URL:', audioUrl);
  }

  // Test 2: Look up a misspelled word (should get suggestions)
  console.log('\n2. Looking up "voluminus" (misspelled)...');
  const typoResult = await mw.define('voluminus');

  if (typoResult.found) {
    console.error('  FAIL: Expected suggestions, got entries');
    return false;
  }

  console.log('  Suggestions:', typoResult.suggestions.slice(0, 5).join(', '));

  // Test 3: Look up a nonsense word (might get empty suggestions)
  console.log('\n3. Looking up "xyzqwerty123"...');
  const nonsenseResult = await mw.define('xyzqwerty123');

  if (nonsenseResult.found) {
    console.error('  FAIL: Expected not found');
    return false;
  }
  console.log('  Suggestions:', nonsenseResult.suggestions.length, 'found');

  return true;
}

async function testThesaurus() {
  console.log('\n=== THESAURUS TEST ===\n');

  // Test 1: Look up synonyms for a valid word
  console.log('1. Looking up synonyms for "happy"...');
  const result = await mw.synonyms('happy');

  if (!result.found) {
    console.error('  FAIL: Expected to find "happy"');
    return false;
  }

  const entry = result.entries[0];
  console.log('  Found:', entry?.meta.id);
  console.log('  Quick syns:', entry?.meta.syns[0]?.slice(0, 5).join(', '));
  console.log('  Quick ants:', entry?.meta.ants[0]?.slice(0, 5).join(', '));

  // Test getSynonymsForSense
  if (entry) {
    const syns = getSynonymsForSense(entry, '1');
    console.log('  Sense 1 synonyms:', syns.slice(0, 5).join(', '));

    const lists = getWordListsForSense(entry, '1');
    console.log('  Sense 1 antonyms:', lists.antonyms.slice(0, 3).join(', '));
  }

  // Test 2: Look up misspelled word
  console.log('\n2. Looking up synonyms for "hapy" (misspelled)...');
  const typoResult = await mw.synonyms('hapy');

  if (typoResult.found) {
    console.error('  FAIL: Expected suggestions');
    return false;
  }
  console.log('  Suggestions:', typoResult.suggestions.slice(0, 5).join(', '));

  return true;
}

async function testMarkup() {
  console.log('\n=== MARKUP TEST ===\n');

  // Get a real entry with markup
  const result = await mw.define('test');
  if (!result.found) {
    console.error('FAIL: Could not find "test"');
    return false;
  }

  const entry = result.entries[0];

  // Find a definition with markup
  const rawDefs = flattenDefinitions(entry!, { preserveMarkup: true });
  const cleanDefs = flattenDefinitions(entry!);

  if (rawDefs.length > 0) {
    console.log('Raw definition (with markup):');
    console.log('  ', rawDefs[0]?.substring(0, 100));
    console.log('Clean definition (markup stripped):');
    console.log('  ', cleanDefs[0]?.substring(0, 100));
  }

  // Test parseMarkup directly
  const testMarkup = '{bc}a {it}critical{/it} evaluation {sx|assessment||}';
  console.log('\nparseMarkup test:');
  console.log('  Input:', testMarkup);
  console.log('  Output:', parseMarkup(testMarkup));

  return true;
}

async function testEdgeCases() {
  console.log('\n=== EDGE CASES ===\n');

  // Test with special characters
  console.log('1. Looking up "café"...');
  const cafeResult = await mw.define('café');
  console.log('  Found:', cafeResult.found);
  if (cafeResult.found) {
    console.log('  Entry:', cafeResult.entries[0]?.meta.id);
  }

  // Test with hyphenated word
  console.log('\n2. Looking up "well-being"...');
  const hyphenResult = await mw.define('well-being');
  console.log('  Found:', hyphenResult.found);
  if (hyphenResult.found) {
    console.log('  Entry:', hyphenResult.entries[0]?.meta.id);
  }

  // Test with phrase
  console.log('\n3. Looking up "ice cream"...');
  const phraseResult = await mw.define('ice cream');
  console.log('  Found:', phraseResult.found);
  if (phraseResult.found) {
    console.log('  Entry:', phraseResult.entries[0]?.meta.id);
  }

  return true;
}

async function main() {
  console.log('Testing merriam-webster-api against real API...');
  console.log('================================================');

  let allPassed = true;

  try {
    if (!(await testDictionary())) allPassed = false;
    if (!(await testThesaurus())) allPassed = false;
    if (!(await testMarkup())) allPassed = false;
    if (!(await testEdgeCases())) allPassed = false;
  } catch (error) {
    console.error('\nUnexpected error:', error);
    allPassed = false;
  }

  console.log('\n================================================');
  if (allPassed) {
    console.log('All integration tests PASSED!');
  } else {
    console.log('Some tests FAILED!');
    process.exit(1);
  }
}

main();
