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
} from './lib/utils/debug-config';

export {
  provideRiveRuntime,
  DEFAULT_RIVE_RUNTIME_RESOLVED_CONFIG,
  type RiveRuntimeConfig,
  type RiveRuntimeResolvedConfig,
} from './lib/utils/runtime-config';

// Color utilities for data binding
export {
  parseRiveColor,
  riveColorToArgb,
  riveColorToHex,
} from './lib/utils/color-parser';

// Re-export commonly used Rive SDK-compatible types for convenience
export type {
  Rive,
  RiveFile,
  Layout,
  StateMachineInput,
  ViewModelInstance,
  LayoutParameters,
  RiveParameters,
  RiveFileParameters,
} from './lib/utils/rive-sdk';
