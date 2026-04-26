<!-- Synced with libs/rive-angular/README.md — update both when changing the public README. -->

# @grandgular/rive-angular

[![npm version](https://img.shields.io/npm/v/@grandgular/rive-angular.svg)](https://www.npmjs.com/package/@grandgular/rive-angular)
[![npm downloads](https://img.shields.io/npm/dm/@grandgular/rive-angular.svg)](https://www.npmjs.com/package/@grandgular/rive-angular)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@grandgular/rive-angular)](https://bundlephobia.com/package/@grandgular/rive-angular)
[![Angular](https://img.shields.io/badge/Angular-18%2B-red)](https://angular.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Rive Angular showcase preview](https://raw.githubusercontent.com/Grandgular/rive/main/libs/rive-angular/docs/showcase-afi.gif)

Modern Angular wrapper for [Rive](https://rive.app) animations with reactive state management, built with Angular signals and zoneless architecture.

**2.x** is the current major line: the public API follows [Semantic Versioning](https://semver.org/).
Current release candidate in this branch: **`2.0.0-beta.4`** (pre-release).

## Migration from v1 to v2

Version `2.0.0` contains a deliberate breaking change to remove hard runtime linkage to `@rive-app/canvas` and fully support `webgl2-only` installations.

### Breaking change: runtime value exports removed

These exports are now **type-only** from `@grandgular/rive-angular`:

- `Rive`
- `RiveFile`
- `Layout`
- `StateMachineInput`
- `ViewModelInstance`

If your app used them as runtime values (for example `new Rive(...)` from this package), switch to direct SDK imports from `@rive-app/canvas` or `@rive-app/webgl2` depending on your runtime path.

Most applications using `RiveCanvasComponent`, `RiveFileService`, `Fit`, `Alignment`, `EventType`, `LoopType`, and component APIs do not require code changes.

## What is Rive?

[Rive](https://rive.app) is a real-time interactive design and animation tool. It allows designers and developers to create animations that respond to different states and user inputs. Rive animations are lightweight, interactive, and can be used in apps, games, and websites.

## Why @grandgular/rive-angular?

This library provides a **modern, Angular-native** way to integrate Rive animations into your Angular applications:

- 🚀 **Modern Angular**: Built with Angular 18+ signals, standalone components, and zoneless architecture
- ⚡ **Performance-first**: Runs outside Angular zone, uses OnPush change detection, and IntersectionObserver for automatic rendering optimization
- 🎯 **Type-safe**: Full TypeScript support with strict typing
- 🔄 **Reactive**: Signal-based API for reactive state management
- 🌐 **SSR-ready**: Full server-side rendering support
- 🧹 **Automatic cleanup**: Proper resource management and lifecycle handling
- 📦 **File caching**: Built-in service for preloading and caching .riv files
- 🛠️ **Developer Experience**: Built-in debug mode, validation, and detailed error codes

### Comparison with alternatives

#### vs. ng-rive (unmaintained)

[ng-rive](https://www.npmjs.com/package/ng-rive) was the previous Angular wrapper for Rive, but it has been **unmaintained since 2021** and is incompatible with modern Angular versions:

| Feature | ng-rive | @grandgular/rive-angular |
|---------|---------|--------------------------|
| Angular version | 9-12 (legacy) | 18+ (modern) |
| Architecture | Modules, Zone.js | Signals, standalone |
| Maintenance | ❌ Abandoned (3+ years) | ✅ Active |
| TypeScript | Partial | Strict typing |
| SSR support | ⚠️ Limited | ✅ Full |
| Performance | Standard | Optimized (zoneless) |
| File caching | ❌ Manual | ✅ Built-in service |
| Validation | ❌ None | ✅ Built-in |

#### vs. rive-react

This library follows the design principles of the official [rive-react](https://github.com/rive-app/rive-react) library but adapts them to Angular's reactive paradigm:

| Aspect | rive-react | @grandgular/rive-angular |
|--------|------------|--------------------------|
| Component API | `<Rive>` component | `<rive>` (`<rive-canvas>` legacy alias) |
| Reactivity | Hooks (useState, useEffect) | Signals |
| File preloading | `useRiveFile` hook | `RiveFileService` |
| State access | Hook return values | Public signals |
| Lifecycle | useEffect cleanup | DestroyRef |

Both libraries provide similar features and follow the same philosophy of providing a thin, reactive wrapper around the core Rive runtime.

## Migration from ng-rive

[ng-rive](https://www.npmjs.com/package/ng-rive) has been unmaintained since 2021 and does not support Angular 13+. If you're upgrading your Angular project, here's how to migrate.

### 1. Replace the package

```bash
npm uninstall ng-rive
npm install @grandgular/rive-angular @rive-app/canvas
```

If you use WebGL2 (`provideRiveRuntime({ renderer: 'webgl2' })`) or rely on automatic fallback from WebGL2 to Canvas, also install `@rive-app/webgl2` (see [Installation](#installation)).

### 2. Update imports

| ng-rive | @grandgular/rive-angular |
|---------|--------------------------|
| `import { RiveModule } from 'ng-rive'` | `import { RiveCanvasComponent } from '@grandgular/rive-angular'` |
| Add `RiveModule` to `NgModule.imports` | Add `RiveCanvasComponent` to `imports` of standalone component |

### 3. Update templates

**ng-rive:**

```html
<!-- NgModule-based, Zone.js -->
<canvas riv="my-animation" width="500" height="500">
  <riv-animation name="idle" [play]="true"></riv-animation>
</canvas>
```

**@grandgular/rive-angular:**

```html
<!-- Standalone, signals, zoneless -->
<rive
  src="assets/my-animation.riv"
  [autoplay]="true"
  style="width: 500px; height: 500px"
/>
```

### 4. State machines

**ng-rive:**

```html
<canvas riv="my-animation">
  <riv-state-machine name="StateMachine" [play]="true">
    <riv-input name="isHover" [value]="hover"></riv-input>
  </riv-state-machine>
</canvas>
```

**@grandgular/rive-angular:**

```html
<rive
  src="assets/my-animation.riv"
  stateMachines="StateMachine"
  (loaded)="onLoaded()"
/>
```

```typescript
onLoaded() {
  this.riveCanvas().setInput('StateMachine', 'isHover', this.hover);
}
```

## Installation

`@rive-app/canvas` and `@rive-app/webgl2` are **optional peer dependencies**: install the runtime package(s) that match how you configure the library. The bundler only pulls in the SDK that is actually imported for your `renderer` / fallback path.

| Goal | Packages to install |
|------|------------------------|
| Canvas only (default `renderer`, or you never use WebGL2) | `@grandgular/rive-angular` + `@rive-app/canvas` |
| WebGL2 only (e.g. `renderer: 'webgl2'` and `strict: true`, so no Canvas fallback) | `@grandgular/rive-angular` + `@rive-app/webgl2` |
| WebGL2 with automatic fallback to Canvas (`strict: false`) | `@grandgular/rive-angular` + `@rive-app/canvas` + `@rive-app/webgl2` |

```bash
npm install @grandgular/rive-angular @rive-app/canvas
```

Or with yarn:

```bash
yarn add @grandgular/rive-angular @rive-app/canvas
```

Add WebGL2 when needed:

```bash
npm install @rive-app/webgl2
```

If a required package is missing, initialization fails with an error that names the package and suggests either installing it or setting `strict: true` to avoid loading that renderer/fallback path.

## Quick Start

### Selector notice

- Preferred selector: `<rive>`
- Legacy selector: `<rive-canvas>` (deprecated, will be removed in a future major version)

Both selectors are supported in the current major for backward compatibility.

### Basic usage

```typescript
import { Component } from '@angular/core';
import { RiveCanvasComponent, Fit, Alignment } from '@grandgular/rive-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive
      src="assets/animation.riv"
      [autoplay]="true"
      [fit]="Fit.Cover"
      [alignment]="Alignment.Center"
      (loaded)="onLoaded()"
      (loadError)="onError($event)"
    />
  `,
  styles: [`
    rive {
      width: 100%;
      height: 400px;
    }
  `]
})
export class AppComponent {
  Fit = Fit;
  Alignment = Alignment;

  onLoaded() {
    console.log('Animation loaded!');
  }

  onError(error: Error) {
    console.error('Failed to load animation:', error);
  }
}
```

### With state machines

```typescript
import { Component, viewChild } from '@angular/core';
import { RiveCanvasComponent } from '@grandgular/rive-angular';

@Component({
  selector: 'app-interactive',
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive
      src="assets/interactive.riv"
      [stateMachines]="'StateMachine'"
      (loaded)="onLoaded()"
    />
    <button (click)="triggerAction()">Trigger</button>
  `
})
export class InteractiveComponent {
  riveCanvas = viewChild.required(RiveCanvasComponent);

  onLoaded() {
    // Set initial state
    this.riveCanvas().setInput('StateMachine', 'isActive', true);
  }

  triggerAction() {
    // Fire a trigger
    this.riveCanvas().fireTrigger('StateMachine', 'onClick');
  }
}
```

### Text Runs

Rive text runs allow you to update text content at runtime. The library provides two approaches:

#### Declarative (Controlled Keys)

Use the `textRuns` input for reactive, template-driven text updates:

```html
<rive
  src="assets/hello.riv"
  [textRuns]="{ greeting: userName(), subtitle: 'Welcome' }"
/>
```

Keys present in `textRuns` are **controlled** — the input is the source of truth and will override any imperative changes.

#### Imperative (Uncontrolled Keys)

Use methods for reading values or managing keys not in `textRuns`:

```typescript
riveRef = viewChild.required(RiveCanvasComponent);

// Read current value
const greeting = this.riveRef().getTextRunValue('greeting');

// Set uncontrolled key
this.riveRef().setTextRunValue('dynamicText', 'New value');
```

#### Nested Text Runs

For text runs inside nested components, use the `AtPath` variants:

```typescript
this.riveRef().setTextRunValueAtPath(
  'button_text',
  'Click Me',
  'NestedArtboard/ButtonComponent'
);
```

#### Controlled vs Uncontrolled

- **Controlled**: Keys in `textRuns` input — managed by Angular, input is source of truth
- **Uncontrolled**: Keys not in `textRuns` — managed imperatively via methods
- **Warning**: Calling `setTextRunValue()` on a controlled key logs a warning and the change will be overwritten on next input update

### Data Binding (ViewModel)

Rive's ViewModel system allows you to bind dynamic data (colors, numbers, strings, booleans, etc.) to your animations. ViewModels are created in the Rive editor and provide a structured way to control animation properties at runtime.

#### What is a ViewModel?

A ViewModel in Rive is a data structure that:
- Is created by designers in the Rive editor
- Contains typed properties (color, number, string, boolean, enum, trigger)
- Can be bound to animation elements (fills, strokes, transforms, etc.)
- Supports two-way data binding (changes in code affect animation, changes in animation can trigger events)

#### When to use Data Binding vs Text Runs?

- **Text Runs**: Simple text updates, no ViewModel setup required in editor
- **Data Binding**: Dynamic colors, numbers, complex data structures, two-way reactivity

#### Declarative (Controlled) Approach

Use the `dataBindings` input for reactive, template-driven data binding:

```typescript
import { Component, signal } from '@angular/core';
import { RiveCanvasComponent } from '@grandgular/rive-angular';

@Component({
  selector: 'app-data-binding',
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive
      src="assets/animation.riv"
      [dataBindings]="{
        backgroundColor: themeColor(),
        score: playerScore(),
        playerName: userName(),
        isActive: isGameActive()
      }"
      (dataBindingChange)="onDataChange($event)"
    />
    
    <button (click)="changeTheme()">Change Theme</button>
    <button (click)="incrementScore()">+10 Points</button>
  `
})
export class DataBindingComponent {
  themeColor = signal('#FF5733');
  playerScore = signal(0);
  userName = signal('Player 1');
  isGameActive = signal(true);

  changeTheme() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    this.themeColor.set(randomColor);
  }

  incrementScore() {
    this.playerScore.update(score => score + 10);
  }

  onDataChange(event: DataBindingChangeEvent) {
    console.log('Property changed from animation:', event);
    // event.path: property path
    // event.value: new value (for triggers, value is always true)
    // event.propertyType: 'color' | 'number' | 'string' | 'boolean' | 'enum' | 'trigger'
    
    if (event.propertyType === 'trigger') {
      console.log(`Trigger "${event.path}" fired from animation`);
      // Handle trigger event (e.g., show popup, play sound, etc.)
    }
  }
}
```

#### Imperative (Uncontrolled) Approach

Use methods for direct, programmatic control:

```typescript
import { Component, viewChild } from '@angular/core';
import { RiveCanvasComponent } from '@grandgular/rive-angular';

@Component({
  selector: 'app-imperative',
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive src="assets/animation.riv" />
    
    <button (click)="updateColor()">Update Color</button>
    <button (click)="updateScore()">Update Score</button>
    <button (click)="triggerAnimation()">Fire Trigger</button>
  `
})
export class ImperativeComponent {
  riveRef = viewChild.required(RiveCanvasComponent);

  updateColor() {
    // Set color using hex string
    this.riveRef().setColor('backgroundColor', '#00FF00');
    
    // Or using RGBA components
    this.riveRef().setColorRgba('backgroundColor', 0, 255, 0, 255);
    
    // Or change only opacity
    this.riveRef().setColorOpacity('backgroundColor', 0.5);
  }

  updateScore() {
    // Set any data binding value (auto-detects type)
    this.riveRef().setDataBinding('score', 100);
    this.riveRef().setDataBinding('playerName', 'Winner');
    this.riveRef().setDataBinding('isActive', false);
  }

  triggerAnimation() {
    // Fire a trigger property
    this.riveRef().fireViewModelTrigger('onComplete');
  }

  readValues() {
    // Read current values
    const color = this.riveRef().getColor('backgroundColor');
    // color: { r: 0, g: 255, b: 0, a: 255 }
    
    const score = this.riveRef().getDataBinding('score');
    // score: 100 (auto-detected as number)
  }
}
```

#### Color Utilities

The library exports color conversion utilities for advanced use cases:

```typescript
import { parseRiveColor, riveColorToArgb, riveColorToHex } from '@grandgular/rive-angular';

// Parse various color formats
const color1 = parseRiveColor('#FF5733');        // { r: 255, g: 87, b: 51, a: 255 }
const color2 = parseRiveColor('#FF573380');      // { r: 255, g: 87, b: 51, a: 128 }
const color3 = parseRiveColor(0x80FF5733);       // { r: 255, g: 87, b: 51, a: 128 }
const color4 = parseRiveColor({ r: 255, g: 0, b: 0, a: 255 });

// Convert to ARGB integer
const argb = riveColorToArgb({ r: 255, g: 0, b: 0, a: 255 }); // 0xFFFF0000

// Convert to hex string
const hex = riveColorToHex({ r: 255, g: 0, b: 0, a: 255 }); // '#FF0000FF'
```

#### Selecting a ViewModel

If your `.riv` file contains multiple ViewModels, specify which one to use:

```typescript
<rive
  src="assets/animation.riv"
  viewModelName="GameViewModel"
  [dataBindings]="{ score: 42 }"
/>
```

If `viewModelName` is not provided, the default ViewModel for the artboard is used.

#### Controlled vs Uncontrolled

Same semantics as Text Runs:

- **Controlled**: Keys in `dataBindings` input — managed by Angular, input is source of truth
- **Uncontrolled**: Keys not in `dataBindings` — managed imperatively via methods
- **Warning**: Calling `setDataBinding()` or `setColor()` on a controlled key logs a warning and the change will be overwritten on next input update

#### Validation and Error Handling

Imperative methods (`setDataBinding`, `setColor`, `setColorOpacity`, `fireViewModelTrigger`) emit validation errors via the `loadError` output when:

- Property path doesn't exist in the ViewModel (`RIVE_402`)
- Value type doesn't match property type (`RIVE_403`)
- Color format is invalid (hex string, ARGB integer, or RiveColor object expected)
- Opacity value is out of range (must be between 0.0 and 1.0)

```typescript
<rive
  src="assets/animation.riv"
  (loadError)="handleError($event)"
/>

handleError(error: Error) {
  if (error instanceof RiveValidationError) {
    console.error('Validation error:', error.code, error.message);
  }
}
```

#### Advanced: Direct ViewModel Access

For advanced scenarios, access the ViewModel instance directly:

```typescript
riveRef = viewChild.required(RiveCanvasComponent);

advancedUsage() {
  const vmi = this.riveRef().viewModelInstance();
  if (vmi) {
    // Direct access to ViewModel SDK methods
    const colorProp = vmi.color('backgroundColor');
    if (colorProp) {
      colorProp.rgba(255, 0, 0, 255);
    }
  }
}
```

### Preloading files with RiveFileService

For better performance, you can preload and cache .riv files:

```typescript
import { Component, inject, DestroyRef } from '@angular/core';
import { RiveCanvasComponent, RiveFileService } from '@grandgular/rive-angular';

@Component({
  selector: 'app-preload',
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    @if (fileState().status === 'success') {
      <rive
        [riveFile]="fileState().riveFile"
        [autoplay]="true"
      />
    }
    @if (fileState().status === 'loading') {
      <p>Loading animation...</p>
    }
    @if (fileState().status === 'failed') {
      <p>Failed to load animation</p>
    }
  `
})
export class PreloadComponent {
  private riveFileService = inject(RiveFileService);
  private destroyRef = inject(DestroyRef);

  // Load and cache the file
  fileState = this.riveFileService.loadFile({
    src: 'assets/animation.riv'
  });

  constructor() {
    // Auto-release on component destroy
    this.destroyRef.onDestroy(() => {
      this.riveFileService.releaseFile({ src: 'assets/animation.riv' });
    });
  }
}
```

## Debug Mode

The library provides a built-in debug mode to help you troubleshoot animations.

### Global Configuration

Enable debug mode globally in your `app.config.ts`:

```typescript
import { provideRiveDebug } from '@grandgular/rive-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRiveDebug({ logLevel: 'debug' })
  ]
};
```

Available log levels: `'none' | 'error' | 'warn' | 'info' | 'debug'`

### Local Override

Enable debug mode for a specific component instance:

```typescript
<rive
  src="assets/animation.riv"
  [debugMode]="true" 
/>
```

When debug mode is enabled, the library will log:
- Loading progress and file details
- Available artboards, animations, and state machines
- Validation warnings (e.g., misspelled animation names)

## Runtime Initialization (WASM)

Use `provideRiveRuntime()` to control when the Rive WASM runtime initializes.

By default, runtime uses `renderer: 'canvas'` for backward compatibility.
To enable vector feathering support, configure `renderer: 'webgl2'`.

### Eager mode (default)

Initializes runtime on app startup:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRiveRuntime } from '@grandgular/rive-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRiveRuntime({
      wasmUrl: 'assets/rive/rive.v1.wasm',
      renderer: 'canvas',
    }),
  ],
};
```

### Lazy mode

Initializes runtime only when first needed (first `rive-canvas` init or `RiveFileService.loadFile()` call):

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRiveRuntime } from '@grandgular/rive-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRiveRuntime({
      wasmUrl: 'assets/rive/rive.v1.wasm',
      lazy: true,
      renderer: 'webgl2',
      strict: false,
    }),
  ],
};
```

### Renderer fallback behavior

```typescript
provideRiveRuntime({
  renderer: 'webgl2',
  strict: false,
});
```

- `renderer` is optional; default is `'canvas'`.
- `strict` is optional; default is `false`.
- With `strict: false`, the library automatically falls back to the other renderer if the preferred renderer fails to initialize. **Both** `@rive-app/canvas` and `@rive-app/webgl2` must be installed for fallback to succeed if the other SDK is needed.
- With `strict: true`, fallback is disabled and initialization fails fast if the chosen renderer cannot load — useful when you intentionally ship only one runtime package.

If fallback fails (for example WebGL2 unavailable **and** the Canvas package is not installed), the error explains what failed and suggests installing the missing package or using `strict: true` with a single renderer.

### Migration from `provideAppInitializer`

If you used:

```typescript
provideAppInitializer(() => RuntimeLoader.setWasmUrl('assets/rive/rive.v1.wasm'))
```

you can now use:

```typescript
provideRiveRuntime({ wasmUrl: 'assets/rive/rive.v1.wasm' })
```

## Error Handling & Validation

The library validates your configuration against the loaded Rive file and provides structured error codes.

### Validation

Validation errors (e.g., missing artboard or animation) are **non-fatal**. They are emitted via the `loadError` output but do not crash the application.

```typescript
<rive
  src="assets/anim.riv"
  [artboard]="'WrongName'"
  (loadError)="onError($event)"
/>
```

In this case, `onError` receives a `RiveValidationError` with code `RIVE_201`, and the library logs a warning with available artboard names.

### Error Codes

| Code | Type | Description |
|------|------|-------------|
| `RIVE_101` | Load | File not found (404) |
| `RIVE_102` | Load | Invalid .riv file format |
| `RIVE_103` | Load | Network error |
| `RIVE_201` | Validation | Artboard not found |
| `RIVE_202` | Validation | Animation not found |
| `RIVE_203` | Validation | State machine not found |
| `RIVE_204` | Validation | Input/Trigger not found in State Machine |
| `RIVE_205` | Validation | Text run not found |
| `RIVE_301` | Config | No animation source provided |
| `RIVE_302` | Config | Invalid canvas element |
| `RIVE_401` | Data Binding | ViewModel not found |
| `RIVE_402` | Data Binding | Property not found in ViewModel |
| `RIVE_403` | Data Binding | Type mismatch (value doesn't match property type) |

## API Reference

### Runtime Provider

```typescript
interface RiveRuntimeConfig {
  wasmUrl?: string;
  lazy?: true;
  renderer?: 'canvas' | 'webgl2';
  strict?: boolean;
}
```

- `provideRiveRuntime(config?: RiveRuntimeConfig)` - configures Rive runtime initialization strategy.
- `lazy` omitted - eager initialization on startup.
- `lazy: true` - deferred initialization at first runtime usage.
- `renderer` omitted - defaults to `'canvas'` for backward compatibility.
- `strict` omitted - defaults to `false` and allows automatic fallback.

### RiveCanvasComponent

#### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `src` | `string` | - | URL to the .riv file |
| `buffer` | `ArrayBuffer` | - | ArrayBuffer containing .riv file data |
| `riveFile` | `RiveFile` | - | Preloaded RiveFile instance (from RiveFileService) |
| `artboard` | `string` | - | Name of the artboard to display |
| `animations` | `string \| string[]` | - | Animation(s) to play |
| `stateMachines` | `string \| string[]` | - | State machine(s) to use |
| `autoplay` | `boolean` | `true` | Auto-play animations on load |
| `fit` | `Fit` | `Fit.Contain` | How the animation fits in the canvas |
| `alignment` | `Alignment` | `Alignment.Center` | Alignment of the animation |
| `useOffscreenRenderer` | `boolean` | `false` | Use offscreen rendering |
| `shouldUseIntersectionObserver` | `boolean` | `true` | Auto-pause when off-screen |
| `shouldDisableRiveListeners` | `boolean` | `false` | Disable Rive event listeners |
| `automaticallyHandleEvents` | `boolean` | `false` | Auto-handle Rive events (e.g., OpenUrlEvent) |
| `debugMode` | `boolean` | `undefined` | Enable verbose logging for this instance |
| `textRuns` | `Record<string, string>` | - | Declarative text run values. Keys present are controlled by input. |
| `viewModelName` | `string` | - | ViewModel to use for data binding (if the `.riv` file defines ViewModels) |
| `dataBindings` | `Record<string, DataBindingValue>` | - | Declarative ViewModel property values. Keys present are controlled by input. |

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `loaded` | `void` | Emitted when animation loads successfully |
| `loadError` | `Error` | Emitted when animation fails to load or validation errors occur |
| `stateChange` | `RiveEvent` | Emitted on state machine state changes |
| `riveEvent` | `RiveEvent` | Emitted for custom Rive events |
| `riveReady` | `Rive` | Emitted when Rive instance is **fully loaded** and ready (after `loaded`) |
| `dataBindingChange` | `DataBindingChangeEvent` | Emitted when a ViewModel property changes (two-way binding) |
| `animationPlay` | `RiveEvent` | Emitted when playback starts (`type: EventType.Play`) |
| `animationPause` | `RiveEvent` | Emitted when playback pauses (`type: EventType.Pause`) |
| `animationStop` | `RiveEvent` | Emitted when playback stops (`type: EventType.Stop`) |
| `animationLoop` | `RiveEvent` | Emitted when a loop iteration completes; `event.data` is a `LoopEvent` (animation name + `LoopType`) |
| `animationAdvance` | `RiveEvent` | Emitted every frame while advancing; **high frequency** — use sparingly. Not wrapped in `NgZone.run`; trigger change detection manually if the view must update |

#### Animation lifecycle events

Listen for play/pause/stop/loop/advance without subscribing to the raw Rive instance:

```typescript
import { Component } from '@angular/core';
import {
  RiveCanvasComponent,
  type RiveEvent,
  EventType,
  LoopType,
  type LoopEvent,
} from '@grandgular/rive-angular';

@Component({
  imports: [RiveCanvasComponent],
  template: `
    <rive
      src="animation.riv"
      (animationPlay)="onAnimationPlay($event)"
      (animationPause)="onAnimationPause($event)"
      (animationStop)="onAnimationStop($event)"
      (animationLoop)="onAnimationLoop($event)"
    />
  `,
})
export class LifecycleDemoComponent {
  onAnimationPlay(_event: RiveEvent) {
    // event.type === EventType.Play
  }

  onAnimationPause(_event: RiveEvent) {
    // event.type === EventType.Pause
  }

  onAnimationStop(_event: RiveEvent) {
    // event.type === EventType.Stop
  }

  onAnimationLoop(event: RiveEvent) {
    const loopData = event.data as LoopEvent;
    // e.g. one-shot completion:
    if (loopData.type === LoopType.OneShot) {
      // animation finished its single run
    }
  }
}
```

`LoopType` and `LoopEvent` are re-exported from `@grandgular/rive-angular` for convenience.

#### Public Signals (Readonly)

All signals are **readonly** and cannot be mutated externally. Use the public methods to control the animation.

| Signal | Type | Description |
|--------|------|-------------|
| `isPlaying` | `Signal<boolean>` | Whether animation is playing |
| `isPaused` | `Signal<boolean>` | Whether animation is paused |
| `isLoaded` | `Signal<boolean>` | Whether animation is loaded |
| `riveInstance` | `Signal<Rive \| null>` | Direct access to Rive instance |
| `viewModelInstance` | `Signal<ViewModelInstance \| null>` | Active ViewModel instance after load, if the file uses ViewModels |

**Note:** Signals are readonly to prevent external mutation. Use component methods (`playAnimation()`, `pauseAnimation()`, etc.) to control the animation state.

#### Public Methods

| Method | Description |
|--------|-------------|
| `playAnimation(animations?: string \| string[])` | Play animation(s) |
| `pauseAnimation(animations?: string \| string[])` | Pause animation(s) |
| `stopAnimation(animations?: string \| string[])` | Stop animation(s) |
| `reset()` | Reset animation to beginning |
| `setInput(stateMachine: string, input: string, value: number \| boolean)` | Set state machine input value |
| `fireTrigger(stateMachine: string, trigger: string)` | Fire state machine trigger |
| `getTextRunValue(name: string): string \| undefined` | Get text run value |
| `setTextRunValue(name: string, value: string)` | Set text run value (warns if key is controlled) |
| `getTextRunValueAtPath(name: string, path: string): string \| undefined` | Get nested text run value |
| `setTextRunValueAtPath(name: string, value: string, path: string)` | Set nested text run |

### RiveFileService

Service for preloading and caching .riv files.

#### Methods

| Method | Description |
|--------|-------------|
| `loadFile(params: RiveFileParams): Signal<RiveFileState>` | Load and cache a .riv file |
| `releaseFile(params: RiveFileParams): void` | Release cached file (decrements ref count) |
| `clearCache(): void` | Clear all cached files |

#### Types

```typescript
interface RiveFileParams {
  src?: string;
  buffer?: ArrayBuffer;
  debug?: boolean;
}

interface RiveFileState {
  riveFile: RiveFile | null;
  status: 'idle' | 'loading' | 'success' | 'failed';
}
```

## SSR Support

The library is fully compatible with Angular Universal and server-side rendering:

- Canvas rendering is automatically disabled on the server
- IntersectionObserver and ResizeObserver use safe fallbacks
- No runtime errors in SSR environments

## Performance Tips

1. **Use IntersectionObserver**: Keep `shouldUseIntersectionObserver` enabled (default) to automatically pause animations when off-screen
2. **Preload files**: Use `RiveFileService` to preload and cache .riv files for instant display
3. **Disable unnecessary listeners**: Set `shouldDisableRiveListeners` to `true` for decorative animations without interactivity
4. **Use OnPush**: The component already uses `OnPush` change detection for optimal performance
5. **Reactive updates**: The component now reactively updates layout when `fit` or `alignment` change without full reload

## Recent Improvements (v0.2.0)

### Quality & Stability
- ✅ **Readonly signals** prevent accidental state mutation
- ✅ **Dynamic DPR** support for multi-monitor setups
- ✅ **Reactive configuration** - all inputs trigger appropriate updates
- ✅ **Type-safe configuration** - eliminated unsafe type assertions
- ✅ **Fixed race conditions** in file service and cache management
- ✅ **Proper timing** - `riveReady` emits after full load

### Developer Experience
- 🛠️ **Enhanced validation** with detailed error messages
- 🐛 **Comprehensive debugging** via `provideRiveDebug()`
- 📝 **Better error codes** for programmatic error handling
- 🧪 **Improved testability** with DI-based services

See [CHANGELOG.md](libs/rive-angular/CHANGELOG.md) for complete details, migration guide, and all improvements.

## Requirements

- Angular 18.0.0 or higher
- At least one of: `@rive-app/canvas` or `@rive-app/webgl2` (^2.35.0), matching your `provideRiveRuntime` / fallback setup (see [Installation](#installation))
- TypeScript 5.4 or higher

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Resources

- [Rive Homepage](https://rive.app)
- [Rive Documentation](https://help.rive.app)
- [Rive Community](https://rive.app/community)
- [Angular Documentation](https://angular.dev)

## Maintainer

This library is maintained by the community and is not officially supported by Rive. For official Rive support, please visit the [Rive Community](https://rive.app/community).
