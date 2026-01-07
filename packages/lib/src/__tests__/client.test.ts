import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MerriamWebster } from '../client.js';
import { TimeoutError, InvalidKeyError, APIError, NetworkError } from '../errors.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('MerriamWebster', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('throws if no keys provided', () => {
      expect(() => new MerriamWebster({})).toThrow(
        'At least one of dictionaryKey or thesaurusKey is required'
      );
    });

    it('accepts dictionaryKey only', () => {
      expect(() => new MerriamWebster({ dictionaryKey: 'test' })).not.toThrow();
    });

    it('accepts thesaurusKey only', () => {
      expect(() => new MerriamWebster({ thesaurusKey: 'test' })).not.toThrow();
    });

    it('accepts both keys', () => {
      expect(
        () =>
          new MerriamWebster({
            dictionaryKey: 'dict',
            thesaurusKey: 'thes',
          })
      ).not.toThrow();
    });
  });

  describe('define', () => {
    it('returns found result for valid word', async () => {
      const mockEntry = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockEntry]),
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      const result = await mw.define('test');

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0]?.meta.id).toBe('test');
      }
    });

    it('returns suggestions for unknown word', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(['test', 'testing', 'tested']),
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      const result = await mw.define('tset');

      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.suggestions).toEqual(['test', 'testing', 'tested']);
      }
    });

    it('returns empty suggestions for empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      const result = await mw.define('xyzabc');

      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.suggestions).toEqual([]);
      }
    });

    it('throws if dictionaryKey not configured', async () => {
      const mw = new MerriamWebster({ thesaurusKey: 'thes-key' });
      await expect(mw.define('test')).rejects.toThrow(
        'dictionaryKey is required for define()'
      );
    });

    it('URL encodes the word', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      await mw.define('test word');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test%20word'),
        expect.any(Object)
      );
    });
  });

  describe('synonyms', () => {
    it('returns found result for valid word', async () => {
      const mockEntry = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockEntry]),
      });

      const mw = new MerriamWebster({ thesaurusKey: 'thes-key' });
      const result = await mw.synonyms('happy');

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0]?.meta.id).toBe('happy');
      }
    });

    it('throws if thesaurusKey not configured', async () => {
      const mw = new MerriamWebster({ dictionaryKey: 'dict-key' });
      await expect(mw.synonyms('test')).rejects.toThrow(
        'thesaurusKey is required for synonyms()'
      );
    });
  });

  describe('error handling', () => {
    it('throws InvalidKeyError for 403 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const mw = new MerriamWebster({ dictionaryKey: 'bad-key' });
      await expect(mw.define('test')).rejects.toThrow(InvalidKeyError);
    });

    it('throws APIError for other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      await expect(mw.define('test')).rejects.toThrow(APIError);
    });

    it('throws TimeoutError when request times out', async () => {
      // Simulate an AbortError which is what happens on timeout
      mockFetch.mockImplementationOnce(
        (_, options) =>
          new Promise((_, reject) => {
            // Listen to abort signal
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const mw = new MerriamWebster({ dictionaryKey: 'test-key', timeout: 10 });

      await expect(mw.define('test')).rejects.toThrow(TimeoutError);
    });

    it('throws NetworkError for network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      await expect(mw.define('test')).rejects.toThrow(NetworkError);
    });
  });

  describe('request options', () => {
    it('allows per-request timeout override', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key', timeout: 1000 });
      await mw.define('test', { timeout: 5000 });

      // We can't easily verify the timeout value was used,
      // but at least verify the request completes
      expect(mockFetch).toHaveBeenCalled();
    });

    it('accepts custom AbortSignal', async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const mw = new MerriamWebster({ dictionaryKey: 'test-key' });
      await mw.define('test', { signal: controller.signal });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });
});
