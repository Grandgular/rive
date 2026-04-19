import {
  formatMissingRivePackageError,
  isModuleResolutionError,
} from './rive-runtime-errors';

export type RiveRenderer = 'canvas' | 'webgl2';

export enum Fit {
  Cover = 'cover',
  Contain = 'contain',
  Fill = 'fill',
  FitWidth = 'fitWidth',
  FitHeight = 'fitHeight',
  None = 'none',
  ScaleDown = 'scaleDown',
  Layout = 'layout',
}

export enum Alignment {
  Center = 'center',
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  CenterLeft = 'centerLeft',
  CenterRight = 'centerRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight',
}

export enum EventType {
  Load = 'load',
  LoadError = 'loaderror',
  Play = 'play',
  Pause = 'pause',
  Stop = 'stop',
  Loop = 'loop',
  Draw = 'draw',
  Advance = 'advance',
  StateChange = 'statechange',
  RiveEvent = 'riveevent',
  AudioStatusChange = 'audiostatuschange',
}

export enum LoopType {
  OneShot = 'oneshot',
  Loop = 'loop',
  PingPong = 'pingpong',
}

export interface LayoutParameters {
  fit?: Fit;
  alignment?: Alignment;
  layoutScaleFactor?: number;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
}

export interface LoopEvent {
  animation: string;
  type: LoopType;
}

export interface RiveEvent {
  type: EventType;
  data?: unknown;
}

export interface StateMachineInput {
  name: string;
  value: number | boolean;
  fire(): void;
  type?: number;
}

export interface ViewModelProperty<TValue = unknown> {
  value: TValue;
  on?: (callback: () => void) => (() => void) | void;
  trigger?: () => void;
}

export interface ViewModelColorProperty extends ViewModelProperty<number> {
  rgba(r: number, g: number, b: number, a?: number): void;
  opacity(opacity: number): void;
}

export interface ViewModelTriggerProperty extends ViewModelProperty<boolean> {
  trigger(): void;
}

export interface ViewModelInstance {
  name?: string;
  properties: unknown[];
  number(path: string): ViewModelProperty<number> | undefined;
  string(path: string): ViewModelProperty<string> | undefined;
  boolean(path: string): ViewModelProperty<boolean> | undefined;
  color(path: string): ViewModelColorProperty | undefined;
  enum(path: string): ViewModelProperty<string | number> | undefined;
  trigger(path: string): ViewModelTriggerProperty | undefined;
  cleanup(): void;
}

export interface ViewModel {
  name: string;
  instance(): ViewModelInstance;
}

export interface RiveFileParameters {
  src?: string;
  buffer?: ArrayBuffer;
}

export interface RiveFile {
  init(): void | Promise<void>;
  cleanup(): void;
  getInstance(): unknown;
  on(event: EventType, callback: () => void): void;
}

export interface RiveParameters {
  canvas: HTMLCanvasElement;
  autoplay?: boolean;
  layout?: unknown;
  useOffscreenRenderer?: boolean;
  shouldDisableRiveListeners?: boolean;
  automaticallyHandleEvents?: boolean;
  onLoad?: () => void;
  onLoadError?: (error?: unknown) => void;
  onPlay?: (event: RiveEvent) => void;
  onPause?: (event: RiveEvent) => void;
  onStop?: (event: RiveEvent) => void;
  onLoop?: (event: RiveEvent) => void;
  onAdvance?: (event: RiveEvent) => void;
  onStateChange?: (event: RiveEvent) => void;
  onRiveEvent?: (event: RiveEvent) => void;
  src?: string;
  buffer?: ArrayBuffer;
  riveFile?: RiveFile;
  artboard?: string;
  animations?: string | string[];
  stateMachines?: string | string[];
}

export interface Rive {
  layout?: unknown;
  viewModelCount: number;
  cleanup(): void;
  resizeDrawingSurfaceToCanvas(): void;
  startRendering(): void;
  stopRendering(): void;
  play(animations?: string | string[]): void;
  pause(animations?: string | string[]): void;
  stop(animations?: string | string[]): void;
  reset(params?: unknown): void;
  stateMachineInputs(stateMachine: string): StateMachineInput[];
  getTextRunValue(name: string): string | undefined;
  setTextRunValue(name: string, value: string): void;
  getTextRunValueAtPath(name: string, path: string): string | undefined;
  setTextRunValueAtPath(name: string, value: string, path: string): void;
  viewModelByIndex(index: number): ViewModel | null;
  defaultViewModel(): ViewModel | null;
  viewModelByName(name: string): ViewModel | null;
  bindViewModelInstance(viewModelInstance: ViewModelInstance): void;
  artboardNames?: string[];
  animationNames?: string[];
  stateMachineNames?: string[];
  /** Subscribe to Rive-generated events (matches `@rive-app/canvas` / `@rive-app/webgl2`). */
  on(type: EventType, callback: (event: RiveEvent) => void): void;
  off(type: EventType, callback: (event: RiveEvent) => void): void;
  removeAllRiveEventListeners(type?: EventType): void;
}

export type Layout = object;

export interface RiveSdkLoadResult {
  renderer: RiveRenderer;
  sdk: RiveSdkModule;
}

export interface RuntimeLoaderApi {
  awaitInstance(): Promise<unknown>;
  setWasmUrl(url: string): void;
}

export interface RiveSdkModule {
  RuntimeLoader: RuntimeLoaderApi;
  Layout: new (params?: LayoutParameters) => Layout;
  Rive: new (params: RiveParameters) => Rive;
  RiveFile: new (params: RiveFileParameters) => RiveFile;
}

export const DEFAULT_RIVE_RENDERER: RiveRenderer = 'canvas';

export function getFallbackRenderer(renderer: RiveRenderer): RiveRenderer {
  return renderer === 'webgl2' ? 'canvas' : 'webgl2';
}

export async function loadRiveSdk(
  renderer: RiveRenderer,
): Promise<RiveSdkLoadResult> {
  try {
    if (renderer === 'webgl2') {
      const sdk = (await import('@rive-app/webgl2')) as unknown as RiveSdkModule;
      return { renderer, sdk };
    }

    const sdk = (await import('@rive-app/canvas')) as unknown as RiveSdkModule;
    return { renderer: 'canvas', sdk };
  } catch (error) {
    if (isModuleResolutionError(error)) {
      throw formatMissingRivePackageError(renderer, error);
    }
    throw error;
  }
}
