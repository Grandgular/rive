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

## Documentation

- [Full Documentation](libs/rive-angular/README.md)
- [Issues Analysis & Roadmap](libs/rive-angular/docs/ng-rive-issues-analysis.md)

## Installation

```bash
npm install @grandgular/rive-angular @rive-app/canvas
```

## Quick Start

```typescript
import { RiveCanvasComponent, Fit, Alignment } from '@grandgular/rive-angular';

@Component({
  standalone: true,
  imports: [RiveCanvasComponent],
  template: `
    <rive-canvas
      src="assets/animation.riv"
      [stateMachines]="'StateMachine'"
      [fit]="Fit.Cover"
      [debugMode]="true"
    />
  `
})
export class AppComponent {
  Fit = Fit;
}
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
