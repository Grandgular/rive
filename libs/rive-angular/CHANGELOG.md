# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-02-16

### Added

- **Debug Mode**: New `debugMode` input on `rive-canvas` component and `debug` option in `RiveFileService` to enable verbose logging.
- **Global Debug Config**: `provideRiveDebug()` provider to configure log levels globally (`'none' | 'error' | 'warn' | 'info' | 'debug'`).
- **Validation**: Automatic validation of artboard, animation, state machine, and input names against the loaded file.
- **Error Codes**: Structured error codes (`RIVE_1xx` for load errors, `RIVE_2xx` for validation, `RIVE_3xx` for config) to help identify issues programmatically.
- **Types**: Exported `RiveErrorCode`, `RiveValidationError`, `RiveErrorOptions`, `LogLevel`, `RiveDebugConfig`.

### Changed

- **Validation Behavior**: Validation errors (e.g., missing animation name) are now non-fatal and emitted via `loadError` output with detailed suggestions.
- **Logging**: Enhanced error messages with actionable suggestions.

### Fixed

- **Race Condition**: Fixed a race condition in `RiveFileService` where event listeners were attached after initialization started, potentially missing load events.
- **Error Handling**: Improved error handling during file initialization to properly catch and report WASM/format errors.

## [0.1.2] - 2025-10-10

### Added

- Initial release of @grandgular/rive-angular
- Standalone `RiveCanvasComponent` with signal-based inputs
- `RiveFileService` for caching and preloading
- SSR support
- ResizeObserver and IntersectionObserver integration
