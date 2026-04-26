import { RiveValidationError } from '../models/rive-errors';
import { RiveErrorCode, formatErrorMessage } from './error-codes';
import { RiveLogger } from './logger';

/** Minimal Rive instance shape used for validation; works for canvas and webgl2 runtimes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RiveLike = any;

/**
 * Validates requested artboard name against available artboards.
 * Returns error if not found.
 */
export function validateArtboard(
  rive: RiveLike,
  requestedName?: string,
): RiveValidationError | null {
  if (!requestedName) return null;

  try {
    // Safe check: ensure artboardNames exist on runtime
    // Note: These properties exist at runtime but may not be in type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const available = (rive as any).artboardNames;
    if (!available || !available.includes(requestedName)) {
      return new RiveValidationError(
        formatErrorMessage(RiveErrorCode.ArtboardNotFound, {
          name: requestedName,
        }),
        RiveErrorCode.ArtboardNotFound,
        available || [],
        available && available.length > 0
          ? `Available artboards: ${available.join(', ')}`
          : 'No artboards found in file',
      );
    }
  } catch {
    // Graceful fallback if runtime metadata is not accessible
    // Return null silently to avoid breaking validation flow
  }
  return null;
}

/**
 * Validates requested animation names against available animations.
 * Returns first error found.
 */
export function validateAnimations(
  rive: RiveLike,
  requestedNames?: string | string[],
): RiveValidationError | null {
  if (!requestedNames) return null;

  const names = Array.isArray(requestedNames)
    ? requestedNames
    : [requestedNames];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const available = (rive as any).animationNames;
    for (const name of names) {
      if (!available || !available.includes(name)) {
        return new RiveValidationError(
          formatErrorMessage(RiveErrorCode.AnimationNotFound, { name }),
          RiveErrorCode.AnimationNotFound,
          available || [],
          available && available.length > 0
            ? `Available animations: ${available.join(', ')}`
            : 'No animations found in file',
        );
      }
    }
  } catch {
    // Graceful fallback if runtime metadata is not accessible
    // Return null silently to avoid breaking validation flow
  }
  return null;
}

/**
 * Validates requested state machine names against available state machines.
 * Returns first error found.
 */
export function validateStateMachines(
  rive: RiveLike,
  requestedNames?: string | string[],
): RiveValidationError | null {
  if (!requestedNames) return null;

  const names = Array.isArray(requestedNames)
    ? requestedNames
    : [requestedNames];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const available = (rive as any).stateMachineNames;
    for (const name of names) {
      if (!available || !available.includes(name)) {
        return new RiveValidationError(
          formatErrorMessage(RiveErrorCode.StateMachineNotFound, { name }),
          RiveErrorCode.StateMachineNotFound,
          available || [],
          available && available.length > 0
            ? `Available state machines: ${available.join(', ')}`
            : 'No state machines found in file',
        );
      }
    }
  } catch {
    // Graceful fallback if runtime metadata is not accessible
    // Return null silently to avoid breaking validation flow
  }
  return null;
}

/**
 * Validates if an input exists within a specific state machine.
 */
export function validateInput(
  rive: RiveLike,
  stateMachineName: string,
  inputName: string,
): RiveValidationError | null {
  try {
    const inputs = rive.stateMachineInputs(stateMachineName);
    if (!inputs) return null; // Should not happen if SM exists

    const found = inputs.find((i: { name: string }) => i.name === inputName);
    if (!found) {
      const available = inputs.map((i: { name: string }) => i.name);
      return new RiveValidationError(
        formatErrorMessage(RiveErrorCode.InputNotFound, {
          name: inputName,
          stateMachine: stateMachineName,
        }),
        RiveErrorCode.InputNotFound,
        available,
        available.length > 0
          ? `Available inputs in "${stateMachineName}": ${available.join(', ')}`
          : `No inputs found in state machine "${stateMachineName}"`,
      );
    }
  } catch {
    // Graceful fallback if runtime metadata is not accessible
    // Return null silently to avoid breaking validation flow
  }
  return null;
}

/**
 * Runs full configuration validation.
 * Logs warnings and returns array of errors.
 */
export function validateConfiguration(
  rive: RiveLike,
  config: {
    artboard?: string;
    animations?: string | string[];
    stateMachines?: string | string[];
  },
  logger: RiveLogger,
): RiveValidationError[] {
  const errors: RiveValidationError[] = [];

  const artboardError = validateArtboard(rive, config.artboard);
  if (artboardError) errors.push(artboardError);

  const animError = validateAnimations(rive, config.animations);
  if (animError) errors.push(animError);

  const smError = validateStateMachines(rive, config.stateMachines);
  if (smError) errors.push(smError);

  if (errors.length > 0) {
    logger.warn(`Validation failed with ${errors.length} errors:`);
    errors.forEach((err) => {
      logger.warn(`- ${err.message}`);
      if (err.suggestion) logger.warn(`  Suggestion: ${err.suggestion}`);
    });
  }

  return errors;
}
