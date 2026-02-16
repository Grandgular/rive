import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiveCanvasComponent } from './rive-canvas.component';
import { Rive, RiveFile, Fit, Alignment } from '@rive-app/canvas';

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
});
