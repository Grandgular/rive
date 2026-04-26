# @grandgular/rive-angular-canvas

**Rive for Angular (Canvas2D)** — a modern [Angular](https://angular.dev) (18+) library for [Rive](https://rive.app) `.riv` animations: standalone [`RiveCanvasComponent`](https://github.com/Grandgular/rive#readme), [`RiveFileService`](https://github.com/Grandgular/rive#readme) for loading and caching, optional [`provideRiveRuntime()`](https://github.com/Grandgular/rive#readme) for WASM, **ViewModel / data binding**, state machines, and signal-based, zoneless-friendly updates.

This package targets the **smaller** official runtime [`@rive-app/canvas`](https://www.npmjs.com/package/@rive-app/canvas) (HTML5 Canvas 2D). For **Rive Renderer** (WebGL2) and the default recommendation for most apps, use [`@grandgular/rive-angular-webgl2`](https://www.npmjs.com/package/@grandgular/rive-angular-webgl2) — see Rive’s [Canvas vs WebGL2](https://rive.app/docs/runtimes/web/canvas-vs-webgl) overview.

![Rive for Angular – interactive showcase (GIF)](./docs/rive-showcase.gif)

## Install

```bash
npm install @grandgular/rive-angular-canvas @rive-app/canvas
```

`@rive-app/canvas` is a **peer dependency** (install it alongside this package).

## Quick start

**1. Import the component** (standalone):

```typescript
import { RiveCanvasComponent, Fit, Alignment } from '@grandgular/rive-angular-canvas';
```

**2. Register the component** in the standalone `imports` array of your feature component (or your route `loadComponent` setup).

**3. Use the template** (shared selector and public API with the WebGL2 package):

```html
<rive-canvas
  src="assets/animation.riv"
  [fit]="Fit.Contain"
  [alignment]="Alignment.Center"
  [autoplay]="true"
/>
```

**4. (Optional) Configure the Rive WASM runtime** in `app.config.ts` — see the full [README](https://github.com/Grandgular/rive#readme) and [CHANGELOG](https://github.com/Grandgular/rive/blob/main/CHANGELOG.md) for `provideRiveRuntime({ wasmUrl, lazy: true })` and `provideRiveDebug()`.

## What you get (API overview)

- **`<rive-canvas>`** — load `.riv` from `src` or `buffer`, layout, playback, state machines, ViewModel + **data binding**, lifecycle and error outputs (same component API as `@grandgular/rive-angular-webgl2`).
- **`RiveFileService`** — preload, dedupe, and cache `RiveFile` instances.
- **Types re-exported** from the Canvas peer where useful: e.g. `Rive`, `RiveFile`, `Layout`, `Fit`, `Alignment`, `LoopType`, and related types.
- **Shared helpers** (colors, errors, debug) are embedded in this package; long-form docs and migration notes: monorepo [README](https://github.com/Grandgular/rive#readme).

## When to pick Canvas2D vs WebGL2

- **This package** — smaller download, simpler 2D-style pipelines; good when you accept Canvas2D trade-offs.
- **`@grandgular/rive-angular-webgl2`** — Rive’s usual recommendation for **quality and performance** and Renderer-only features — see the official [comparison](https://rive.app/docs/runtimes/web/canvas-vs-webgl).

## Versioning and migration

Published as **2.0.0** as a **product-line major** (split into renderer packages; legacy meta package no longer built here). See [“Why 2.0.0”](https://github.com/Grandgular/rive#readme) and the **Migration** section in the root README if you used `@grandgular/rive-angular` before.

## More documentation

- **Full guide, comparisons, and advanced topics:** [GitHub `README.md`](https://github.com/Grandgular/rive#readme)  
- **Changelog:** [`CHANGELOG.md`](https://github.com/Grandgular/rive/blob/main/CHANGELOG.md)  
- **WebGL2 / Rive Renderer package:** [`@grandgular/rive-angular-webgl2`](https://www.npmjs.com/package/@grandgular/rive-angular-webgl2)  
- **Rive runtimes (official):** [Web](https://rive.app/docs/runtimes/web/web)

## License

[MIT](https://github.com/Grandgular/rive/blob/main/LICENSE) (see repository).
