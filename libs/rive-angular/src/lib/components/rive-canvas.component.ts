import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  input,
  output,
  signal,
  effect,
  inject,
  DestroyRef,
  PLATFORM_ID,
  AfterViewInit,
  NgZone,
  viewChild,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Rive,
  RiveFile,
  Layout,
  Fit,
  Alignment,
  StateMachineInput,
  type LayoutParameters,
  Event as RiveEvent,
} from '@rive-app/canvas';
import { RiveLoadError } from '../models';
import { getElementObserver } from '../utils';

/**
 * Standalone Angular component for Rive animations
 *
 * Features:
 * - Signal-based inputs for reactive updates
 * - Automatic canvas sizing via ResizeObserver with DPR support
 * - OnPush change detection strategy
 * - SSR compatible
 * - Zoneless architecture ready
 * - Automatic resource cleanup
 * - Runs outside Angular zone for optimal performance
 *
 * @example
 * ```html
 * <rive-canvas
 *   src="assets/animations/rive/animation.riv"
 *   [stateMachines]="'StateMachine'"
 *   [autoplay]="true"
 *   [fit]="Fit.Cover"
 *   [alignment]="Alignment.Center"
 *   (loaded)="onLoad()"
 * />
 * ```
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'rive-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #canvas [style.width.%]="100" [style.height.%]="100"></canvas>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      canvas {
        display: block;
      }
    `,
  ],
})
export class RiveCanvasComponent implements AfterViewInit {
  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly #destroyRef = inject(DestroyRef);
  readonly #platformId = inject(PLATFORM_ID);
  readonly #ngZone = inject(NgZone);

  public readonly src = input<string>();
  public readonly buffer = input<ArrayBuffer>();
  /**
   * Preloaded RiveFile instance (from RiveFileService).
   * If provided, this takes precedence over src/buffer.
   */
  public readonly riveFile = input<RiveFile>();
  public readonly artboard = input<string>();
  public readonly animations = input<string | string[]>();
  public readonly stateMachines = input<string | string[]>();
  public readonly autoplay = input<boolean>(true);
  public readonly fit = input<Fit>(Fit.Contain);
  public readonly alignment = input<Alignment>(Alignment.Center);
  public readonly useOffscreenRenderer = input<boolean>(false);
  /**
   * Enable IntersectionObserver to automatically stop rendering when canvas is not visible.
   * This optimizes performance by pausing animations that are off-screen.
   */
  public readonly shouldUseIntersectionObserver = input<boolean>(true);
  /**
   * Disable Rive event listeners on the canvas (pointer events, touch events).
   * Useful for decorative animations without interactivity.
   */
  public readonly shouldDisableRiveListeners = input<boolean>(false);
  /**
   * Allow Rive to automatically handle Rive Events (e.g., OpenUrlEvent opens URLs).
   * Default is false for security - events must be handled manually via riveEvent output.
   */
  public readonly automaticallyHandleEvents = input<boolean>(false);

  // Outputs (Events)
  public readonly loaded = output<void>();
  public readonly loadError = output<Error>();
  /**
   * Emitted when state machine state changes.
   * Contains information about the state change event.
   */
  public readonly stateChange = output<RiveEvent>();
  /**
   * Emitted for Rive Events (custom events defined in the .riv file).
   * Use this to handle custom events like OpenUrlEvent, etc.
   */
  public readonly riveEvent = output<RiveEvent>();
  /**
   * Emitted when Rive instance is created and ready.
   * Provides direct access to the Rive instance for advanced use cases.
   */
  public readonly riveReady = output<Rive>();

  // Signals for reactive state
  public readonly isPlaying = signal<boolean>(false);
  public readonly isPaused = signal<boolean>(false);
  public readonly isLoaded = signal<boolean>(false);
  /**
   * Public signal providing access to the Rive instance.
   * Use this to access advanced Rive SDK features.
   */
  public readonly riveInstance = signal<Rive | null>(null);

  // Private state
  #rive: Rive | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isInitialized = false;
  private isPausedByIntersectionObserver = false;
  private retestIntersectionTimeoutId: ReturnType<typeof setTimeout> | null =
    null;

  constructor() {
    // Effect to reload animation when src, buffer, or riveFile changes
    effect(() => {
      const src = this.src();
      const buffer = this.buffer();
      const riveFile = this.riveFile();
      untracked(() => {
        if (
          (src || buffer || riveFile) &&
          isPlatformBrowser(this.#platformId) &&
          this.isInitialized
        )
          this.loadAnimation();
      });
    });

    // Auto cleanup on destroy
    this.#destroyRef.onDestroy(() => {
      this.cleanupRive();
      this.disconnectResizeObserver();
      this.disconnectIntersectionObserver();
    });
  }

  public ngAfterViewInit(): void {
    if (isPlatformBrowser(this.#platformId)) {
      this.isInitialized = true;
      this.setupResizeObserver();
      this.setupIntersectionObserver();
      this.loadAnimation();
    }
  }

  /**
   * Setup ResizeObserver for automatic canvas sizing with DPR support
   */
  private setupResizeObserver(): void {
    const canvas = this.canvas().nativeElement;
    const dpr = window.devicePixelRatio || 1;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Set canvas size with device pixel ratio for sharp rendering
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // Resize Rive instance if it exists
        if (this.#rive) this.#rive.resizeDrawingSurfaceToCanvas();
      }
    });

    this.resizeObserver.observe(canvas);
  }

  /**
   * Disconnect ResizeObserver
   */
  private disconnectResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Setup IntersectionObserver to stop rendering when canvas is not visible
   */
  private setupIntersectionObserver(): void {
    if (!this.shouldUseIntersectionObserver()) return;

    const canvas = this.canvas().nativeElement;
    const observer = getElementObserver();

    const onIntersectionChange = (entry: IntersectionObserverEntry): void => {
      if (entry.isIntersecting) {
        // Canvas is visible - start rendering
        if (this.#rive) {
          this.#rive.startRendering();
        }
        this.isPausedByIntersectionObserver = false;
      } else {
        // Canvas is not visible - stop rendering
        if (this.#rive) {
          this.#rive.stopRendering();
        }
        this.isPausedByIntersectionObserver = true;

        // Workaround for Chrome bug with insertBefore
        // Retest after 10ms if boundingClientRect.width is 0
        if (this.retestIntersectionTimeoutId) {
          clearTimeout(this.retestIntersectionTimeoutId);
        }

        if (entry.boundingClientRect.width === 0) {
          this.retestIntersectionTimeoutId = setTimeout(() => {
            this.retestIntersection();
          }, 10);
        }
      }
    };

    observer.registerCallback(canvas, onIntersectionChange);
  }

  /**
   * Retest intersection - workaround for Chrome bug
   */
  private retestIntersection(): void {
    if (!this.isPausedByIntersectionObserver) return;

    const canvas = this.canvas().nativeElement;
    const rect = canvas.getBoundingClientRect();

    const isIntersecting =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top <
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom > 0 &&
      rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
      rect.right > 0;

    if (isIntersecting && this.#rive) {
      this.#rive.startRendering();
      this.isPausedByIntersectionObserver = false;
    }
  }

  /**
   * Disconnect IntersectionObserver
   */
  private disconnectIntersectionObserver(): void {
    if (this.retestIntersectionTimeoutId) {
      clearTimeout(this.retestIntersectionTimeoutId);
      this.retestIntersectionTimeoutId = null;
    }

    if (this.shouldUseIntersectionObserver()) {
      const canvas = this.canvas().nativeElement;
      const observer = getElementObserver();
      observer.removeCallback(canvas);
    }
  }

  /**
   * Load animation from src or buffer
   */
  private loadAnimation(): void {
    // Run outside Angular zone for better performance
    this.#ngZone.runOutsideAngular(() => {
      try {
        // Clean up existing Rive instance only
        this.cleanupRive();

        const canvas = this.canvas().nativeElement;
        const src = this.src();
        const buffer = this.buffer();
        const riveFile = this.riveFile();

        if (!src && !buffer && !riveFile) return;

        // Build layout configuration
        const layoutParams: LayoutParameters = {
          fit: this.fit(),
          alignment: this.alignment(),
        };

        // Create Rive instance configuration
        // Using Record to allow dynamic property assignment
        const config: Record<string, unknown> = {
          canvas,
          autoplay: this.autoplay(),
          layout: new Layout(layoutParams),
          useOffscreenRenderer: this.useOffscreenRenderer(),
          shouldDisableRiveListeners: this.shouldDisableRiveListeners(),
          automaticallyHandleEvents: this.automaticallyHandleEvents(),
          onLoad: () => this.onLoad(),
          onLoadError: (error?: unknown) => this.onLoadError(error),
          onPlay: () => this.onPlay(),
          onPause: () => this.onPause(),
          onStop: () => this.onStop(),
          onStateChange: (event: RiveEvent) => this.onStateChange(event),
          onRiveEvent: (event: RiveEvent) => this.onRiveEvent(event),
        };

        // Add src, buffer, or riveFile (priority: riveFile > src > buffer)
        if (riveFile) {
          config['riveFile'] = riveFile;
        } else if (src) {
          config['src'] = src;
        } else if (buffer) {
          config['buffer'] = buffer;
        }

        // Add artboard if specified
        const artboard = this.artboard();
        if (artboard) config['artboard'] = artboard;

        // Add animations if specified
        const animations = this.animations();
        if (animations) config['animations'] = animations;

        // Add state machines if specified
        const stateMachines = this.stateMachines();
        if (stateMachines) config['stateMachines'] = stateMachines;

        // Safe type assertion - config contains all required properties
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.#rive = new Rive(config as any);

        // Update public signal and emit riveReady event
        this.#ngZone.run(() => {
          this.riveInstance.set(this.#rive);
          this.riveReady.emit(this.#rive!);
        });
      } catch (error) {
        console.error('Failed to initialize Rive instance:', error);
        this.#ngZone.run(() =>
          this.loadError.emit(
            new RiveLoadError('Failed to load Rive animation', error as Error),
          ),
        );
      }
    });
  }

  // Event handlers (run inside Angular zone for change detection)
  private onLoad(): void {
    this.#ngZone.run(() => {
      this.isLoaded.set(true);
      this.loaded.emit();
    });
  }

  private onLoadError(originalError?: unknown): void {
    this.#ngZone.run(() => {
      const error = new RiveLoadError(
        'Failed to load Rive animation',
        originalError instanceof Error ? originalError : undefined,
      );
      console.error('Rive load error:', error);
      this.loadError.emit(error);
    });
  }

  private onPlay(): void {
    this.#ngZone.run(() => {
      this.isPlaying.set(true);
      this.isPaused.set(false);
    });
  }

  private onPause(): void {
    this.#ngZone.run(() => {
      this.isPlaying.set(false);
      this.isPaused.set(true);
    });
  }

  private onStop(): void {
    this.#ngZone.run(() => {
      this.isPlaying.set(false);
      this.isPaused.set(false);
    });
  }

  private onStateChange(event: RiveEvent): void {
    this.#ngZone.run(() => this.stateChange.emit(event));
  }

  private onRiveEvent(event: RiveEvent): void {
    this.#ngZone.run(() => this.riveEvent.emit(event));
  }

  // Public API methods

  /**
   * Play animation(s)
   */
  public playAnimation(animations?: string | string[]): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      if (animations) {
        this.#rive!.play(animations);
      } else {
        this.#rive!.play();
      }
    });
  }

  /**
   * Pause animation(s)
   */
  public pauseAnimation(animations?: string | string[]): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      if (animations) {
        this.#rive!.pause(animations);
      } else {
        this.#rive!.pause();
      }
    });
  }

  /**
   * Stop animation(s)
   */
  public stopAnimation(animations?: string | string[]): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      if (animations) {
        this.#rive!.stop(animations);
      } else {
        this.#rive!.stop();
      }
    });
  }

  /**
   * Reset the animation to the beginning
   */
  public reset(): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      this.#rive!.reset();
    });
  }

  /**
   * Set a state machine input value
   */
  public setInput(
    stateMachineName: string,
    inputName: string,
    value: number | boolean,
  ): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      const inputs = this.#rive!.stateMachineInputs(stateMachineName);
      const input = inputs.find((i: StateMachineInput) => i.name === inputName);

      if (input && 'value' in input) {
        input.value = value;
      }
    });
  }

  /**
   * Fire a state machine trigger
   */
  public fireTrigger(stateMachineName: string, triggerName: string): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      const inputs = this.#rive!.stateMachineInputs(stateMachineName);
      const input = inputs.find(
        (i: StateMachineInput) => i.name === triggerName,
      );

      if (input && 'fire' in input && typeof input.fire === 'function') {
        input.fire();
      }
    });
  }

  /**
   * Clean up Rive instance only
   */
  private cleanupRive(): void {
    if (this.#rive) {
      try {
        this.#rive.cleanup();
      } catch (error) {
        console.warn('Error during Rive cleanup:', error);
      }
      this.#rive = null;
    }

    // Reset signals
    this.riveInstance.set(null);
    this.isLoaded.set(false);
    this.isPlaying.set(false);
    this.isPaused.set(false);
  }
}
