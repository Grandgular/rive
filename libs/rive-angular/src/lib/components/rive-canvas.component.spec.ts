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

  it('should initialize with default values', () => {
    expect(component.autoplay()).toBe(true);
    expect(component.fit()).toBe(Fit.Contain);
    expect(component.alignment()).toBe(Alignment.Center);
    expect(component.useOffscreenRenderer()).toBe(false);
    expect(component.shouldUseIntersectionObserver()).toBe(true);
    expect(component.shouldDisableRiveListeners()).toBe(false);
    expect(component.automaticallyHandleEvents()).toBe(false);
  });

  it('should load animation from src after view init', () => {
    fixture.componentRef.setInput('src', 'test.riv');
    fixture.detectChanges();

    expect(Rive).toHaveBeenCalledWith(
      expect.objectContaining({
        src: 'test.riv',
        autoplay: true,
      }),
    );
  });

  it('should emit loaded event on successful load', (done) => {
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
      if (loadedEmitted && riveReadyEmitted) done();
    });

    component.riveReady.subscribe(() => {
      riveReadyEmitted = true;
      expect(component.riveInstance()).toBe(mockRive);
      if (loadedEmitted && riveReadyEmitted) done();
    });

    fixture.componentRef.setInput('src', 'test.riv');
    fixture.detectChanges();

    onLoadCallback!();
  });

  it('should emit loadError event on load failure', (done) => {
    let onLoadErrorCallback: (() => void) | undefined;

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
      (config: any) => {
        onLoadErrorCallback = config.onLoadError;
        return mockRive;
      },
    );

    component.loadError.subscribe((error) => {
      expect(error).toBeDefined();
      expect(error.name).toBe('RiveLoadError');
      done();
    });

    fixture.componentRef.setInput('src', 'test.riv');
    fixture.detectChanges();

    onLoadErrorCallback!();
  });

  it('should cleanup Rive instance on destroy', () => {
    fixture.componentRef.setInput('src', 'test.riv');
    fixture.detectChanges();

    fixture.destroy();

    expect(mockRive.cleanup).toHaveBeenCalled();
  });

  it('should reload animation when src changes', () => {
    fixture.componentRef.setInput('src', 'test1.riv');
    fixture.detectChanges();

    expect(Rive).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('src', 'test2.riv');
    fixture.detectChanges();

    expect(Rive).toHaveBeenCalledTimes(2);
    expect(mockRive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('should prioritize riveFile over src and buffer', () => {
    const mockRiveFile = {} as RiveFile;

    fixture.componentRef.setInput('src', 'test.riv');
    fixture.componentRef.setInput('buffer', new ArrayBuffer(100));
    fixture.componentRef.setInput('riveFile', mockRiveFile);
    fixture.detectChanges();

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
    beforeEach(() => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();
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
    it('should update isPlaying signal on play', (done) => {
      let onPlayCallback: (() => void) | undefined;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onPlayCallback = config.onPlay;
          return mockRive;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      onPlayCallback!();

      setTimeout(() => {
        expect(component.isPlaying()).toBe(true);
        expect(component.isPaused()).toBe(false);
        done();
      }, 0);
    });

    it('should update isPaused signal on pause', (done) => {
      let onPauseCallback: (() => void) | undefined;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onPauseCallback = config.onPause;
          return mockRive;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      onPauseCallback!();

      setTimeout(() => {
        expect(component.isPaused()).toBe(true);
        expect(component.isPlaying()).toBe(false);
        done();
      }, 0);
    });

    it('should expose riveInstance signal after load', (done) => {
      let onLoadCallback: (() => void) | undefined;

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
        (config: any) => {
          onLoadCallback = config.onLoad;
          return mockRive;
        },
      );

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      // Before load, instance is set but not ready
      setTimeout(() => {
        expect(component.riveInstance()).toBe(mockRive);
        
        // After load, riveReady should emit
        component.riveReady.subscribe((rive) => {
          expect(rive).toBe(mockRive);
          done();
        });

        onLoadCallback!();
      }, 0);
    });
  });

  describe('Animation lifecycle events', () => {
    it('should pass onLoop and onAdvance callbacks to Rive', () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          onLoop: expect.any(Function),
          onAdvance: expect.any(Function),
        }),
      );
    });

    it('should emit animationPlay and keep isPlaying in sync', (done) => {
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
      fixture.detectChanges();

      onPlayCallback?.({ type: EventType.Play });

      setTimeout(() => {
        expect(playSpy).toHaveBeenCalledWith({ type: EventType.Play });
        expect(component.isPlaying()).toBe(true);
        expect(component.isPaused()).toBe(false);
        done();
      }, 0);
    });

    it('should emit animationPause and keep isPaused in sync', (done) => {
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
      fixture.detectChanges();

      onPauseCallback?.({ type: EventType.Pause });

      setTimeout(() => {
        expect(pauseSpy).toHaveBeenCalledWith({ type: EventType.Pause });
        expect(component.isPaused()).toBe(true);
        expect(component.isPlaying()).toBe(false);
        done();
      }, 0);
    });

    it('should emit animationStop and reset playing state', (done) => {
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
      fixture.detectChanges();

      onStopCallback?.({ type: EventType.Stop });

      setTimeout(() => {
        expect(stopSpy).toHaveBeenCalledWith({ type: EventType.Stop });
        expect(component.isPlaying()).toBe(false);
        expect(component.isPaused()).toBe(false);
        done();
      }, 0);
    });

    it('should emit animationLoop with loop event data', (done) => {
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
      fixture.detectChanges();

      const loopPayload = {
        type: EventType.Loop,
        data: { animation: 'idle', type: LoopType.OneShot },
      };
      onLoopCallback?.(loopPayload);

      setTimeout(() => {
        expect(loopSpy).toHaveBeenCalledWith(loopPayload);
        done();
      }, 0);
    });

    it('should emit animationAdvance when Rive advances a frame', (done) => {
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
      fixture.detectChanges();

      const advancePayload = { type: EventType.Advance };
      onAdvanceCallback?.(advancePayload);

      setTimeout(() => {
        expect(advanceSpy).toHaveBeenCalledWith(advancePayload);
        done();
      }, 0);
    });
  });

  describe('Configuration', () => {
    it('should pass artboard to Rive config', () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('artboard', 'MyArtboard');
      fixture.detectChanges();

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          artboard: 'MyArtboard',
        }),
      );
    });

    it('should pass animations to Rive config', () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('animations', ['anim1', 'anim2']);
      fixture.detectChanges();

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          animations: ['anim1', 'anim2'],
        }),
      );
    });

    it('should pass stateMachines to Rive config', () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('stateMachines', 'StateMachine1');
      fixture.detectChanges();

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          stateMachines: 'StateMachine1',
        }),
      );
    });

    it('should pass fit and alignment to Rive config', () => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('fit', Fit.Cover);
      fixture.componentRef.setInput('alignment', Alignment.TopLeft);
      fixture.detectChanges();

      expect(Rive).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: expect.anything(),
        }),
      );
    });
  });

  describe('Phase 2: Debug Mode', () => {
    it('should use debug level when debugMode is true', () => {
      fixture.componentRef.setInput('debugMode', true);
      fixture.detectChanges();

      // Logger should be initialized with debug level
      // We can verify this by checking console output in integration tests
      expect(component.debugMode()).toBe(true);
    });

    it('should use global config when debugMode is undefined', () => {
      // Without debugMode input, should fall back to global config (or error level)
      expect(component.debugMode()).toBeUndefined();
    });

    it('should update logger level when debugMode changes', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('debugMode', false);
      fixture.detectChanges();

      setTimeout(() => {
        fixture.componentRef.setInput('debugMode', true);
        fixture.detectChanges();

        expect(component.debugMode()).toBe(true);
        done();
      }, 0);
    });
  });

  describe('Phase 2: Validation', () => {
    it('should emit RiveValidationError for invalid artboard name', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        expect(errors.length).toBeGreaterThan(0);
        const validationError = errors.find(
          (e) => e.name === 'RiveValidationError',
        );
        expect(validationError).toBeDefined();
        done();
      }, 0);
    });

    it('should emit RiveValidationError for invalid animation name', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        expect(errors.length).toBeGreaterThan(0);
        const validationError = errors.find(
          (e) => e.name === 'RiveValidationError',
        );
        expect(validationError).toBeDefined();
        done();
      }, 0);
    });

    it('should emit RiveValidationError for invalid state machine name', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        expect(errors.length).toBeGreaterThan(0);
        const validationError = errors.find(
          (e) => e.name === 'RiveValidationError',
        );
        expect(validationError).toBeDefined();
        done();
      }, 0);
    });

    it('should emit RiveValidationError with RIVE_204 for invalid input', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        component.setInput('StateMachine', 'invalidInput', 42);

        setTimeout(() => {
          const validationError = errors.find(
            (e) => e.name === 'RiveValidationError',
          );
          expect(validationError).toBeDefined();
          done();
        }, 0);
      }, 0);
    });

    it('should emit RiveValidationError with RIVE_204 for invalid trigger', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        component.fireTrigger('StateMachine', 'invalidTrigger');

        setTimeout(() => {
          const validationError = errors.find(
            (e) => e.name === 'RiveValidationError',
          );
          expect(validationError).toBeDefined();
          done();
        }, 0);
      }, 0);
    });

    it('should not crash when runtime metadata is unavailable', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        // Should complete without throwing
        expect(component.isLoaded()).toBe(true);
        done();
      }, 0);
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
      it('should apply text runs after load', (done) => {
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
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'title',
            'Hello',
          );
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'subtitle',
            'World',
          );
          done();
        }, 0);
      });

      it('should reactively update when textRuns values change', (done) => {
        let onLoadCallback: (() => void) | undefined;

        (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
          (config: any) => {
            onLoadCallback = config.onLoad;
            return mockRive;
          },
        );

        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'title',
            'Hello',
          );

          // Clear mock and update input
          jest.clearAllMocks();
          fixture.componentRef.setInput('textRuns', { title: 'Updated' });
          fixture.detectChanges();

          setTimeout(() => {
            expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
              'title',
              'Updated',
            );
            done();
          }, 0);
        }, 0);
      });

      it('should emit error for non-existent text run', (done) => {
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
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          const validationError = errors.find(
            (e) => e.name === 'RiveValidationError',
          );
          expect(validationError).toBeDefined();
          done();
        }, 0);
      });

      it('should make key uncontrolled when removed from input', (done) => {
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
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'title',
            'Hello',
          );
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'subtitle',
            'World',
          );

          // Remove subtitle from input
          jest.clearAllMocks();
          fixture.componentRef.setInput('textRuns', { title: 'Hello' });
          fixture.detectChanges();

          setTimeout(() => {
            // Only title should be set now
            expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
              'title',
              'Hello',
            );
            expect(mockRive.setTextRunValue).not.toHaveBeenCalledWith(
              'subtitle',
              expect.anything(),
            );
            done();
          }, 0);
        }, 0);
      });
    });

    describe('Imperative methods', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.detectChanges();
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

      it('scenario 1: controlled key + imperative call -> input wins', (done) => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'title',
            'Hello',
          );

          // Imperative call on controlled key
          jest.clearAllMocks();
          component.setTextRunValue('title', 'World');

          setTimeout(() => {
            expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
              'title',
              'World',
            );

            // Input updates with same value - should reapply
            jest.clearAllMocks();
            fixture.componentRef.setInput('textRuns', { title: 'Hello' });
            fixture.detectChanges();

            setTimeout(() => {
              expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
                'title',
                'Hello',
              );
              done();
            }, 0);
          }, 0);
        }, 0);
      });

      it('scenario 2: controlled key changes value', (done) => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'title',
            'Hello',
          );

          // Input changes
          jest.clearAllMocks();
          fixture.componentRef.setInput('textRuns', { title: 'Updated' });
          fixture.detectChanges();

          setTimeout(() => {
            expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
              'title',
              'Updated',
            );
            done();
          }, 0);
        }, 0);
      });

      it('scenario 3: uncontrolled key + imperative call -> both preserved', (done) => {
        fixture.componentRef.setInput('src', 'test.riv');
        fixture.componentRef.setInput('textRuns', { title: 'Hello' });
        fixture.detectChanges();

        onLoadCallback!();

        setTimeout(() => {
          expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
            'title',
            'Hello',
          );

          // Imperative call on uncontrolled key
          jest.clearAllMocks();
          component.setTextRunValue('subtitle', 'World');

          setTimeout(() => {
            expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
              'subtitle',
              'World',
            );

            // Input updates - should only set controlled key
            jest.clearAllMocks();
            fixture.componentRef.setInput('textRuns', { title: 'Hello' });
            fixture.detectChanges();

            setTimeout(() => {
              expect(mockRive.setTextRunValue).toHaveBeenCalledWith(
                'title',
                'Hello',
              );
              expect(mockRive.setTextRunValue).not.toHaveBeenCalledWith(
                'subtitle',
                expect.anything(),
              );
              done();
            }, 0);
          }, 0);
        }, 0);
      });
    });

    describe('Warning logging', () => {
      it('should log warning when setting controlled key imperatively', (done) => {
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
        fixture.detectChanges();

        onLoadCallback!();

        // Wait for the component to be fully loaded
        setTimeout(() => {
          // Call setTextRunValue - this should log a warning immediately
          component.setTextRunValue('title', 'World');

          // Verify the warning was logged
          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('controlled by textRuns input'),
          );
          warnSpy.mockRestore();
          done();
        }, 0);
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

    it('should apply dataBindings on load with auto-detected types', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('dataBindings', {
        backgroundColor: '#FF5733',
        score: 42,
        playerName: 'Alice',
        isActive: true,
        gameState: 'running',
      });
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
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
        done();
      }, 0);
    });

    it('should emit dataBindingChange on callback from ViewModel property updates', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      const emitted: Array<{
        path: string;
        propertyType: string;
        value: unknown;
      }> = [];
      component.dataBindingChange.subscribe((event) => emitted.push(event));

      onLoadCallback!();

      setTimeout(() => {
        mockViewModelInstance.numberValue.value = 13;
        mockViewModelInstance.numberValue.emitChange();

        setTimeout(() => {
          expect(emitted).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: 'score',
                propertyType: 'number',
                value: 13,
              }),
            ]),
          );
          done();
        }, 0);
      }, 0);
    });

    it('should support get/set helpers and fireTrigger', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('dataBindings', { isActive: true });
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        expect(component.getDataBinding('score')).toBe(0);

        component.setDataBinding('score', 5);
        expect(mockViewModelInstance.numberValue.value).toBe(5);
        expect(component.getDataBinding('score')).toBe(5);
        component.setDataBinding('playerName', 'Bob');
        expect(mockViewModelInstance.stringValue.value).toBe('Bob');
        expect(component.getDataBinding('playerName')).toBe('Bob');
        component.fireViewModelTrigger('onComplete');
        expect(mockViewModelInstance.triggerValue.trigger).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should mark controlled keys warning and keep uncontrolled path mutable', (done) => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('dataBindings', { score: 1 });
      fixture.componentRef.setInput('debugMode', true);
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        component.setDataBinding('score', 2);
        component.setDataBinding('gameState', 'paused');
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('controlled by dataBindings input'),
        );
        expect(mockViewModelInstance.numberValue.value).toBe(2);
        expect(mockViewModelInstance.enumValue.value).toBe('paused');
        warnSpy.mockRestore();
        done();
      }, 0);
    });

    it('should emit type mismatch validation error', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));
      onLoadCallback!();

      setTimeout(() => {
        component.setDataBinding('score', 'invalid');
        setTimeout(() => {
          expect(errors.some((error) => error.name === 'RiveValidationError')).toBe(
            true,
          );
          done();
        }, 0);
      }, 0);
    });

    it('should cleanup property subscriptions on destroy', (done) => {
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
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        fixture.destroy();
        expect(onDisposalSpy).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should emit dataBindingChange when trigger fires', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      const emitted: Array<{
        path: string;
        propertyType: string;
        value: unknown;
      }> = [];
      component.dataBindingChange.subscribe((event) => emitted.push(event));

      onLoadCallback!();

      setTimeout(() => {
        mockViewModelInstance.triggerValue.emitChange();

        setTimeout(() => {
          expect(emitted).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: 'onComplete',
                propertyType: 'trigger',
                value: true,
              }),
            ]),
          );
          done();
        }, 0);
      }, 0);
    });

    it('should reinitialize ViewModel when viewModelName changes', (done) => {
      const alternateVM = createMockViewModel();
      alternateVM.name = 'AlternateViewModel';
      mockRive.viewModelByName = jest.fn((name: string) => {
        if (name === 'MainViewModel') return mockViewModel as any;
        if (name === 'AlternateViewModel') return alternateVM as any;
        return null;
      }) as any;

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.componentRef.setInput('viewModelName', 'MainViewModel');
      fixture.detectChanges();

      onLoadCallback!();

      setTimeout(() => {
        expect(mockRive.viewModelByName).toHaveBeenCalledWith('MainViewModel');

        fixture.componentRef.setInput('viewModelName', 'AlternateViewModel');
        fixture.detectChanges();

        setTimeout(() => {
          expect(mockRive.viewModelByName).toHaveBeenCalledWith('AlternateViewModel');
          done();
        }, 0);
      }, 0);
    });

    it('should emit validation error for invalid opacity value', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));

      onLoadCallback!();

      setTimeout(() => {
        component.setColorOpacity('backgroundColor', 1.5);

        setTimeout(() => {
          expect(errors.some((error) => 
            error.name === 'RiveValidationError' && 
            error.message.includes('opacity')
          )).toBe(true);
          done();
        }, 0);
      }, 0);
    });

    it('should emit validation error for non-existent property in imperative API', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));

      onLoadCallback!();

      setTimeout(() => {
        component.setDataBinding('nonExistentProperty', 42);

        setTimeout(() => {
          expect(errors.some((error) => 
            error.name === 'RiveValidationError' &&
            error.message.includes('not found')
          )).toBe(true);
          done();
        }, 0);
      }, 0);
    });

    it('should emit validation error for invalid color format', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      const errors: Error[] = [];
      component.loadError.subscribe((error) => errors.push(error));

      onLoadCallback!();

      setTimeout(() => {
        component.setColor('backgroundColor', 'invalid-color');

        setTimeout(() => {
          expect(errors.some((error) => 
            error.name === 'RiveValidationError'
          )).toBe(true);
          done();
        }, 0);
      }, 0);
    });
  });
});
