import { Injectable, signal, Signal, inject } from '@angular/core';
import { RiveFile, EventType } from '@rive-app/canvas';
import { RIVE_DEBUG_CONFIG } from '../utils';
import { RiveLogger } from '../utils';

/**
 * Status of RiveFile loading
 */
export type FileStatus = 'idle' | 'loading' | 'success' | 'failed';

/**
 * State of a loaded RiveFile
 */
export interface RiveFileState {
  riveFile: RiveFile | null;
  status: FileStatus;
}

/**
 * Parameters for loading a RiveFile
 */
export interface RiveFileParams {
  src?: string;
  buffer?: ArrayBuffer;
  debug?: boolean;
}

/**
 * Cache entry for a loaded RiveFile
 */
interface CacheEntry {
  file: RiveFile;
  state: Signal<RiveFileState>;
  refCount: number;
}

/**
 * Pending load entry to prevent duplicate loads
 */
interface PendingLoad {
  stateSignal: ReturnType<typeof signal<RiveFileState>>;
  promise: Promise<void>;
}

/**
 * Service for preloading and caching Rive files.
 *
 * This service allows you to:
 * - Preload .riv files before they're needed
 * - Share the same file across multiple components
 * - Cache files to avoid redundant network requests
 * - Deduplicate concurrent loads of the same file
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   private riveFileService = inject(RiveFileService);
 *   private destroyRef = inject(DestroyRef);
 *
 *   fileState = this.riveFileService.loadFile({
 *     src: 'assets/animation.riv'
 *   });
 *
 *   constructor() {
 *     // Auto-release on component destroy
 *     this.destroyRef.onDestroy(() => {
 *       this.riveFileService.releaseFile({ src: 'assets/animation.riv' });
 *     });
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class RiveFileService {
  private cache = new Map<string, CacheEntry>();
  private pendingLoads = new Map<string, PendingLoad>();
  private bufferIdMap = new WeakMap<ArrayBuffer, number>();
  private bufferIdCounter = 0;

  // Optional debug configuration
  private readonly globalDebugConfig = inject(RIVE_DEBUG_CONFIG, {
    optional: true,
  });

  /**
   * Load a RiveFile from URL or ArrayBuffer.
   * Returns a signal with the file state and loading status.
   * Files are cached by src URL to avoid redundant loads.
   * Concurrent loads of the same file are deduplicated.
   *
   * @param params - Parameters containing src URL or buffer
   * @returns Signal with RiveFileState
   */
  public loadFile(params: RiveFileParams): Signal<RiveFileState> {
    const cacheKey = this.getCacheKey(params);

    // Initialize logger for this request
    const logger = new RiveLogger(this.globalDebugConfig, params.debug);
    logger.debug(`RiveFileService: Request to load file`, { cacheKey });

    // Return cached entry if exists
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.refCount++;
      logger.debug(`RiveFileService: Cache hit for ${cacheKey}`);
      return cached.state;
    }

    // Return pending load if already in progress
    const pending = this.pendingLoads.get(cacheKey);
    if (pending) {
      logger.debug(`RiveFileService: Reuse pending load for ${cacheKey}`);
      return pending.stateSignal.asReadonly();
    }

    // Create new loading state
    const stateSignal = signal<RiveFileState>({
      riveFile: null,
      status: 'loading',
    });

    // Start loading and track as pending
    const promise = this.loadRiveFile(params, stateSignal, cacheKey, logger);
    this.pendingLoads.set(cacheKey, { stateSignal, promise });

    return stateSignal.asReadonly();
  }

  /**
   * Release a cached file. Decrements reference count and cleans up if no longer used.
   *
   * @param params - Parameters used to load the file
   */
  public releaseFile(params: RiveFileParams): void {
    const cacheKey = this.getCacheKey(params);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      cached.refCount--;
      if (cached.refCount <= 0) {
        try {
          cached.file.cleanup();
        } catch (error) {
          console.warn('Error cleaning up RiveFile:', error);
        }
        this.cache.delete(cacheKey);
      }
    }
  }

  /**
   * Clear all cached files and abort pending loads
   */
  public clearCache(): void {
    // Clear pending loads first to prevent them from populating the cache
    this.pendingLoads.forEach((pending) => {
      pending.stateSignal.set({
        riveFile: null,
        status: 'failed',
      });
    });
    this.pendingLoads.clear();

    // Clean up cached files
    this.cache.forEach((entry) => {
      try {
        entry.file.cleanup();
      } catch (error) {
        console.warn('Error cleaning up RiveFile:', error);
      }
    });
    this.cache.clear();
  }

  /**
   * Get cache key from params
   */
  private getCacheKey(params: RiveFileParams): string {
    if (params.src) {
      return `src:${params.src}`;
    }
    if (params.buffer) {
      // For buffers, use WeakMap to track unique IDs without mutating the buffer
      let bufferId = this.bufferIdMap.get(params.buffer);
      if (bufferId === undefined) {
        bufferId = ++this.bufferIdCounter;
        this.bufferIdMap.set(params.buffer, bufferId);
      }
      return `buffer:${bufferId}`;
    }
    return 'unknown';
  }

  /**
   * Load RiveFile and update state signal.
   * Addresses race condition by setting up listeners BEFORE init.
   */
  private async loadRiveFile(
    params: RiveFileParams,
    stateSignal: ReturnType<typeof signal<RiveFileState>>,
    cacheKey: string,
    logger: RiveLogger,
  ): Promise<void> {
    // Guard to ensure pending load is cleaned up exactly once
    let pendingCleanupDone = false;
    const finalizePendingLoadOnce = () => {
      if (!pendingCleanupDone) {
        this.pendingLoads.delete(cacheKey);
        pendingCleanupDone = true;
      }
    };

    try {
      // Extract debug parameter - it's not part of RiveFile SDK API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug, ...sdkParams } = params;
      const file = new RiveFile(sdkParams);

      // Listeners must be attached BEFORE calling init() to avoid race conditions
      // where init() completes or fails synchronously/immediately.
      file.on(EventType.Load, () => {
        logger.debug(`RiveFileService: File loaded successfully`, { cacheKey });

        // Request an instance to increment reference count
        // This prevents the file from being destroyed while in use
        file.getInstance();

        stateSignal.set({
          riveFile: file,
          status: 'success',
        });

        // Cache the successfully loaded file
        this.cache.set(cacheKey, {
          file,
          state: stateSignal.asReadonly(),
          refCount: 1,
        });

        finalizePendingLoadOnce();
      });

      file.on(EventType.LoadError, () => {
        logger.warn(`RiveFileService: Failed to load file`, { cacheKey });

        stateSignal.set({
          riveFile: null,
          status: 'failed',
        });

        finalizePendingLoadOnce();
      });

      logger.debug(`RiveFileService: Initializing file`, { cacheKey });

      // Await init() to catch initialization errors (e.g. WASM issues)
      await file.init();
    } catch (error) {
      logger.error('RiveFileService: Unexpected error loading file', error);

      stateSignal.set({
        riveFile: null,
        status: 'failed',
      });

      finalizePendingLoadOnce();
    }
  }
}
