# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-02-17

### Added

- **Text Run Support**: Read and update Rive text runs at runtime.
  - `textRuns` input for declarative, reactive text setting from templates (controlled keys).
  - `getTextRunValue()` / `setTextRunValue()` methods for imperative control (uncontrolled keys).
  - `getTextRunValueAtPath()` / `setTextRunValueAtPath()` for nested text runs in components.
  - Controlled/uncontrolled semantics: keys in `textRuns` input are controlled by the input (source of truth), keys outside are managed imperatively.
- **Error Code**: `RIVE_205` (`TextRunNotFound`) for text run validation errors.

## [0.2.0] - 2026-02-16

### Added

- **Debug Mode**: New `debugMode` input on `rive-canvas` component and `debug` option in `RiveFileService` to enable verbose logging.
- **Global Debug Config**: `provideRiveDebug()` provider to configure log levels globally (`'none' | 'error' | 'warn' | 'info' | 'debug'`).
- **Validation**: Automatic validation of artboard, animation, state machine, and input names against the loaded file.
- **Error Codes**: Structured error codes (`RIVE_1xx` for load errors, `RIVE_2xx` for validation, `RIVE_3xx` for config) to help identify issues programmatically.
- **Types**: Exported `RiveErrorCode`, `RiveValidationError`, `RiveErrorOptions`, `LogLevel`, `RiveDebugConfig`.
- **Reactive Configuration**: All component inputs (`fit`, `alignment`, `artboard`, `animations`, `stateMachines`) are now reactive and trigger appropriate updates.
- **DI Integration**: `ElementObserver` converted to Angular service for better testability and integration.

### Changed

- **Validation Behavior**: Validation errors (e.g., missing animation name) are now non-fatal and emitted via `loadError` output with detailed suggestions.
- **Logging**: Enhanced error messages with actionable suggestions. All logging now goes through the logger system (respects `provideRiveDebug` configuration).
- **Signal API**: Public signals (`isPlaying`, `isPaused`, `isLoaded`, `riveInstance`) are now readonly to prevent external mutation. ⚠️ **BREAKING CHANGE**
- **riveReady Timing**: The `riveReady` output now emits after the animation is fully loaded (in `onLoad` callback), not immediately after Rive instance creation. This ensures the instance is ready for use. ⚠️ **BREAKING CHANGE**
- **Layout Updates**: Changes to `fit` and `alignment` inputs now update the layout without full reload (performance optimization).
- **Type Safety**: Replaced unsafe `Record<string, unknown>` configuration with properly typed object construction.

### Fixed

- **Race Condition**: Fixed a race condition in `RiveFileService` where event listeners were attached after initialization started, potentially missing load events.
- **Error Handling**: Improved error handling during file initialization to properly catch and report WASM/format errors.
- **Device Pixel Ratio**: DPR is now read dynamically on every resize, supporting multi-monitor setups and zoom changes.
- **ArrayBuffer Mutation**: Service no longer mutates `ArrayBuffer` objects; uses `WeakMap` for internal tracking.
- **Cache Race Condition**: Fixed `clearCache()` to properly handle pending loads, preventing memory leaks.
- **Signal Encapsulation**: Public signals are now properly encapsulated as readonly, preventing external state mutation.

### Developer Experience

- **Comprehensive Audit**: Conducted full library audit and resolved all critical and medium-priority issues.
- **Code Quality**: Improved ESLint compliance and code clarity.

### Migration Guide

#### Breaking Change 1: Readonly Signals

**Before (v0.1.x):**
```typescript
// This was possible but incorrect
component.isPlaying.set(true); // ❌ Direct mutation
```

**After (v0.2.0):**
```typescript
// Signals are readonly - use component methods instead
component.playAnimation(); // ✅ Correct way
// component.isPlaying.set(true); // ❌ TypeScript error
```

#### Breaking Change 2: riveReady Timing

**Before (v0.1.x):**
```typescript
// riveReady emitted immediately, instance might not be ready
<rive-canvas (riveReady)="onReady($event)" />

onReady(rive: Rive) {
  // ⚠️ artboardNames might not be available yet
  console.log(rive.artboardNames);
}
```

**After (v0.2.0):**
```typescript
// riveReady emits after load, instance is fully ready
<rive-canvas (riveReady)="onReady($event)" />

onReady(rive: Rive) {
  // ✅ artboardNames are guaranteed to be available
  console.log(rive.artboardNames);
}
```

**Alternative:** Use `loaded` output if you don't need the Rive instance:
```typescript
<rive-canvas (loaded)="onLoaded()" />
```

## [0.1.2] - 2025-10-10

### Added

- Initial release of @grandgular/rive-angular
- Standalone `RiveCanvasComponent` with signal-based inputs
- `RiveFileService` for caching and preloading
- SSR support
- ResizeObserver and IntersectionObserver integration
