# rive-angular-core (internal)

Shared, runtime-agnostic code for `@grandgular/rive-angular-canvas` and `@grandgular/rive-angular-webgl2`.

This library is **not published** to npm. Sources are **copied** into each renderer package at `src/rive-angular-core` so ng-packagr can compile a single package tree.

After editing files here, run from the repo root:

```bash
npm run sync:rive-angular-core
```

Unit tests for shared pieces (e.g. `RiveLoadError`) live under this project.
