const canvasAwaitInstance = jest.fn();
const canvasSetWasmUrl = jest.fn();
const webgl2AwaitInstance = jest.fn();
const webgl2SetWasmUrl = jest.fn();

jest.mock('@rive-app/canvas', () => ({
  RuntimeLoader: {
    awaitInstance: (...args: unknown[]) => canvasAwaitInstance(...args),
    setWasmUrl: (...args: unknown[]) => canvasSetWasmUrl(...args),
  },
}));

jest.mock('@rive-app/webgl2', () => ({
  RuntimeLoader: {
    awaitInstance: (...args: unknown[]) => webgl2AwaitInstance(...args),
    setWasmUrl: (...args: unknown[]) => webgl2SetWasmUrl(...args),
  },
}));

describe('ensureRiveRuntimeReady', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    canvasAwaitInstance.mockResolvedValue(undefined);
    webgl2AwaitInstance.mockResolvedValue(undefined);
  });

  it('uses canvas renderer by default', async () => {
    const { ensureRiveRuntimeReady } = await import('./rive-runtime');

    const result = await ensureRiveRuntimeReady();

    expect(result.renderer).toBe('canvas');
    expect(canvasAwaitInstance).toHaveBeenCalledTimes(1);
    expect(webgl2AwaitInstance).not.toHaveBeenCalled();
  });

  it('uses webgl2 renderer when explicitly configured', async () => {
    const { ensureRiveRuntimeReady } = await import('./rive-runtime');

    const result = await ensureRiveRuntimeReady({
      lazy: false,
      renderer: 'webgl2',
      wasmUrl: 'assets/rive/rive.wasm',
    });

    expect(result.renderer).toBe('webgl2');
    expect(webgl2AwaitInstance).toHaveBeenCalledTimes(1);
    expect(webgl2SetWasmUrl).toHaveBeenCalledWith('assets/rive/rive.wasm');
    expect(canvasAwaitInstance).not.toHaveBeenCalled();
  });

  it('does not fall back when webgl2 init fails without fallback', async () => {
    webgl2AwaitInstance.mockRejectedValueOnce(new Error('WebGL2 unavailable'));
    const { ensureRiveRuntimeReady } = await import('./rive-runtime');

    await expect(
      ensureRiveRuntimeReady({
        lazy: false,
        renderer: 'webgl2',
      }),
    ).rejects.toThrow('WebGL2 unavailable');

    expect(webgl2AwaitInstance).toHaveBeenCalledTimes(1);
    expect(canvasAwaitInstance).not.toHaveBeenCalled();
  });

  it('falls back to canvas when fallback is enabled', async () => {
    webgl2AwaitInstance.mockRejectedValueOnce(new Error('WebGL2 unavailable'));
    const { ensureRiveRuntimeReady } = await import('./rive-runtime');

    const result = await ensureRiveRuntimeReady({
      lazy: false,
      renderer: 'webgl2',
      fallback: true,
    });

    expect(result.renderer).toBe('canvas');
    expect(webgl2AwaitInstance).toHaveBeenCalledTimes(1);
    expect(canvasAwaitInstance).toHaveBeenCalledTimes(1);
  });

  it('combines primary and fallback errors when both runtimes fail', async () => {
    webgl2AwaitInstance.mockRejectedValueOnce(new Error('primary fail'));
    canvasAwaitInstance.mockRejectedValueOnce(new Error('fallback fail'));
    const { ensureRiveRuntimeReady } = await import('./rive-runtime');

    await expect(
      ensureRiveRuntimeReady({
        lazy: false,
        renderer: 'webgl2',
        fallback: true,
      }),
    ).rejects.toThrow(/Could not initialize Rive[\s\S]*fallback: true/);
  });
});
