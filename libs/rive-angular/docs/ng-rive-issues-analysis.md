# ng-rive Issues Analysis Report

> **Purpose**: This document analyzes all 31 issues (12 open + 19 closed) from the [ng-rive](https://github.com/dappsnation/ng-rive) library to understand common pain points and ensure @grandgular/rive-angular prevents these issues from occurring.

## Executive Summary

The ng-rive library, while pioneering Angular support for Rive animations, has been unmaintained since 2023 and accumulated significant technical debt. After analyzing all 31 GitHub issues, we categorized them into **5 main problem areas**:

| Category | Issues Count | Status in @grandgular/rive-angular |
|----------|--------------|-------------------------------------|
| Version Compatibility | 8 | ✅ Fully resolved |
| Memory Management | 5 | ✅ Fully resolved |
| Dependency Injection / Module Setup | 4 | ✅ Fully resolved |
| Missing Features | 6 | ⏳ Partially addressed (4/6 done) |
| Documentation / DX | 2 | ✅ Fully resolved (Phase 2) |

**Result**: @grandgular/rive-angular already prevents **~90% of issues** that plagued ng-rive users.

---

## Issue Categories Analysis

### 1. Version Compatibility Issues (8 issues)

These issues stem from ng-rive's inability to keep pace with Angular and Rive runtime updates.

#### Issues

| # | Title | Root Cause |
|---|-------|------------|
| [#61](https://github.com/dappsnation/ng-rive/issues/61) | Compilation errors on fresh install | Angular 18+ type definition incompatibility |
| [#60](https://github.com/dappsnation/ng-rive/issues/60) | WEBPACK_IMPORTED_MODULE TypeError | @rive-app/canvas-advanced version mismatch |
| [#45](https://github.com/dappsnation/ng-rive/issues/45) | Not compatible with Angular 14 | ɵɵDirectiveDeclaration signature changes |
| [#44](https://github.com/dappsnation/ng-rive/issues/44) | rive.load not a function | WASM/canvas-advanced version mismatch |
| [#17](https://github.com/dappsnation/ng-rive/issues/17) | Cannot read property 'apply' | Angular 11 incompatibility |
| [#16](https://github.com/dappsnation/ng-rive/issues/16) | Undefined is not an object | Old .riv file format vs new runtime |
| [#15](https://github.com/dappsnation/ng-rive/issues/15) | Missing declaration files | rive-canvas TypeScript types missing |
| [#20](https://github.com/dappsnation/ng-rive/issues/20) | State machine binding error | rive-canvas API breaking change |

#### How @grandgular/rive-angular Prevents These

```typescript
// package.json - Clear peer dependencies with version ranges
{
  "peerDependencies": {
    "@angular/common": ">=18.0.0 <22.0.0",
    "@angular/core": ">=18.0.0 <22.0.0",
    "@rive-app/canvas": "^2.35.0"
  }
}
```

**Prevention strategies:**

1. **Modern Angular-first**: Built specifically for Angular 18+ with signals, standalone components
2. **@rive-app/canvas**: Uses the recommended official Rive package (not canvas-advanced)
3. **No WASM management**: Delegates WASM loading entirely to @rive-app/canvas
4. **Strict peer dependencies**: Clear version constraints prevent silent incompatibilities
5. **Signal-based inputs**: Uses Angular's new input() API, avoiding deprecated patterns

---

### 2. Memory Management Issues (5 issues)

Critical issues causing runtime crashes when animations are destroyed or multiple animations exist.

#### Issues

| # | Title | Root Cause |
|---|-------|------------|
| [#53](https://github.com/dappsnation/ng-rive/issues/53) | LinearAnimationInstance already deleted | Improper cleanup on component destroy |
| [#46](https://github.com/dappsnation/ng-rive/issues/46) | LinearAnimationInstance already deleted (v0.2.6) | Timeout-based cleanup race condition |
| [#52](https://github.com/dappsnation/ng-rive/issues/52) | Cannot have multiple artboards on same page | Shared WASM state corruption |
| [#30](https://github.com/dappsnation/ng-rive/issues/30) | Multiple rive assets cause BindingError | Concurrent initialization race condition |
| [#26](https://github.com/dappsnation/ng-rive/issues/26) | BindingError in lazy-loaded modules | File cache not properly invalidated |

#### How @grandgular/rive-angular Prevents These

```typescript
// rive-canvas.component.ts - Proper cleanup implementation
private cleanupRive(): void {
  if (this.#rive) {
    try {
      this.#rive.cleanup(); // Official Rive cleanup method
    } catch (error) {
      console.warn('Error during Rive cleanup:', error);
    }
    this.#rive = null;
  }
  
  // Reset all state signals
  this.riveInstance.set(null);
  this.isLoaded.set(false);
  this.isPlaying.set(false);
  this.isPaused.set(false);
}

// Automatic cleanup via DestroyRef
constructor() {
  this.#destroyRef.onDestroy(() => {
    this.cleanupRive();
    this.disconnectResizeObserver();
    this.disconnectIntersectionObserver();
  });
}
```

**Prevention strategies:**

1. **No shared state**: Each component instance is completely independent
2. **Synchronous cleanup**: No setTimeout-based cleanup that causes race conditions
3. **Official cleanup API**: Uses `Rive.cleanup()` method from @rive-app/canvas
4. **DestroyRef integration**: Automatic cleanup tied to Angular's destruction lifecycle
5. **RiveFileService with ref counting**: Proper cache management with reference counting

```typescript
// rive-file.service.ts - Reference counting for file cache
releaseFile(params: RiveFileParams): void {
  const key = this.getCacheKey(params);
  const entry = this.cache.get(key);
  
  if (entry) {
    entry.refCount--;
    if (entry.refCount <= 0) {
      this.cache.delete(key);
    }
  }
}
```

---

### 3. Dependency Injection / Module Setup Issues (4 issues)

Issues related to Angular's DI system and the transition to standalone components.

#### Issues

| # | Title | Root Cause |
|---|-------|------------|
| [#50](https://github.com/dappsnation/ng-rive/issues/50) | module vs standalone setup errors | NullInjectorError for RiveService |
| [#49](https://github.com/dappsnation/ng-rive/issues/49) | Custom WASM location in standalone | RIVE_WASM token not available |
| [#29](https://github.com/dappsnation/ng-rive/issues/29) | Cannot access RiveStateMachine before init | Circular dependency in DI |
| [#13](https://github.com/dappsnation/ng-rive/issues/13) | RiveService not in provider | Missing provider in module |

#### How @grandgular/rive-angular Prevents These

```typescript
// Fully standalone architecture - no modules required
@Component({
  selector: 'rive-canvas',
  standalone: true,
  // No dependencies on external services for basic functionality
})
export class RiveCanvasComponent { }

// Service uses providedIn: 'root' - always available
@Injectable({ providedIn: 'root' })
export class RiveFileService { }
```

**Prevention strategies:**

1. **100% standalone**: No NgModule required, ever
2. **Zero configuration**: Works out of the box with just component import
3. **No injection tokens**: Doesn't require RIVE_WASM, RIVE_FOLDER, RIVE_VERSION tokens
4. **Self-contained**: Component works independently without any service injection
5. **Optional service**: RiveFileService is optional, only for advanced caching use cases

---

### 4. Missing Features (6 issues)

Features users requested that were never implemented or partially implemented.

#### Issues

| # | Title | Feature Request |
|---|-------|-----------------|
| [#59](https://github.com/dappsnation/ng-rive/issues/59) | Angular + Rive Text | Dynamic text manipulation in animations |
| [#56](https://github.com/dappsnation/ng-rive/issues/56) | Change color | Programmatic fill/stroke color changes |
| [#57](https://github.com/dappsnation/ng-rive/issues/57) | Play when visible not working | Visibility-based playback control |
| [#51](https://github.com/dappsnation/ng-rive/issues/51) | 2-way bindings deprecated | Animation state tracking (playing/finished) |
| [#10](https://github.com/dappsnation/ng-rive/issues/10) | autoreset without "one-shot" | Auto-reset for all animation modes |
| [#4](https://github.com/dappsnation/ng-rive/issues/4) | Node/Bone support | Procedural bone/node manipulation |

#### Current Status in @grandgular/rive-angular

| Feature | Status | Implementation |
|---------|--------|----------------|
| Visibility-based playback | ✅ Implemented | `shouldUseIntersectionObserver` input |
| Animation state tracking | ✅ Implemented | `isPlaying`, `isPaused`, `isLoaded` signals |
| Animation lifecycle events | ✅ Implemented (v1.0.0) | `animationPlay`, `animationPause`, `animationStop`, `animationLoop`, `animationAdvance` outputs |
| Rive Text | ✅ Implemented (v0.3.0) | `textRuns` input + `getTextRunValue()` / `setTextRunValue()` / `AtPath` methods |
| Color changes | ✅ Implemented (v0.4.0) | ViewModel Data Binding: `dataBindings` input + `setColor()` / `getColor()` methods |
| Auto-reset | ⏳ Planned | Not yet implemented |
| Node/Bone | ⏳ Planned | Via `riveInstance` signal for now |

**Rive Text — fully resolved in v0.3.0 (issue [#59](https://github.com/dappsnation/ng-rive/issues/59)):**

```typescript
// Declarative (controlled) — reactive text via input
@Component({
  template: `
    <rive-canvas
      src="animation.riv"
      [textRuns]="{ greeting: userName(), subtitle: 'Welcome' }"
    />
  `
})
export class MyComponent {
  userName = signal('World');
}
```

```typescript
// Imperative (uncontrolled) — read/write text runs via methods
riveRef = viewChild.required(RiveCanvasComponent);

readValue() {
  const text = this.riveRef().getTextRunValue('greeting');
}

writeValue() {
  this.riveRef().setTextRunValue('dynamicText', 'New value');
}

// Nested artboard text runs
nestedWrite() {
  this.riveRef().setTextRunValueAtPath('button_text', 'Click Me', 'NestedArtboard/Button');
}
```

**Current workaround for remaining advanced features:**

```typescript
// Users can access the Rive instance directly for features not yet wrapped
@Component({
  template: `
    <rive-canvas
      src="animation.riv"
      (riveReady)="onRiveReady($event)"
    />
  `
})
export class MyComponent {
  onRiveReady(rive: Rive) {
    // Access advanced Rive SDK features directly
    // - Color changes
    // - Bones/nodes
  }
}
```

---

### 5. Documentation / Developer Experience Issues (2 issues)

Issues related to error messages and documentation quality.

#### Issues

| # | Title | Problem |
|---|-------|---------|
| [#23](https://github.com/dappsnation/ng-rive/issues/23) | Improve error messages | Generic errors hard to debug |
| [#22](https://github.com/dappsnation/ng-rive/issues/22) | Could not load animation | No guidance on animation name mismatch |
| [#58](https://github.com/dappsnation/ng-rive/issues/58) | documentation error | Typo "tigger" instead of "trigger" |

#### How @grandgular/rive-angular Addresses These (Phase 2 Implemented)

We have implemented a comprehensive **Developer Experience (DX)** update in Phase 2 to solve these issues permanently:

1.  **Strict Validation**: The library now validates artboard, animation, and state machine names against the loaded file.
    *   Mismatch errors are **non-fatal** (do not crash the app).
    *   Errors are emitted via `loadError` output with code `RIVE_2xx`.
    *   Console warnings include "Did you mean...?" suggestions listing available options.

2.  **Debug Mode**: A new `[debugMode]="true"` input enables verbose logging:
    *   Logs file loading progress and cache hits.
    *   Lists all available artboards/animations upon load.
    *   Shows validation warnings with suggestions.

3.  **Error Codes**: Structured error codes for programmatic handling:
    *   `RIVE_1xx`: Load errors (404, bad format)
    *   `RIVE_2xx`: Validation errors (missing assets)
    *   `RIVE_3xx`: Configuration errors (no source)

This explicitly resolves issues #23 and #22 by providing actionable feedback instead of generic failures.

---

## Detailed Issue Resolution Matrix

### Open Issues (12)

| # | Issue | Severity | @grandgular Status | Notes |
|---|-------|----------|-------------------|-------|
| #61 | Compilation errors | Critical | ✅ Resolved | Modern Angular signals API |
| #60 | WEBPACK TypeError | Critical | ✅ Resolved | Uses @rive-app/canvas |
| #59 | Rive Text | Medium | ✅ Resolved | `textRuns` input + imperative methods (v0.3.0) |
| #58 | Doc typo | Low | ✅ N/A | Fresh documentation |
| #57 | Play when visible | High | ✅ Resolved | IntersectionObserver built-in |
| #56 | Change color | Medium | ✅ Resolved | ViewModel Data Binding (v0.4.0) |
| #54 | shouldFire fails | Medium | ✅ Resolved | Different API design |
| #53 | Instance deleted | Critical | ✅ Resolved | Proper cleanup |
| #52 | Multiple artboards | Critical | ✅ Resolved | No shared state |
| #50 | Standalone errors | High | ✅ Resolved | 100% standalone |
| #23 | Error messages | Medium | ✅ Resolved | Phase 2 (Error Codes) |
| #10 | autoreset | Low | ⏳ Not yet | Planned feature |

### Closed Issues (19)

| # | Issue | Root Cause | @grandgular Status |
|---|-------|------------|-------------------|
| #51 | 2-way bindings | State tracking | ✅ Signals provide this |
| #49 | Custom WASM | Token injection | ✅ Not needed |
| #46 | Instance deleted | Cleanup race | ✅ Sync cleanup |
| #45 | Angular 14 compat | Type definitions | ✅ Modern Angular only |
| #44 | rive.load error | Version mismatch | ✅ Peer deps |
| #40 | Listeners not working | Missing feature | ✅ shouldDisableRiveListeners |
| #31 | Update package | Old rive-canvas | ✅ @rive-app/canvas |
| #30 | Multiple assets | Race condition | ✅ No shared state |
| #29 | Init order | Circular dep | ✅ No circular deps |
| #26 | Lazy module error | Cache issue | ✅ Ref counting |
| #25 | OffscreenCanvas | TypeScript config | ✅ Proper types |
| #24 | CSP unsafe-eval | Old WASM | ✅ Modern runtime |
| #22 | Animation load error | Bad error msg | ✅ Resolved (Validation) |
| #20 | State machine error | API change | ✅ Modern API |
| #17 | apply undefined | Angular 11 | ✅ Angular 18+ only |
| #16 | undefined object | Old .riv format | ✅ Modern format |
| #15 | Missing types | rive-canvas types | ✅ Full types |
| #13 | RiveService missing | Provider issue | ✅ providedIn: root |
| #6 | Canvas gaps | Fit/alignment | ✅ fit, alignment inputs |

---

## Architecture Comparison

### ng-rive Architecture (Problems)

```
┌─────────────────────────────────────────────────────────┐
│                      RiveModule                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ RiveCanvas  │  │RiveAnimation│  │ RiveStateMachine│  │
│  │ (Directive) │  │ (Directive) │  │   (Directive)   │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
│         └────────────────┼───────────────────┘           │
│                          ▼                               │
│                   ┌─────────────┐                        │
│                   │ RiveService │ ◄── Injection tokens   │
│                   │ (Shared)    │     RIVE_WASM          │
│                   └──────┬──────┘     RIVE_FOLDER        │
│                          │            RIVE_VERSION       │
│                          ▼                               │
│              ┌────────────────────┐                      │
│              │@rive-app/canvas-   │                      │
│              │    advanced        │ ◄── Manual WASM      │
│              └────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

Problems:
- Shared state causes race conditions
- Multiple directives must coordinate
- Injection tokens complicate setup
- Manual WASM management
- Module-based architecture

### @grandgular/rive-angular Architecture (Solution)

```
┌─────────────────────────────────────────────────────────┐
│              RiveCanvasComponent (Standalone)            │
│  ┌─────────────────────────────────────────────────────┐│
│  │                                                     ││
│  │  Inputs (Signals)    │  Outputs       │  State     ││
│  │  ─────────────────   │  ───────────   │  ──────    ││
│  │  src                 │  loaded        │  isPlaying ││
│  │  buffer              │  loadError     │  isPaused  ││
│  │  riveFile            │  stateChange   │  isLoaded  ││
│  │  artboard            │  riveEvent     │  riveInst  ││
│  │  animations          │  riveReady     │            ││
│  │  stateMachines       │                │            ││
│  │  autoplay            │  Methods       │            ││
│  │  fit, alignment      │  ───────────   │            ││
│  │  textRuns            │  get/setText   │            ││
│  │                      │  RunValue()    │            ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                          │                               │
│                          ▼                               │
│              ┌────────────────────┐                      │
│              │   @rive-app/canvas │ ◄── Auto WASM       │
│              │   (High-level API) │                      │
│              └────────────────────┘                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           RiveFileService (Optional, providedIn: root)   │
│  ┌─────────────────────────────────────────────────────┐│
│  │  loadFile() ──► Signal<RiveFileState>               ││
│  │  releaseFile() ──► Decrements ref count             ││
│  │  clearCache() ──► Clears all cached files           ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

Benefits:
✓ Single self-contained component
✓ No shared mutable state
✓ Zero configuration required
✓ Signal-based reactivity
✓ Automatic resource cleanup
✓ Optional caching service

---

## Roadmap: Remaining Features

Based on ng-rive issues analysis, here are features to consider:

### Phase 1: Core Stability ✅ Complete

- [x] Proper cleanup without race conditions
- [x] Multiple animations on same page
- [x] Standalone component architecture
- [x] IntersectionObserver for visibility
- [x] State signals (isPlaying, isPaused, isLoaded)
- [x] File caching with reference counting

### Phase 2: Enhanced Developer Experience ✅ Complete

- [x] Improved error messages with codes and suggestions
- [x] Validation of animation/state machine names
- [x] Debug mode with verbose logging
- [x] Race condition fixes in RiveFileService

### Phase 3: Text Run Support ✅ Complete (v0.3.0)

- [x] `textRuns` input for declarative, reactive text setting (controlled keys)
- [x] `getTextRunValue()` / `setTextRunValue()` for imperative text control (uncontrolled keys)
- [x] `getTextRunValueAtPath()` / `setTextRunValueAtPath()` for nested artboard text runs
- [x] Controlled/uncontrolled semantics with warning on misuse
- [x] Error code `RIVE_205` (`TextRunNotFound`) for text run validation

### Phase 4: Data Binding (ViewModel) Support ✅ Complete (v0.4.0)

- [x] `viewModelName` input to select ViewModel
- [x] `dataBindings` input for declarative data binding (controlled keys)
- [x] `dataBindingChange` output for two-way reactivity
- [x] `viewModelInstance` signal for advanced access
- [x] Auto-detect property types (color, number, string, boolean, enum, trigger)
- [x] `setDataBinding()` / `getDataBinding()` for imperative control (uncontrolled keys)
- [x] `fireViewModelTrigger()` for trigger properties
- [x] Color convenience methods: `setColor()`, `getColor()`, `setColorRgba()`, `setColorOpacity()`
- [x] Color utilities: `parseRiveColor()`, `riveColorToArgb()`, `riveColorToHex()`
- [x] Error codes `RIVE_4xx` for Data Binding validation
- [x] Controlled/uncontrolled semantics (same pattern as textRuns)

**Why ViewModel instead of `setFillColor()`?**

The Rive SDK doesn't provide a direct `setFillColor(shapeName, color)` method. Instead, Rive uses a **ViewModel / Data Binding** system where designers create ViewModels in the editor with typed properties (color, number, string, etc.) and bind them to animation elements. This is the official, recommended approach for dynamic data in Rive.

**Usage Examples:**

```typescript
// Declarative (controlled) — reactive via input
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

```typescript
// Imperative (uncontrolled) — direct method calls
riveRef = viewChild.required(RiveCanvasComponent);

updateColor() {
  this.riveRef().setColor('backgroundColor', '#00FF00');
  this.riveRef().setColorOpacity('backgroundColor', 0.5);
}

updateData() {
  this.riveRef().setDataBinding('score', 100);
  this.riveRef().fireViewModelTrigger('onComplete');
}

// Read values
readData() {
  const color = this.riveRef().getColor('backgroundColor');
  const score = this.riveRef().getDataBinding('score');
}
```

### Phase 5: Advanced Features (partial — v1.0.0)

- [x] Animation lifecycle outputs (`animationPlay`, `animationPause`, `animationStop`, `animationLoop`, `animationAdvance`) — **v1.0.0**
- [ ] `autoReset` input for animation reset
- [ ] Bone/node manipulation helpers (via ViewModel if supported by Rive SDK)

---

## Conclusion

The @grandgular/rive-angular library was designed with the explicit goal of **preventing the issues that plagued ng-rive users**. Through:

1.  **Modern architecture**: Standalone components, signals, zoneless-ready
2.  **Proper resource management**: Synchronous cleanup, no shared state
3.  **Zero configuration**: Works out of the box without injection tokens
4.  **Clear API boundaries**: Single component with well-defined inputs/outputs
5.  **Official SDK patterns**: Uses ViewModel for data binding (not workarounds)

We have successfully prevented **~90% of the issues** that ng-rive users faced. With v0.4.0 adding full Data Binding (ViewModel) support — including the most requested color manipulation feature (issue #56) — the library now provides feature parity with React's `@rive-app/react-webgl2` hooks while maintaining Angular's reactive patterns. **v1.0.0** marks the first stable, production-ready release under semantic versioning, including animation lifecycle outputs for play/pause/stop/loop/advance.

**Note on Feature Parity**: While we achieve functional parity with React's ViewModel hooks, the API surface differs by design:
- React uses composable hooks (`useViewModelInstanceString`, `useViewModelInstanceColor`, etc.) with individual state management
- Angular uses a unified component API with `dataBindings` input (declarative) and imperative methods (uncontrolled)
- Both approaches support two-way data binding, but Angular's output-based model (`dataBindingChange`) differs from React's hook-based reactivity
- Trigger events: React uses `onTrigger` callbacks in hooks; Angular emits via `dataBindingChange` output with `propertyType: 'trigger'` and `value: true`

---

## References

- [ng-rive GitHub Issues](https://github.com/dappsnation/ng-rive/issues)
- [Rive Web Runtime Documentation](https://help.rive.app/runtimes/overview/web-js)
- [@rive-app/canvas NPM](https://www.npmjs.com/package/@rive-app/canvas)
- [Angular Signals Documentation](https://angular.dev/guide/signals)
