/*
 * Public API Surface of @grandgular/rive-angular-webgl2
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
  LoopType,
  RiveValidationError,
  RiveErrorCode,
  type RiveErrorOptions,
  type RiveEvent,
  type LoopEvent,
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
} from './rive-angular-core';

export {
  provideRiveRuntime,
  type RiveRuntimeConfig,
} from './lib/utils/runtime-config';

// Color utilities for data binding
export {
  parseRiveColor,
  riveColorToArgb,
  riveColorToHex,
} from './rive-angular-core';

// Re-export commonly used types from the WebGL2 runtime
export {
  Rive,
  RiveFile,
  Layout,
  StateMachineInput,
  ViewModelInstance,
  type LayoutParameters,
  type RiveParameters,
  type RiveFileParameters,
} from './lib/rive-sdk';
