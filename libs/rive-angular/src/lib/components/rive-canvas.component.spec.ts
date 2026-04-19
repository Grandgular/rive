import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiveCanvasComponent } from './rive-canvas.component';
import {
  Rive,
  RiveFile,
  Fit,
  Alignment,
  EventType,
  LoopType,
  type RiveParameters,
} from '@rive-app/canvas';
import { resetRiveRuntimeLifecycleForTests } from '../utils/rive-runtime';

// Mock Rive
jest.mock('@rive-app/canvas', () => ({
  Rive: jest.fn(),
  RiveFile: jest.fn(),
  Layout: jest.fn(),
  Fit: {
    Contain: 'contain',
    Cover: 'cover',
    Fill: 'fill',
    FitWidth: 'fitWidth',
    FitHeight: 'fitHeight',
    None: 'none',
    ScaleDown: 'scaleDown',
  },
  Alignment: {
    Center: 'center',
    TopLeft: 'topLeft',
    TopCenter: 'topCenter',
    TopRight: 'topRight',
    CenterLeft: 'centerLeft',
    CenterRight: 'centerRight',
    BottomLeft: 'bottomLeft',
    BottomCenter: 'bottomCenter',
    BottomRight: 'bottomRight',
  },
  StateMachineInput: jest.fn(),
  EventType: {
    Load: 'load',
    LoadError: 'loaderror',
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop',
    Loop: 'loop',
    Advance: 'advance',
    StateChange: 'statechange',
    RiveEvent: 'riveevent',
  },
  LoopType: {
    OneShot: 'oneshot',
    Loop: 'loop',
    PingPong: 'pingpong',
  },
  RuntimeLoader: {
    awaitInstance: jest.fn().mockResolvedValue(undefined),
    setWasmUrl: jest.fn(),
  },
}));

jest.mock('@rive-app/webgl2', () => ({
  RuntimeLoader: {
    awaitInstance: jest.fn().mockResolvedValue(undefined),
    setWasmUrl: jest.fn(),
  },
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as any;

/**
 * After `ensureRiveRuntimeReady`, Rive is created on a microtask outside the Angular zone.
 * `fixture.whenStable()` does not wait for that in zoneless tests; a macrotask flush does.
 */
async function detectChangesAndSettle(
  fixture: ComponentFixture<RiveCanvasComponent>,
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('RiveCanvasComponent', () => {
  let component: RiveCanvasComponent;
  let fixture: ComponentFixture<RiveCanvasComponent>;
  let mockRive: jest.Mocked<Rive>;
  const createMockViewModel = () => {
    const viewModelInstance = createMockViewModelInstance();
    return {
      name: 'MainViewModel',
      instance: jest.fn(() => viewModelInstance),
    };
  };
  const createMockProperty = <T>(initialValue: T) => {
    let currentValue = initialValue;
    const listeners: Array<() => void> = [];
    const property = {
      on: jest.fn((...args: unknown[]) => {
        const callback =
          typeof args[0] === 'function'
            ? (args[0] as () => void)
            : typeof args[1] === 'function'
              ? (args[1] as () => void)
              : undefined;

        if (callback) {
          listeners.push(callback);
        }

        return {
          unsubscribe: () => {
            if (callback) {
              const idx = listeners.indexOf(callback);
              if (idx >= 0) {
                listeners.splice(idx, 1);
              }
            }
          },
        };
      }),
      off: jest.fn(),
      get value() {
        return currentValue;
      },
      set value(nextValue: T) {
        currentValue = nextValue;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rgba: jest.fn((...args: any[]) => {
        const [r, g, b, a] = args;
        (property as any).value =
          (((a ?? 255) << 24) | (r << 16) | (g << 8) | b) >>> 0;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opacity: jest.fn((opacity: any) => {
        const value = (property as any).value as number;
        (property as any).value =
          (((opacity * 255) << 24) | (value & 0x00ffffff)) >>> 0;
      }),
      trigger: jest.fn(),
      emitChange: () => {
        listeners.forEach((listener) => listener());
      },
    };

    return property as typeof property & {
      on: jest.Mock;
      off: jest.Mock;
      value: T;
      rgba: jest.Mock;
      opacity: jest.Mock;
      trigger: jest.Mock;
      emitChange: () => void;
    };
  };

  const createMockViewModelInstance = () => {
    const colorValue = createMockProperty(0xffffffff);
    const numberValue = createMockProperty(0);
    const stringValue = createMockProperty('initial');
    const booleanValue = createMockProperty(false);
    const enumValue = createMockProperty('idle');
    const triggerValue = createMockProperty('trigger');

    return {
      properties: [
        { name: 'backgroundColor', type: 'color' },
        { name: 'score', type: 'number' },
        { name: 'playerName', type: 'string' },
        { name: 'isActive', type: 'boolean' },
        { name: 'gameState', type: 'enum' },
        { name: 'onComplete', type: 'trigger' },
      ],
      color: jest.fn((path: string) => {
        if (path === 'backgroundColor') return colorValue;
        return undefined;
      }),
      number: jest.fn((path: string) => {
        if (path === 'score') return numberValue;
        return undefined;
      }),
      string: jest.fn((path: string) => {
        if (path === 'playerName') return stringValue;
        return undefined;
      }),
      boolean: jest.fn((path: string) => {
        if (path === 'isActive') return booleanValue;
        return undefined;
      }),
      enum: jest.fn((path: string) => {
        if (path === 'gameState') return enumValue;
        return undefined;
      }),
      trigger: jest.fn((path: string) => {
        if (path === 'onComplete') return triggerValue;
        return undefined;
      }),
      cleanup: jest.fn(),
      get colorValue() {
        return colorValue;
      },
      get numberValue() {
        return numberValue;
      },
      get stringValue() {
        return stringValue;
      },
      get booleanValue() {
        return booleanValue;
      },
      get enumValue() {
        return enumValue;
      },
      get triggerValue() {
        return triggerValue;
      },
    } as const;
  };

  beforeEach(async () => {
    resetRiveRuntimeLifecycleForTests();

    mockRive = {
      cleanup: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      resizeDrawingSurfaceToCanvas: jest.fn(),
      startRendering: jest.fn(),
      stopRendering: jest.fn(),
      stateMachineInputs: jest.fn(() => []),
      setTextRunValue: jest.fn(),
      setTextRunValueAtPath: jest.fn(),
      bindViewModelInstance: jest.fn(),
      defaultViewModel: jest.fn(createMockViewModel),
      viewModelByName: jest.fn((name: string) =>
        name === 'MainViewModel' ? createMockViewModel() : undefined,
      ),
      viewModelByIndex: jest.fn(() => createMockViewModel()),
      viewModelCount: 1,
      artboardNames: [],
      animationNames: [],
      stateMachineNames: [],
    } as unknown as jest.Mocked<Rive>;

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation(() => mockRive);

    await TestBed.configureTestingModule({
      imports: [RiveCanvasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RiveCanvasComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose both selectors for compatibility', () => {
    const selectors = (RiveCanvasComponent as any).ɵcmp?.selectors ?? [];
    expect(selectors).toEqual(
      expect.arrayContaining([['rive'], ['rive-canvas']]),
    );
  });

  it('should initialize with default values', () => {
    expect(component.autoplay()).toBe(true);
    expect(component.fit()).toBe(Fit.Contain);
    expect(component.alignment()).toBe(Alignment.Center);
    expect(component.useOffscreenRenderer()).toBe(false);
    expect(component.shouldUseIntersectionObserver()).toBe(true);
    expect(component.shouldDisableRiveListeners()).toBe(false);
    expect(component.automaticallyHandleEvents()).toBe(false);
  });

  it('should load animation from src after view init', async () => {
    fixture.componentRef.setInput('src', 'test.riv');
    await detectChangesAndSettle(fixture);

    expect(Rive).toHaveBeenCalledWith(
      expect.objectContaining({
        src: 'test.riv',
        autoplay: true,
      }),
    );
  });

  it('should emit loaded event on successful load', async () => {
    let onLoadCallback: (() => void) | undefined;

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
      (config: any) => {
        onLoadCallback = config.onLoad;
        return mockRive;
      },
    );

    let loadedEmitted = false;
    let riveReadyEmitted = false;

    component.loaded.subscribe(() => {
      loadedEmitted = true;
      expect(component.isLoaded()).toBe(true);
    });

    component.riveReady.subscribe(() => {
      riveReadyEmitted = true;
      expect(component.riveInstance()).toBe(mockRive);
    });

    fixture.componentRef.setInput('src', 'test.riv');
    await detectChangesAndSettle(fixture);

    onLoadCallback!();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(loadedEmitted).toBe(true);
    expect(riveReadyEmitted).toBe(true);
  });

  it('should emit loadError event on load failure', async () => {
    let onLoadErrorCallback: (() => void) | undefined;

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
      (config: any) => {
        onLoadErrorCallback = config.onLoadError;
        return mockRive;
      },
    );

    const errorPromise = new Promise<unknown>((resolve) => {
      component.loadError.subscribe((error) => resolve(error));
    });

    fixture.componentRef.setInput('src', 'test.riv');
    await detectChangesAndSettle(fixture);

    onLoadErrorCallback!();
    const error = await errorPromise;
    expect(error).toBeDefined();
    expect((error as Error).name).toBe('RiveLoadError');
  });

  it('should cleanup Rive instance on destroy', async () => {
    fixture.componentRef.setInput('src', 'test.riv');
    await detectChangesAndSettle(fixture);

    fixture.destroy();

    expect(mockRive.cleanup).toHaveBeenCalled();
  });

  it('should reload animation when src changes', async () => {
    fixture.componentRef.setInput('src', 'test1.riv');
    await detectChangesAndSettle(fixture);

    expect(Rive).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('src', 'test2.riv');
    await detectChangesAndSettle(fixture);

    expect(Rive).toHaveBeenCalledTimes(2);
    expect(mockRive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('should prioritize riveFile over src and buffer', async () => {
    const mockRiveFile = {} as RiveFile;

    fixture.componentRef.setInput('src', 'test.riv');
    fixture.componentRef.setInput('buffer', new ArrayBuffer(100));
    fixture.componentRef.setInput('riveFile', mockRiveFile);
    await detectChangesAndSettle(fixture);

    expect(Rive).toHaveBeenCalledWith(
      expect.objectContaining({
        riveFile: mockRiveFile,
      }),
    );
    expect(Rive).toHaveBeenCalledWith(
      expect.not.objectContaining({
        src: expect.anything(),
        buffer: expect.anything(),
      }),
    );
  });

  describe('Public API methods', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);
    });

    it('should play animation', () => {
      component.playAnimation();
      expect(mockRive.play).toHaveBeenCalled();
    });

    it('should play specific animations', () => {
      component.playAnimation(['anim1', 'anim2']);
      expect(mockRive.play).toHaveBeenCalledWith(['anim1', 'anim2']);
    });

    it('should pause animation', () => {
      component.pauseAnimation();
      expect(mockRive.pause).toHaveBeenCalled();
    });

    it('should stop animation', () => {
      component.stopAnimation();
      expect(mockRive.stop).toHaveBeenCalled();
    });

    it('should reset animation', () => {
      component.reset();
      expect(mockRive.reset).toHaveBeenCalled();
    });

    it('should set state machine input', () => {
      const mockInput = { name: 'testInput', value: 0 };
      mockRive.stateMachineInputs.mockReturnValue([mockInput] as any);

      component.setInput('StateMachine', 'testInput', 42);

      expect(mockRive.stateMachineInputs).toHaveBeenCalledWith('StateMachine');
      expect(mockInput.value).toBe(42);
    });

    it('should fire state machine trigger', () => {
      const mockTrigger = { name: 'testTrigger', fire: jest.fn() };
      mockRive.stateMachineInputs.mockReturnValue([mockTrigger] as any);

      component.fireTrigger('StateMachine', 'testTrigger');

      expect(mockRive.stateMachineInputs).toHaveBeenCalledWith('StateMachine');
      expect(mockTrigger.fire).toHaveBeenCalled();
    });
  });

  describe('Signals', () => {
    it('should update isPlaying signal on play', async () => {
      let onPlayCallback: (() => void) | undefined;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onPlayCallback = config.onPlay;
          return mockRive;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onPlayCallback!();

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(component.isPlaying()).toBe(true);
      expect(component.isPaused()).toBe(false);
    });

    it('should update isPaused signal on pause', async () => {
      let onPauseCallback: (() => void) | undefined;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onPauseCallback = config.onPause;
          return mockRive;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onPauseCallback!();

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(component.isPaused()).toBe(true);
      expect(component.isPlaying()).toBe(false);
    });

    it('should expose riveInstance signal after load', async () => {
      let onLoadCallback: (() => void) | undefined;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRive;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const ready = new Promise<void>((resolve) => {
        component.riveReady.subscribe(() => resolve());
      });
      onLoadCallback!();
      await ready;
      expect(component.riveInstance()).toBe(mockRive);
    });
  });

  describe('Animation lifecycle events', () => {
    it('should pass onLoop and onAdvance callbacks to Rive', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          onLoop: expect.any(Function),
          onAdvance: expect.any(Function),
        }),
      );
    });

    it('should emit animationPlay and keep isPlaying in sync', async () => {
      let onPlayCallback: RiveParameters['onPlay'];

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: RiveParameters) => {
          onPlayCallback = config.onPlay;
          return mockRive;
        },
      );

      const playSpy = jest.fn();
      component.animationPlay.subscribe(playSpy);

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onPlayCallback?.({ type: EventType.Play });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(playSpy).toHaveBeenCalledWith({ type: EventType.Play });
      expect(component.isPlaying()).toBe(true);
      expect(component.isPaused()).toBe(false);
    });

    it('should emit animationPause and keep isPaused in sync', async () => {
      let onPauseCallback: RiveParameters['onPause'];

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: RiveParameters) => {
          onPauseCallback = config.onPause;
          return mockRive;
        },
      );

      const pauseSpy = jest.fn();
      component.animationPause.subscribe(pauseSpy);

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onPauseCallback?.({ type: EventType.Pause });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(pauseSpy).toHaveBeenCalledWith({ type: EventType.Pause });
      expect(component.isPaused()).toBe(true);
      expect(component.isPlaying()).toBe(false);
    });

    it('should emit animationStop and reset playing state', async () => {
      let onStopCallback: RiveParameters['onStop'];

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: RiveParameters) => {
          onStopCallback = config.onStop;
          return mockRive;
        },
      );

      const stopSpy = jest.fn();
      component.animationStop.subscribe(stopSpy);

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onStopCallback?.({ type: EventType.Stop });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(stopSpy).toHaveBeenCalledWith({ type: EventType.Stop });
      expect(component.isPlaying()).toBe(false);
      expect(component.isPaused()).toBe(false);
    });

    it('should emit animationLoop with loop event data', async () => {
      let onLoopCallback: RiveParameters['onLoop'];

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: RiveParameters) => {
          onLoopCallback = config.onLoop;
          return mockRive;
        },
      );

      const loopSpy = jest.fn();
      component.animationLoop.subscribe(loopSpy);

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const loopPayload = {
        type: EventType.Loop,
        data: { animation: 'idle', type: LoopType.OneShot },
      };
      onLoopCallback?.(loopPayload);

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(loopSpy).toHaveBeenCalledWith(loopPayload);
    });

    it('should emit animationAdvance when Rive advances a frame', async () => {
      let onAdvanceCallback: RiveParameters['onAdvance'];

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: RiveParameters) => {
          onAdvanceCallback = config.onAdvance;
          return mockRive;
        },
      );

      const advanceSpy = jest.fn();
      component.animationAdvance.subscribe(advanceSpy);

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const advancePayload = { type: EventType.Advance };
      onAdvanceCallback?.(advancePayload);

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(advanceSpy).toHaveBeenCalledWith(advancePayload);
    });
  });

  describe('Configuration', () => {
    it('should pass artboard to Rive config', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('artboard', 'MyArtboard');
      await detectChangesAndSettle(fixture);

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          artboard: 'MyArtboard',
        }),
      );
    });

    it('should pass animations to Rive config', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('animations', ['anim1', 'anim2']);
      await detectChangesAndSettle(fixture);

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          animations: ['anim1', 'anim2'],
        }),
      );
    });

    it('should pass stateMachines to Rive config', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('stateMachines', 'StateMachine1');
      await detectChangesAndSettle(fixture);

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          stateMachines: 'StateMachine1',
        }),
      );
    });

    it('should pass fit and alignment to Rive config', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('fit', Fit.Cover);
      fixture.componentRef.setInput('alignment', Alignment.TopLeft);
      await detectChangesAndSettle(fixture);

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: expect.anything(),
        }),
      );
    });
  });

  describe('Phase 2: Debug Mode', () => {
    it('should use debug level when debugMode is true', async () => {
      fixture.componentRef.setInput('debugMode', true);
      await detectChangesAndSettle(fixture);

      // Logger should be initialized with debug level
      // We can verify this by checking console output in integration tests
      expect(component.debugMode()).toBe(true);
    });

    it('should use global config when debugMode is undefined', () => {
      // Without debugMode input, should fall back to global config (or error level)
      expect(component.debugMode()).toBeUndefined();
    });

    it('should update logger level when debugMode changes', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('debugMode', false);
      await detectChangesAndSettle(fixture);

      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.componentRef.setInput('debugMode', true);
      await detectChangesAndSettle(fixture);

      expect(component.debugMode()).toBe(true);
    });
  });

  describe('Phase 2: Validation', () => {
    it('should emit RiveValidationError for invalid artboard name', async () => {
      let onLoadCallback: (() => void) | undefined;

      const mockRiveWithArtboards = {
        ...mockRive,
        artboardNames: ['Artboard1', 'Artboard2'],
      };

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRiveWithArtboards as any;
        },
      );

      const errors: Error[] = [];
      component.loadError.subscribe((error) => {
        errors.push(error);
      });

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('artboard', 'InvalidArtboard');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(errors.length).toBeGreaterThan(0);
      const validationError = errors.find(
        (e) => e.name === 'RiveValidationError',
      );
      expect(validationError).toBeDefined();
    });

    it('should emit RiveValidationError for invalid animation name', async () => {
      let onLoadCallback: (() => void) | undefined;

      const mockRiveWithAnimations = {
        ...mockRive,
        animationNames: ['Animation1', 'Animation2'],
      };

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRiveWithAnimations as any;
        },
      );

      const errors: Error[] = [];
      component.loadError.subscribe((error) => {
        errors.push(error);
      });

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('animations', 'InvalidAnimation');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(errors.length).toBeGreaterThan(0);
      const validationError = errors.find(
        (e) => e.name === 'RiveValidationError',
      );
      expect(validationError).toBeDefined();
    });

    it('should emit RiveValidationError for invalid state machine name', async () => {
      let onLoadCallback: (() => void) | undefined;

      const mockRiveWithStateMachines = {
        ...mockRive,
        stateMachineNames: ['SM1', 'SM2'],
      };

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRiveWithStateMachines as any;
        },
      );

      const errors: Error[] = [];
      component.loadError.subscribe((error) => {
        errors.push(error);
      });

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('stateMachines', 'InvalidSM');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(errors.length).toBeGreaterThan(0);
      const validationError = errors.find(
        (e) => e.name === 'RiveValidationError',
      );
      expect(validationError).toBeDefined();
    });

    it('should emit RiveValidationError with RIVE_204 for invalid input', async () => {
      let onLoadCallback: (() => void) | undefined;

      mockRive.stateMachineInputs.mockReturnValue([
        { name: 'validInput', value: 0 },
      ] as any);

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRive;
        },
      );

      const errors: Error[] = [];
      component.loadError.subscribe((error) => {
        errors.push(error);
      });

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.setInput('StateMachine', 'invalidInput', 42);
      await new Promise<void>((r) => setTimeout(r, 0));
      const validationError = errors.find(
        (e) => e.name === 'RiveValidationError',
      );
      expect(validationError).toBeDefined();
    });

    it('should emit RiveValidationError with RIVE_204 for invalid trigger', async () => {
      let onLoadCallback: (() => void) | undefined;

      mockRive.stateMachineInputs.mockReturnValue([
        { name: 'validTrigger', fire: jest.fn() },
      ] as any);

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRive;
        },
      );

      const errors: Error[] = [];
      component.loadError.subscribe((error) => {
        errors.push(error);
      });

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.fireTrigger('StateMachine', 'invalidTrigger');
      await new Promise<void>((r) => setTimeout(r, 0));
      const validationError = errors.find(
        (e) => e.name === 'RiveValidationError',
      );
      expect(validationError).toBeDefined();
    });

    it('should not crash when runtime metadata is unavailable', async () => {
      let onLoadCallback: (() => void) | undefined;

      // Mock Rive instance without metadata properties
      const mockRiveWithoutMetadata = {
        ...mockRive,
        artboardNames: undefined,
        animationNames: undefined,
        stateMachineNames: undefined,
      };

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRiveWithoutMetadata as any;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('artboard', 'SomeArtboard');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(component.isLoaded()).toBe(true);
    });
  });

  describe('Text Runs', () => {
    beforeEach(() => {
      mockRive.getTextRunValue = jest.fn((name: string) => `value-${name}`);
      mockRive.setTextRunValue = jest.fn();
      mockRive.getTextRunValueAtPath = jest.fn(
        (name: string, path: string) => `value-${name}-${path}`,
      );
      mockRive.setTextRunValueAtPath = jest.fn();
    });

    describe('textRuns input (controlled keys)', () => {
      it('should apply text runs after load', async () => {
        let onLoadCallback: (() => void) | undefined;

        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );

        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', {
          title: 'Hello',
          subtitle: 'World',
        });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'subtitle',
          'World',
        );
      });

      it('should reactively update when textRuns values change', async () => {
        let onLoadCallback: (() => void) | undefined;

        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );

        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );

        jest.clearAllMocks();
        fixture.componentRef.setInput('textRuns', { title: 'Updated' });
        await detectChangesAndSettle(fixture);

        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Updated',
        );
      });

      it('should emit error for non-existent text run', async () => {
        let onLoadCallback: (() => void) | undefined;

        mockRive.setTextRunValue = jest.fn((textRunName: string, textRunValue: string) => {
          throw new Error('Text run not found');
        });

        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );

        const errors: Error[] = [];
        component.loadError.subscribe((error) => {
          errors.push(error);
        });

        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { invalid: 'value' });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        const validationError = errors.find(
          (e) => e.name === 'RiveValidationError',
        );
        expect(validationError).toBeDefined();
      });

      it('should make key uncontrolled when removed from input', async () => {
        let onLoadCallback: (() => void) | undefined;

        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );

        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', {
          title: 'Hello',
          subtitle: 'World',
        });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'subtitle',
          'World',
        );

        jest.clearAllMocks();
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );
        expect(mockRive.setTextRunValue).not.toHaveBeenCalledWith(
          'subtitle',
          expect.anything(),
        );
      });
    });

    describe('Imperative methods', () => {
      beforeEach(async () => {
        fixture.componentRef.setInput('src', 'test.riv');
        await detectChangesAndSettle(fixture);
      });

      it('should get text run value', () => {
        const value = component.getTextRunValue('greeting');
        expect(mockRive.getTextRunValue).toHaveBeenCalledWith('greeting');
        expect(value).toBe('value-greeting');
      });

      it('should return undefined when getting text run value with no rive instance', () => {
        fixture.destroy();
        const value = component.getTextRunValue('greeting');
        expect(value).toBeUndefined();
      });

      it('should set text run value on uncontrolled key', () => {
        component.setTextRunValue('dynamicText', 'New value');
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'dynamicText',
          'New value',
        );
      });

      it('should no-op when setting text run value with no rive instance', () => {
        fixture.destroy();
        component.setTextRunValue('greeting', 'Hello');
        // Should not throw
      });

      it('should get text run value at path', () => {
        const value = component.getTextRunValueAtPath(
          'button_text',
          'Nested/Button',
        );
        expect(mockRive.getTextRunValueAtPath).toHaveBeenCalledWith(
          'button_text',
          'Nested/Button',
        );
        expect(value).toBe('value-button_text-Nested/Button');
      });

      it('should set text run value at path', () => {
        component.setTextRunValueAtPath(
          'button_text',
          'Click Me',
          'Nested/Button',
        );
        expect(mockRive.setTextRunValueAtPath).toHaveBeenCalledWith(
          'button_text',
          'Click Me',
          'Nested/Button',
        );
      });
    });

    describe('Controlled vs Uncontrolled scenarios', () => {
      let onLoadCallback: (() => void) | undefined;

      beforeEach(() => {
        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );
      });

      it('scenario 1: controlled key + imperative call -> input wins', async () => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );

        jest.clearAllMocks();
        component.setTextRunValue('title', 'World');
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'World',
        );

        jest.clearAllMocks();
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );
      });

      it('scenario 2: controlled key changes value', async () => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );

        jest.clearAllMocks();
        fixture.componentRef.setInput('textRuns', { title: 'Updated' });
        await detectChangesAndSettle(fixture);

        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Updated',
        );
      });

      it('scenario 3: uncontrolled key + imperative call -> both preserved', async () => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );

        jest.clearAllMocks();
        component.setTextRunValue('subtitle', 'World');
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'subtitle',
          'World',
        );

        jest.clearAllMocks();
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        await detectChangesAndSettle(fixture);

        expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
          'title',
          'Hello',
        );
        expect(mockRive.setTextRunValue).not.toHaveBeenCalledWith(
          'subtitle',
          expect.anything(),
        );
      });
    });

    describe('Warning logging', () => {
      it('should log warning when setting controlled key imperatively', async () => {
        let onLoadCallback: (() => void) | undefined;

        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        fixture.componentRef.setInput('debugMode', true); // Enable debug logging to see warnings
        await detectChangesAndSettle(fixture);

        onLoadCallback!();
        await new Promise<void>((r) => setTimeout(r, 0));
        component.setTextRunValue('title', 'World');

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('controlled by textRuns input'),
        );
        warnSpy.mockRestore();
      });
    });
  });

  describe('Data Binding (ViewModel)', () => {
    let onLoadCallback: (() => void) | undefined;
    let mockViewModelInstance: ReturnType<typeof createMockViewModelInstance>;
    let mockViewModel: { name: string; instance: () => ReturnType<typeof createMockViewModelInstance> };

    beforeEach(() => {
      mockViewModelInstance = createMockViewModelInstance();
      mockViewModel = {
        name: 'MainViewModel',
        instance: () => mockViewModelInstance,
      };

      mockRive.defaultViewModel = jest.fn(() => mockViewModel as any) as any;
      mockRive.viewModelByName = jest.fn((name: string) => {
        return name === 'MainViewModel' ? (mockViewModel as any) : undefined;
      }) as any;
      mockRive.viewModelByIndex = jest.fn(() => mockViewModel as any) as any;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRive;
        },
      );
    });

    it('should apply dataBindings on load with auto-detected types', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('dataBindings', {
        backgroundColor: '#FF5733',
        score: 42,
        playerName: 'Alice',
        isActive: true,
        gameState: 'running',
      });
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(mockViewModelInstance.colorValue.rgba).toHaveBeenCalledWith(
        255,
        87,
        51,
        255,
      );
      expect(mockViewModelInstance.numberValue.value).toBe(42);
      expect(mockViewModelInstance.stringValue.value).toBe('Alice');
      expect(mockViewModelInstance.booleanValue.value).toBe(true);
      expect(mockViewModelInstance.enumValue.value).toBe('running');
      expect(mockRive.bindViewModelInstance).toHaveBeenCalledWith(
        mockViewModelInstance,
      );
    });

    it('should emit dataBindingChange on callback from ViewModel property updates', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const emitted: Array<{
        path: string;
        propertyType: string;
        value: unknown;
      }> = [];
      component.dataBindingChange.subscribe((event) => emitted.push(event));

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      mockViewModelInstance.numberValue.value = 13;
      mockViewModelInstance.numberValue.emitChange();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(emitted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'score',
            propertyType: 'number',
            value: 13,
          }),
        ]),
      );
    });

    it('should support get/set helpers and fireTrigger', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('dataBindings', { isActive: true });
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(component.getDataBinding('score')).toBe(0);

      component.setDataBinding('score', 5);
      expect(mockViewModelInstance.numberValue.value).toBe(5);
      expect(component.getDataBinding('score')).toBe(5);
      component.setDataBinding('playerName', 'Bob');
      expect(mockViewModelInstance.stringValue.value).toBe('Bob');
      expect(component.getDataBinding('playerName')).toBe('Bob');
      component.fireViewModelTrigger('onComplete');
      expect(mockViewModelInstance.triggerValue.trigger).toHaveBeenCalled();
    });

    it('should mark controlled keys warning and keep uncontrolled path mutable', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('dataBindings', { score: 1 });
      fixture.componentRef.setInput('debugMode', true);
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.setDataBinding('score', 2);
      component.setDataBinding('gameState', 'paused');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('controlled by dataBindings input'),
      );
      expect(mockViewModelInstance.numberValue.value).toBe(2);
      expect(mockViewModelInstance.enumValue.value).toBe('paused');
      warnSpy.mockRestore();
    });

    it('should emit type mismatch validation error', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));
      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.setDataBinding('score', 'invalid');
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(
        errors.some((error) => error.name === 'RiveValidationError'),
      ).toBe(true);
    });

    it('should cleanup property subscriptions on destroy', async () => {
      const onDisposalSpy = jest.fn();
      const unsubscribe = () => {
        onDisposalSpy();
      };

      const trackedProperty = createMockProperty(10);
      trackedProperty.on.mockImplementationOnce(() => ({ unsubscribe }));

      const localViewModelInstance = {
        properties: [{ name: 'score', type: 'number' }],
        number: jest.fn((path: string) => (path === 'score' ? trackedProperty : undefined)),
        string: jest.fn(),
        boolean: jest.fn(),
        color: jest.fn(),
        enum: jest.fn(),
        trigger: jest.fn(),
        cleanup: jest.fn(),
      };
      const localViewModel = {
        name: 'MainViewModel',
        instance: jest.fn(() => localViewModelInstance),
      };
      mockRive.defaultViewModel = jest.fn(() => localViewModel as any);

      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      fixture.destroy();
      expect(onDisposalSpy).toHaveBeenCalled();
    });

    it('should emit dataBindingChange when trigger fires', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const emitted: Array<{
        path: string;
        propertyType: string;
        value: unknown;
      }> = [];
      component.dataBindingChange.subscribe((event) => emitted.push(event));

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      mockViewModelInstance.triggerValue.emitChange();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(emitted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'onComplete',
            propertyType: 'trigger',
            value: true,
          }),
        ]),
      );
    });

    it('should reinitialize ViewModel when viewModelName changes', async () => {
      const alternateVM = createMockViewModel();
      alternateVM.name = 'AlternateViewModel';
      mockRive.viewModelByName = jest.fn((name: string) => {
        if (name === 'MainViewModel') return mockViewModel as any;
        if (name === 'AlternateViewModel') return alternateVM as any;
        return null;
      }) as any;

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('viewModelName', 'MainViewModel');
      await detectChangesAndSettle(fixture);

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(mockRive.viewModelByName).toHaveBeenCalledWith('MainViewModel');

      fixture.componentRef.setInput('viewModelName', 'AlternateViewModel');
      await detectChangesAndSettle(fixture);

      expect(mockRive.viewModelByName).toHaveBeenCalledWith(
        'AlternateViewModel',
      );
    });

    it('should emit validation error for invalid opacity value', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.setColorOpacity('backgroundColor', 1.5);
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(
        errors.some(
          (error) =>
            error.name === 'RiveValidationError' &&
            error.message.includes('opacity'),
        ),
      ).toBe(true);
    });

    it('should emit validation error for non-existent property in imperative API', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.setDataBinding('nonExistentProperty', 42);
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(
        errors.some(
          (error) =>
            error.name === 'RiveValidationError' &&
            error.message.includes('not found'),
        ),
      ).toBe(true);
    });

    it('should emit validation error for invalid color format', async () => {
      fixture.componentRef.setInput('src', 'test.riv');
      await detectChangesAndSettle(fixture);

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));

      onLoadCallback!();
      await new Promise<void>((r) => setTimeout(r, 0));
      component.setColor('backgroundColor', 'invalid-color');
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(
        errors.some((error) => error.name === 'RiveValidationError'),
      ).toBe(true);
    });
  });
});
