# @grandgular/rive-angular-webgl2

**Rive for Angular (WebGL2 / Rive Renderer)** — a modern [Angular](https://angular.dev) (18+) library for [Rive](https://rive.app) `.riv` animations: standalone [`RiveCanvasComponent`](https://github.com/Grandgular/rive#readme), [`RiveFileService`](https://github.com/Grandgular/rive#readme) for loading and caching, optional [`provideRiveRuntime()`](https://github.com/Grandgular/rive#readme) for WASM, **ViewModel / data binding**, state machines, and signal-based, zoneless-friendly updates.

This package is the **recommended** Rive web runtime for most projects: it uses the official [`@rive-app/webgl2`](https://www.npmjs.com/package/@rive-app/webgl2) peer (Rive Renderer) for strong rendering quality and performance. For the smaller **Canvas2D** runtime, see [`@grandgular/rive-angular-canvas`](https://www.npmjs.com/package/@grandgular/rive-angular-canvas) and Rive’s [Canvas vs WebGL2](https://rive.app/docs/runtimes/web/canvas-vs-webgl) guide.

![Rive for Angular – interactive showcase (GIF)](./docs/rive-showcase.gif)

## Install

```bash
npm install @grandgular/rive-angular-webgl2 @rive-app/webgl2
```

`@rive-app/webgl2` is a **peer dependency** (you install it next to this package so versions stay aligned with your app).

## Quick start

**1. Import the component** (standalone) where you use `<rive-canvas>`:

```typescript
import { RiveCanvasComponent, Fit, Alignment } from '@grandgular/rive-angular-webgl2';
```

**2. Register the component** in the standalone `imports` array of your feature component (or your route `loadComponent` setup).

**3. Use the template** (component selector and inputs are shared with the canvas package):

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

- **`<rive-canvas>`** — load `.riv` from `src` or `buffer`, layout (`Fit` / `Alignment`), playback, state machines, inputs, ViewModel + **data binding**, lifecycle and error outputs.
- **`RiveFileService`** — preload, dedupe, and cache `RiveFile` instances across components.
- **Types re-exported** from your Rive peer (`@rive-app/webgl2`) where useful: e.g. `Rive`, `RiveFile`, `Layout`, `Fit`, `Alignment`, `LoopType`, and related types — same surface as the canvas package, different runtime.
- **Shared helpers** (colors, errors, debug) are shipped inside this package; full narrative docs live in the monorepo [README](https://github.com/Grandgular/rive#readme).

## Versioning and migration

These packages are published as **2.0.0** as a **product-line major** (renderer split; legacy meta package no longer built from this repo). See [“Why 2.0.0”](https://github.com/Grandgular/rive#readme) and the **Migration** section in the root README if you used `@grandgular/rive-angular` before.

## More documentation

- **Full guide, comparisons, and advanced topics:** [GitHub `README.md`](https://github.com/Grandgular/rive#readme)  
- **Changelog:** [`CHANGELOG.md`](https://github.com/Grandgular/rive/blob/main/CHANGELOG.md)  
- **Canvas alternative:** [`@grandgular/rive-angular-canvas`](https://www.npmjs.com/package/@grandgular/rive-angular-canvas) + [`@rive-app/canvas`](https://www.npmjs.com/package/@rive-app/canvas)  
- **Rive runtimes (official):** [Web](https://rive.app/docs/runtimes/web/web) — WebGL2 vs Canvas, performance, and feature notes.

## License

[MIT](https://github.com/Grandgular/rive/blob/main/LICENSE) (see repository).
