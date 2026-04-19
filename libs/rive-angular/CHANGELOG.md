# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0-beta.1] - 2026-04-20

### Fixed

- `RiveFileService`: `await Promise.resolve(file.init())` so promise rejections from `RiveFile.init()` are handled and the file state moves to `failed` instead of staying `loading`.
- `RiveFileService` tests: async `flushLoadMicrotasks()` for init-failure cases (reliable in CI).

## [2.0.0-beta.0] - 2026-04-19

### Added

- **Dual runtime support** for `@rive-app/canvas` and `@rive-app/webgl2` with `provideRiveRuntime()` options `renderer` and `strict`, and automatic fallback when `strict` is `false`.
- **Preferred component selector**: `<rive>` (with `<rive-canvas>` still supported as a legacy alias).
- **Runtime tests** covering `webgl2`, fallback behavior, and strict mode failures.

### Changed

- Runtime SDK loading now uses dynamic imports for both renderers and no longer keeps a static runtime import of `@rive-app/canvas`.
- Runtime error handling now emits clearer missing-package and fallback failure messages, including install hints and `strict: true` guidance.
- Runtime initialization defaults are centralized through `DEFAULT_RIVE_RUNTIME_RESOLVED_CONFIG` and reused by both `RiveCanvasComponent` and `RiveFileService`.
- README/docs were updated to describe optional runtime peers and renderer/fallback installation matrix.

### Fixed

- Stabilized async zoneless specs in `RiveCanvasComponent` and `RiveFileService` by removing dangling timers and isolating runtime lifecycle state between tests.

### Breaking Changes

- The following exports from `@grandgular/rive-angular` are now **type-only** and are no longer runtime values: `Rive`, `RiveFile`, `Layout`, `StateMachineInput`, `ViewModelInstance`.
- This removes accidental hard linkage to `@rive-app/canvas` in `webgl2-only` installs.

### Migration

- If you used these symbols as runtime classes/values, import them directly from the selected Rive SDK package (`@rive-app/canvas` or `@rive-app/webgl2`).
- Typical component/service usage (`RiveCanvasComponent`, `RiveFileService`, `Fit`, `Alignment`, `EventType`, `LoopType`) remains unchanged.

### Notes

- `<rive-canvas>` is deprecated and is planned for removal in a future major release.

## [1.1.0] - 2026-04-16

### Added

- **Configurable runtime initialization** via new `provideRiveRuntime()` provider.
  - `provideRiveRuntime({ wasmUrl })` enables **eager** runtime initialization on app startup.
  - `provideRiveRuntime({ wasmUrl, lazy: true })` enables **lazy** initialization at first real usage.
- **New public type export**: `RiveRuntimeConfig`.

### Changed

- Rive WASM runtime initialization is now internally coordinated by a shared, idempotent initializer.
- `RiveCanvasComponent` and `RiveFileService` now ensure runtime readiness before creating Rive instances.

### Notes

- Existing integrations remain backward compatible.
- `provideAppInitializer(() => RuntimeLoader.setWasmUrl(...))` is no longer required for typical setups; use `provideRiveRuntime()` instead.

## [1.0.0] - 2026-04-07

### Added

- **Animation lifecycle events**: New outputs that mirror Rive constructor callbacks.
  - `animationPlay` — emitted when animation starts playing.
  - `animationPause` — emitted when animation pauses.
  - `animationStop` — emitted when animation stops.
  - `animationLoop` — emitted when a loop iteration completes; `event.data` contains `LoopEvent` (animation name and `LoopType`).
  - `animationAdvance` — emitted on every advance tick (high frequency; for advanced use only). Emitted outside `NgZone.run` to avoid change detection every frame; call `ChangeDetectorRef` manually if the template must update.

- **New exports**: `LoopType` enum and `LoopEvent` type re-exported from `@rive-app/canvas` for use with `animationLoop`.

### Changed

- `onPlay`, `onPause`, and `onStop` handlers now emit the corresponding outputs in addition to updating `isPlaying` / `isPaused` (backward compatible).

### Notes

- **Stable release**: This version is treated as production-ready; [Semantic Versioning](https://semver.org/) applies from **1.0.0** onward.
- **No breaking changes** relative to 0.4.0: all changes since 0.4.0 are additive.

## [0.4.0] - 2026-02-23

### Added

- **Data Binding (ViewModel) Support**: Full integration with Rive's ViewModel system for dynamic data binding.
  - `viewModelName` input to select which ViewModel to use (defaults to artboard's default ViewModel). Changing this input after load automatically reinitializes the ViewModel.
  - `dataBindings` input for declarative, reactive data binding from templates (controlled keys).
  - `dataBindingChange` output for two-way reactivity — emits when ViewModel properties change from within the animation, including trigger events (with `value: true`).
  - `viewModelInstance` signal for advanced ViewModel access.
  - Auto-detect property types: automatically determines if a property is color, number, string, boolean, enum, or trigger.
  - Controlled/uncontrolled semantics: keys in `dataBindings` input are controlled (source of truth), keys outside are managed imperatively.

- **Universal Data Binding Methods**:
  - `setDataBinding(path, value)` — set any ViewModel property value (auto-detects type).
  - `getDataBinding(path)` — get any ViewModel property value (auto-detects type).
  - `fireViewModelTrigger(path)` — fire a trigger property in the ViewModel.

- **Color Manipulation Methods** (resolves [ng-rive issue #56](https://github.com/dappsnation/ng-rive/issues/56)):
  - `setColor(path, color)` — set color using hex string (`'#RRGGBB'` or `'#RRGGBBAA'`), ARGB integer, or `RiveColor` object.
  - `getColor(path)` — get color as `RiveColor` object.
  - `setColorRgba(path, r, g, b, a)` — set color using RGBA components (0-255).
  - `setColorOpacity(path, opacity)` — set opacity (0.0-1.0) while preserving RGB values.

- **Color Utilities** (exported for consumer use):
  - `parseRiveColor(input)` — parse hex string, ARGB integer, or `RiveColor` object into normalized `RiveColor`.
  - `riveColorToArgb(color)` — convert `RiveColor` to ARGB 32-bit integer.
  - `riveColorToHex(color)` — convert `RiveColor` to hex string (`'#RRGGBBAA'`).

- **New Types**:
  - `RiveColor` — color representation with `r`, `g`, `b`, `a` components (0-255).
  - `DataBindingValue` — union type for all ViewModel property values.
  - `DataBindingChangeEvent` — event emitted when ViewModel property changes.
  - `DataBindingPropertyType` — enum of ViewModel property types.

- **Error Codes**: New `RIVE_4xx` range for Data Binding validation (emitted via `loadError` output):
  - `RIVE_401` (`ViewModelNotFound`) — specified ViewModel not found in file.
  - `RIVE_402` (`DataBindingPropertyNotFound`) — property path not found in ViewModel (both declarative and imperative APIs).
  - `RIVE_403` (`DataBindingTypeMismatch`) — value type doesn't match property type, invalid color format, or opacity out of range (0.0-1.0).

### Changed

- **ViewModel vs Direct API**: Color changes now use Rive's official ViewModel / Data Binding system instead of direct shape manipulation (which doesn't exist in Rive SDK). This provides a more robust, designer-friendly approach where ViewModels are created in the Rive editor and bound to animation elements.

### Notes

- **No Breaking Changes**: All new features are additive. Existing code continues to work without modification.
- **Optional Feature**: Data Binding is only used if your `.riv` file contains ViewModels. Files without ViewModels work exactly as before.
- **Feature Parity**: This release brings Angular library to feature parity with React's `@rive-app/react-webgl2` hooks for ViewModel support.

### Examples

**Declarative (Controlled) — Reactive via Input:**

```typescript
@Component({
  template: `
    <rive-canvas
      src="animation.riv"
      [dataBindings]="{
        backgroundColor: '#FF5733',
        score: playerScore(),
        playerName: userName(),
        isActive: true
      }"
    />
  `
})
export class MyComponent {
  playerScore = signal(42);
  userName = signal('Alice');
}
```

**Imperative (Uncontrolled) — Direct Method Calls:**

```typescript
riveRef = viewChild.required(RiveCanvasComponent);

updateColor() {
  this.riveRef().setColor('backgroundColor', '#00FF00');
  this.riveRef().setColorOpacity('backgroundColor', 0.5);
}

updateData() {
  this.riveRef().setDataBinding('score', 100);
  this.riveRef().fireViewModelTrigger('onComplete');
}
```

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
