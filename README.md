# @grandgular/rive-angular

[![npm version](https://img.shields.io/npm/v/@grandgular/rive-angular.svg)](https://www.npmjs.com/package/@grandgular/rive-angular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Modern Angular wrapper for [Rive](https://rive.app) animations with reactive state management, built with Angular signals and zoneless architecture.

## Overview

This library provides a **modern, Angular-native** way to integrate Rive animations into your Angular applications:

- 🚀 **Modern Angular**: Built with Angular 18+ signals, standalone components, and zoneless architecture
- ⚡ **Performance-first**: Runs outside Angular zone, uses OnPush change detection, and IntersectionObserver
- 🎯 **Type-safe**: Full TypeScript support with strict typing
- 🔄 **Reactive**: Signal-based API for reactive state management
- 🛠️ **Developer Experience**: Built-in debug mode, validation, and detailed error codes
- 🔒 **Production-ready**: Comprehensive audit completed, all critical issues resolved (v0.2.0)
- 🎨 **Data Binding**: Full ViewModel support for dynamic colors, numbers, strings, and two-way reactivity (v0.4.0)

## Documentation

- [Full Documentation](libs/rive-angular/README.md)
- [Changelog](libs/rive-angular/CHANGELOG.md)
- [Issues Analysis & Roadmap](libs/rive-angular/docs/ng-rive-issues-analysis.md)

## Latest Release: v0.4.0 (2026-02-23)

**Data Binding (ViewModel) Support** — Full integration with Rive's ViewModel system:

- ✅ Declarative data binding via `dataBindings` input (controlled keys)
- ✅ Imperative methods: `setDataBinding()`, `setColor()`, `setColorOpacity()`, `fireViewModelTrigger()`
- ✅ Two-way reactivity via `dataBindingChange` output (including trigger events)
- ✅ Auto-detect property types (color, number, string, boolean, enum, trigger)
- ✅ Color manipulation with multiple formats (hex, ARGB, RiveColor object)
- ✅ Validation errors via `RIVE_4xx` error codes
- ✅ Feature parity with React's `@rive-app/react-webgl2` hooks

See [CHANGELOG.md](libs/rive-angular/CHANGELOG.md) for full details.

## Installation

```bash
npm install @grandgular/rive-angular @rive-app/canvas
```

## Quick Start

```typescript
import { RiveCanvasComponent, Fit } from '@grandgular/rive-angular';
import { signal } from '@angular/core';

@Component({
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive-canvas
      src="assets/animation.riv"
      [stateMachines]="'StateMachine'"
      [textRuns]="{ title: 'Hello Angular!' }"
      [dataBindings]="{ backgroundColor: themeColor(), score: score() }"
      [fit]="Fit.Cover"
      [debugMode]="true"
    />
  `
})
export class AppComponent {
  Fit = Fit;
  themeColor = signal('#FF5733');
  score = signal(0);
}
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
