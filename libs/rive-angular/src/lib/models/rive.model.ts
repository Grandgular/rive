/**
 * Re-export Rive SDK types for consumer convenience
 */
export { Fit, Alignment, EventType } from '@rive-app/canvas';
export type { Event as RiveEvent } from '@rive-app/canvas';

/**
 * Loop mode for Rive animations
 * Note: The actual loop behavior is defined in the .riv file itself.
 * This enum is provided for documentation and future compatibility.
 */
export enum LoopMode {
  /** Play once and stop */
  OneShot = 'oneshot',
  /** Loop continuously */
  Loop = 'loop',
  /** Play forward then backward repeatedly (ping-pong) */
  PingPong = 'pingpong',
}

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
