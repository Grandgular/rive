import {
  EnvironmentProviders,
  InjectionToken,
  Provider,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { ensureRiveRuntimeReady } from './rive-runtime';

/**
 * Public configuration for Rive runtime setup.
 * - lazy omitted: eager initialization on app startup
 * - lazy true: defer runtime init until first component/service usage
 */
export interface RiveRuntimeConfig {
  wasmUrl?: string;
  lazy?: true;
}

/**
 * Internal normalized config used by runtime helpers.
 */
export interface RiveRuntimeResolvedConfig {
  wasmUrl?: string;
  lazy: boolean;
}

/**
 * Internal DI token used by component/service to read runtime options.
 */
export const RIVE_RUNTIME_CONFIG =
  new InjectionToken<RiveRuntimeResolvedConfig>('RIVE_RUNTIME_CONFIG');

function resolveRuntimeConfig(
  config?: RiveRuntimeConfig,
): RiveRuntimeResolvedConfig {
  return {
    wasmUrl: config?.wasmUrl,
    lazy: config?.lazy === true,
  };
}

/**
 * Configure Rive runtime behavior globally.
 *
 * @example
 * providers: [
 *   provideRiveRuntime({ wasmUrl: 'assets/rive/rive.wasm' }),
 * ]
 *
 * @example
 * providers: [
 *   provideRiveRuntime({ wasmUrl: 'assets/rive/rive.wasm', lazy: true }),
 * ]
 */
export function provideRiveRuntime(
  config?: RiveRuntimeConfig,
): EnvironmentProviders {
  const resolvedConfig = resolveRuntimeConfig(config);

  const providers: Array<Provider | EnvironmentProviders> = [
    {
      provide: RIVE_RUNTIME_CONFIG,
      useValue: resolvedConfig,
    },
  ];

  if (!resolvedConfig.lazy) {
    providers.push(
      provideAppInitializer(() => ensureRiveRuntimeReady(resolvedConfig)),
    );
  }

  return makeEnvironmentProviders(providers);
}
