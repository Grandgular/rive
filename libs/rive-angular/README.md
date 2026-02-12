# @grandgular/rive-angular

[![npm version](https://img.shields.io/npm/v/@grandgular/rive-angular.svg)](https://www.npmjs.com/package/@grandgular/rive-angular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Modern Angular wrapper for [Rive](https://rive.app) animations with reactive state management, built with Angular signals and zoneless architecture.

## What is Rive?

[Rive](https://rive.app) is a real-time interactive design and animation tool. It allows designers and developers to create animations that respond to different states and user inputs. Rive animations are lightweight, interactive, and can be used in apps, games, and websites.

## Why @grandgular/rive-angular?

This library provides a **modern, Angular-native** way to integrate Rive animations into your Angular applications:

- 🚀 **Modern Angular**: Built with Angular 21+ signals, standalone components, and zoneless architecture
- ⚡ **Performance-first**: Runs outside Angular zone, uses OnPush change detection, and IntersectionObserver for automatic rendering optimization
- 🎯 **Type-safe**: Full TypeScript support with strict typing
- 🔄 **Reactive**: Signal-based API for reactive state management
- 🌐 **SSR-ready**: Full server-side rendering support
- 🧹 **Automatic cleanup**: Proper resource management and lifecycle handling
- 📦 **File caching**: Built-in service for preloading and caching .riv files

### Comparison with alternatives

#### vs. ng-rive (unmaintained)

[ng-rive](https://www.npmjs.com/package/ng-rive) was the previous Angular wrapper for Rive, but it has been **unmaintained since 2021** and is incompatible with modern Angular versions:

| Feature | @grandgular/rive-angular | ng-rive |
|---------|--------------------------|---------|
| Angular version | 21+ (modern) | 9-12 (legacy) |
| Architecture | Signals, standalone | Modules, Zone.js |
| Maintenance | ✅ Active | ❌ Abandoned (3+ years) |
| TypeScript | Strict typing | Partial |
| SSR support | ✅ Full | ⚠️ Limited |
| Performance | Optimized (zoneless) | Standard |
| File caching | ✅ Built-in service | ❌ Manual |

#### vs. rive-react

This library follows the design principles of the official [rive-react](https://github.com/rive-app/rive-react) library but adapts them to Angular's reactive paradigm:

| Aspect | @grandgular/rive-angular | rive-react |
|--------|--------------------------|------------|
| Component API | `<rive-canvas>` | `<Rive>` component |
| Reactivity | Signals | Hooks (useState, useEffect) |
| File preloading | `RiveFileService` | `useRiveFile` hook |
| State access | Public signals | Hook return values |
| Lifecycle | DestroyRef | useEffect cleanup |

Both libraries provide similar features and follow the same philosophy of providing a thin, reactive wrapper around the core Rive runtime.

## Installation

```bash
npm install @grandgular/rive-angular @rive-app/canvas
```

Or with yarn:

```bash
yarn add @grandgular/rive-angular @rive-app/canvas
```

## Quick Start

### Basic usage

```typescript
import { Component } from '@angular/core';
import { RiveCanvasComponent, Fit, Alignment } from '@grandgular/rive-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive-canvas
      src="assets/animation.riv"
      [autoplay]="true"
      [fit]="Fit.Cover"
      [alignment]="Alignment.Center"
      (loaded)="onLoaded()"
      (loadError)="onError($event)"
    />
  `,
  styles: [`
    rive-canvas {
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
    <rive-canvas
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
      <rive-canvas
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

## API Reference

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

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `loaded` | `void` | Emitted when animation loads successfully |
| `loadError` | `Error` | Emitted when animation fails to load |
| `stateChange` | `RiveEvent` | Emitted on state machine state changes |
| `riveEvent` | `RiveEvent` | Emitted for custom Rive events |
| `riveReady` | `Rive` | Emitted when Rive instance is created |

#### Public Signals

| Signal | Type | Description |
|--------|------|-------------|
| `isPlaying` | `Signal<boolean>` | Whether animation is playing |
| `isPaused` | `Signal<boolean>` | Whether animation is paused |
| `isLoaded` | `Signal<boolean>` | Whether animation is loaded |
| `riveInstance` | `Signal<Rive \| null>` | Direct access to Rive instance |

#### Public Methods

| Method | Description |
|--------|-------------|
| `playAnimation(animations?: string \| string[])` | Play animation(s) |
| `pauseAnimation(animations?: string \| string[])` | Pause animation(s) |
| `stopAnimation(animations?: string \| string[])` | Stop animation(s) |
| `reset()` | Reset animation to beginning |
| `setInput(stateMachine: string, input: string, value: number \| boolean)` | Set state machine input value |
| `fireTrigger(stateMachine: string, trigger: string)` | Fire state machine trigger |

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

## Troubleshooting

### Animation not loading

- Verify the .riv file path is correct
- Check browser console for errors
- Ensure `@rive-app/canvas` is installed

### State machine inputs not working

- Verify state machine and input names match your .riv file
- Check that the animation has loaded before calling `setInput` or `fireTrigger`
- Use the `loaded` output to ensure timing

### Memory leaks with RiveFileService

- Always call `releaseFile` when done with a file
- Use `DestroyRef.onDestroy` to auto-release files on component destroy
- The service uses reference counting - files are only cleaned up when ref count reaches 0

## Requirements

- Angular 21.1.0 or higher
- @rive-app/canvas 2.35.0 or higher
- TypeScript 5.9 or higher

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
