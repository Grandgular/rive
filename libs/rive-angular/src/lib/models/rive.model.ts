/**
 * Re-export Rive SDK types for consumer convenience
 */
export { Fit, Alignment, EventType } from '@rive-app/canvas';
export type { Event as RiveEvent } from '@rive-app/canvas';

/**
 * Error thrown when Rive animation fails to load
 */
export class RiveLoadError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'RiveLoadError';
  }
}
