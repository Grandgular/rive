import { LogLevel, RiveDebugConfig } from './debug-config';

/**
 * Internal logger for Rive Angular library.
 * Handles log levels and formatting.
 * Not exported publicly.
 */
export class RiveLogger {
  private level: LogLevel;

  constructor(globalConfig?: RiveDebugConfig | null, localDebug?: boolean) {
    this.level = this.resolveLogLevel(globalConfig, localDebug);
  }

  /**
   * Resolve effective log level based on precedence rules:
   * 1. Local debug=true -> 'debug'
   * 2. Local debug=false/undefined -> Use global config
   * 3. No config -> 'error' (default)
   */
  private resolveLogLevel(
    globalConfig?: RiveDebugConfig | null,
    localDebug?: boolean,
  ): LogLevel {
    if (localDebug === true) {
      return 'debug';
    }
    if (globalConfig?.logLevel) {
      return globalConfig.logLevel;
    }
    return 'error';
  }

  /**
   * Update log level dynamically (e.g. when input changes)
   */
  public update(
    globalConfig?: RiveDebugConfig | null,
    localDebug?: boolean,
  ): void {
    this.level = this.resolveLogLevel(globalConfig, localDebug);
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[Rive] ${message}`, ...args);
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[Rive] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[Rive] ${message}`, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[Rive] ${message}`, ...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['none', 'error', 'warn', 'info', 'debug'];
    const currentIdx = levels.indexOf(this.level);
    const targetIdx = levels.indexOf(level);
    return currentIdx >= targetIdx;
  }
}
