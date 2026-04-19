import { RiveErrorCode } from '../utils';

/**
 * Re-export Rive SDK types for consumer convenience
 */
export { Fit, Alignment, EventType, LoopType } from '../utils/rive-sdk';
export type { RiveEvent, LoopEvent } from '../utils/rive-sdk';

/**
 * Options for constructing a RiveLoadError with detailed context.
 */
export interface RiveErrorOptions {
  message: string;
  code?: RiveErrorCode;
  suggestion?: string;
  docsUrl?: string;
  cause?: unknown;
}

/**
 * Error thrown when Rive animation fails to load.
 * Supports legacy constructor for backward compatibility.
 */
export class RiveLoadError extends Error {
  public readonly code?: RiveErrorCode;
  public readonly suggestion?: string;
  public readonly docsUrl?: string;
  public readonly originalError?: Error;

  constructor(
    messageOrOptions: string | RiveErrorOptions,
    originalError?: unknown,
  ) {
    if (typeof messageOrOptions === 'string') {
      // Legacy constructor: new RiveLoadError(message, originalError)
      super(messageOrOptions);
      this.originalError =
        originalError instanceof Error ? originalError : undefined;
    } else {
      // New constructor: new RiveLoadError(options)
      super(messageOrOptions.message);
      this.code = messageOrOptions.code;
      this.suggestion = messageOrOptions.suggestion;
      this.docsUrl = messageOrOptions.docsUrl;
      this.originalError =
        messageOrOptions.cause instanceof Error
          ? messageOrOptions.cause
          : undefined;
    }
    this.name = 'RiveLoadError';
  }
}

/**
 * Error thrown when validation fails (e.g. missing artboard/animation/input).
 * These errors are typically non-fatal but indicate a configuration mismatch.
 */
export class RiveValidationError extends Error {
  constructor(
    message: string,
    public readonly code: RiveErrorCode,
    public readonly availableOptions?: string[],
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = 'RiveValidationError';
  }
}
