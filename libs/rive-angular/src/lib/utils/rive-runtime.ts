import type { RiveRuntimeResolvedConfig } from './runtime-config';
import { composeFallbackRiveRuntimeError } from './rive-runtime-errors';
import {
  DEFAULT_RIVE_RENDERER,
  getFallbackRenderer,
  loadRiveSdk,
  type RiveRenderer,
  type RiveSdkLoadResult,
} from './rive-sdk';

interface RuntimeState {
  runtimeInitPromise: Promise<void> | null;
  isRuntimeReady: boolean;
  configuredWasmUrl?: string;
}

const runtimeStates = new Map<RiveRenderer, RuntimeState>();

/** Clears WASM init state (for unit tests; each test needs a fresh RuntimeLoader path). */
export function resetRiveRuntimeLifecycleForTests(): void {
  runtimeStates.clear();
}

function getRuntimeState(renderer: RiveRenderer): RuntimeState {
  const existing = runtimeStates.get(renderer);
  if (existing) {
    return existing;
  }

  const state: RuntimeState = {
    runtimeInitPromise: null,
    isRuntimeReady: false,
  };
  runtimeStates.set(renderer, state);
  return state;
}

function applyWasmUrl(
  sdk: RiveSdkLoadResult['sdk'],
  state: RuntimeState,
  config?: RiveRuntimeResolvedConfig | null,
): void {
  const wasmUrl = config?.wasmUrl;
  if (!wasmUrl || state.configuredWasmUrl === wasmUrl) return;

  sdk.RuntimeLoader.setWasmUrl(wasmUrl);
  state.configuredWasmUrl = wasmUrl;
}

async function ensureRuntimeForRenderer(
  renderer: RiveRenderer,
  config?: RiveRuntimeResolvedConfig | null,
): Promise<RiveSdkLoadResult> {
  const runtime = await loadRiveSdk(renderer);
  const state = getRuntimeState(renderer);

  applyWasmUrl(runtime.sdk, state, config);

  if (state.isRuntimeReady) {
    return runtime;
  }

  if (state.runtimeInitPromise) {
    await state.runtimeInitPromise;
    return runtime;
  }

  state.runtimeInitPromise = runtime.sdk.RuntimeLoader.awaitInstance()
    .then(() => {
      state.isRuntimeReady = true;
    })
    .catch((error) => {
      state.runtimeInitPromise = null;
      throw error;
    });

  await state.runtimeInitPromise;
  return runtime;
}

/**
 * Ensure Rive WASM runtime is initialized once across the app.
 * Safe to call from multiple concurrent code paths.
 */
export async function ensureRiveRuntimeReady(
  config?: RiveRuntimeResolvedConfig | null,
): Promise<RiveSdkLoadResult> {
  if (typeof window === 'undefined') {
    return loadRiveSdk(config?.renderer ?? DEFAULT_RIVE_RENDERER);
  }

  const preferredRenderer = config?.renderer ?? DEFAULT_RIVE_RENDERER;
  const shouldFallback = config?.fallback === true;

  try {
    return await ensureRuntimeForRenderer(preferredRenderer, config);
  } catch (primaryError) {
    if (!shouldFallback) {
      throw primaryError;
    }

    const fallbackTargetRenderer = getFallbackRenderer(preferredRenderer);
    try {
      return await ensureRuntimeForRenderer(fallbackTargetRenderer, config);
    } catch (fallbackError) {
      throw composeFallbackRiveRuntimeError(
        preferredRenderer,
        fallbackTargetRenderer,
        primaryError,
        fallbackError,
      );
    }
  }
}
