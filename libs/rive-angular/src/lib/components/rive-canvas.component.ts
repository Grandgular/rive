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
  Fit,
  Alignment,
  EventType,
  CANVAS_RIVE_SDK,
  DEFAULT_RIVE_RENDERER,
  getFallbackRenderer,
  type Rive,
  type RiveFile,
  type RiveRenderer,
  type StateMachineInput,
  type LayoutParameters,
  type RiveEvent,
  type ViewModelInstance,
  type RiveSdkModule,
} from '../utils/rive-sdk';
import { RiveLoadError } from '../models';
import type {
  DataBindingValue,
  DataBindingChangeEvent,
  DataBindingPropertyType,
  RiveColor,
} from '../models';
import {
  ElementObserver,
  RiveLogger,
  RIVE_DEBUG_CONFIG,
  RIVE_RUNTIME_CONFIG,
  validateConfiguration,
  validateInput,
  RiveErrorCode,
  formatErrorMessage,
  parseRiveColor,
} from '../utils';
import { ensureRiveRuntimeReady } from '../utils/rive-runtime';
import { RiveValidationError } from '../models';

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
 * <rive
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
  selector: 'rive, rive-canvas',
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
  readonly #globalDebugConfig = inject(RIVE_DEBUG_CONFIG, { optional: true });
  readonly #runtimeConfig = inject(RIVE_RUNTIME_CONFIG, { optional: true });
  readonly #elementObserver = inject(ElementObserver);

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

  /**
   * Enable debug mode for this specific instance.
   * Overrides global configuration if set.
   * - true: 'debug' level
   * - false/undefined: use global level
   */
  public readonly debugMode = input<boolean>();

  /**
   * Record of text run names to values for declarative text setting.
   * Keys present in this input are CONTROLLED — the input is the source of truth.
   * Keys absent from this input are UNCONTROLLED — managed imperatively.
   * Values are applied reactively when input changes.
   */
  public readonly textRuns = input<Record<string, string>>();

  /**
   * Name of the ViewModel to use for data binding.
   * If not provided, uses the default ViewModel for the artboard.
   * Only relevant if the .riv file contains ViewModels.
   */
  public readonly viewModelName = input<string>();

  /**
   * Record of ViewModel property paths to values for declarative data binding.
   * Keys present in this input are CONTROLLED — the input is the source of truth.
   * Keys absent from this input are UNCONTROLLED — managed imperatively.
   * Values are applied reactively when input changes.
   *
   * Supports multiple data types: number, string, boolean, RiveColor.
   * The component auto-detects the property type from the ViewModel.
   *
   * @example
   * [dataBindings]="{
   *   backgroundColor: '#FF5733',
   *   score: 42,
   *   playerName: 'Alice',
   *   isActive: true
   * }"
   */
  public readonly dataBindings = input<Record<string, DataBindingValue>>();

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
   * Emitted when Rive instance is fully loaded and ready.
   * Provides direct access to the Rive instance for advanced use cases.
   * Note: This fires AFTER the animation is loaded, not just instantiated.
   */
  public readonly riveReady = output<Rive>();
  /**
   * Emitted when a ViewModel property changes from within the animation.
   * Enables two-way data binding between the animation and Angular application.
   * Only fires if the .riv file uses ViewModels with callbacks.
   */
  public readonly dataBindingChange = output<DataBindingChangeEvent>();

  /**
   * Emitted when animation starts playing.
   * Payload uses {@link EventType.Play}; the Rive constructor callback does not pass `data`.
   */
  public readonly animationPlay = output<RiveEvent>();
  /**
   * Emitted when animation is paused.
   * Payload uses {@link EventType.Pause}.
   */
  public readonly animationPause = output<RiveEvent>();
  /**
   * Emitted when animation stops (distinct from pause — typically resets to the start).
   * Payload uses {@link EventType.Stop}.
   */
  public readonly animationStop = output<RiveEvent>();
  /**
   * Emitted when an animation completes a loop iteration.
   * `event.data` contains loop details (see `LoopEvent` exported from this package).
   */
  public readonly animationLoop = output<RiveEvent>();
  /**
   * Emitted on every animation frame advance.
   * **Performance:** Fires very frequently (often 60+ times per second). Use only for advanced cases.
   * Emitted **outside** the Angular zone to avoid triggering change detection every frame; call `ChangeDetectorRef.markForCheck()` / `detectChanges()` in the handler if the view must update.
   */
  public readonly animationAdvance = output<RiveEvent>();

  // Private writable signals
  readonly #isPlaying = signal<boolean>(false);
  readonly #isPaused = signal<boolean>(false);
  readonly #isLoaded = signal<boolean>(false);
  readonly #riveInstance = signal<Rive | null>(null);
  readonly #viewModelInstance = signal<ViewModelInstance | null>(null);

  // Public readonly signals
  public readonly isPlaying = this.#isPlaying.asReadonly();
  public readonly isPaused = this.#isPaused.asReadonly();
  public readonly isLoaded = this.#isLoaded.asReadonly();
  /**
   * Public signal providing access to the Rive instance.
   * Use this to access advanced Rive SDK features.
   */
  public readonly riveInstance = this.#riveInstance.asReadonly();
  /**
   * Public signal providing access to the ViewModel instance.
   * Use this to access advanced ViewModel features for data binding.
   * Returns null if the .riv file doesn't use ViewModels.
   */
  public readonly viewModelInstance = this.#viewModelInstance.asReadonly();

  // Private state
  #rive: Rive | null = null;
  #runtimeSdk: RiveSdkModule | null = null;
  private readonly logger: RiveLogger;
  private resizeObserver: ResizeObserver | null = null;
  private isInitialized = false;
  private isPausedByIntersectionObserver = false;
  readonly #viewModelSubscriptionDisposers = new Set<() => void>();
  readonly #localMutationSuppressions = new Map<string, number>();
  private retestIntersectionTimeoutId: ReturnType<typeof setTimeout> | null =
    null;
  private resizeRafId: number | null = null;
  private lastWidth = 0;
  private lastHeight = 0;
  private loadRequestId = 0;

  constructor() {
    this.logger = new RiveLogger(this.#globalDebugConfig, this.debugMode());

    // Effect to update logger level when debugMode changes
    effect(() => {
      this.logger.update(this.#globalDebugConfig, this.debugMode());
    });

    // Effect to reload animation when src, buffer, riveFile, or configuration changes
    effect(() => {
      const src = this.src();
      const buffer = this.buffer();
      const riveFile = this.riveFile();
      // Track configuration changes to trigger reload
      this.artboard();
      this.animations();
      this.stateMachines();
      untracked(() => {
        if (
          (src || buffer || riveFile) &&
          isPlatformBrowser(this.#platformId) &&
          this.isInitialized
        )
          this.loadAnimation();
      });
    });

    // Effect to update layout when fit or alignment changes
    effect(() => {
      const fit = this.fit();
      const alignment = this.alignment();
      untracked(() => {
        if (this.#rive && isPlatformBrowser(this.#platformId)) {
          const layoutParams: LayoutParameters = { fit, alignment };
          const layoutCtor = (this.#runtimeSdk ?? CANVAS_RIVE_SDK).Layout;
          this.#rive.layout = new layoutCtor(layoutParams as never) as never;
        }
      });
    });

    // Effect to apply text runs when input changes or animation loads
    effect(() => {
      const runs = this.textRuns();
      const isLoaded = this.#isLoaded();
      untracked(() => {
        if (runs && isLoaded && this.#rive) {
          this.applyTextRuns(runs);
        }
      });
    });

    // Effect to apply data bindings when input changes or animation loads
    effect(() => {
      const bindings = this.dataBindings();
      const isLoaded = this.#isLoaded();
      const vmi = this.#viewModelInstance();
      untracked(() => {
        if (bindings && isLoaded && vmi) {
          this.applyDataBindings(bindings);
        }
      });
    });

    // Effect to reinitialize ViewModel when viewModelName changes after load
    effect(() => {
      this.viewModelName();
      const isLoaded = this.#isLoaded();
      untracked(() => {
        if (isLoaded && this.#rive) {
          this.initializeViewModel();
        }
      });
    });

    // Auto cleanup on destroy
    this.#destroyRef.onDestroy(() => {
      this.loadRequestId++;
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

    this.resizeObserver = new ResizeObserver((entries) => {
      // Cancel any pending resize frame
      if (this.resizeRafId) {
        cancelAnimationFrame(this.resizeRafId);
      }

      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Skip if dimensions haven't changed (prevents unnecessary updates)
        if (width === this.lastWidth && height === this.lastHeight) {
          continue;
        }

        this.lastWidth = width;
        this.lastHeight = height;

        // Defer resize to next animation frame to prevent excessive updates in Safari
        this.resizeRafId = requestAnimationFrame(() => {
          // Read current DPR to support monitor changes and zoom
          const dpr = window.devicePixelRatio || 1;

          // Set canvas size with device pixel ratio for sharp rendering
          canvas.width = width * dpr;
          canvas.height = height * dpr;

          // Resize Rive instance if it exists
          if (this.#rive) this.#rive.resizeDrawingSurfaceToCanvas();
        });
      }
    });

    this.resizeObserver.observe(canvas);
  }

  /**
   * Disconnect ResizeObserver
   */
  private disconnectResizeObserver(): void {
    if (this.resizeRafId) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
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

    this.#elementObserver.registerCallback(canvas, onIntersectionChange);
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
      this.#elementObserver.removeCallback(canvas);
    }
  }

  /**
   * Load animation from src or buffer
   */
  private loadAnimation(): void {
    // Run outside Angular zone for better performance
    this.#ngZone.runOutsideAngular(() => {
      const requestId = ++this.loadRequestId;
      try {
        // Clean up existing Rive instance only
        this.cleanupRive();

        const canvas = this.canvas().nativeElement;
        const src = this.src();
        const buffer = this.buffer();
        const riveFile = this.riveFile();

        if (!src && !buffer && !riveFile) {
          this.logger.warn(
            'No animation source provided (src, buffer, or riveFile)',
          );
          this.#ngZone.run(() =>
            this.loadError.emit(
              new RiveLoadError({
                message: 'No animation source provided',
                code: RiveErrorCode.NoSource,
              }),
            ),
          );
          return;
        }

        this.logger.info(`Loading animation`, {
          src: src || (buffer ? 'buffer' : 'riveFile'),
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          dpr: window.devicePixelRatio,
        });

        // Build layout configuration
        const layoutParams: LayoutParameters = {
          fit: this.fit(),
          alignment: this.alignment(),
        };

        // Add source (priority: riveFile > src > buffer)
        const sourceConfig = riveFile
          ? { riveFile }
          : src
            ? { src }
            : buffer
              ? { buffer }
              : {};

        // Add optional configuration
        const optionalConfig = {
          ...(this.artboard() ? { artboard: this.artboard() } : {}),
          ...(this.animations() ? { animations: this.animations() } : {}),
          ...(this.stateMachines()
            ? { stateMachines: this.stateMachines() }
            : {}),
        };

        const createRiveInstance = (runtimeSdk: RiveSdkModule) => {
          if (requestId !== this.loadRequestId) {
            return;
          }

          const config = {
            canvas,
            autoplay: this.autoplay(),
            layout: new runtimeSdk.Layout(layoutParams as never),
            useOffscreenRenderer: this.useOffscreenRenderer(),
            shouldDisableRiveListeners: this.shouldDisableRiveListeners(),
            automaticallyHandleEvents: this.automaticallyHandleEvents(),
            onLoad: () => this.onLoad(),
            onLoadError: (error?: unknown) => this.onLoadError(error),
            onPlay: () => this.onPlay(),
            onPause: () => this.onPause(),
            onStop: () => this.onStop(),
            onLoop: (event: RiveEvent) => this.onLoop(event),
            onAdvance: (event: RiveEvent) => this.onAdvance(event),
            onStateChange: (event: RiveEvent) => this.onStateChange(event),
            onRiveEvent: (event: RiveEvent) => this.onRiveEvent(event),
            ...sourceConfig,
            ...optionalConfig,
          };

          const rive = new runtimeSdk.Rive(config as never) as unknown as Rive;

          if (requestId !== this.loadRequestId) {
            try {
              rive.cleanup();
            } catch (cleanupError) {
              this.logger.warn(
                'Error during stale Rive cleanup:',
                cleanupError,
              );
            }
            return;
          }

          this.#rive = rive;
          this.#runtimeSdk = runtimeSdk;

          // Update public signal (riveReady will be emitted in onLoad)
          this.#ngZone.run(() => {
            this.#riveInstance.set(this.#rive);
          });
        };

        if (!this.#runtimeConfig) {
          createRiveInstance(CANVAS_RIVE_SDK);
          return;
        }

        const runtimeConfig = this.#runtimeConfig;
        const preferredRenderer =
          runtimeConfig.renderer ?? DEFAULT_RIVE_RENDERER;
        const strictMode = runtimeConfig.strict;

        void ensureRiveRuntimeReady(runtimeConfig)
          .then(async (runtimeResult) => {
            try {
              createRiveInstance(runtimeResult.sdk);
            } catch (primaryCreateError) {
              if (
                strictMode ||
                runtimeResult.renderer !== preferredRenderer ||
                !this.shouldFallbackOnRendererError(
                  primaryCreateError,
                  preferredRenderer,
                )
              ) {
                throw primaryCreateError;
              }

              const fallbackRuntime = await ensureRiveRuntimeReady({
                ...runtimeConfig,
                lazy: runtimeConfig.lazy,
                renderer: getFallbackRenderer(preferredRenderer),
                strict: true,
              });
              createRiveInstance(fallbackRuntime.sdk);
            }
          })
          .catch((error) => {
            if (requestId !== this.loadRequestId) {
              return;
            }
            this.logger.error('Failed to initialize Rive instance:', error);
            this.#ngZone.run(() =>
              this.loadError.emit(
                new RiveLoadError({
                  message: 'Failed to initialize Rive instance',
                  code: RiveErrorCode.InvalidFormat,
                  cause: error instanceof Error ? error : undefined,
                }),
              ),
            );
          });
      } catch (error) {
        this.logger.error('Failed to initialize Rive instance:', error);
        this.#ngZone.run(() =>
          this.loadError.emit(
            new RiveLoadError({
              message: 'Failed to initialize Rive instance',
              code: RiveErrorCode.InvalidFormat,
              cause: error instanceof Error ? error : undefined,
            }),
          ),
        );
      }
    });
  }

  private shouldFallbackOnRendererError(
    error: unknown,
    renderer: RiveRenderer,
  ): boolean {
    if (renderer !== 'webgl2' || !(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('webgl') ||
      message.includes('context') ||
      message.includes('gpu') ||
      message.includes('renderer')
    );
  }

  // Event handlers (run inside Angular zone for change detection)
  private onLoad(): void {
    // Validate loaded configuration
    if (this.#rive) {
      const validationErrors = validateConfiguration(
        this.#rive,
        {
          artboard: this.artboard(),
          animations: this.animations(),
          stateMachines: this.stateMachines(),
        },
        this.logger,
      );

      // Emit validation errors via loadError output
      if (validationErrors.length > 0) {
        this.#ngZone.run(() => {
          validationErrors.forEach((err) => this.loadError.emit(err));
        });
      }

      // Log available assets in debug mode
      // Note: These properties exist at runtime but may not be in type definitions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const riveWithMetadata = this.#rive as any;
      this.logger.debug('Animation loaded successfully. Available assets:', {
        artboards: riveWithMetadata.artboardNames,
        animations: riveWithMetadata.animationNames,
        stateMachines: riveWithMetadata.stateMachineNames,
      });

      // Initialize ViewModel if available
      this.initializeViewModel();
    }

    this.#ngZone.run(() => {
      this.#isLoaded.set(true);
      this.loaded.emit();
      // Emit riveReady after animation is fully loaded
      if (this.#rive) {
        this.riveReady.emit(this.#rive);
      }
    });
  }

  private onLoadError(originalError?: unknown): void {
    this.#ngZone.run(() => {
      // Determine probable cause and code
      let code = RiveErrorCode.NetworkError;
      let message = 'Failed to load Rive animation';

      if (originalError instanceof Error) {
        if (originalError.message.includes('404')) {
          code = RiveErrorCode.FileNotFound;
          message = `File not found: ${this.src()}`;
        } else if (originalError.message.includes('format')) {
          code = RiveErrorCode.InvalidFormat;
          message = 'Invalid .riv file format';
        }
      }

      const error = new RiveLoadError({
        message,
        code,
        cause: originalError instanceof Error ? originalError : undefined,
      });

      this.logger.error('Rive load error:', error);
      this.loadError.emit(error);
    });
  }

  private onPlay(): void {
    this.#ngZone.run(() => {
      this.#isPlaying.set(true);
      this.#isPaused.set(false);
      this.animationPlay.emit({ type: EventType.Play });
    });
  }

  private onPause(): void {
    this.#ngZone.run(() => {
      this.#isPlaying.set(false);
      this.#isPaused.set(true);
      this.animationPause.emit({ type: EventType.Pause });
    });
  }

  private onStop(): void {
    this.#ngZone.run(() => {
      this.#isPlaying.set(false);
      this.#isPaused.set(false);
      this.animationStop.emit({ type: EventType.Stop });
    });
  }

  private onLoop(event: RiveEvent): void {
    this.#ngZone.run(() => {
      this.animationLoop.emit(event);
    });
  }

  /**
   * Forwarded from Rive `onAdvance`; kept outside the Angular zone intentionally.
   */
  private onAdvance(event: RiveEvent): void {
    this.animationAdvance.emit(event);
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
      // Validate input existence first
      const error = validateInput(this.#rive!, stateMachineName, inputName);
      if (error) {
        this.logger.warn(error.message);
        this.#ngZone.run(() => this.loadError.emit(error));
        return;
      }

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
      // Validate trigger (input) existence first
      const error = validateInput(this.#rive!, stateMachineName, triggerName);
      if (error) {
        this.logger.warn(error.message);
        this.#ngZone.run(() => this.loadError.emit(error));
        return;
      }

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
   * Get the current value of a text run.
   * Returns undefined if the text run doesn't exist or Rive instance is not loaded.
   */
  public getTextRunValue(textRunName: string): string | undefined {
    if (!this.#rive) return undefined;

    try {
      return this.#ngZone.runOutsideAngular(() => {
        return this.#rive!.getTextRunValue(textRunName);
      });
    } catch (error) {
      this.logger.warn(`Failed to get text run "${textRunName}":`, error);
      return undefined;
    }
  }

  /**
   * Set a text run value.
   * Warning: If the text run is controlled by textRuns input, this change will be overwritten
   * on the next input update.
   */
  public setTextRunValue(textRunName: string, textRunValue: string): void {
    if (!this.#rive) return;

    // Check if this key is controlled by textRuns input
    const controlledRuns = this.textRuns();
    if (controlledRuns && textRunName in controlledRuns) {
      this.logger.warn(
        `Text run "${textRunName}" is controlled by textRuns input. This change will be overwritten on next input update.`,
      );
    }

    this.#ngZone.runOutsideAngular(() => {
      try {
        this.#rive!.setTextRunValue(textRunName, textRunValue);
        this.logger.debug(`Text run "${textRunName}" set to "${textRunValue}"`);
      } catch (error) {
        this.logger.warn(`Failed to set text run "${textRunName}":`, error);
        this.#ngZone.run(() =>
          this.loadError.emit(
            new RiveValidationError(
              formatErrorMessage(RiveErrorCode.TextRunNotFound, {
                name: textRunName,
              }),
              RiveErrorCode.TextRunNotFound,
            ),
          ),
        );
      }
    });
  }

  /**
   * Get the current value of a text run at a specific path (for nested artboards/components).
   * Returns undefined if the text run doesn't exist or Rive instance is not loaded.
   */
  public getTextRunValueAtPath(
    textRunName: string,
    path: string,
  ): string | undefined {
    if (!this.#rive) return undefined;

    try {
      return this.#ngZone.runOutsideAngular(() => {
        return this.#rive!.getTextRunValueAtPath(textRunName, path);
      });
    } catch (error) {
      this.logger.warn(
        `Failed to get text run "${textRunName}" at path "${path}":`,
        error,
      );
      return undefined;
    }
  }

  /**
   * Set a text run value at a specific path (for nested artboards/components).
   * Note: AtPath text runs are always uncontrolled (not managed by textRuns input).
   */
  public setTextRunValueAtPath(
    textRunName: string,
    textRunValue: string,
    path: string,
  ): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      try {
        this.#rive!.setTextRunValueAtPath(textRunName, textRunValue, path);
        this.logger.debug(
          `Text run "${textRunName}" at path "${path}" set to "${textRunValue}"`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to set text run "${textRunName}" at path "${path}":`,
          error,
        );
        this.#ngZone.run(() =>
          this.loadError.emit(
            new RiveValidationError(
              formatErrorMessage(RiveErrorCode.TextRunNotFound, {
                name: textRunName,
              }),
              RiveErrorCode.TextRunNotFound,
            ),
          ),
        );
      }
    });
  }

  // ========================================================================
  // Data Binding (ViewModel) Methods
  // ========================================================================

  /**
   * Set a data binding value in the ViewModel.
   * Auto-detects the property type and applies the value accordingly.
   * Warning: If the property is controlled by dataBindings input, this change
   * will be overwritten on the next input update.
   */
  public setDataBinding(path: string, value: DataBindingValue): void {
    const vmi = this.#viewModelInstance();
    if (!vmi) {
      this.logger.warn('No ViewModel instance available');
      return;
    }

    // Check if this key is controlled by dataBindings input
    const controlledBindings = this.dataBindings();
    if (controlledBindings && path in controlledBindings) {
      this.logger.warn(
        `Data binding "${path}" is controlled by dataBindings input. This change will be overwritten on next input update.`,
      );
    }

    this.#ngZone.runOutsideAngular(() => {
      this.withLocalMutation(path, () => {
        const resolved = this.resolveViewModelProperty(vmi, path);
        if (!resolved) {
          this.logger.warn(
            `Data binding property "${path}" not found in ViewModel`,
          );
          this.#ngZone.run(() =>
            this.loadError.emit(
              new RiveValidationError(
                formatErrorMessage(RiveErrorCode.DataBindingPropertyNotFound, {
                  path,
                }),
                RiveErrorCode.DataBindingPropertyNotFound,
              ),
            ),
          );
          return;
        }
        this.tryApplyBinding(path, value, resolved);
      });
    });
  }

  /**
   * Get a data binding value from the ViewModel.
   * Auto-detects the property type and returns the value accordingly.
   * Returns undefined if the property doesn't exist or ViewModel is not loaded.
   */
  public getDataBinding(path: string): DataBindingValue | undefined {
    const vmi = this.#viewModelInstance();
    if (!vmi) return undefined;

    return this.#ngZone.runOutsideAngular(() => {
      // Try each property type
      const colorProp = vmi.color(path);
      if (colorProp) {
        const argb = colorProp.value;
        const a = (argb >> 24) & 0xff;
        const r = (argb >> 16) & 0xff;
        const g = (argb >> 8) & 0xff;
        const b = argb & 0xff;
        return { r, g, b, a } as RiveColor;
      }

      const numberProp = vmi.number(path);
      if (numberProp) return numberProp.value;

      const stringProp = vmi.string(path);
      if (stringProp) return stringProp.value;

      const boolProp = vmi.boolean(path);
      if (boolProp) return boolProp.value;

      const enumProp = vmi.enum(path);
      if (enumProp) return enumProp.value;

      return undefined;
    });
  }

  /**
   * Fire a trigger property in the ViewModel.
   * Use this for ViewModel-based triggers (data binding).
   * For state machine triggers, use fireTrigger(stateMachineName, triggerName).
   */
  public fireViewModelTrigger(path: string): void {
    const vmi = this.#viewModelInstance();
    if (!vmi) {
      this.logger.warn('No ViewModel instance available');
      return;
    }

    this.#ngZone.runOutsideAngular(() => {
      const triggerProp = vmi.trigger(path);
      if (triggerProp) {
        triggerProp.trigger();
        this.logger.debug(`ViewModel trigger "${path}" fired`);
      } else {
        this.logger.warn(`ViewModel trigger "${path}" not found`);
        this.#ngZone.run(() =>
          this.loadError.emit(
            new RiveValidationError(
              formatErrorMessage(RiveErrorCode.DataBindingPropertyNotFound, {
                path,
              }),
              RiveErrorCode.DataBindingPropertyNotFound,
            ),
          ),
        );
      }
    });
  }

  /**
   * Set a color value in the ViewModel.
   * Accepts hex string ('#RRGGBB' or '#RRGGBBAA'), ARGB integer, or RiveColor object.
   * Warning: If the property is controlled by dataBindings input, this change
   * will be overwritten on the next input update.
   */
  public setColor(path: string, color: string | number | RiveColor): void {
    const vmi = this.#viewModelInstance();
    if (!vmi) {
      this.logger.warn('No ViewModel instance available');
      return;
    }

    // Check if this key is controlled by dataBindings input
    const controlledBindings = this.dataBindings();
    if (controlledBindings && path in controlledBindings) {
      this.logger.warn(
        `Color "${path}" is controlled by dataBindings input. This change will be overwritten on next input update.`,
      );
    }

    this.#ngZone.runOutsideAngular(() => {
      this.withLocalMutation(path, () => {
        const colorProp = vmi.color(path);
        if (!colorProp) {
          this.logger.warn(`Color property "${path}" not found in ViewModel`);
          this.#ngZone.run(() =>
            this.loadError.emit(
              new RiveValidationError(
                formatErrorMessage(RiveErrorCode.DataBindingPropertyNotFound, {
                  path,
                }),
                RiveErrorCode.DataBindingPropertyNotFound,
              ),
            ),
          );
          return;
        }

        try {
          const parsedColor = parseRiveColor(color);
          colorProp.rgba(
            parsedColor.r,
            parsedColor.g,
            parsedColor.b,
            parsedColor.a,
          );
          this.logger.debug(`Color "${path}" set to:`, parsedColor);
        } catch (error) {
          this.logger.warn(`Failed to set color "${path}":`, error);
          this.#ngZone.run(() =>
            this.loadError.emit(
              new RiveValidationError(
                `Failed to parse color value for "${path}": ${error instanceof Error ? error.message : String(error)}`,
                RiveErrorCode.DataBindingTypeMismatch,
              ),
            ),
          );
        }
      });
    });
  }

  /**
   * Get a color value from the ViewModel.
   * Returns undefined if the property doesn't exist or ViewModel is not loaded.
   */
  public getColor(path: string): RiveColor | undefined {
    const vmi = this.#viewModelInstance();
    if (!vmi) return undefined;

    return this.#ngZone.runOutsideAngular(() => {
      const colorProp = vmi.color(path);
      if (!colorProp) return undefined;

      const argb = colorProp.value;
      const a = (argb >> 24) & 0xff;
      const r = (argb >> 16) & 0xff;
      const g = (argb >> 8) & 0xff;
      const b = argb & 0xff;

      return { r, g, b, a };
    });
  }

  /**
   * Set a color value using RGBA components (0-255).
   * Warning: If the property is controlled by dataBindings input, this change
   * will be overwritten on the next input update.
   */
  public setColorRgba(
    path: string,
    r: number,
    g: number,
    b: number,
    a = 255,
  ): void {
    this.setColor(path, { r, g, b, a });
  }

  /**
   * Set the opacity of a color (0.0-1.0) while preserving RGB values.
   * Warning: If the property is controlled by dataBindings input, this change
   * will be overwritten on the next input update.
   */
  public setColorOpacity(path: string, opacity: number): void {
    const vmi = this.#viewModelInstance();
    if (!vmi) {
      this.logger.warn('No ViewModel instance available');
      return;
    }

    // Validate opacity range
    if (opacity < 0 || opacity > 1) {
      this.logger.warn(
        `Invalid opacity value ${opacity}: must be between 0.0 and 1.0`,
      );
      this.#ngZone.run(() =>
        this.loadError.emit(
          new RiveValidationError(
            `Invalid opacity value for "${path}": ${opacity}. Expected value between 0.0 and 1.0.`,
            RiveErrorCode.DataBindingTypeMismatch,
          ),
        ),
      );
      return;
    }

    // Check if this key is controlled by dataBindings input
    const controlledBindings = this.dataBindings();
    if (controlledBindings && path in controlledBindings) {
      this.logger.warn(
        `Color "${path}" is controlled by dataBindings input. This change will be overwritten on next input update.`,
      );
    }

    this.#ngZone.runOutsideAngular(() => {
      this.withLocalMutation(path, () => {
        const colorProp = vmi.color(path);
        if (!colorProp) {
          this.logger.warn(`Color property "${path}" not found in ViewModel`);
          this.#ngZone.run(() =>
            this.loadError.emit(
              new RiveValidationError(
                formatErrorMessage(RiveErrorCode.DataBindingPropertyNotFound, {
                  path,
                }),
                RiveErrorCode.DataBindingPropertyNotFound,
              ),
            ),
          );
          return;
        }

        colorProp.opacity(opacity);
        this.logger.debug(`Color "${path}" opacity set to ${opacity}`);
      });
    });
  }

  /**
   * Apply all text runs from input (controlled keys).
   * Called on every input change or load.
   */
  private applyTextRuns(runs: Record<string, string>): void {
    this.#ngZone.runOutsideAngular(() => {
      for (const [name, value] of Object.entries(runs)) {
        try {
          this.#rive!.setTextRunValue(name, value);
          this.logger.debug(`Text run "${name}" set to "${value}"`);
        } catch (error) {
          this.logger.warn(`Failed to set text run "${name}":`, error);
          this.#ngZone.run(() =>
            this.loadError.emit(
              new RiveValidationError(
                formatErrorMessage(RiveErrorCode.TextRunNotFound, { name }),
                RiveErrorCode.TextRunNotFound,
              ),
            ),
          );
        }
      }
    });
  }

  /**
   * Initialize ViewModel instance if available in the loaded file.
   * Called once after animation loads successfully.
   */
  private initializeViewModel(): void {
    if (!this.#rive) return;

    this.#ngZone.runOutsideAngular(() => {
      try {
        const viewModelName = this.viewModelName();
        let viewModel;

        // Get ViewModel by name or use default
        if (viewModelName) {
          viewModel = this.#rive!.viewModelByName(viewModelName);
          if (!viewModel) {
            this.logger.warn(
              `ViewModel "${viewModelName}" not found. Available ViewModels:`,
              this.getAvailableViewModelNames(),
            );
            this.#ngZone.run(() =>
              this.loadError.emit(
                new RiveValidationError(
                  formatErrorMessage(RiveErrorCode.ViewModelNotFound, {
                    name: viewModelName,
                  }),
                  RiveErrorCode.ViewModelNotFound,
                  this.getAvailableViewModelNames(),
                ),
              ),
            );
            return;
          }
        } else {
          viewModel = this.#rive!.defaultViewModel();
        }

        // If no ViewModel found (file doesn't use ViewModels), that's OK
        if (!viewModel) {
          this.logger.debug(
            'No ViewModel found in file (file may not use ViewModels)',
          );
          return;
        }

        // Get ViewModel instance
        const viewModelInstance = viewModel.instance();
        if (!viewModelInstance) {
          this.logger.warn('Failed to create ViewModel instance');
          return;
        }

        // Bind to artboard
        this.#rive!.bindViewModelInstance(viewModelInstance);

        // Update signal
        this.#ngZone.run(() => {
          this.#viewModelInstance.set(viewModelInstance);
        });

        // Log ViewModel info in debug mode
        this.logger.debug('ViewModel initialized:', {
          name: viewModel.name,
          properties: this.getViewModelPropertyInfo(viewModelInstance),
        });

        // Subscribe to ViewModel property changes for two-way binding
        this.subscribeToViewModelChanges(viewModelInstance);
      } catch (error) {
        this.logger.error('Error initializing ViewModel:', error);
      }
    });
  }

  /**
   * Get list of available ViewModel names for error messages.
   */
  private getAvailableViewModelNames(): string[] {
    if (!this.#rive) return [];
    const names: string[] = [];
    const count = this.#rive.viewModelCount;
    for (let i = 0; i < count; i++) {
      const vm = this.#rive.viewModelByIndex(i);
      if (vm) names.push(vm.name);
    }
    return names;
  }

  /**
   * Get ViewModel property information for debug logging.
   */
  private getViewModelPropertyInfo(
    vmi: ViewModelInstance,
  ): Record<string, string> {
    const info: Record<string, string> = {};
    try {
      const properties = vmi.properties;
      for (const prop of properties) {
        // Property has name and type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propAny = prop as any;
        const propertyType = this.normalizeViewModelPropertyType(propAny?.type);
        info[propAny.name || 'unknown'] =
          propertyType ?? (propAny.type || 'unknown');
      }
    } catch (error) {
      this.logger.warn('Failed to get ViewModel property info:', error);
    }
    return info;
  }

  /**
   * Subscribe to ViewModel property changes for two-way data binding.
   * Emits dataBindingChange output when properties change from within the animation.
   */
  private subscribeToViewModelChanges(vmi: ViewModelInstance): void {
    this.cleanupViewModelSubscriptions();

    const properties = vmi.properties ?? [];
    if (!Array.isArray(properties)) {
      return;
    }

    for (const property of properties) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const propertyAny = property as any;
      const path = propertyAny?.name;
      if (typeof path !== 'string') {
        continue;
      }

      const resolved = this.resolveViewModelProperty(vmi, path);
      if (!resolved) {
        continue;
      }

      const subscription = this.subscribeToPropertyChanges(
        path,
        resolved.type,
        resolved.accessor,
      );

      if (subscription) {
        this.#viewModelSubscriptionDisposers.add(subscription);
      }
    }
  }

  /**
   * Subscribe to changes for a specific ViewModel property.
   * Uses multiple event APIs to maximize compatibility with Rive runtime versions.
   */
  private subscribeToPropertyChanges(
    path: string,
    propertyType: DataBindingPropertyType,
    property: unknown,
  ): (() => void) | undefined {
    const propertyAny = property as any;
    if (!propertyAny) {
      return undefined;
    }

    const callback = (): void => {
      if (this.shouldSuppressLocalMutation(path)) {
        return;
      }

      const value = this.readPropertyValue(propertyType, propertyAny);
      if (value === undefined) return;

      this.#ngZone.run(() => {
        this.dataBindingChange.emit({
          path,
          value,
          propertyType,
        });
      });
    };

    let unsubscribe: (() => void) | undefined;
    try {
      if (typeof propertyAny.on === 'function') {
        try {
          const handler = propertyAny.on(callback);
          unsubscribe = this.buildUnsubscribeFromHandler(
            propertyAny,
            callback,
            handler,
          );
        } catch {
          const handler = propertyAny.on('change', callback);
          unsubscribe = this.buildUnsubscribeFromHandler(
            propertyAny,
            callback,
            handler,
            true,
          );
        }
      } else if (typeof propertyAny.subscribe === 'function') {
        const handler = propertyAny.subscribe(callback);
        unsubscribe = this.buildUnsubscribeFromHandler(
          propertyAny,
          callback,
          handler,
        );
      } else if (typeof propertyAny.addEventListener === 'function') {
        propertyAny.addEventListener('change', callback);
        unsubscribe = () =>
          propertyAny.removeEventListener?.('change', callback);
      } else if (typeof propertyAny.addListener === 'function') {
        propertyAny.addListener('change', callback);
        unsubscribe = () => propertyAny.removeListener?.('change', callback);
      } else if (typeof propertyAny.onChange === 'function') {
        const handler = propertyAny.onChange(callback);
        unsubscribe = this.buildUnsubscribeFromHandler(
          propertyAny,
          callback,
          handler,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to subscribe to ViewModel property "${path}":`,
        error,
      );
    }

    if (!unsubscribe) {
      this.logger.warn(
        `No supported subscription API found for ViewModel property "${path}"`,
      );
    }

    return unsubscribe;
  }

  private buildUnsubscribeFromHandler(
    property: any,
    callback: () => void,
    handler: unknown,
    useLegacyEventApi?: boolean,
  ): (() => void) | undefined {
    if (typeof handler === 'function') {
      return handler as () => void;
    }

    if (
      handler &&
      typeof handler === 'object' &&
      'unsubscribe' in handler &&
      typeof handler.unsubscribe === 'function'
    ) {
      return () => (handler as { unsubscribe: () => void }).unsubscribe();
    }

    if (
      handler &&
      typeof handler === 'object' &&
      'dispose' in handler &&
      typeof handler.dispose === 'function'
    ) {
      return () => (handler as { dispose: () => void }).dispose();
    }

    if (typeof property.off === 'function') {
      return useLegacyEventApi
        ? () => property.off('change', callback)
        : () => property.off(callback);
    }

    if (typeof property.remove === 'function') {
      return useLegacyEventApi
        ? () => property.remove('change', callback)
        : () => property.remove(callback);
    }

    if (typeof property.removeListener === 'function') {
      return useLegacyEventApi
        ? () => property.removeListener('change', callback)
        : () => property.removeListener(callback);
    }

    if (typeof property.unsubscribe === 'function') {
      return () => property.unsubscribe();
    }

    return undefined;
  }

  private withLocalMutation(path: string, fn: () => void): void {
    const previous = this.#localMutationSuppressions.get(path) ?? 0;
    this.#localMutationSuppressions.set(path, previous + 1);

    try {
      fn();
    } finally {
      setTimeout(() => {
        const current = this.#localMutationSuppressions.get(path) ?? 0;
        if (current <= 1) {
          this.#localMutationSuppressions.delete(path);
        } else {
          this.#localMutationSuppressions.set(path, current - 1);
        }
      });
    }
  }

  private shouldSuppressLocalMutation(path: string): boolean {
    const current = this.#localMutationSuppressions.get(path);
    if (current === undefined || current <= 0) {
      return false;
    }

    if (current <= 1) {
      this.#localMutationSuppressions.delete(path);
    } else {
      this.#localMutationSuppressions.set(path, current - 1);
    }

    return true;
  }

  private readPropertyValue(
    propertyType: DataBindingPropertyType,
    property: any,
  ): DataBindingValue | undefined {
    if (propertyType === 'color') {
      if (!property || typeof property.value !== 'number') return undefined;
      const argb = property.value;
      const a = (argb >> 24) & 0xff;
      const r = (argb >> 16) & 0xff;
      const g = (argb >> 8) & 0xff;
      const b = argb & 0xff;
      return { r, g, b, a };
    }

    if (propertyType === 'number' && typeof property.value === 'number') {
      return property.value;
    }

    if (propertyType === 'string' && typeof property.value === 'string') {
      return property.value;
    }

    if (propertyType === 'boolean' && typeof property.value === 'boolean') {
      return property.value;
    }

    if (propertyType === 'enum' && typeof property.value === 'string') {
      return property.value;
    }

    if (propertyType === 'trigger') {
      // Triggers don't have a meaningful value, but we return true to indicate the trigger fired
      return true;
    }

    return undefined;
  }

  private normalizeViewModelPropertyType(
    type: unknown,
  ): DataBindingPropertyType | null {
    if (typeof type !== 'string') {
      return null;
    }

    const normalized = type.toLowerCase();
    if (normalized.includes('color')) return 'color';
    if (normalized.includes('number')) return 'number';
    if (normalized.includes('string')) return 'string';
    if (normalized.includes('boolean')) return 'boolean';
    if (normalized.includes('enum')) return 'enum';
    if (normalized.includes('trigger')) return 'trigger';

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveViewModelProperty(
    vmi: ViewModelInstance,
    path: string,
  ): { accessor: any; type: DataBindingPropertyType } | null {
    const color = vmi.color(path);
    if (color) return { accessor: color, type: 'color' };

    const number = vmi.number(path);
    if (number) return { accessor: number, type: 'number' };

    const string = vmi.string(path);
    if (string) return { accessor: string, type: 'string' };

    const bool = vmi.boolean(path);
    if (bool) return { accessor: bool, type: 'boolean' };

    const enumProp = vmi.enum(path);
    if (enumProp) return { accessor: enumProp, type: 'enum' };

    const trigger = vmi.trigger(path);
    if (trigger) return { accessor: trigger, type: 'trigger' };

    return null;
  }

  private emitDataBindingTypeMismatch(
    path: string,
    expectedType: DataBindingPropertyType,
    actualType: string,
  ): void {
    this.#ngZone.run(() =>
      this.loadError.emit(
        new RiveValidationError(
          formatErrorMessage(RiveErrorCode.DataBindingTypeMismatch, {
            path,
            expected: expectedType,
            actual: actualType,
          }),
          RiveErrorCode.DataBindingTypeMismatch,
        ),
      ),
    );
  }

  private cleanupViewModelSubscriptions(): void {
    this.#viewModelSubscriptionDisposers.forEach((disposer) => {
      try {
        disposer();
      } catch (error) {
        this.logger.warn('Error during ViewModel subscription cleanup:', error);
      }
    });
    this.#viewModelSubscriptionDisposers.clear();
  }

  /**
   * Apply all data bindings from input (controlled keys).
   * Called on every input change or load.
   * Auto-detects property type from ViewModel and applies the value accordingly.
   */
  private applyDataBindings(bindings: Record<string, DataBindingValue>): void {
    const vmi = this.#viewModelInstance();
    if (!vmi) return;

    this.#ngZone.runOutsideAngular(() => {
      for (const [path, value] of Object.entries(bindings)) {
        try {
          const resolved = this.resolveViewModelProperty(vmi, path);
          if (!resolved) {
            this.logger.warn(
              `Data binding property "${path}" not found in ViewModel`,
            );
            this.#ngZone.run(() =>
              this.loadError.emit(
                new RiveValidationError(
                  formatErrorMessage(
                    RiveErrorCode.DataBindingPropertyNotFound,
                    {
                      path,
                    },
                  ),
                  RiveErrorCode.DataBindingPropertyNotFound,
                ),
              ),
            );
            continue;
          }

          let applied = false;
          this.withLocalMutation(path, () => {
            applied = this.tryApplyBinding(path, value, resolved);
          });
          if (applied) {
            this.logger.debug(`Data binding "${path}" set to:`, value);
          } else {
            this.logger.warn(
              `Data binding property "${path}" has a type mismatch for value type ${typeof value}`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to set data binding "${path}":`, error);
        }
      }
    });
  }

  /**
   * Try to apply a binding value to a resolved ViewModel property.
   * Returns true if successful, false on type mismatch.
   */
  private tryApplyBinding(
    path: string,
    value: DataBindingValue,
    resolved: { accessor: any; type: DataBindingPropertyType },
  ): boolean {
    const { accessor, type } = resolved;

    if (type === 'color') {
      if (typeof value === 'object' && value !== null && 'r' in value) {
        // RiveColor object
        const color = value as RiveColor;
        accessor.rgba(color.r, color.g, color.b, color.a);
        return true;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        // Hex string or ARGB integer
        const color = parseRiveColor(value);
        accessor.rgba(color.r, color.g, color.b, color.a);
        return true;
      }
      this.logger.warn(
        `Invalid color value for "${path}": expected string, number, or RiveColor`,
      );
      this.emitDataBindingTypeMismatch(path, type, typeof value);
      return false;
    }

    if (type === 'number') {
      if (typeof value === 'number') {
        accessor.value = value;
        return true;
      }
      this.logger.warn(
        `Invalid number value for "${path}": expected number, got ${typeof value}`,
      );
      this.emitDataBindingTypeMismatch(path, type, typeof value);
      return false;
    }

    if (type === 'string') {
      if (typeof value === 'string') {
        accessor.value = value;
        return true;
      }
      this.logger.warn(
        `Invalid string value for "${path}": expected string, got ${typeof value}`,
      );
      this.emitDataBindingTypeMismatch(path, type, typeof value);
      return false;
    }

    if (type === 'boolean') {
      if (typeof value === 'boolean') {
        accessor.value = value;
        return true;
      }
      this.logger.warn(
        `Invalid boolean value for "${path}": expected boolean, got ${typeof value}`,
      );
      this.emitDataBindingTypeMismatch(path, type, typeof value);
      return false;
    }

    if (type === 'enum') {
      if (typeof value === 'string') {
        accessor.value = value;
        return true;
      }
      this.logger.warn(
        `Invalid enum value for "${path}": expected string, got ${typeof value}`,
      );
      this.emitDataBindingTypeMismatch(path, type, typeof value);
      return false;
    }

    if (type === 'trigger') {
      this.logger.warn(
        `Cannot set trigger property "${path}" via setDataBinding`,
      );
      return false;
    }

    return false;
  }

  /**
   * Clean up Rive instance only
   */
  private cleanupRive(): void {
    this.cleanupViewModelSubscriptions();
    this.#localMutationSuppressions.clear();

    const vmi = this.#viewModelInstance();
    if (vmi) {
      try {
        vmi.cleanup();
      } catch (error) {
        this.logger.warn('Error during ViewModel cleanup:', error);
      }
    }

    if (this.#rive) {
      try {
        this.#rive.cleanup();
      } catch (error) {
        this.logger.warn('Error during Rive cleanup:', error);
      }
      this.#rive = null;
    }
    this.#runtimeSdk = null;

    // Reset signals
    this.#riveInstance.set(null);
    this.#viewModelInstance.set(null);
    this.#isLoaded.set(false);
    this.#isPlaying.set(false);
    this.#isPaused.set(false);
  }
}
