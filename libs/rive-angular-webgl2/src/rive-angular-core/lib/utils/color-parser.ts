import { RiveColor } from '../models/data-binding.types';

/**
 * Parses various color input formats into a normalized RiveColor object.
 *
 * Supported formats:
 * - Hex string: '#RRGGBB' or '#RRGGBBAA'
 * - ARGB integer: 0xAARRGGBB (32-bit integer)
 * - RiveColor object: { r, g, b, a? }
 *
 * @param input - Color in any supported format
 * @returns Normalized RiveColor object with all components in 0-255 range
 * @throws Error if the input format is invalid
 *
 * @example
 * parseRiveColor('#FF5733')         // { r: 255, g: 87, b: 51, a: 255 }
 * parseRiveColor('#FF573380')       // { r: 255, g: 87, b: 51, a: 128 }
 * parseRiveColor(0x80FF5733)        // { r: 255, g: 87, b: 51, a: 128 }
 * parseRiveColor({ r: 255, g: 0, b: 0 }) // { r: 255, g: 0, b: 0, a: 255 }
 */
export function parseRiveColor(
  input: string | number | RiveColor,
): RiveColor {
  // If already a RiveColor object, normalize it
  if (typeof input === 'object' && input !== null) {
    return {
      r: clamp(Math.round(input.r), 0, 255),
      g: clamp(Math.round(input.g), 0, 255),
      b: clamp(Math.round(input.b), 0, 255),
      a: clamp(Math.round(input.a ?? 255), 0, 255),
    };
  }

  // If hex string
  if (typeof input === 'string') {
    return parseHexColor(input);
  }

  // If ARGB integer
  if (typeof input === 'number') {
    return parseArgbInteger(input);
  }

  throw new Error(
    `Invalid color format: ${input}. Expected hex string, ARGB integer, or RiveColor object.`,
  );
}

/**
 * Converts a RiveColor object to an ARGB 32-bit integer.
 *
 * @param color - RiveColor object
 * @returns ARGB integer in format 0xAARRGGBB
 *
 * @example
 * riveColorToArgb({ r: 255, g: 0, b: 0, a: 255 }) // 0xFFFF0000
 * riveColorToArgb({ r: 0, g: 128, b: 255, a: 128 }) // 0x800080FF
 */
export function riveColorToArgb(color: RiveColor): number {
  const a = clamp(Math.round(color.a), 0, 255);
  const r = clamp(Math.round(color.r), 0, 255);
  const g = clamp(Math.round(color.g), 0, 255);
  const b = clamp(Math.round(color.b), 0, 255);

  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

/**
 * Converts a RiveColor object to a hex string.
 *
 * @param color - RiveColor object
 * @returns Hex string in format '#RRGGBBAA'
 *
 * @example
 * riveColorToHex({ r: 255, g: 0, b: 0, a: 255 })   // '#FF0000FF'
 * riveColorToHex({ r: 0, g: 128, b: 255, a: 128 }) // '#0080FF80'
 */
export function riveColorToHex(color: RiveColor): string {
  const r = clamp(Math.round(color.r), 0, 255)
    .toString(16)
    .padStart(2, '0');
  const g = clamp(Math.round(color.g), 0, 255)
    .toString(16)
    .padStart(2, '0');
  const b = clamp(Math.round(color.b), 0, 255)
    .toString(16)
    .padStart(2, '0');
  const a = clamp(Math.round(color.a), 0, 255)
    .toString(16)
    .padStart(2, '0');

  return `#${r}${g}${b}${a}`.toUpperCase();
}

/**
 * Parses a hex color string into a RiveColor object.
 * Supports both '#RRGGBB' and '#RRGGBBAA' formats.
 */
function parseHexColor(hex: string): RiveColor {
  // Remove '#' if present
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

  // Validate hex string
  if (!/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(cleanHex)) {
    throw new Error(
      `Invalid hex color format: ${hex}. Expected '#RRGGBB' or '#RRGGBBAA'.`,
    );
  }

  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  const a = cleanHex.length === 8 ? parseInt(cleanHex.slice(6, 8), 16) : 255;

  return { r, g, b, a };
}

/**
 * Parses an ARGB 32-bit integer into a RiveColor object.
 * Format: 0xAARRGGBB
 */
function parseArgbInteger(argb: number): RiveColor {
  // Ensure it's a valid 32-bit unsigned integer
  const value = argb >>> 0;

  const a = (value >> 24) & 0xff;
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;

  return { r, g, b, a };
}

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
