/**
 * Re-export Rive SDK types and shared error types for this renderer package.
 */
export { Fit, Alignment, EventType, LoopType } from '../rive-sdk';
export type { RiveEvent, LoopEvent } from '../rive-sdk';
export {
  RiveLoadError,
  RiveValidationError,
  type RiveErrorOptions,
} from '../../rive-angular-core/lib/models/rive-errors';
