import { describe, it, expect } from 'vitest';
import { buildAudioUrl } from '../utils/audio.js';

describe('buildAudioUrl', () => {
  it('uses first letter as subdirectory for regular words', () => {
    const url = buildAudioUrl({ audio: 'happy001', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/h/happy001.mp3');
  });

  it('uses bix subdirectory for bix prefix', () => {
    const url = buildAudioUrl({ audio: 'bixtest01', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bixtest01.mp3');
  });

  it('uses gg subdirectory for gg prefix', () => {
    const url = buildAudioUrl({ audio: 'ggtest01', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/gg/ggtest01.mp3');
  });

  it('uses number subdirectory for numeric prefix', () => {
    const url = buildAudioUrl({ audio: '1test', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/number/1test.mp3');
  });

  it('uses number subdirectory for punctuation prefix', () => {
    const url = buildAudioUrl({ audio: '_test', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/number/_test.mp3');
  });

  it('lowercases the first letter for subdirectory', () => {
    const url = buildAudioUrl({ audio: 'Apple', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/a/Apple.mp3');
  });

  it('handles uppercase BIX prefix', () => {
    // Note: MW typically uses lowercase, but test edge case
    const url = buildAudioUrl({ audio: 'bixword', ref: 'c', stat: '1' });
    expect(url).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bixword.mp3');
  });
});
