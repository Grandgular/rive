import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
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
    } as unknown as jest.Mocked<Rive>;

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation(
      () => mockRive,
    );

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

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation((config: any) => {
      onLoadCallback = config.onLoad;
      return mockRive;
    });

    component.loaded.subscribe(() => {
      expect(component.isLoaded()).toBe(true);
      done();
    });

    fixture.componentRef.setInput('src', 'test.riv');
    fixture.detectChanges();

    onLoadCallback!();
  });

  it('should emit loadError event on load failure', (done) => {
    let onLoadErrorCallback: (() => void) | undefined;

    (Rive as jest.MockedClass<typeof Rive>).mockImplementation((config: any) => {
      onLoadErrorCallback = config.onLoadError;
      return mockRive;
    });

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

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation((config: any) => {
        onPlayCallback = config.onPlay;
        return mockRive;
      });

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

      (Rive as jest.MockedClass<typeof Rive>).mockImplementation((config: any) => {
        onPauseCallback = config.onPause;
        return mockRive;
      });

      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      onPauseCallback!();

      setTimeout(() => {
        expect(component.isPaused()).toBe(true);
        expect(component.isPlaying()).toBe(false);
        done();
      }, 0);
    });

    it('should expose riveInstance signal', (done) => {
      fixture.componentRef.setInput('src', 'test.riv');
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.riveInstance()).toBe(mockRive);
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
});
