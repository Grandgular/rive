import * as canvasSdk from '@rive-app/canvas';

export type RiveRenderer = 'canvas' | 'webgl2';

export interface RiveSdkLoadResult {
  renderer: RiveRenderer;
  sdk: RiveSdkModule;
}

export type CanvasRiveSdkModule = typeof import('@rive-app/canvas');
export type Webgl2RiveSdkModule = typeof import('@rive-app/webgl2');
export type RiveSdkModule = CanvasRiveSdkModule | Webgl2RiveSdkModule;

export const DEFAULT_RIVE_RENDERER: RiveRenderer = 'canvas';
export const CANVAS_RIVE_SDK: CanvasRiveSdkModule = canvasSdk;

/**
 * Keep type/value exports stable for existing consumers.
 * Runtime-specific module selection is handled by `loadRiveSdk`.
 */
export {
  Fit,
  Alignment,
  EventType,
  LoopType,
  Rive,
  RiveFile,
  Layout,
  StateMachineInput,
  ViewModelInstance,
} from '@rive-app/canvas';

export type {
  LayoutParameters,
  RiveParameters,
  RiveFileParameters,
  Event as RiveEvent,
  LoopEvent,
} from '@rive-app/canvas';

export function getFallbackRenderer(renderer: RiveRenderer): RiveRenderer {
  return renderer === 'webgl2' ? 'canvas' : 'webgl2';
}

export async function loadRiveSdk(
  renderer: RiveRenderer,
): Promise<RiveSdkLoadResult> {
  if (renderer === 'webgl2') {
    const sdk = await import('@rive-app/webgl2');
    return { renderer, sdk };
  }

  return { renderer: 'canvas', sdk: canvasSdk };
}
