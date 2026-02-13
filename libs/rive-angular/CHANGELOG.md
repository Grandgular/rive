# Changelog

All notable changes to `@grandgular/rive-angular` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-02-13

### Fixed

- Prevent ResizeObserver loop error in Safari browsers

## [0.1.1] - 2026-02-13

### Fixed

- Resolve unhandled promise rejection and improve error handling

### Changed

- Update GitHub repository links

## [0.1.0] - 2025-02-13

### Added

- Standalone `RiveCanvasComponent` with signal-based inputs and OnPush change detection
- `RiveFileService` for preloading and caching Rive files with reference counting
- Automatic canvas sizing via ResizeObserver with DPR support
- IntersectionObserver integration for off-screen rendering optimization
- Zoneless architecture support (runs animations outside Angular zone)
- SSR compatibility with platform checks and fallbacks
- Full Rive SDK feature coverage: animations, state machines, triggers, inputs
- Public API methods: `playAnimation`, `pauseAnimation`, `stopAnimation`, `reset`, `setInput`, `fireTrigger`
- Reactive signals: `isPlaying`, `isPaused`, `isLoaded`, `riveInstance`
- Event outputs: `loaded`, `loadError`, `stateChange`, `riveEvent`, `riveReady`
- Support for Angular 18–21 and `@rive-app/canvas` ^2.35
