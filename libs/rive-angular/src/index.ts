/*
 * Public API Surface of @Grandgular/rive-angular
 */

// Component
export { RiveCanvasComponent } from './lib/components';

// Services
export {
  RiveFileService,
  type RiveFileState,
  type RiveFileParams,
  type FileStatus,
} from './lib/services';

// Re-exported Rive SDK types and error classes
export {
  Fit,
  Alignment,
  RiveLoadError,
  EventType,
} from './lib/models';
export type { RiveEvent } from './lib/models';

// Re-export commonly used types from @rive-app/canvas for convenience
export {
  Rive,
  RiveFile,
  Layout,
  StateMachineInput,
  type LayoutParameters,
  type RiveParameters,
  type RiveFileParameters,
} from '@rive-app/canvas';
