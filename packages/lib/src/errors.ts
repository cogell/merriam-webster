/**
 * Custom error classes for MW API errors.
 */

/**
 * Base error class for MW API errors.
 */
export class MerriamWebsterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MerriamWebsterError';
  }
}

/**
 * Error thrown when an API request times out.
 */
export class TimeoutError extends MerriamWebsterError {
  readonly timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Error thrown when there's a network failure.
 */
export class NetworkError extends MerriamWebsterError {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Error thrown when the API key is invalid or missing.
 */
export class InvalidKeyError extends MerriamWebsterError {
  constructor(endpoint: 'dictionary' | 'thesaurus') {
    super(
      `Invalid or missing API key for ${endpoint}. ` +
        'Get your free API key at https://dictionaryapi.com/register/index'
    );
    this.name = 'InvalidKeyError';
  }
}

/**
 * Error thrown when the API returns an unexpected response format.
 */
export class APIError extends MerriamWebsterError {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`API error: HTTP ${status} ${statusText}`);
    this.name = 'APIError';
    this.status = status;
    this.statusText = statusText;
  }
}
