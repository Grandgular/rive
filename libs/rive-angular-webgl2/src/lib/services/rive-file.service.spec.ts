import { TestBed } from '@angular/core/testing';
import { RiveFileService } from './rive-file.service';
import { RiveFile, EventType, RuntimeLoader } from '../rive-sdk';

// Mock RiveFile
jest.mock('@rive-app/webgl2', () => ({
  RiveFile: jest.fn(),
  EventType: {
    Load: 'load',
    LoadError: 'loaderror',
  },
  RuntimeLoader: {
    awaitInstance: jest.fn(),
    setWasmUrl: jest.fn(),
  },
}));

describe('RiveFileService', () => {
  let service: RiveFileService;
  let mockRiveFile: jest.Mocked<RiveFile>;
  let eventHandlers: Map<string, () => void>;
  let methodCallOrder: string[];

  beforeEach(() => {
    eventHandlers = new Map();
    methodCallOrder = [];

    // Create mock RiveFile instance
    mockRiveFile = {
      init: jest.fn().mockImplementation(() => {
        methodCallOrder.push('init');
        return Promise.resolve();
      }),
      on: jest.fn((event: string, handler: () => void) => {
        methodCallOrder.push(`on:${event}`);
        eventHandlers.set(event, handler);
      }),
      getInstance: jest.fn(),
      cleanup: jest.fn(),
    } as unknown as jest.Mocked<RiveFile>;

    (RiveFile as jest.MockedClass<typeof RiveFile>).mockImplementation(
      () => mockRiveFile,
    );
    (RuntimeLoader.awaitInstance as jest.Mock).mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [RiveFileService],
    });

    service = TestBed.inject(RiveFileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventHandlers.clear();
    methodCallOrder = [];
  });

  describe('loadFile', () => {
    it('should subscribe to events BEFORE calling init (fix race condition)', async () => {
      const params = { src: 'test.riv' };
      service.loadFile(params);

      // Wait for async loadRiveFile to execute
      await Promise.resolve();

      // Check order: on(Load) -> on(LoadError) -> init
      const loadIndex = methodCallOrder.indexOf(`on:${EventType.Load}`);
      const errorIndex = methodCallOrder.indexOf(`on:${EventType.LoadError}`);
      const initIndex = methodCallOrder.indexOf('init');

      expect(loadIndex).toBeGreaterThan(-1);
      expect(errorIndex).toBeGreaterThan(-1);
      expect(initIndex).toBeGreaterThan(-1);
      
      expect(loadIndex).toBeLessThan(initIndex);
      expect(errorIndex).toBeLessThan(initIndex);
    });

    it('should load file from src and cache it', (done) => {
      const params = { src: 'test.riv' };
      const state = service.loadFile(params);

      expect(state().status).toBe('loading');
      
      // Wait for init to be called
      setTimeout(() => {
        // Simulate successful load
        const loadHandler = eventHandlers.get(EventType.Load);
        expect(loadHandler).toBeDefined();
        loadHandler!();

        expect(state().status).toBe('success');
        expect(state().riveFile).toBe(mockRiveFile);
        expect(mockRiveFile.getInstance).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should handle load errors', (done) => {
      const params = { src: 'test.riv' };
      const state = service.loadFile(params);

      setTimeout(() => {
        // Simulate load error
        const errorHandler = eventHandlers.get(EventType.LoadError);
        expect(errorHandler).toBeDefined();
        errorHandler!();

        expect(state().status).toBe('failed');
        expect(state().riveFile).toBeNull();
        done();
      }, 0);
    });

    it('should handle init() failure (catch block)', (done) => {
      // Mock init to reject
      mockRiveFile.init.mockRejectedValue(new Error('Init failed'));

      const params = { src: 'fail.riv' };
      const state = service.loadFile(params);

      setTimeout(() => {
        expect(state().status).toBe('failed');
        // Should clear pending load so retry is possible
        const state2 = service.loadFile(params);
        expect(state2().status).toBe('loading'); // New loading state, not cached failed state
        done();
      }, 0);
    });

    it('should accept debug parameter but not pass it to RiveFile', async () => {
      const params = { src: 'debug.riv', debug: true };
      service.loadFile(params);
      await Promise.resolve();
      await Promise.resolve();
      // debug should be excluded from SDK params
      expect(RiveFile).toHaveBeenCalledWith({ src: 'debug.riv' });
    });
  });

  describe('releaseFile', () => {
    it('should decrement ref count and cleanup when count reaches 0', (done) => {
      const params = { src: 'test.riv' };

      // Load and complete
      service.loadFile(params);
      
      setTimeout(() => {
        const loadHandler = eventHandlers.get(EventType.Load);
        loadHandler!();

        // Release
        service.releaseFile(params);

        expect(mockRiveFile.cleanup).toHaveBeenCalled();
        done();
      }, 0);
    });
  });

  describe('Phase 2: Race Condition Fix', () => {
    it('should call finalizePendingLoadOnce exactly once on success', (done) => {
      const params = { src: 'test.riv' };
      service.loadFile(params);

      setTimeout(() => {
        // Simulate successful load
        const loadHandler = eventHandlers.get(EventType.Load);
        loadHandler!();

        // Try to call load handler again (should be no-op due to guard)
        loadHandler!();

        // Verify pending load was cleared (only one cleanup)
        const state2 = service.loadFile(params);
        
        // Should return cached state, not create new pending load
        expect(state2().status).toBe('success');
        done();
      }, 0);
    });

    it('should call finalizePendingLoadOnce exactly once on error', (done) => {
      const params = { src: 'error.riv' };
      service.loadFile(params);

      setTimeout(() => {
        // Simulate load error
        const errorHandler = eventHandlers.get(EventType.LoadError);
        errorHandler!();

        // Try to call error handler again (should be no-op due to guard)
        errorHandler!();

        // Verify pending load was cleared
        const state2 = service.loadFile(params);
        
        // Should create new loading state since previous failed
        expect(state2().status).toBe('loading');
        done();
      }, 0);
    });

    it('should call finalizePendingLoadOnce exactly once on init() exception', (done) => {
      // Mock init to throw
      mockRiveFile.init.mockRejectedValue(new Error('Init failed'));

      const params = { src: 'fail.riv' };
      service.loadFile(params);

      setTimeout(() => {
        // Verify pending load was cleared after exception
        const state2 = service.loadFile(params);
        
        // Should create new loading state (retry possible)
        expect(state2().status).toBe('loading');
        done();
      }, 0);
    });
  });

  describe('Phase 2: Debug Parameter', () => {
    it('should not break cache when debug parameter differs', (done) => {
      const params1 = { src: 'test.riv', debug: false };
      const params2 = { src: 'test.riv', debug: true };

      // Load with debug: false
      const state1 = service.loadFile(params1);

      setTimeout(() => {
        const loadHandler = eventHandlers.get(EventType.Load);
        loadHandler!();

        expect(state1().status).toBe('success');

        // Load same file with debug: true (should use cache)
        const state2 = service.loadFile(params2);

        // Should return same cached state
        expect(state2().status).toBe('success');
        expect(state2().riveFile).toBe(state1().riveFile);
        done();
      }, 0);
    });

    it('should maintain correct refCount with debug parameter', (done) => {
      const params1 = { src: 'test.riv', debug: false };
      const params2 = { src: 'test.riv', debug: true };

      service.loadFile(params1);

      setTimeout(() => {
        const loadHandler = eventHandlers.get(EventType.Load);
        loadHandler!();

        // Load again with different debug
        service.loadFile(params2);

        // Release first
        service.releaseFile(params1);

        // File should NOT be cleaned up (refCount = 1)
        expect(mockRiveFile.cleanup).not.toHaveBeenCalled();

        // Release second
        service.releaseFile(params2);

        // Now file should be cleaned up (refCount = 0)
        expect(mockRiveFile.cleanup).toHaveBeenCalled();
        done();
      }, 0);
    });
  });
});
