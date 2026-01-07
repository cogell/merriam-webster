/**
 * Audio URL builder for MW pronunciation files.
 */

import type { SoundData } from '../types/common.js';

/** Base URL for MW audio files */
const AUDIO_BASE_URL = 'https://media.merriam-webster.com/audio/prons/en/us/mp3';

/**
 * Determine the subdirectory for an audio file based on MW's rules.
 *
 * MW audio files are organized into subdirectories:
 * - "bix" prefix → /bix/
 * - "gg" prefix → /gg/
 * - Number or punctuation prefix → /number/
 * - Otherwise → first letter of filename
 *
 * @param filename - Audio filename (without extension)
 * @returns Subdirectory name
 */
function getAudioSubdirectory(filename: string): string {
  if (filename.startsWith('bix')) {
    return 'bix';
  }
  if (filename.startsWith('gg')) {
    return 'gg';
  }
  // Check for number or non-letter start
  if (/^[^a-zA-Z]/.test(filename)) {
    return 'number';
  }
  // Default to first letter
  return filename[0]?.toLowerCase() ?? 'a';
}

/**
 * Build a complete audio URL from pronunciation sound data.
 *
 * @param sound - Sound data from pronunciation entry
 * @returns Complete URL to the MP3 audio file
 *
 * @example
 * ```ts
 * const url = buildAudioUrl({ audio: "happy001", ref: "c", stat: "1" });
 * // => "https://media.merriam-webster.com/audio/prons/en/us/mp3/h/happy001.mp3"
 *
 * const url = buildAudioUrl({ audio: "bixtest01", ref: "c", stat: "1" });
 * // => "https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bixtest01.mp3"
 * ```
 */
export function buildAudioUrl(sound: SoundData): string {
  const subdir = getAudioSubdirectory(sound.audio);
  return `${AUDIO_BASE_URL}/${subdir}/${sound.audio}.mp3`;
}
