import { Injectable, signal, Signal } from '@angular/core';
import { RiveFile, EventType } from '@rive-app/canvas';

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
  private bufferIdCounter = 0;

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

    // Return cached entry if exists
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.refCount++;
      return cached.state;
    }

    // Return pending load if already in progress
    const pending = this.pendingLoads.get(cacheKey);
    if (pending) {
      return pending.stateSignal.asReadonly();
    }

    // Create new loading state
    const stateSignal = signal<RiveFileState>({
      riveFile: null,
      status: 'loading',
    });

    // Start loading and track as pending
    const promise = this.loadRiveFile(params, stateSignal, cacheKey);
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
   * Clear all cached files
   */
  public clearCache(): void {
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
      // For buffers, generate unique ID to avoid collisions
      // Store the ID on the buffer object itself
      const bufferWithId = params.buffer as ArrayBuffer & { __riveBufferId?: number };
      if (!bufferWithId.__riveBufferId) {
        bufferWithId.__riveBufferId = ++this.bufferIdCounter;
      }
      return `buffer:${bufferWithId.__riveBufferId}`;
    }
    return 'unknown';
  }

  /**
   * Load RiveFile and update state signal
   */
  private loadRiveFile(
    params: RiveFileParams,
    stateSignal: ReturnType<typeof signal<RiveFileState>>,
    cacheKey: string,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        const file = new RiveFile(params);
        file.init();

        file.on(EventType.Load, () => {
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

          // Remove from pending loads
          this.pendingLoads.delete(cacheKey);
          resolve();
        });

        file.on(EventType.LoadError, () => {
          stateSignal.set({
            riveFile: null,
            status: 'failed',
          });

          // Remove from pending loads
          this.pendingLoads.delete(cacheKey);

          // Resolve (not reject) — error state is communicated via the signal.
          // Rejecting would cause an unhandled promise rejection since no
          // consumer awaits or catches this promise.
          resolve();
        });
      } catch (error) {
        console.error('Failed to load RiveFile:', error);
        stateSignal.set({
          riveFile: null,
          status: 'failed',
        });

        // Remove from pending loads
        this.pendingLoads.delete(cacheKey);

        // Resolve (not reject) — error state is communicated via the signal.
        resolve();
      }
    });
  }
}
