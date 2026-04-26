import { RiveLoadError, RiveValidationError } from './rive-errors';
import { RiveErrorCode } from '../utils/error-codes';

describe('RiveLoadError', () => {
  it('should support legacy constructor (backward compatibility)', () => {
    const originalError = new Error('Original cause');
    const error = new RiveLoadError('Legacy message', originalError);

    expect(error.message).toBe('Legacy message');
    expect(error.originalError).toBe(originalError);
    expect(error.code).toBeUndefined();
    expect(error.name).toBe('RiveLoadError');
  });

  it('should support new options constructor', () => {
    const cause = new Error('Cause');
    const error = new RiveLoadError({
      message: 'New message',
      code: RiveErrorCode.FileNotFound,
      suggestion: 'Check path',
      docsUrl: 'http://docs',
      cause,
    });

    expect(error.message).toBe('New message');
    expect(error.code).toBe(RiveErrorCode.FileNotFound);
    expect(error.suggestion).toBe('Check path');
    expect(error.docsUrl).toBe('http://docs');
    expect(error.originalError).toBe(cause);
  });
});

describe('RiveValidationError', () => {
  it('should construct correctly', () => {
    const error = new RiveValidationError(
      'Validation failed',
      RiveErrorCode.ArtboardNotFound,
      ['Option1', 'Option2'],
      'Try Option1',
    );

    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe(RiveErrorCode.ArtboardNotFound);
    expect(error.availableOptions).toEqual(['Option1', 'Option2']);
    expect(error.suggestion).toBe('Try Option1');
    expect(error.name).toBe('RiveValidationError');
  });
});
