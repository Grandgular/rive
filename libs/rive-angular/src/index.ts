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
  RiveValidationError,
  RiveErrorCode,
  type RiveErrorOptions,
  type RiveEvent,
  type RiveColor,
  type DataBindingValue,
  type DataBindingChangeEvent,
  type DataBindingPropertyType,
} from './lib/models';

// Debug Configuration
export {
  provideRiveDebug,
  type RiveDebugConfig,
  type LogLevel,
} from './lib/utils/debug-config';

// Color utilities for data binding
export {
  parseRiveColor,
  riveColorToArgb,
  riveColorToHex,
} from './lib/utils/color-parser';

// Re-export commonly used types from @rive-app/canvas for convenience
export {
  Rive,
  RiveFile,
  Layout,
  StateMachineInput,
  ViewModelInstance,
  type LayoutParameters,
  type RiveParameters,
  type RiveFileParameters,
} from '@rive-app/canvas';
