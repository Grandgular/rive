/**
 * Error codes used throughout the Rive Angular library.
 *
 * Ranges:
 * - RIVE_1xx: Load errors (file not found, network, bad format)
 * - RIVE_2xx: Validation errors (artboard, animation, state machine mismatch)
 * - RIVE_3xx: Configuration/Usage errors (missing source, bad canvas)
 * - RIVE_4xx: Data Binding errors (ViewModel, property not found, type mismatch)
 */
export enum RiveErrorCode {
  // Load Errors
  FileNotFound = 'RIVE_101',
  InvalidFormat = 'RIVE_102',
  NetworkError = 'RIVE_103',

  // Validation Errors
  ArtboardNotFound = 'RIVE_201',
  AnimationNotFound = 'RIVE_202',
  StateMachineNotFound = 'RIVE_203',
  InputNotFound = 'RIVE_204',
  TextRunNotFound = 'RIVE_205',

  // Configuration Errors
  NoSource = 'RIVE_301',
  InvalidCanvas = 'RIVE_302',

  // Data Binding Errors
  ViewModelNotFound = 'RIVE_401',
  DataBindingPropertyNotFound = 'RIVE_402',
  DataBindingTypeMismatch = 'RIVE_403',
}

/**
 * Template messages for each error code.
 * Used by formatErrorMessage to generate user-friendly descriptions.
 */
export const ERROR_MESSAGES: Record<RiveErrorCode, string> = {
  [RiveErrorCode.FileNotFound]: 'File not found: {url}',
  [RiveErrorCode.InvalidFormat]: 'Invalid .riv file format',
  [RiveErrorCode.NetworkError]: 'Network error while loading file',
  [RiveErrorCode.ArtboardNotFound]: 'Artboard "{name}" not found',
  [RiveErrorCode.AnimationNotFound]: 'Animation "{name}" not found',
  [RiveErrorCode.StateMachineNotFound]: 'State machine "{name}" not found',
  [RiveErrorCode.InputNotFound]: 'Input "{name}" not found in "{stateMachine}"',
  [RiveErrorCode.TextRunNotFound]: 'Text run "{name}" not found',
  [RiveErrorCode.NoSource]: 'No animation source provided',
  [RiveErrorCode.InvalidCanvas]: 'Invalid canvas element',
  [RiveErrorCode.ViewModelNotFound]: 'ViewModel "{name}" not found',
  [RiveErrorCode.DataBindingPropertyNotFound]:
    'Data binding property "{path}" not found in ViewModel',
  [RiveErrorCode.DataBindingTypeMismatch]:
    'Data binding type mismatch for "{path}": expected {expected}, got {actual}',
};

/**
 * Formats an error message by replacing placeholders with actual values.
 *
 * @param code - The error code
 * @param params - Record of values to replace in the template (e.g. { name: 'MyAnim' })
 * @returns The formatted error string
 */
export function formatErrorMessage(
  code: RiveErrorCode,
  params: Record<string, string> = {},
): string {
  let message = ERROR_MESSAGES[code] || 'Unknown Rive error';

  for (const [key, value] of Object.entries(params)) {
    message = message.replace(`{${key}}`, value);
  }

  return message;
}
