/**
 * String parsing utilities for MW's custom markup format.
 */

/**
 * Options for parseMarkup function.
 */
export interface ParseMarkupOptions {
  /** Output format: 'text' strips formatting, 'html' converts to HTML tags */
  format?: 'text' | 'html';
}

/**
 * Parse MW's custom markup to plain text or HTML.
 *
 * MW uses custom markup in definition text:
 * - {bc} → bold colon (": ")
 * - {it}...{/it} → italics
 * - {wi}...{/wi} → word illustration (headword in examples)
 * - {sx|word||} → synonym cross-reference
 * - {a_link|word} → auto-link to related word
 * - {d_link|word|sense} → definition link
 * - etc.
 *
 * @param text - Text containing MW markup
 * @param options - Output format options
 * @returns Cleaned text with markup converted or stripped
 *
 * @example
 * ```ts
 * parseMarkup("{bc}a means of {a_link|testing}")
 * // => ": a means of testing"
 *
 * parseMarkup("{it}word{/it}", { format: 'html' })
 * // => "<i>word</i>"
 * ```
 */
export function parseMarkup(
  text: string,
  options?: ParseMarkupOptions
): string {
  const format = options?.format ?? 'text';

  let result = text;

  // Bold colon - definition separator
  result = result.replace(/\{bc\}/g, format === 'html' ? '<b>:</b> ' : ': ');

  // Italic text
  result = result.replace(
    /\{it\}(.*?)\{\/it\}/g,
    format === 'html' ? '<i>$1</i>' : '$1'
  );

  // Word illustration (headword in examples)
  result = result.replace(
    /\{wi\}(.*?)\{\/wi\}/g,
    format === 'html' ? '<i>$1</i>' : '$1'
  );

  // Quote word (headword in quotes)
  result = result.replace(
    /\{qword\}(.*?)\{\/qword\}/g,
    format === 'html' ? '<b>$1</b>' : '$1'
  );

  // Cross-references - extract just the word
  result = result.replace(/\{sx\|([^|]+)\|[^}]*\}/g, '$1');
  result = result.replace(/\{a_link\|([^}]+)\}/g, '$1');
  result = result.replace(/\{d_link\|([^|]+)\|[^}]*\}/g, '$1');
  result = result.replace(/\{dxt\|([^|]+)\|[^}]*\}/g, '$1');

  // Etymology cross-reference
  result = result.replace(/\{dx_ety\}(.*?)\{\/dx_ety\}/g, '$1');

  // Small caps
  result = result.replace(
    /\{sc\}(.*?)\{\/sc\}/g,
    format === 'html' ? '<span style="font-variant:small-caps">$1</span>' : '$1'
  );

  // Subscript
  result = result.replace(
    /\{inf\}(.*?)\{\/inf\}/g,
    format === 'html' ? '<sub>$1</sub>' : '$1'
  );

  // Superscript
  result = result.replace(
    /\{sup\}(.*?)\{\/sup\}/g,
    format === 'html' ? '<sup>$1</sup>' : '$1'
  );

  // Bold
  result = result.replace(
    /\{b\}(.*?)\{\/b\}/g,
    format === 'html' ? '<b>$1</b>' : '$1'
  );

  // Curly quotes (left/right double quotes)
  result = result.replace(/\{ldquo\}/g, '"');
  result = result.replace(/\{rdquo\}/g, '"');

  // Remove any remaining unknown tags
  result = result.replace(/\{[^}]+\}/g, '');

  return result.trim();
}

/**
 * Remove syllable break markers from a headword.
 *
 * MW uses asterisks to indicate syllable breaks in headwords.
 *
 * @param hw - Headword with syllable markers
 * @returns Clean headword without markers
 *
 * @example
 * ```ts
 * parseHeadword("vol*u*mi*nous")
 * // => "voluminous"
 *
 * parseHeadword("test")
 * // => "test"
 * ```
 */
export function parseHeadword(hw: string): string {
  return hw.replace(/\*/g, '');
}
