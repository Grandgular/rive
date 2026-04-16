import { RuntimeLoader } from '@rive-app/canvas';
import type { RiveRuntimeResolvedConfig } from './runtime-config';

let runtimeInitPromise: Promise<void> | null = null;
let isRuntimeReady = false;
let configuredWasmUrl: string | undefined;

function applyWasmUrl(config?: RiveRuntimeResolvedConfig | null): void {
  const wasmUrl = config?.wasmUrl;
  if (!wasmUrl || configuredWasmUrl === wasmUrl) return;

  RuntimeLoader.setWasmUrl(wasmUrl);
  configuredWasmUrl = wasmUrl;
}

/**
 * Ensure Rive WASM runtime is initialized once across the app.
 * Safe to call from multiple concurrent code paths.
 */
export function ensureRiveRuntimeReady(
  config?: RiveRuntimeResolvedConfig | null,
): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  applyWasmUrl(config);

  if (isRuntimeReady) {
    return Promise.resolve();
  }

  if (runtimeInitPromise) {
    return runtimeInitPromise;
  }

  runtimeInitPromise = RuntimeLoader.awaitInstance()
    .then(() => {
      isRuntimeReady = true;
    })
    .catch((error) => {
      runtimeInitPromise = null;
      throw error;
    });

  return runtimeInitPromise;
}
