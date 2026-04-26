import { InjectionToken, Provider } from '@angular/core';

/**
 * Log levels for Rive debugging.
 * - 'none': No output
 * - 'error': Only errors (default)
 * - 'warn': Errors and warnings
 * - 'info': High-level info (loaded, played)
 * - 'debug': Detailed logs (internal state, events)
 */
export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Configuration for Rive debug mode.
 */
export interface RiveDebugConfig {
  logLevel: LogLevel;
}

/**
 * Injection token for global Rive debug configuration.
 * Can be provided via provideRiveDebug().
 */
export const RIVE_DEBUG_CONFIG = new InjectionToken<RiveDebugConfig>('RIVE_DEBUG_CONFIG');

/**
 * Provides global configuration for Rive debugging.
 * Use this in your app.config.ts or module providers.
 *
 * @example
 * providers: [
 *   provideRiveDebug({ logLevel: 'debug' })
 * ]
 */
export function provideRiveDebug(config: RiveDebugConfig): Provider {
  return {
    provide: RIVE_DEBUG_CONFIG,
    useValue: config,
  };
}
