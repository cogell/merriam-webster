import { describe, it, expect } from 'vitest';
import { parseMarkup, parseHeadword } from '../utils/markup.js';

describe('parseMarkup', () => {
  it('converts bold colon to plain text', () => {
    expect(parseMarkup('{bc}a definition')).toBe(': a definition');
  });

  it('strips italic tags in text mode', () => {
    expect(parseMarkup('{it}word{/it}')).toBe('word');
  });

  it('converts italic tags to HTML in html mode', () => {
    expect(parseMarkup('{it}word{/it}', { format: 'html' })).toBe('<i>word</i>');
  });

  it('strips word illustration tags in text mode', () => {
    expect(parseMarkup('{wi}example{/wi}')).toBe('example');
  });

  it('extracts word from sx cross-reference', () => {
    expect(parseMarkup('{sx|test||}')).toBe('test');
  });

  it('extracts word from a_link', () => {
    expect(parseMarkup('{a_link|testing}')).toBe('testing');
  });

  it('extracts word from d_link', () => {
    expect(parseMarkup('{d_link|word|sense}')).toBe('word');
  });

  it('handles multiple markup patterns', () => {
    const input = '{bc}a {it}test{/it} of {a_link|testing}';
    expect(parseMarkup(input)).toBe(': a test of testing');
  });

  it('converts quotation marks', () => {
    expect(parseMarkup('{ldquo}hello{rdquo}')).toBe('"hello"');
  });

  it('removes unknown tags', () => {
    expect(parseMarkup('{unknown}text')).toBe('text');
  });

  it('handles empty string', () => {
    expect(parseMarkup('')).toBe('');
  });

  it('converts subscript to HTML', () => {
    expect(parseMarkup('H{inf}2{/inf}O', { format: 'html' })).toBe('H<sub>2</sub>O');
  });

  it('converts superscript to HTML', () => {
    expect(parseMarkup('10{sup}th{/sup}', { format: 'html' })).toBe('10<sup>th</sup>');
  });

  it('strips subscript in text mode', () => {
    expect(parseMarkup('H{inf}2{/inf}O')).toBe('H2O');
  });

  it('converts bold to HTML', () => {
    expect(parseMarkup('{b}bold{/b}', { format: 'html' })).toBe('<b>bold</b>');
  });

  it('converts small caps to HTML', () => {
    const result = parseMarkup('{sc}small caps{/sc}', { format: 'html' });
    expect(result).toBe('<span style="font-variant:small-caps">small caps</span>');
  });

  it('handles dxt cross-reference', () => {
    expect(parseMarkup('{dxt|word|sense|}')).toBe('word');
  });

  it('handles etymology cross-reference', () => {
    expect(parseMarkup('{dx_ety}see word{/dx_ety}')).toBe('see word');
  });

  it('handles qword in quotes', () => {
    expect(parseMarkup('{qword}test{/qword}', { format: 'html' })).toBe('<b>test</b>');
  });
});

describe('parseHeadword', () => {
  it('removes syllable markers', () => {
    expect(parseHeadword('vol*u*mi*nous')).toBe('voluminous');
  });

  it('handles single syllable words', () => {
    expect(parseHeadword('test')).toBe('test');
  });

  it('handles words with single marker', () => {
    expect(parseHeadword('test*ing')).toBe('testing');
  });

  it('handles empty string', () => {
    expect(parseHeadword('')).toBe('');
  });
});
