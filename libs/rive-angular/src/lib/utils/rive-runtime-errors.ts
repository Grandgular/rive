import type { RiveRenderer } from './rive-sdk';

const RIVE_PACKAGE: Record<RiveRenderer, string> = {
  canvas: '@rive-app/canvas',
  webgl2: '@rive-app/webgl2',
};

export function isModuleResolutionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as Error & { code?: string };
  if (
    err.code === 'MODULE_NOT_FOUND' ||
    err.code === 'ERR_MODULE_NOT_FOUND' ||
    err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
  ) {
    return true;
  }
  const msg = String((error as Error).message ?? '');
  return (
    msg.includes('Cannot find module') ||
    msg.includes('Failed to resolve') ||
    msg.includes('Could not resolve')
  );
}

export function formatMissingRivePackageError(
  renderer: RiveRenderer,
  cause?: unknown,
): Error {
  const pkg = RIVE_PACKAGE[renderer];
  const message = [
    `[rive-angular] Rive runtime package "${pkg}" is not installed.`,
    `Install it with: npm install ${pkg}`,
  ].join(' ');
  const err = new Error(message);
  if (cause !== undefined) {
    (err as Error & { cause?: unknown }).cause = cause;
  }
  return err;
}

export function composeFallbackRiveRuntimeError(
  preferred: RiveRenderer,
  fallback: RiveRenderer,
  primaryError: unknown,
  fallbackError: unknown,
): Error {
  const pkgPreferred = RIVE_PACKAGE[preferred];
  const pkgFallback = RIVE_PACKAGE[fallback];
  const primaryMsg =
    primaryError instanceof Error ? primaryError.message : String(primaryError);
  const fallbackMsg =
    fallbackError instanceof Error
      ? fallbackError.message
      : String(fallbackError);

  const message = [
    `[rive-angular] Could not initialize Rive with renderer "${preferred}" or fallback "${fallback}".`,
    `Primary error: ${primaryMsg}`,
    `Fallback error: ${fallbackMsg}`,
    `Install both runtimes for automatic fallback: npm install ${pkgPreferred} ${pkgFallback}`,
    `Or remove fallback: true from provideRiveRuntime({ renderer: "${preferred}" }) to ship only the selected runtime.`,
  ].join('\n');
  const err = new Error(message);
  (err as Error & { cause?: unknown }).cause = {
    primary: primaryError,
    fallback: fallbackError,
  };
  return err;
}
