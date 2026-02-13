# ng-rive Issues Analysis Report

> **Purpose**: This document analyzes all 31 issues (12 open + 19 closed) from the [ng-rive](https://github.com/dappsnation/ng-rive) library to understand common pain points and ensure @grandgular/rive-angular prevents these issues from occurring.

## Executive Summary

The ng-rive library, while pioneering Angular support for Rive animations, has been unmaintained since 2023 and accumulated significant technical debt. After analyzing all 31 GitHub issues, we categorized them into **5 main problem areas**:

| Category | Issues Count | Status in @grandgular/rive-angular |
|----------|--------------|-------------------------------------|
| Version Compatibility | 8 | ✅ Fully resolved |
| Memory Management | 5 | ✅ Fully resolved |
| Dependency Injection / Module Setup | 4 | ✅ Fully resolved |
| Missing Features | 6 | ⏳ Partially addressed |
| Documentation / DX | 2 | ⏳ Needs improvement |

**Result**: @grandgular/rive-angular already prevents **~80% of issues** that plagued ng-rive users.

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
| Rive Text | ⏳ Planned | Via `riveInstance` signal for now |
| Color changes | ⏳ Planned | Via `riveInstance` signal for now |
| Auto-reset | ⏳ Planned | Not yet implemented |
| Node/Bone | ⏳ Planned | Via `riveInstance` signal for now |

**Current workaround for advanced features:**

```typescript
// Users can access the Rive instance directly for advanced features
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
    // - Text runs
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

#### How @grandgular/rive-angular Addresses These

```typescript
// Custom error class with context
export class RiveLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RiveLoadError';
  }
}

// Error handling with context
private onLoadError(originalError?: unknown): void {
  const error = new RiveLoadError(
    'Failed to load Rive animation',
    originalError instanceof Error ? originalError : undefined
  );
  console.error('Rive load error:', error);
  this.loadError.emit(error);
}
```

**Improvements needed:**

1. Add error codes with specific suggestions
2. Include documentation links in error messages
3. Validate animation/state machine names before use
4. Provide detailed troubleshooting guide

---

## Detailed Issue Resolution Matrix

### Open Issues (12)

| # | Issue | Severity | @grandgular Status | Notes |
|---|-------|----------|-------------------|-------|
| #61 | Compilation errors | Critical | ✅ Resolved | Modern Angular signals API |
| #60 | WEBPACK TypeError | Critical | ✅ Resolved | Uses @rive-app/canvas |
| #59 | Rive Text | Medium | ⏳ Workaround | Via riveInstance signal |
| #58 | Doc typo | Low | ✅ N/A | Fresh documentation |
| #57 | Play when visible | High | ✅ Resolved | IntersectionObserver built-in |
| #56 | Change color | Medium | ⏳ Workaround | Via riveInstance signal |
| #54 | shouldFire fails | Medium | ✅ Resolved | Different API design |
| #53 | Instance deleted | Critical | ✅ Resolved | Proper cleanup |
| #52 | Multiple artboards | Critical | ✅ Resolved | No shared state |
| #50 | Standalone errors | High | ✅ Resolved | 100% standalone |
| #23 | Error messages | Medium | ⏳ Partial | Basic errors, needs improvement |
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
| #22 | Animation load error | Bad error msg | ⏳ Needs work |
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

Problems:
- Shared state causes race conditions
- Multiple directives must coordinate
- Injection tokens complicate setup
- Manual WASM management
- Module-based architecture
```

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
│  │  autoplay            │                │            ││
│  │  fit, alignment      │                │            ││
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

Benefits:
✓ Single self-contained component
✓ No shared mutable state
✓ Zero configuration required
✓ Signal-based reactivity
✓ Automatic resource cleanup
✓ Optional caching service
```

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

### Phase 2: Enhanced Developer Experience (In Progress)

- [ ] Improved error messages with codes and suggestions
- [ ] Validation of animation/state machine names
- [ ] Debug mode with verbose logging

### Phase 3: Advanced Features (Planned)

- [ ] `setText(textRunName, value)` method for Rive Text
- [ ] `setFillColor(shapeName, color)` method
- [ ] `autoReset` input for animation reset
- [ ] `animationComplete` / `animationLoop` events
- [ ] Bone/node manipulation helpers

---

## Conclusion

The @grandgular/rive-angular library was designed with the explicit goal of **preventing the issues that plagued ng-rive users**. Through:

1. **Modern architecture**: Standalone components, signals, zoneless-ready
2. **Proper resource management**: Synchronous cleanup, no shared state
3. **Zero configuration**: Works out of the box without injection tokens
4. **Clear API boundaries**: Single component with well-defined inputs/outputs

We have successfully prevented **80% of the issues** that ng-rive users faced. The remaining 20% are feature requests that can be addressed through the `riveInstance` signal workaround today, with dedicated methods planned for future releases.

---

## References

- [ng-rive GitHub Issues](https://github.com/dappsnation/ng-rive/issues)
- [Rive Web Runtime Documentation](https://help.rive.app/runtimes/overview/web-js)
- [@rive-app/canvas NPM](https://www.npmjs.com/package/@rive-app/canvas)
- [Angular Signals Documentation](https://angular.dev/guide/signals)
