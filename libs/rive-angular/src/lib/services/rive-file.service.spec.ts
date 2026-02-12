import { TestBed } from '@angular/core/testing';
import { RiveFileService } from './rive-file.service';
import { RiveFile, EventType } from '@rive-app/canvas';

// Mock RiveFile
jest.mock('@rive-app/canvas', () => ({
  RiveFile: jest.fn(),
  EventType: {
    Load: 'load',
    LoadError: 'loaderror',
  },
}));

describe('RiveFileService', () => {
  let service: RiveFileService;
  let mockRiveFile: jest.Mocked<RiveFile>;
  let eventHandlers: Map<string, () => void>;

  beforeEach(() => {
    eventHandlers = new Map();

    // Create mock RiveFile instance
    mockRiveFile = {
      init: jest.fn(),
      on: jest.fn((event: string, handler: () => void) => {
        eventHandlers.set(event, handler);
      }),
      getInstance: jest.fn(),
      cleanup: jest.fn(),
    } as unknown as jest.Mocked<RiveFile>;

    (RiveFile as jest.MockedClass<typeof RiveFile>).mockImplementation(
      () => mockRiveFile,
    );

    TestBed.configureTestingModule({
      providers: [RiveFileService],
    });

    service = TestBed.inject(RiveFileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventHandlers.clear();
  });

  describe('loadFile', () => {
    it('should load file from src and cache it', (done) => {
      const params = { src: 'test.riv' };
      const state = service.loadFile(params);

      expect(state().status).toBe('loading');
      expect(RiveFile).toHaveBeenCalledWith(params);
      expect(mockRiveFile.init).toHaveBeenCalled();

      // Simulate successful load
      const loadHandler = eventHandlers.get(EventType.Load);
      expect(loadHandler).toBeDefined();
      loadHandler!();

      setTimeout(() => {
        expect(state().status).toBe('success');
        expect(state().riveFile).toBe(mockRiveFile);
        expect(mockRiveFile.getInstance).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should return cached file on subsequent calls', () => {
      const params = { src: 'test.riv' };

      // First load
      const state1 = service.loadFile(params);
      const loadHandler = eventHandlers.get(EventType.Load);
      loadHandler!();

      // Second load - should return cached
      const state2 = service.loadFile(params);

      expect(RiveFile).toHaveBeenCalledTimes(1);
      expect(state1).toBe(state2);
    });

    it('should deduplicate concurrent loads of same file', () => {
      const params = { src: 'test.riv' };

      // Start two concurrent loads
      const state1 = service.loadFile(params);
      const state2 = service.loadFile(params);

      expect(RiveFile).toHaveBeenCalledTimes(1);
      expect(state1).toBe(state2);
    });

    it('should handle load errors', (done) => {
      const params = { src: 'test.riv' };
      const state = service.loadFile(params);

      // Simulate load error
      const errorHandler = eventHandlers.get(EventType.LoadError);
      expect(errorHandler).toBeDefined();
      
      // Catch the rejected promise to avoid unhandled rejection
      const pendingLoad = (service as any).pendingLoads.get('src:test.riv');
      if (pendingLoad) {
        pendingLoad.promise.catch(() => {
          // Expected error, ignore
        });
      }
      
      errorHandler!();

      setTimeout(() => {
        expect(state().status).toBe('failed');
        expect(state().riveFile).toBeNull();
        done();
      }, 0);
    });

    it('should generate unique cache keys for different buffers', () => {
      const buffer1 = new ArrayBuffer(100);
      const buffer2 = new ArrayBuffer(100);

      const state1 = service.loadFile({ buffer: buffer1 });
      const state2 = service.loadFile({ buffer: buffer2 });

      // Should create two separate RiveFile instances
      expect(RiveFile).toHaveBeenCalledTimes(2);
      expect(state1).not.toBe(state2);
    });

    it('should reuse same buffer if passed again', () => {
      const buffer = new ArrayBuffer(100);

      const state1 = service.loadFile({ buffer });
      const loadHandler = eventHandlers.get(EventType.Load);
      loadHandler!();

      const state2 = service.loadFile({ buffer });

      expect(RiveFile).toHaveBeenCalledTimes(1);
      expect(state1).toBe(state2);
    });
  });

  describe('releaseFile', () => {
    it('should decrement ref count and cleanup when count reaches 0', () => {
      const params = { src: 'test.riv' };

      // Load and complete
      service.loadFile(params);
      const loadHandler = eventHandlers.get(EventType.Load);
      loadHandler!();

      // Release
      service.releaseFile(params);

      expect(mockRiveFile.cleanup).toHaveBeenCalled();

      // Next load should create new instance
      service.loadFile(params);
      expect(RiveFile).toHaveBeenCalledTimes(2);
    });

    it('should not cleanup if ref count > 0', () => {
      const params = { src: 'test.riv' };

      // Load twice
      service.loadFile(params);
      const loadHandler = eventHandlers.get(EventType.Load);
      loadHandler!();

      service.loadFile(params);

      // Release once
      service.releaseFile(params);

      expect(mockRiveFile.cleanup).not.toHaveBeenCalled();

      // Release again
      service.releaseFile(params);

      expect(mockRiveFile.cleanup).toHaveBeenCalled();
    });

    it('should handle release of non-existent file gracefully', () => {
      expect(() => {
        service.releaseFile({ src: 'non-existent.riv' });
      }).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should cleanup all cached files', () => {
      // Load first file
      service.loadFile({ src: 'test1.riv' });
      const loadHandler1 = eventHandlers.get(EventType.Load);
      loadHandler1!();

      // Clear event handlers for second file
      eventHandlers.clear();

      // Load second file
      service.loadFile({ src: 'test2.riv' });
      const loadHandler2 = eventHandlers.get(EventType.Load);
      loadHandler2!();

      // Clear cache
      service.clearCache();

      expect(mockRiveFile.cleanup).toHaveBeenCalledTimes(2);

      // Next loads should create new instances
      service.loadFile({ src: 'test1.riv' });
      expect(RiveFile).toHaveBeenCalledTimes(3);
    });
  });
});
